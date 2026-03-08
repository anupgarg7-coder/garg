// ── BOOK TAB ──

function buildItemIndex(){
  try {
    const index=[];
    data.outputs.forEach(out=>{
      out.items.forEach(item=>{
        let returned=0;
        data.inputs.forEach(inp=>{
          const outs=inp.linkedOuts||(inp.linkedOut?[inp.linkedOut]:[]);
          if(!outs.includes(out.challan))return;
          if(inp.linkedOutItems){const sec=inp.linkedOutItems.find(s=>s.challanNo===out.challan);if(sec)sec.items.filter(i=>i.name===item.name).forEach(i=>{returned+=i.pcs;});}
          else inp.items.filter(i=>i.name===item.name).forEach(i=>{returned+=i.pcs;});
        });
        index.push({name:item.name,challanNo:out.challan,challanDate:out.date,outPcs:item.pcs,returned,pending:Math.max(0,item.pcs-returned)});
      });
    });
    return index;
  } catch(e) { console.warn('[book:buildItemIndex] error:', e); }
}

function challanCountable(challanDate, preStockDate){
  try {
    if(!preStockDate) return true;   // no cutoff set → count everything
    if(!challanDate) return true;    // no date on challan → count it
    return challanDate > preStockDate; // strictly after
  } catch(e) { console.warn('[book:challanCountable] error:', e); }
}

function renderBook(){
  try {
    const bookList=document.getElementById('book-list');
    const totalOut=data.outputs.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.pcs,0),0);
    const totalIn=data.inputs.reduce((s,i)=>s+i.items.reduce((ss,it)=>ss+it.pcs,0),0);
    document.getElementById('sum-out').textContent=totalOut;
    document.getElementById('sum-in').textContent=totalIn;
    document.getElementById('sum-bal').textContent=Math.max(0,totalOut-totalIn);
    if(!data.outputs.length){bookList.innerHTML='<div class="empty"><div class="empty-icon">📖</div>No challans yet.</div>';return;}
    const tI={'Direct':'🚶','Transport':'🚛','Kiran Deka':'👤','Cargo Tempo':'🚐'};
    bookList.innerHTML=data.outputs.slice().reverse().map(out=>{
      const li=data.inputs.filter(inp=>(inp.linkedOuts||(inp.linkedOut?[inp.linkedOut]:[])).includes(out.challan));
      const oM={};out.items.forEach(i=>{oM[i.name]=(oM[i.name]||0)+i.pcs;});
      const iM={};li.forEach(inp=>{if(inp.linkedOutItems){const sec=inp.linkedOutItems.find(s=>s.challanNo===out.challan);if(sec)sec.items.forEach(i=>{iM[i.name]=(iM[i.name]||0)+i.pcs;});}else inp.items.forEach(i=>{iM[i.name]=(iM[i.name]||0)+i.pcs;});});
      const all=[...new Set([...Object.keys(oM),...Object.keys(iM)])];
      const tO=Object.values(oM).reduce((s,v)=>s+v,0),tIv=Object.values(iM).reduce((s,v)=>s+v,0),diff=tO-tIv;
      let sc,st;
      if(diff===0&&tIv>0){sc='balanced';st='✔ FULLY MATCHED';}else if(tIv===0){sc='pending';st='⏳ AWAITING — '+tO+' pcs';}else if(diff>0){sc='pending';st='⏳ PENDING: '+diff+' pcs';}else{sc='excess';st='⚠ EXCESS: '+Math.abs(diff)+' pcs';}
      return `<div class="book-card"><div class="book-header"><div><div class="book-ch-num">${out.challan}</div><div class="book-date">${out.date}</div></div><div style="font-size:0.7rem;color:#aaa">${tO} pcs out</div></div><div class="book-section"><div class="match-row match-head"><span>ITEM</span><span>OUT</span><span>IN</span><span>STATUS</span></div>${all.map(name=>{const o=oM[name]||0,i=iM[name]||0,d=o-i,cls=d===0?'diff-neg':d>0?'diff-pos':'diff-zero',ds=d===0?'✔':d>0?d+' left':'EXTRA '+Math.abs(d);return`<div class="match-row"><span>${name}</span><span>${o}</span><span>${i||'—'}</span><span class="${cls}">${ds}</span></div>`;}).join('')||'<div style="font-size:0.7rem;color:#aaa;padding:5px 0">—</div>'}</div>${li.length?`<div class="in-challan-refs"><span style="font-size:0.58rem;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;">Inputs: </span>${li.map(inp=>{const ti=inp.transport?` · ${tI[inp.transport]||'🚚'} ${inp.transport}`:'';return`<span class="in-ch-ref">${inp.challan}${(inp.linkedOuts&&inp.linkedOuts.length>1)?' 🔀':''} · ${inp.date}${ti}</span>`;}).join('')}</div>`:''}<div class="status-bar ${sc}">${st}</div></div>`;
    }).join('');
  } catch(e) { console.warn('[book:renderBook] error:', e); }
}

function deleteReport(id){if(!confirm('Delete this sales report?'))return;data.salesReports=data.salesReports.filter(r=>r.id!==id);save();renderReportList();renderFinalStock();populateReportFilterMonths();toast('Deleted.');}
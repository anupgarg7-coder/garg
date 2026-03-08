// ── IN TAB ──

function setInType(t){
  currentInType = t;
  document.getElementById('in-type-dyeing').classList.toggle('active', t==='dyeing');
  document.getElementById('in-type-packing').classList.toggle('active', t==='packing');
}

function toggleCustomTransport(sel){
  const f=document.getElementById('transport-custom-field');
  sel.value==='Other'?f.classList.add('show'):(f.classList.remove('show'),document.getElementById('in-transport-custom').value='');
}

function updateInputPcs(n,i,v){if(addedItems[n]?.[i]!==undefined)addedItems[n][i].inputPcs=parseInt(v)||0;}

function removeAddedItem(n){delete addedItems[n];renderAddedItems();}

function renderAddedItems(){
  const container=document.getElementById('in-added-items-container');
  const list=document.getElementById('in-added-items-list');
  const saveSection=document.getElementById('in-save-section');
  const names=Object.keys(addedItems);
  if(!names.length){container.style.display='none';saveSection.style.display='none';return;}
  container.style.display='block';saveSection.style.display='block';
  list.innerHTML=names.map(name=>{
    const rows=addedItems[name];
    const safeN=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `<div class="added-item-card"><div class="added-item-header"><span class="added-item-name">${name}</span><button class="remove-added-item" onclick="removeAddedItem('${safeN}')">✕</button></div><div class="added-item-rows">${rows.map((r,ri)=>`<div class="added-item-row"><div><div class="added-row-out">📤 ${r.challanNo} <span style="font-size:0.58rem;color:var(--muted);">${r.challanDate}</span></div><div class="added-row-meta">Out: ${r.outPcs} &nbsp;·&nbsp; <span class="added-row-pending">${r.pending} pending</span></div></div><div class="added-row-pcs"><input type="number" min="0" max="${r.pending}" value="${r.inputPcs||0}" oninput="updateInputPcs('${safeN}',${ri},this.value)"><span class="pcs-lbl">Pcs In</span></div></div>`).join('')}</div></div>`;
  }).join('');
}

function saveInput(mode){
  const challan=document.getElementById('in-challan').value.trim();
  const date=document.getElementById('in-date').value;
  const ts=document.getElementById('in-transport').value;
  const transport=ts==='Other'?(document.getElementById('in-transport-custom').value.trim()||'Other'):ts;
  if(!challan||!date){toast('⚠ Fill challan no. and date!');return;}
  if(!Object.keys(addedItems).length){toast('⚠ Add at least one item!');return;}
  if(data.inputs.find(i=>i.challan===challan)){toast('⚠ Challan no. already exists!');return;}
  const perOut={};
  Object.entries(addedItems).forEach(([name,rows])=>{rows.forEach(r=>{if(r.inputPcs<=0)return;if(!perOut[r.challanNo])perOut[r.challanNo]=[];perOut[r.challanNo].push({name,pcs:r.inputPcs});});});
  const sections=Object.entries(perOut).map(([challanNo,items])=>({challanNo,items}));
  if(!sections.length){toast('⚠ Enter quantity for at least one item!');return;}
  const allItems=sections.flatMap(s=>s.items);
  const linkedOuts=sections.map(s=>s.challanNo);
  const inType = currentInType;
  if(!mode||mode==='combined'){
    data.inputs.push({id:Date.now().toString(),challan,date,transport,inType,linkedOut:linkedOuts[0],linkedOuts,linkedOutItems:sections,items:allItems});
    toast('✔ Saved! Syncing to cloud...');
  } else {
    sections.forEach((sec,idx)=>{data.inputs.push({id:(Date.now()+idx).toString(),challan:sections.length>1?challan+'-'+(idx+1):challan,date,transport,inType,linkedOut:sec.challanNo,linkedOuts:[sec.challanNo],linkedOutItems:[sec],items:sec.items});});
    toast(`✔ Saved as ${sections.length} challan(s). Syncing...`);
  }
  save(); addedItems={};
  ['in-challan','in-transport-custom','item-search-box'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('in-transport').value='';
  document.getElementById('transport-custom-field').classList.remove('show');
  setInType('dyeing');
  document.getElementById('item-suggestions').style.display='none';
  document.getElementById('in-added-items-container').style.display='none';
  document.getElementById('in-save-section').style.display='none';
  document.getElementById('in-added-items-list').innerHTML='';
  setTodayDates(); renderInputList();
}

function deleteIn(id){if(!confirm('Delete this input challan?'))return;data.inputs=data.inputs.filter(i=>i.id!==id);save();renderInputList();toast('Deleted.');}

function renderInputList(){
  const q=(document.getElementById('in-search').value||'').toLowerCase();
  const list=document.getElementById('in-list');
  const filtered=data.inputs.filter(i=>{const outs=i.linkedOuts||(i.linkedOut?[i.linkedOut]:[]);return i.challan.toLowerCase().includes(q)||outs.some(lo=>lo.toLowerCase().includes(q))||i.items.some(it=>it.name.toLowerCase().includes(q));});
  if(!filtered.length){list.innerHTML='<div class="empty"><div class="empty-icon">📥</div>No input challans yet.</div>';return;}
  const tI={'Direct':'🚶','Transport':'🚛','Kiran Deka':'👤','Cargo Tempo':'🚐'};
  list.innerHTML=filtered.slice().reverse().map(inp=>{
    const total=inp.items.reduce((s,i)=>s+i.pcs,0);
    const outs=inp.linkedOuts||(inp.linkedOut?[inp.linkedOut]:[]);
    const inTypeLbl=inp.inType==='packing'?'<span class="type-badge packing" style="margin-right:4px">🟢 For Packing</span>':'<span class="type-badge" style="background:var(--in-light);color:var(--in-color);border:1px solid var(--in-border);margin-right:4px">🔵 After Dyeing</span>';
    return `<div class="challan-card"><div class="challan-header in"><div><div class="ch-num in">${inp.challan}</div><div class="ch-date">${inp.date}</div></div><div style="display:flex;align-items:center;gap:8px;">${inTypeLbl}<span class="ch-badge in">IN</span><button class="del-ch-btn" onclick="deleteIn('${inp.id}')">🗑</button></div></div><div class="challan-body">${inp.items.map(i=>`<div class="item-line"><span>${i.name}</span><span class="item-pcs">${i.pcs} pcs</span></div>`).join('')}<div class="ch-footer"><span class="ch-total">Total: <strong>${total} pcs</strong></span></div><div style="margin-top:8px;">${outs.map(lo=>`<span class="linked-tag">🔗 ${lo}</span>`).join('')||'<span style="font-size:0.62rem;color:#bbb">Unlinked</span>'}</div>${inp.transport?`<div class="transport-tag">${tI[inp.transport]||'🚚'} ${inp.transport}</div>`:''}</div></div>`;
  }).join('');
}
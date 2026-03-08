// ── REPORT TAB ──

function populateReportFilterMonths(){
  try {
    const sel=document.getElementById('report-filter-month'),cur=sel.value;
    sel.innerHTML='<option value="all">All Months Combined</option>';
    data.salesReports.forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.monthYear;sel.appendChild(o);});
    sel.value=cur||'all';
  } catch(e) { console.warn('[report:populateReportFilterMonths] error:', e); }
}

function renderReportList(){
  try {
    const list=document.getElementById('report-list');
    if(!data.salesReports.length){list.innerHTML='<div class="empty"><div class="empty-icon">📊</div>No sales reports uploaded yet.</div>';return;}
    list.innerHTML=data.salesReports.slice().reverse().map(r=>{
      const totalSold=r.items.reduce((s,i)=>s+i.qty,0);
      return `<div class="report-month-card"><div class="report-month-header"><span class="report-month-title">${r.monthYear}</span><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:0.6rem;opacity:0.8;">${r.items.length} items · ${totalSold} pcs</span><button class="del-report-btn" onclick="deleteReport('${r.id}')">🗑</button></div></div><table class="report-table"><thead><tr><th>ITEM</th><th>QTY SOLD</th></tr></thead><tbody>${r.items.map(i=>`<tr><td>${i.name}</td><td class="sale-qty">${i.qty} pcs</td></tr>`).join('')}</tbody></table></div>`;
    }).join('');
  } catch(e) { console.warn('[report:renderReportList] error:', e); }
}

function renderFinalStock(){
  try {
    const container=document.getElementById('final-stock-table');
    const fv=document.getElementById('report-filter-month').value;
    const rtu=fv==='all'?data.salesReports:data.salesReports.filter(r=>r.id===fv);
    const names=new Set();
    data.stock.forEach(s=>names.add(s.name));
    data.inputs.forEach(inp=>inp.items.forEach(i=>names.add(i.name)));
    rtu.forEach(r=>r.items.forEach(i=>names.add(i.name)));
    if(!names.size){container.innerHTML='<div class="empty"><div class="empty-icon">📊</div>Add stock and upload a sales report to see final stock.</div>';return;}
    const rows=[...names].map(name=>{
      const se=data.stock.find(s=>s.name.toLowerCase()===name.toLowerCase());
      const preWH=se?(se.preStockWarehouse||se.preStock||0):0;
      const preSH=se?(se.preStockShop||0):0;
      const lowWarn=se?(se.lowWarn||0):0;
      const whIn=getWhInQty(name);
      const shOut=getShOutQty(name);
      const shDed=getShInDeduction(name);
      let salesQty=0;rtu.forEach(r=>r.items.filter(i=>i.name.toLowerCase()===name.toLowerCase()).forEach(i=>{salesQty+=i.qty;}));
      const warehouseTotal=preWH+whIn-shOut;
      const shopTotal=preSH+shOut-shDed-salesQty;
      const whShelves=(se&&se.shelves)?se.shelves.filter(s=>s.loc==='wh'):[];
      const shShelves=(se&&se.shelves)?se.shelves.filter(s=>s.loc==='sh'):[];
      const cutoffDate=typeof getLatestPreStockDate==="function"?getLatestPreStockDate(name):""; return{name,preWH,preSH,whIn,shOut,shDed,salesQty,warehouseTotal,shopTotal,lowWarn,whShelves,shShelves,cutoffDate};
    }).sort((a,b)=>(a.warehouseTotal+a.shopTotal)-(b.warehouseTotal+b.shopTotal));
    const label=fv==='all'?'All Months':(data.salesReports.find(r=>r.id===fv)?.monthYear||'');
    const lowCount=rows.filter(r=>r.lowWarn>0&&r.warehouseTotal<=r.lowWarn).length;
    container.innerHTML=`${lowCount>0?`<div style="background:#fdecea;border:1px solid var(--out-border);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:0.74rem;color:var(--out-color);font-weight:600;">🚨 ${lowCount} item(s) at or below low warehouse stock threshold!</div>`:''}<div class="report-month-card"><div class="report-month-header"><span class="report-month-title">FINAL STOCK — ${label}</span><span style="font-size:0.6rem;opacity:0.8;">${rows.length} items</span></div><table class="report-table"><thead><tr><th>ITEM</th><th colspan="2" style="text-align:center;background:#e8f5f5;color:var(--lookup)">🏭 WAREHOUSE</th><th colspan="2" style="text-align:center;background:#fef9ec;color:var(--report)">🏪 SHOP</th></tr><tr><th>—</th><th style="font-size:0.5rem">Formula</th><th>Total</th><th style="font-size:0.5rem">Formula</th><th>Total</th></tr></thead><tbody>${rows.map(row=>{const whD=row.warehouseTotal<=0,whL=row.lowWarn>0&&row.warehouseTotal<=row.lowWarn&&!whD,shD=row.shopTotal<=0,whCls=whD?'final-danger':whL?'final-warn':'final-ok',shCls=shD?'final-danger':'final-ok',badge=whD?'<span class="low-badge">🚨 WH</span>':whL?'<span class="low-badge">⚠ LOW</span>':row.lowWarn>0?'<span class="ok-badge">✔</span>':'';return`<tr><td style="font-weight:600">${row.name}</td><td style="color:var(--muted);font-size:0.62rem">${row.preWH}+${row.whIn}−${row.shOut}</td><td class="${whCls}">${row.warehouseTotal}</td><td style="color:var(--muted);font-size:0.62rem">${row.preSH}+${row.shOut}−${row.shDed}−${row.salesQty}</td><td class="${shCls}">${row.shopTotal}</td></tr>`;}).join('')}</tbody></table></div>`;
  } catch(e) { console.warn('[report:renderFinalStock] error:', e); }
}
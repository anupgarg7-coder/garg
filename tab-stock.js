// ── STOCK TAB ──

function makeShelfRow(shelfNo='', qty=0, container) {
  const row = document.createElement('div'); row.className = 'shelf-row';
  const sInp = document.createElement('input'); sInp.type='text'; sInp.placeholder='Shelf (e.g. A-3)'; sInp.className='stk-shelf'; sInp.value=shelfNo||''; sInp.autocomplete='off';
  const qInp = document.createElement('input'); qInp.type='number'; qInp.placeholder='Qty'; qInp.min='0'; qInp.className='stk-shelf-qty'; qInp.value=qty||'';
  const rmBtn = document.createElement('button'); rmBtn.className='remove-item'; rmBtn.textContent='✕'; rmBtn.title='Remove shelf';
  rmBtn.onclick = () => { if(container.querySelectorAll('.shelf-row').length > 1) row.remove(); else { sInp.value=''; qInp.value=''; } };
  row.appendChild(sInp); row.appendChild(qInp); row.appendChild(rmBtn);
  container.appendChild(row);
}

function makeStockRow(name='', preStockWarehouse=0, preStockShop=0, lowWarn=0, shelves=[], preStockDate='') {
  const div = document.createElement('div'); div.className = 'stock-item-row';

  // Top row: item name + low warn + remove
  const top = document.createElement('div'); top.className = 'stk-item-top';
  const nameWrap = document.createElement('div'); nameWrap.className='name-wrap'; nameWrap.style.position='relative';
  const nameInp = document.createElement('input'); nameInp.type='text'; nameInp.placeholder='Item name'; nameInp.className='stk-name'; nameInp.autocomplete='off'; nameInp.value=name;
  nameWrap.appendChild(nameInp);
  const warnInp = document.createElement('input'); warnInp.type='number'; warnInp.placeholder='Low warn'; warnInp.min='0'; warnInp.className='stk-warn'; warnInp.value=lowWarn||''; warnInp.title='Low stock warning threshold';
  const dateInp = document.createElement('input'); dateInp.type='date'; dateInp.className='stk-date'; dateInp.value=preStockDate||''; dateInp.title='Pre-stock date — only challans AFTER this date will be counted'; dateInp.style.cssText='padding:5px 6px;border:1px solid var(--border);border-radius:7px;background:var(--bg);font-family:"IBM Plex Mono",monospace;font-size:0.6rem;outline:none;min-width:110px;color:var(--ink);';
  const removeBtn = document.createElement('button'); removeBtn.className='remove-item'; removeBtn.textContent='✕'; removeBtn.onclick=()=>div.remove();
  top.appendChild(nameWrap); top.appendChild(warnInp); top.appendChild(dateInp); top.appendChild(removeBtn);

  // Shelf section label
  const shelfLabel = document.createElement('div');
  shelfLabel.style.cssText='font-size:0.5rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;margin-top:2px;';
  shelfLabel.textContent='📦 Shelf locations (shelf name → qty)';

  // Warehouse shelves
  const whLabel = document.createElement('div');
  whLabel.style.cssText='font-size:0.52rem;font-weight:700;color:var(--lookup);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;';
  whLabel.textContent='🏭 Warehouse Shelves';
  const whContainer = document.createElement('div'); whContainer.className='shelf-rows'; whContainer.dataset.loc='wh';
  const whShelves = shelves.filter(s=>s.loc==='wh'||!s.loc);
  if(whShelves.length) whShelves.forEach(s=>makeShelfRow(s.shelf||s.shelfNo||'', s.qty||0, whContainer));
  else makeShelfRow('', preStockWarehouse||0, whContainer);
  const addWhBtn = document.createElement('button'); addWhBtn.className='add-shelf-btn'; addWhBtn.textContent='+ Add Warehouse Shelf';
  addWhBtn.onclick=()=>makeShelfRow('','',whContainer);

  // Shop shelves
  const shLabel = document.createElement('div');
  shLabel.style.cssText='font-size:0.52rem;font-weight:700;color:var(--report);letter-spacing:1px;text-transform:uppercase;margin:8px 0 3px;';
  shLabel.textContent='🏪 Shop Shelves';
  const shContainer = document.createElement('div'); shContainer.className='shelf-rows'; shContainer.dataset.loc='sh';
  const shShelves = shelves.filter(s=>s.loc==='sh');
  if(shShelves.length) shShelves.forEach(s=>makeShelfRow(s.shelf||'', s.qty||0, shContainer));
  else makeShelfRow('', preStockWarehouse>0?0:(shelves.length?0:0), shContainer);
  const addShBtn = document.createElement('button'); addShBtn.className='add-shelf-btn'; addShBtn.textContent='+ Add Shop Shelf';
  addShBtn.onclick=()=>makeShelfRow('','',shContainer);

  div.appendChild(top);
  div.appendChild(shelfLabel);
  div.appendChild(whLabel); div.appendChild(whContainer); div.appendChild(addWhBtn);
  div.appendChild(shLabel); div.appendChild(shContainer); div.appendChild(addShBtn);
  document.getElementById('stock-input-list').appendChild(div);
  attachItemAutocomplete(nameInp);
}

function addStockRow(){ makeStockRow(); }

function editStockItem(name){
  const body=document.getElementById('stock-form-body'),arrow=document.getElementById('stock-form-arrow');
  if(body&&body.style.display==='none'){body.style.display='block';if(arrow)arrow.style.transform='rotate(180deg)';}
  const existing=Array.from(document.querySelectorAll('#stock-input-list .stk-name')).find(i=>i.value.trim().toLowerCase()===name.toLowerCase());
  if(existing){const row=existing.closest('.stock-item-row');row.scrollIntoView({behavior:'smooth',block:'center'});row.style.outline='2px solid var(--stock)';setTimeout(()=>row.style.outline='',2000);return;}
  const item=data.stock.find(s=>s.name.toLowerCase()===name.toLowerCase());
  if(!item){makeStockRow(name);return;}
  const shelves=JSON.parse(JSON.stringify(item.shelves||[]));
  if(!shelves.length){if(item.preStockWarehouse||item.preStock)shelves.push({loc:'wh',shelf:'',qty:item.preStockWarehouse||item.preStock||0});if(item.preStockShop)shelves.push({loc:'sh',shelf:'',qty:item.preStockShop||0});}
  makeStockRow(item.name,item.preStockWarehouse||0,item.preStockShop||0,item.lowWarn||0,shelves,item.preStockDate||'');
  setTimeout(()=>{const rows=document.querySelectorAll('#stock-input-list .stock-item-row');const last=rows[rows.length-1];last.scrollIntoView({behavior:'smooth',block:'center'});last.style.outline='2px solid var(--stock)';setTimeout(()=>last.style.outline='',2000);},100);
}

function renderStockInputRows(){
  document.getElementById('stock-input-list').innerHTML='';
  const active = data.stock.filter(s=>(s.preStockWarehouse||s.preStock||0)>0||(s.preStockShop||0)>0||(s.shelves||[]).some(sh=>sh.qty>0));
  if(active.length) active.forEach(s=>{
    const shelves = s.shelves||[];
    if(!shelves.length){
      if(s.preStockWarehouse||s.preStock) shelves.push({loc:'wh',shelf:'',qty:s.preStockWarehouse||s.preStock||0});
      if(s.preStockShop) shelves.push({loc:'sh',shelf:'',qty:s.preStockShop||0});
    }
    makeStockRow(s.name, s.preStockWarehouse||s.preStock||0, s.preStockShop||0, s.lowWarn||0, shelves, s.preStockDate||'');
  });
  else addStockRow();
}

function saveStockItems(){
  const rows = document.querySelectorAll('#stock-input-list .stock-item-row');
  const formItems = {};
  rows.forEach(row=>{
    const name = row.querySelector('.stk-name').value.trim();
    if(!name) return;
    const shelves = [];
    row.querySelectorAll('[data-loc="wh"] .shelf-row').forEach(sr=>{
      const shelf = sr.querySelector('.stk-shelf').value.trim();
      const qty = parseInt(sr.querySelector('.stk-shelf-qty').value)||0;
      if(shelf||qty) shelves.push({loc:'wh', shelf, qty});
    });
    row.querySelectorAll('[data-loc="sh"] .shelf-row').forEach(sr=>{
      const shelf = sr.querySelector('.stk-shelf').value.trim();
      const qty = parseInt(sr.querySelector('.stk-shelf-qty').value)||0;
      if(shelf||qty) shelves.push({loc:'sh', shelf, qty});
    });
    const preStockWarehouse = shelves.filter(s=>s.loc==='wh').reduce((t,s)=>t+s.qty,0);
    const preStockShop = shelves.filter(s=>s.loc==='sh').reduce((t,s)=>t+s.qty,0);
    const lowWarn = parseInt(row.querySelector('.stk-warn').value)||0;
    const preStockDate = row.querySelector('.stk-date')?.value||'';
    formItems[name.toLowerCase()] = {name, shelves, preStockWarehouse, preStockShop, lowWarn, preStockDate};
  });
  const formKeys = new Set(Object.keys(formItems));
  data.stock = [...data.stock.filter(s=>!formKeys.has(s.name.toLowerCase())), ...Object.values(formItems)];
  save(); toast('✔ Stock saved! Syncing to cloud...'); renderStockRegister();
}

function getLatestPreStockDate(name){
  const entries = data.stock.filter(s=>s.name.toLowerCase()===name.toLowerCase()&&s.preStockDate);
  if(!entries.length) return '';
  return entries.map(s=>s.preStockDate).sort().pop(); // latest date
}

function getWhInQty(n){
  const cutoff = getLatestPreStockDate(n);
  let tot=0;
  data.inputs.forEach(inp=>{
    if(!challanCountable(inp.date, cutoff)) return;
    inp.items.filter(i=>i.name.toLowerCase()===n.toLowerCase()).forEach(i=>{tot+=i.pcs;});
  });
  return tot;
}

function getShOutQty(n){
  const cutoff = getLatestPreStockDate(n);
  let tot=0;
  data.outputs.forEach(o=>{
    if(!challanCountable(o.date, cutoff)) return;
    o.items.filter(i=>i.name.toLowerCase()===n.toLowerCase()&&(i.type==='sample'||i.type==='packing')).forEach(i=>{tot+=i.pcs;});
  });
  return tot;
}

function getShInDeduction(n){
  const cutoff = getLatestPreStockDate(n);
  let tot=0;
  data.inputs.filter(inp=>inp.inType==='packing').forEach(inp=>{
    if(!challanCountable(inp.date, cutoff)) return;
    inp.items.filter(i=>i.name.toLowerCase()===n.toLowerCase()).forEach(i=>{tot+=i.pcs;});
  });
  return tot;
}

function getSalesQtyForItem(n){
  const cutoff = getLatestPreStockDate(n);
  let tot=0;
  data.salesReports.forEach(r=>{
    const rDate = r.date||r.monthYear||'';
    if(!challanCountable(rDate, cutoff)) return;
    (r.items||[]).filter(i=>i.name.toLowerCase()===n.toLowerCase()).forEach(i=>{tot+=i.qty;});
  });
  return tot;
}

function getInputQtyForItem(n){return getWhInQty(n);}

function getOutQtyForItem(n){return getShOutQty(n);}

function renderShelfBadges(item) {
  var wh = (item.whShelves||[]).filter(function(s){return s.shelf;}).map(function(s){return '<span class="shelf-badge">'+s.shelf+': '+s.qty+'</span>';}).join('');
  var sh = (item.shShelves||[]).filter(function(s){return s.shelf;}).map(function(s){return '<span class="shelf-badge" style="background:#fffbe6;color:var(--report)">'+s.shelf+': '+s.qty+'</span>';}).join('');
  if(wh||sh) return '<div>'+wh+(sh?'<br>'+sh:'')+'</div>';
  return '<span style="color:var(--muted)">—</span>';
}

function renderStockRegister(){
  const q=(document.getElementById('stock-search').value||'').toLowerCase();
  const container=document.getElementById('stock-register-container');
  const names=new Set();
  data.stock.forEach(s=>names.add(s.name));
  data.inputs.forEach(inp=>inp.items.forEach(i=>names.add(i.name)));
  data.outputs.forEach(o=>o.items.forEach(i=>{if(i.type==='sample'||i.type==='packing')names.add(i.name);}));
  const items=[...names].filter(n=>n.toLowerCase().includes(q)).map(name=>{
    const se=data.stock.find(s=>s.name.toLowerCase()===name.toLowerCase());
    const preWH=se?(se.preStockWarehouse||se.preStock||0):0;
    const preSH=se?(se.preStockShop||0):0;
    const lowWarn=se?(se.lowWarn||0):0;
    const cutoffDate=getLatestPreStockDate(name);
    const whIn=getWhInQty(name);       // input challans AFTER cutoff date
    const shOut=getShOutQty(name);     // sample/packing outputs AFTER cutoff
    const shDed=getShInDeduction(name);// packing input AFTER cutoff
    const salesQty=getSalesQtyForItem(name);
    const warehouseTotal = preWH + whIn - shOut;
    const shopTotal      = preSH + shOut - shDed - salesQty;
    const whShelves=(se&&se.shelves)?se.shelves.filter(s=>s.loc==='wh'):[];
    const shShelves=(se&&se.shelves)?se.shelves.filter(s=>s.loc==='sh'):[];
    return{name,preWH,preSH,whIn,shOut,shDed,salesQty,warehouseTotal,shopTotal,lowWarn,whShelves,shShelves,cutoffDate};
  });
  const lowCountWH=items.filter(i=>i.lowWarn>0&&i.warehouseTotal<=i.lowWarn).length;
  document.getElementById('stk-total-items').textContent=items.length;
  document.getElementById('stk-low-count').textContent=lowCountWH;
  document.getElementById('stk-total-pcs').textContent=items.reduce((s,i)=>s+Math.max(0,i.warehouseTotal)+Math.max(0,i.shopTotal),0);
  if(!items.length){container.innerHTML='<div class="empty"><div class="empty-icon">📦</div>No stock items yet.</div>';return;}
  container.innerHTML=`<div class="stock-register"><div class="stock-register-header"><span class="stock-register-title">LIVE STOCK REGISTER</span><span style="font-size:0.6rem;opacity:0.8;">${items.length} items</span></div><table class="stock-table"><thead><tr><th>ITEM</th><th colspan="2" style="text-align:center;background:#e8f5f5;color:var(--lookup)">🏭 WAREHOUSE</th><th colspan="2" style="text-align:center;background:#fef9ec;color:var(--report)">🏪 SHOP</th><th>SHELVES</th><th>WARN</th></tr><tr><th>—</th><th>Pre+In</th><th>Total</th><th>Pre+Out</th><th>Total</th><th>—</th><th>—</th></tr></thead><tbody>${items.map(item=>{const whDanger=item.warehouseTotal<=0,whLow=item.lowWarn>0&&item.warehouseTotal<=item.lowWarn&&!whDanger;const shDanger=item.shopTotal<=0;return`<tr><td style="font-weight:600;vertical-align:top;padding-top:8px">${item.name}${item.cutoffDate?`<br><span style="font-size:0.5rem;color:var(--muted);">📅 from ${item.cutoffDate}</span>`:''}</td><td style="color:var(--muted);font-size:0.65rem;vertical-align:top;padding-top:8px">${item.preWH}+${item.whIn}−${item.shOut}</td><td class="stock-total" style="vertical-align:top;padding-top:8px;${whDanger?'color:var(--out-color)':whLow?'color:var(--warn)':''}">${item.warehouseTotal}</td><td style="color:var(--muted);font-size:0.65rem;vertical-align:top;padding-top:8px">${item.preSH}+${item.shOut}−${item.shDed}−${item.salesQty}</td><td class="stock-total" style="vertical-align:top;padding-top:8px;${shDanger?'color:var(--out-color)':''}">${item.shopTotal}</td><td style="vertical-align:top;padding-top:6px;font-size:0.62rem;max-width:110px">${renderShelfBadges(item)}</td><td style="vertical-align:top;padding-top:8px">${whDanger?'<span class="low-badge">🚨 WH</span>':whLow?'<span class="low-badge">⚠ LOW</span>':item.lowWarn>0?'<span class="ok-badge">✔</span>':'<span style="font-size:0.52rem;color:#ccc">—</span>'}</td><td style="padding-top:6px"><button onclick="editStockItem(${JSON.stringify(item.name)})" style="background:var(--stock-light);color:var(--stock);border:1px solid var(--stock);border-radius:6px;padding:3px 8px;font-family:'IBM Plex Mono',monospace;font-size:0.52rem;font-weight:700;cursor:pointer;">✏</button></td></tr>`;}).join('')}</tbody></table></div>`;
}

function seedItemCatalog() {
  if(data.stock && data.stock.length>0) return;
  if(typeof ITEM_CATALOG_SEED==='undefined') return;
  data.stock = ITEM_CATALOG_SEED.map(function(n){ return {name:n,shelves:[],preStockWarehouse:0,preStockShop:0,lowWarn:0,preStockDate:''}; });
  save();
}

function getAllKnownItemNames() {
  const map = {};
  data.stock.forEach(s => { if(!s.name)return; const k=s.name.toLowerCase(); if(!map[k])map[k]={name:s.name,sources:new Set()}; map[k].sources.add('stock'); });
  data.outputs.forEach(o => o.items.forEach(i => { if(!i.name)return; const k=i.name.toLowerCase(); if(!map[k])map[k]={name:i.name,sources:new Set()}; map[k].sources.add('challan'); }));
  data.inputs.forEach(inp => inp.items.forEach(i => { if(!i.name)return; const k=i.name.toLowerCase(); if(!map[k])map[k]={name:i.name,sources:new Set()}; map[k].sources.add('challan'); }));
  return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
}

function getAllItemNames(){
  const s=new Set();
  data.stock.forEach(x=>x.name&&s.add(x.name));
  data.outputs.forEach(o=>o.items.forEach(i=>i.name&&s.add(i.name)));
  data.inputs.forEach(inp=>inp.items.forEach(i=>i.name&&s.add(i.name)));
  return [...s].sort((a,b)=>a.localeCompare(b));
}

function getItemQty(name){
  const se=data.stock.find(s=>s.name.toLowerCase()===name.toLowerCase());
  const pre=se?(se.preStock||0):0;
  let inQty=0; data.inputs.forEach(inp=>inp.items.filter(i=>i.name.toLowerCase()===name.toLowerCase()).forEach(i=>{inQty+=i.pcs;}));
  let sold=0; data.salesReports.forEach(r=>(r.items||[]).filter(i=>i.name.toLowerCase()===name.toLowerCase()).forEach(i=>{sold+=i.qty;}));
  return pre+inQty-sold;
}

function forceSeed(){
  if(typeof ITEM_CATALOG_SEED==='undefined'){toast('Seed data not found');return;}
  if(!data.stock) data.stock=[];
  var existing={};
  data.stock.forEach(function(s){existing[s.name.toLowerCase()]=true;});
  var added=0;
  ITEM_CATALOG_SEED.forEach(function(n){
    if(!existing[n.toLowerCase()]){
      data.stock.push({name:n,shelves:[],preStockWarehouse:0,preStockShop:0,lowWarn:0,preStockDate:''});
      added++;
    }
  });
  save();
  toast('✔ '+added+' items loaded into catalog!');
  var b=document.getElementById('load-catalog-btn');
  if(b) b.textContent='✔ LOADED';
  renderStockRegister();
}
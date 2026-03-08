// ── PROCESS TAB ──

function renderProcessTracker() {
  renderProcessSection('pending-process-list',(data.processChallans||[]).filter(function(c){ return c.type==='process'&&c.status==='pending'; }),'pending');
  renderProcessSection('deka-process-list',(data.processChallans||[]).filter(function(c){ return c.type==='process'&&c.status==='deka'; }),'deka');
  renderProcessSection('completed-process-list',(data.processChallans||[]).filter(function(c){ return c.type==='process'&&(c.status==='returned'||c.status==='deka_returned'); }),'done');
  renderProcessTags();
}

function renderProcessSection(elId,challans,stage) {
  var el=document.getElementById(elId); if(!el) return;
  if(!challans.length){ el.innerHTML='<div style="font-size:0.65rem;color:var(--muted);padding:10px 0;">None</div>'; return; }
  el.innerHTML=challans.map(function(c){
    var total=(c.items||[]).reduce(function(s,i){ return s+i.pcs; },0);
    var eid=JSON.stringify(c.id);
    var actions='';
    if(stage==='pending') actions='<button class="process-action-btn btn-return" onclick="markProcessReturn('+eid+',\'ready\')">✔ RETURNED</button><button class="process-action-btn btn-deka" onclick="markProcessReturn('+eid+',\'deka\')">🔄 DEKA</button>';
    else if(stage==='deka') actions='<button class="process-action-btn btn-return" onclick="markDekaReturn('+eid+')">✔ DEKA DONE</button>';
    return '<div class="process-card"><div class="process-card-header"><div><div class="process-ch-num">'+c.challanNo+'</div><div style="font-size:0.6rem;color:var(--muted);">'+c.date+' · '+(c.party||'—')+' · '+(c.processType||'')+'</div></div><button class="process-action-btn btn-print" onclick="showChallanPrint((data.processChallans||[]).find(function(x){return x.id==='+eid+';}))">🖨</button></div>'
      +'<div>'+(c.items||[]).map(function(i){ return '<div class="item-line"><span>'+i.name+'</span><span class="item-pcs">'+i.pcs+' pcs</span></div>'; }).join('')+'</div>'
      +'<div class="ch-footer"><span class="ch-total">Total: <strong>'+total+' pcs</strong></span></div>'
      +'<div class="process-actions">'+actions+'</div></div>';
  }).join('');
}

function markProcessReturn(id,returnType) {
  var ch=(data.processChallans||[]).find(function(c){ return c.id===id; }); if(!ch) return;
  if(returnType==='ready'){
    ch.status='returned';
    (ch.items||[]).forEach(function(item){
      var se=data.stock.find(function(s){ return s.name.toLowerCase()===item.name.toLowerCase(); });
      if(se){ se.preStockWarehouse=(se.preStockWarehouse||0)+item.pcs; }
      else{ data.stock.push({name:item.name,shelves:[],preStockWarehouse:item.pcs,preStockShop:0,lowWarn:0,preStockDate:''}); }
    }); toast('✔ Items returned to stock!');
  } else { ch.status='deka'; toast('🔄 Moved to Deka'); }
  save(); renderProcessTracker(); renderStockRegister();
}

function markDekaReturn(id) {
  var ch=(data.processChallans||[]).find(function(c){ return c.id===id; }); if(!ch) return;
  ch.status='deka_returned';
  (ch.items||[]).forEach(function(item){
    var se=data.stock.find(function(s){ return s.name.toLowerCase()===item.name.toLowerCase(); });
    if(se){ se.preStockWarehouse=(se.preStockWarehouse||0)+item.pcs; }
    else{ data.stock.push({name:item.name,shelves:[],preStockWarehouse:item.pcs,preStockShop:0,lowWarn:0,preStockDate:''}); }
  });
  save(); renderProcessTracker(); renderStockRegister(); toast('✔ Deka items added to stock!');
}

function renderProcessTags() {
  var el=document.getElementById('process-tags-list'); if(!el) return;
  el.innerHTML=(data.processList||[]).map(function(p){
    return '<span class="process-tag">'+p+'<button class="process-tag-del" onclick="deleteProcessType('+JSON.stringify(p)+')">×</button></span>';
  }).join('')||'<span style="font-size:0.62rem;color:var(--muted);">No types yet.</span>';
  updateProcessSelect();
}

function updateProcessSelect() {
  var sel=document.getElementById('challan-process-type'); if(!sel) return;
  var cur=sel.value;
  sel.innerHTML='<option value="">-- Select --</option>'+(data.processList||[]).map(function(p){
    return '<option value="'+p+'"'+(p===cur?' selected':'')+'>'+p+'</option>';
  }).join('');
}

function addProcessType() {
  var inp=document.getElementById('new-process-input'); var name=inp.value.trim();
  if(!name) return;
  if((data.processList||[]).indexOf(name)!==-1){ toast('Already exists!'); return; }
  if(!data.processList) data.processList=[];
  data.processList.push(name); inp.value=''; save(); renderProcessTags(); toast('✔ '+name+' added!');
}

function deleteProcessType(name) {
  if(!confirm('Delete "'+name+'"?')) return;
  data.processList=(data.processList||[]).filter(function(p){ return p!==name; });
  save(); renderProcessTags();
}

function toggleProcessManager() {
  var body=document.getElementById('process-mgr-body');
  var arrow=document.getElementById('process-mgr-arrow');
  var open=body.style.display!=='none';
  body.style.display=open?'none':'block';
  if(arrow) arrow.style.transform=open?'':'rotate(180deg)';
}
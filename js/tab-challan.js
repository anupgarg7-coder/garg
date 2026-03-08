// ── CHALLAN TAB ──

function attachDcAutocomplete(inputEl) {
  try {
    var wrap = inputEl.parentElement;
    var dd = document.createElement('div');
    dd.className = 'dc-autocomplete';
    wrap.appendChild(dd);
    var focusIdx = -1;

    function getNames() {
      var map = {};
      (data.stock||[]).forEach(function(s){ if(s.name) map[s.name.toLowerCase()] = s.name; });
      (data.outputs||[]).forEach(function(o){ (o.items||[]).forEach(function(i){ if(i.name) map[i.name.toLowerCase()] = i.name; }); });
      (data.inputs||[]).forEach(function(inp){ (inp.items||[]).forEach(function(i){ if(i.name) map[i.name.toLowerCase()] = i.name; }); });
      return Object.values(map).sort();
    }

    function showDD() {
      var q = inputEl.value.trim().toLowerCase();
      if(!q){ dd.style.display='none'; return; }
      var matches = getNames().filter(function(n){ return n.toLowerCase().includes(q); }).slice(0,50);
      if(!matches.length){ dd.style.display='none'; return; }
      focusIdx = -1;
      dd.innerHTML = matches.map(function(n,i){
        var safe = n.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        return '<div class="dc-autocomplete-item" data-i="'+i+'" data-val="'+safe+'">'+safe+'</div>';
      }).join('');
      dd.querySelectorAll('.dc-autocomplete-item').forEach(function(el){
        el.addEventListener('mousedown', function(e){ e.preventDefault(); });
        el.addEventListener('click', function(){ inputEl.value = el.getAttribute('data-val'); dd.style.display='none'; focusIdx=-1; });
      });
      dd.style.display = 'block';
    }

    inputEl.addEventListener('input', showDD);
    inputEl.addEventListener('focus', showDD);
    inputEl.addEventListener('blur', function(){ setTimeout(function(){ dd.style.display='none'; }, 160); });
    inputEl.addEventListener('keydown', function(e){
      var items = dd.querySelectorAll('.dc-autocomplete-item');
      if(dd.style.display==='none' || !items.length) return;
      if(e.key==='ArrowDown'){ e.preventDefault(); focusIdx=Math.min(focusIdx+1,items.length-1); items.forEach(function(el,i){ el.classList.toggle('ac-active',i===focusIdx); }); if(items[focusIdx]) items[focusIdx].scrollIntoView({block:'nearest'}); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); focusIdx=Math.max(focusIdx-1,0); items.forEach(function(el,i){ el.classList.toggle('ac-active',i===focusIdx); }); }
      else if(e.key==='Enter' && focusIdx>=0){ e.preventDefault(); inputEl.value=items[focusIdx].getAttribute('data-val'); dd.style.display='none'; focusIdx=-1; }
      else if(e.key==='Escape'){ dd.style.display='none'; }
    });
  } catch(e) { console.warn('[challan:attachDcAutocomplete] error:', e); }
}

function setChallanType(type) {
  try {
    currentChallanType = type;
    ['regular','process','input'].forEach(function(tt){
      var b = document.getElementById('ctype-'+tt); if(!b) return;
      b.className = 'out-type-btn';
      if(tt===type){ b.classList.add('active'); b.classList.add(tt==='process'?'process-type':tt==='input'?'input-type':'regular'); }
    });
    var pr = document.getElementById('process-type-row');
    if(pr) pr.style.display = type==='process' ? 'block' : 'none';
    updateDcChallanNo();
  } catch(e) { console.warn('[challan:setChallanType] error:', e); }
}

function updateDcChallanNo() {
  try {
    var el = document.getElementById('dc-challan-no');
    if(!el || editingDcId) return;
    el.value = currentChallanType==='input' ? ('IN-'+String(data.inCounter||1).padStart(3,'0')) : ('OUT-'+String(data.outCounter||1).padStart(3,'0'));
  } catch(e) { console.warn('[challan:updateDcChallanNo] error:', e); }
}

function addDcItem(name, qty) {
  try {
    var list = document.getElementById('dc-items-list');
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';

    var wrap = document.createElement('div');
    wrap.className = 'dc-item-name-wrap';

    var nI = document.createElement('input');
    nI.type='text'; nI.placeholder='Type to search item...'; nI.className='dc-item-name'; nI.autocomplete='off';
    nI.value = name||'';
    nI.style.cssText = 'width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-family:\'IBM Plex Mono\',monospace;font-size:0.68rem;outline:none;color:var(--ink);box-sizing:border-box;';
    wrap.appendChild(nI);

    var qI = document.createElement('input');
    qI.type='number'; qI.placeholder='Qty'; qI.min='0'; qI.className='dc-item-qty';
    qI.value = qty||'';
    qI.style.cssText = 'width:70px;padding:9px 8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-family:\'IBM Plex Mono\',monospace;font-size:0.68rem;outline:none;text-align:center;color:var(--ink);flex-shrink:0;';

    var dB = document.createElement('button');
    dB.textContent='✕';
    dB.style.cssText='background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;padding:7px 10px;cursor:pointer;font-size:0.75rem;color:#c0392b;flex-shrink:0;';
    dB.onclick = function(){ row.remove(); };

    row.appendChild(wrap); row.appendChild(qI); row.appendChild(dB);
    list.appendChild(row);
    attachDcAutocomplete(nI);
    if(!name) nI.focus();
  } catch(e) { console.warn('[challan:addDcItem] error:', e); }
}

function collectDcItems() {
  try {
    var items = [];
    document.querySelectorAll('#dc-items-list').forEach(function(list){
      list.querySelectorAll('div[style]').forEach(function(row){
        var nI = row.querySelector('.dc-item-name');
        var qI = row.querySelector('.dc-item-qty');
        if(!nI||!qI) return;
        var name = nI.value.trim();
        var qty = parseInt(qI.value)||0;
        if(name && qty>0) items.push({name:name, pcs:qty});
      });
    });
    return items;
  } catch(e) { console.warn('[challan:collectDcItems] error:', e); }
}

function saveDcChallan() {
  try {
    var party = document.getElementById('dc-party').value.trim();
    var challanNo = document.getElementById('dc-challan-no').value.trim();
    var date = document.getElementById('dc-date').value;
    var items = collectDcItems();
    var pSel = document.getElementById('challan-process-type');
    var pType = pSel ? pSel.value : '';
    if(!party){ toast('⚠ Enter party name!'); return; }
    if(!date){ toast('⚠ Select date!'); return; }
    if(!items.length){ toast('⚠ Add at least one item with quantity!'); return; }
    if(currentChallanType==='process' && !pType){ toast('⚠ Select process type!'); return; }
    var obj = {
      id: editingDcId||Date.now().toString(),
      challanNo:challanNo, date:date, party:party,
      type:currentChallanType, processType:currentChallanType==='process'?pType:'',
      items:items, status:currentChallanType==='process'?'pending':'done',
      createdAt:new Date().toISOString()
    };
    if(editingDcId){
      var idx = (data.processChallans||[]).findIndex(function(c){ return c.id===editingDcId; });
      if(idx!==-1) data.processChallans[idx]=obj;
      editingDcId=null; toast('✔ Challan updated!');
    } else {
      if(!data.processChallans) data.processChallans=[];
      data.processChallans.push(obj);
      if(currentChallanType==='regular'){
        data.outputs.push({id:obj.id,challan:challanNo,date:date,party:party,items:items,source:'digital'});
        data.outCounter=(data.outCounter||1)+1;
      } else if(currentChallanType==='input'){
        data.inputs.push({id:obj.id,challan:challanNo,date:date,party:party,items:items,inType:'input',source:'digital'});
        data.inCounter=(data.inCounter||1)+1;
      } else {
        data.outCounter=(data.outCounter||1)+1;
      }
      toast('✔ Challan saved!');
    }
    save(); renderDcList(); renderProcessTracker();
    if(typeof renderOutputList==='function') renderOutputList();
    if(typeof renderInputList==='function') renderInputList();
    showChallanPrint(obj); resetDcForm();
  } catch(e) { console.warn('[challan:saveDcChallan] error:', e); }
}

function resetDcForm() {
  try {
    document.getElementById('dc-party').value='';
    document.getElementById('dc-items-list').innerHTML='';
    document.getElementById('dc-date').value=new Date().toISOString().split('T')[0];
    var ps=document.getElementById('challan-process-type'); if(ps) ps.value='';
    document.getElementById('dc-save-btn').textContent='SAVE & PREVIEW';
    editingDcId=null; updateDcChallanNo(); addDcItem();
  } catch(e) { console.warn('[challan:resetDcForm] error:', e); }
}

function editDcChallan(id) {
  try {
    var ch=(data.processChallans||[]).find(function(c){ return c.id===id; }); if(!ch) return;
    editingDcId=id; switchTab('challan'); setChallanType(ch.type);
    document.getElementById('dc-party').value=ch.party||'';
    document.getElementById('dc-challan-no').value=ch.challanNo;
    document.getElementById('dc-date').value=ch.date;
    var ps=document.getElementById('challan-process-type'); if(ps&&ch.processType) ps.value=ch.processType;
    document.getElementById('dc-items-list').innerHTML='';
    (ch.items||[]).forEach(function(item){ addDcItem(item.name,item.pcs); });
    document.getElementById('dc-save-btn').textContent='UPDATE & PREVIEW';
    window.scrollTo(0,0);
  } catch(e) { console.warn('[challan:editDcChallan] error:', e); }
}

function deleteDcChallan(id) {
  try {
    if(!confirm('Delete this challan?')) return;
    data.outputs=data.outputs.filter(function(o){ return o.id!==id; });
    data.inputs=data.inputs.filter(function(i){ return i.id!==id; });
    data.processChallans=(data.processChallans||[]).filter(function(c){ return c.id!==id; });
    save(); renderDcList(); renderProcessTracker();
    if(typeof renderOutputList==='function') renderOutputList();
    if(typeof renderInputList==='function') renderInputList();
    toast('Deleted');
  } catch(e) { console.warn('[challan:deleteDcChallan] error:', e); }
}

function renderDcList() {
  try {
    var qEl=document.getElementById('dc-search'); var q=qEl?(qEl.value||'').toLowerCase():'';
    var list=document.getElementById('dc-list'); if(!list) return;
    var all=(data.processChallans||[]).filter(function(c){
      return !q||c.challanNo.toLowerCase().includes(q)||(c.party||'').toLowerCase().includes(q)||(c.items||[]).some(function(i){ return i.name.toLowerCase().includes(q); });
    }).slice().reverse();
    if(!all.length){ list.innerHTML='<div class="empty"><div class="empty-icon">🖨</div>No challans yet.</div>'; return; }
    list.innerHTML=all.map(function(c){
      var total=(c.items||[]).reduce(function(s,i){ return s+i.pcs; },0);
      var tb=c.type==='regular'?'<span class="process-badge badge-regular">REGULAR OUT</span>':c.type==='process'?'<span class="process-badge badge-pending">'+(c.processType||'PROCESS')+' OUT</span>':'<span class="process-badge badge-returned">INPUT</span>';
      var sb=c.type==='process'?(c.status==='pending'?'<span class="process-badge badge-pending">⏳ PENDING</span>':c.status==='deka'?'<span class="process-badge badge-deka">🔄 DEKA</span>':'<span class="process-badge badge-returned">✔ DONE</span>'):'';
      var eid=JSON.stringify(c.id);
      return '<div class="process-card"><div class="process-card-header"><div><div class="process-ch-num">'+c.challanNo+'</div><div style="font-size:0.6rem;color:var(--muted);">'+c.date+' · '+(c.party||'—')+'</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">'+tb+sb+'</div></div>'
        +'<div>'+(c.items||[]).map(function(i){ return '<div class="item-line"><span>'+i.name+'</span><span class="item-pcs">'+i.pcs+' pcs</span></div>'; }).join('')+'</div>'
        +'<div class="ch-footer"><span class="ch-total">Total: <strong>'+total+' pcs</strong></span></div>'
        +'<div class="process-actions"><button class="process-action-btn btn-print" onclick="showChallanPrint((data.processChallans||[]).find(function(x){return x.id==='+eid+';}))">🖨 PRINT</button>'
        +'<button class="process-action-btn" style="background:#fef9c3;color:#854d0e;" onclick="editDcChallan('+eid+')">✏ EDIT</button>'
        +'<button class="process-action-btn" style="background:#fee2e2;color:#991b1b;" onclick="deleteDcChallan('+eid+')">🗑 DELETE</button></div></div>';
    }).join('');
  } catch(e) { console.warn('[challan:renderDcList] error:', e); }
}

function initChallanTab() {
  try {
    updateDcChallanNo();
    var d=document.getElementById('dc-date'); if(d&&!d.value) d.value=new Date().toISOString().split('T')[0];
    if(!document.querySelector('#dc-items-list .dc-item-name')) addDcItem();
    updateProcessSelect();
  } catch(e) { console.warn('[challan:initChallanTab] error:', e); }
}

function buildChallanHtml(ch) {
  try {
    if(!ch) return '';
    var total=(ch.items||[]).reduce(function(s,i){ return s+i.pcs; },0);
    var typeLabel=ch.type==='regular'?'DELIVERY CHALLAN':ch.type==='process'?'PROCESS CHALLAN — '+(ch.processType||''):'INPUT CHALLAN';
    var rows=(ch.items||[]).map(function(item,i){
      return '<tr><td style="text-align:center;border:1px solid #e879a0;padding:6px 4px;">'+(i+1)+'</td><td style="border:1px solid #e879a0;padding:6px 8px;">'+item.name+'</td><td style="text-align:center;border:1px solid #e879a0;padding:6px 4px;">'+item.pcs+'</td></tr>';
    }).join('');
    var empty=''; for(var i=0;i<Math.max(0,8-(ch.items||[]).length);i++){ empty+='<tr><td style="border:1px solid #e879a0;padding:9px;"></td><td style="border:1px solid #e879a0;"></td><td style="border:1px solid #e879a0;"></td></tr>'; }
    return '<div style="background:#fff;font-family:Arial,sans-serif;padding:18px;max-width:420px;margin:0 auto;">'
      +'<div style="text-align:center;border-bottom:2px solid #e879a0;padding-bottom:10px;margin-bottom:12px;">'
      +'<div style="font-size:1.4rem;font-weight:900;letter-spacing:3px;color:#c0392b;">GARG INDUSTRIES</div>'
      +'<div style="font-size:0.62rem;color:#888;letter-spacing:1px;">Textile · Surat</div>'
      +'<div style="font-size:0.72rem;font-weight:700;letter-spacing:2px;color:#e879a0;margin-top:4px;">'+typeLabel+'</div></div>'
      +'<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:0.68rem;">'
      +'<tr><td><b>Ch. No.:</b> '+ch.challanNo+'</td><td style="text-align:right;"><b>Date:</b> '+ch.date+'</td></tr>'
      +'<tr><td colspan="2"><b>To M/s:</b> '+(ch.party||'—')+'</td></tr>'
      +(ch.type==='process'?'<tr><td colspan="2"><b>Process:</b> '+(ch.processType||'—')+'</td></tr>':'')+'</table>'
      +'<table style="width:100%;border-collapse:collapse;border:1px solid #e879a0;">'
      +'<thead><tr style="background:#fce4ec;"><th style="border:1px solid #e879a0;padding:6px 4px;font-size:0.62rem;width:10%;">Sr.</th><th style="border:1px solid #e879a0;padding:6px 8px;font-size:0.62rem;text-align:left;">Description</th><th style="border:1px solid #e879a0;padding:6px 4px;font-size:0.62rem;width:18%;">Qty</th></tr></thead>'
      +'<tbody>'+rows+empty
      +'<tr style="background:#fff8f8;"><td colspan="2" style="border:1px solid #e879a0;padding:6px 8px;font-size:0.68rem;font-weight:700;text-align:right;">TOTAL</td><td style="border:1px solid #e879a0;padding:6px 4px;font-size:0.68rem;font-weight:700;text-align:center;">'+total+'</td></tr>'
      +'</tbody></table>'
      +'<div style="margin-top:18px;display:flex;justify-content:space-between;font-size:0.6rem;color:#888;"><div>Received by: _______________</div><div>Prepared by: _______________</div></div>'
      +'<div style="margin-top:10px;font-size:0.5rem;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:6px;">Notify within 24 hrs of any discrepancy.</div></div>';
  } catch(e) { console.warn('[challan:buildChallanHtml] error:', e); }
}

function showChallanPrint(ch) {
  try {
    if(!ch) return; currentPrintChallan=ch;
    var el=document.getElementById('challan-print-content'); if(el) el.innerHTML=buildChallanHtml(ch);
    var m=document.getElementById('challan-print-modal');
    if(m){ m.style.display='flex'; m.style.alignItems='center'; m.style.justifyContent='center'; }
  } catch(e) { console.warn('[challan:showChallanPrint] error:', e); }
}

function closeChallanPrint(){ var m=document.getElementById('challan-print-modal'); if(m) m.style.display='none'; }

function printChallanPdf(){
  try {
    var content=document.getElementById('challan-print-content').innerHTML;
    var win=window.open('','_blank');
    win.document.write('<html><head><title>Challan</title><style>body{margin:0;}@media print{body{margin:0;}}</style></head><body>'+content+'<\/body><\/html>');
    win.document.close(); win.focus(); setTimeout(function(){ win.print(); },400);
  } catch(e) { console.warn('[challan:printChallanPdf] error:', e); }
}

function printChallanImg(){
  try {
    if(window.html2canvas){
      html2canvas(document.getElementById('challan-print-content'),{scale:2,backgroundColor:'#fff'}).then(function(canvas){
        var a=document.createElement('a'); a.download=(currentPrintChallan?currentPrintChallan.challanNo:'challan')+'.png';
        a.href=canvas.toDataURL('image/png'); a.click();
      });
    } else { printChallanPdf(); }
  } catch(e) { console.warn('[challan:printChallanImg] error:', e); }
}
// ── LOOKUP TAB ──

function renderCatalogEditor(){
  try {
    const el=document.getElementById('catalog-editor');
    const names=getAllItemNames();
    if(!names.length){el.innerHTML='<div style="font-size:0.7rem;color:var(--muted);text-align:center;padding:16px">No items yet. Add via Output Challan or Stock tab first.</div>';return;}
    el.innerHTML=names.map(name=>{
      const cat=itemCatalog[name]||{};
      const sid='cst-'+name.replace(/[^a-zA-Z0-9]/g,'_');
      const sn=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const thumb = cat.photoURL
        ?'<img class="cat-thumb" src="'+cat.photoURL+'" onclick="openLB(\''+cat.photoURL+'\')" title="View photo">'
        :'<div class="cat-nophoto" onclick="triggerPhotoUpload(\''+sn+'\')">📷</div>';
      const photoLbl = cat.photoURL
        ?'<div class="cat-photo-lbl" style="cursor:pointer" onclick="triggerPhotoUpload(\''+sn+'\')">Change</div>'
        :'<div class="cat-photo-lbl">Add photo</div>';
      return '<div class="cat-row" id="catrow-'+sid+'"><div class="cat-left"><div class="cat-name">'+name+'</div><div class="cat-stack-row"><span class="cat-stack-lbl">Stack:</span><input class="cat-stack-inp" type="text" placeholder="e.g. A-12" value="'+(cat.stackNo||'')+'" oninput="itemCatalog[\''+sn+'\']={...itemCatalog[\''+sn+'\']||{},stackNo:this.value}"></div></div><div class="cat-right"><input type="file" id="photo-inp-'+sid+'" accept="image/*" style="display:none" onchange="handlePhotoUpload(event,\''+sn+'\',\''+sid+'\')">'+thumb+photoLbl+'<div class="uploading-badge" id="photo-loading-'+sid+'" style="display:none"><div class="spinner" style="width:11px;height:11px;border-width:2px;border-color:#eee;border-top-color:var(--warn)"></div>Uploading</div></div></div>';
    }).join('');
  } catch(e) { console.warn('[lookup:renderCatalogEditor] error:', e); }
}

function renderLookupGrid(){
  try {
    const q=(document.getElementById('lookup-search').value||'').toLowerCase();
    const grid=document.getElementById('lookup-grid');
    const names=getAllItemNames().filter(name=>{
      const cat=itemCatalog[name]||{};
      return name.toLowerCase().includes(q)||(cat.stackNo||'').toLowerCase().includes(q);
    });
    if(!names.length){grid.innerHTML='<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div>No items found.</div>';return;}
    grid.innerHTML=names.map(name=>{
      const cat=itemCatalog[name]||{};
      const qty=getItemQty(name);
      const sel=lookupSelected.has(name);
      const sn=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const photo=cat.photoURL?'<img class="lk-photo" src="'+cat.photoURL+'" loading="lazy">':'<div class="lk-nophoto">📦</div>';
      const stack=cat.stackNo?'<div class="lk-stack">📍 Stack '+cat.stackNo+'</div>':'<div class="lk-stack" style="color:#ccc">No stack</div>';
      return '<div class="lk-card'+(sel?' sel':'')+'" onclick="toggleSel(\''+sn+'\')"><div class="lk-check">✓</div>'+photo+'<div class="lk-info"><div class="lk-name">'+name+'</div>'+stack+'<div class="lk-qty">'+qty+' pcs in stock</div></div></div>';
    }).join('');
    updateSelBar();
  } catch(e) { console.warn('[lookup:renderLookupGrid] error:', e); }
}

async function handlePhotoUpload(event, itemName, sid){
  try {
    const file=event.target.files[0]; if(!file)return;
    const loadEl=document.getElementById('photo-loading-'+sid);
    if(loadEl)loadEl.style.display='flex';
    try{
      const base64=await fileToBase64(file);
      const mime=file.type||'image/jpeg';
      const url=await uploadItemPhoto(itemName,base64,mime);
      if(!itemCatalog[itemName])itemCatalog[itemName]={};
      itemCatalog[itemName].photoURL=url;
      toast('✔ Photo uploaded for '+itemName);
      renderCatalogEditor(); // re-render to show thumb
    }catch(err){
      toast('❌ Upload error: '+err.message,3500);
    }
    if(loadEl)loadEl.style.display='none';
    event.target.value='';
  } catch(e) { console.warn('[lookup:handlePhotoUpload] error:', e); }
}

async function uploadItemPhoto(itemName, base64, mime){
  try {
    const path = 'items/'+itemName.replace(/[^a-zA-Z0-9]/g,'_')+'/photo.jpg';
    const ref = fbSRef(storage, path);
    await fbUploadString(ref, base64, 'base64', {contentType: mime});
    return await fbGetDownloadURL(ref);
  } catch(e) { console.warn('[lookup:uploadItemPhoto] error:', e); }
}

async function saveCatalogFB(){
  try{ await fbSetDoc(fbDoc(db,'meta','item_catalog'),{items:itemCatalog,updatedAt:new Date().toISOString()}); }
  catch(e){ console.warn('Catalog save error',e); }
}

function saveCatalog(){
  try {
    // Collect latest stack number values from inputs
    getAllItemNames().forEach(name=>{
      const sid='cst-'+name.replace(/[^a-zA-Z0-9]/g,'_');
      const inp=document.querySelector('#catrow-'+sid+' .cat-stack-inp');
      if(inp){if(!itemCatalog[name])itemCatalog[name]={};itemCatalog[name].stackNo=inp.value.trim();}
    });
    saveCatalogFB();
    toast('✔ Catalog saved! Stack numbers & photos updated.');
    renderLookupGrid();
  } catch(e) { console.warn('[lookup:saveCatalog] error:', e); }
}

function attachItemAutocomplete(inputEl) {
  try {
    const wrap = inputEl.closest('.name-wrap') || inputEl.parentElement;
    const dd = document.createElement('div');
    dd.className = 'name-dropdown';
    wrap.appendChild(dd);
    let currentFocus = -1;

    function refresh() {
      const q = inputEl.value.trim().toLowerCase();
      if (!q) { dd.style.display='none'; return; }
      const matches = getAllKnownItemNames().filter(e => e.name.toLowerCase().includes(q) && e.name.toLowerCase() !== q);
      if (!matches.length) { dd.style.display='none'; return; }
      currentFocus = -1;
      dd.innerHTML = matches.slice(0,10).map(e => {
        const isStock=e.sources.has('stock'), isChallan=e.sources.has('challan');
        const badge=isStock?'<span class="opt-badge stock">📦 Stock</span>':isChallan?'<span class="opt-badge challan">📤 Challan</span>':'';
        const safeN=e.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return `<div class="name-option" onclick="pickItemName(this,'${safeN}')"><span class="name-option-text">${e.name}</span>${badge}</div>`;
      }).join('');
      dd.style.display='block';
    }

    inputEl.addEventListener('input', refresh);
    inputEl.addEventListener('focus', refresh);
    inputEl.addEventListener('keydown', e => {
      const opts=dd.querySelectorAll('.name-option');
      if(!opts.length||dd.style.display==='none')return;
      if(e.key==='ArrowDown'){e.preventDefault();currentFocus=Math.min(currentFocus+1,opts.length-1);opts.forEach((o,i)=>o.classList.toggle('active',i===currentFocus));}
      else if(e.key==='ArrowUp'){e.preventDefault();currentFocus=Math.max(currentFocus-1,0);opts.forEach((o,i)=>o.classList.toggle('active',i===currentFocus));}
      else if(e.key==='Enter'&&currentFocus>=0){e.preventDefault();opts[currentFocus].click();}
      else if(e.key==='Escape'){dd.style.display='none';}
    });
    inputEl.addEventListener('blur', ()=>setTimeout(()=>{dd.style.display='none';currentFocus=-1;},180));
  } catch(e) { console.warn('[lookup:attachItemAutocomplete] error:', e); }
}

function onItemSearch(){
  try {
    const q=(document.getElementById('item-search-box').value||'').trim().toLowerCase();
    const dropdown=document.getElementById('item-suggestions');
    const index=buildItemIndex();
    let matches=q?index.filter(i=>i.name.toLowerCase().includes(q)):index;
    matches=matches.filter(m=>!(addedItems[m.name]&&addedItems[m.name].find(r=>r.challanNo===m.challanNo)));
    if(!matches.length){dropdown.innerHTML=`<div class="no-results">${q?'❌ No matching items':'📭 No output items available'}</div>`;dropdown.style.display='block';return;}
    const grouped={};
    matches.forEach(m=>{if(!grouped[m.name])grouped[m.name]=[];grouped[m.name].push(m);});
    dropdown.innerHTML=Object.entries(grouped).map(([name,rows])=>{
      const outTags=rows.map(r=>`<span class="sug-out-tag">📤 ${r.challanNo} (${r.pending} left)</span>`).join(' ');
      const safeN=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `<div class="suggestion-item" onclick="selectItem('${safeN}')"><div class="sug-name">${name}</div><div class="sug-meta">${outTags} <span class="sug-pending">· ${rows.reduce((s,r)=>s+r.pending,0)} pcs total</span></div></div>`;
    }).join('');
    dropdown.style.display='block';
  } catch(e) { console.warn('[lookup:onItemSearch] error:', e); }
}

function selectItem(itemName){
  try {
    const sources=buildItemIndex().filter(m=>m.name===itemName&&!(addedItems[itemName]&&addedItems[itemName].find(r=>r.challanNo===m.challanNo)));
    if(!addedItems[itemName])addedItems[itemName]=[];
    sources.forEach(src=>addedItems[itemName].push({challanNo:src.challanNo,challanDate:src.challanDate,outPcs:src.outPcs,pending:src.pending,inputPcs:0}));
    document.getElementById('item-search-box').value='';
    document.getElementById('item-suggestions').style.display='none';
    renderAddedItems();
  } catch(e) { console.warn('[lookup:selectItem] error:', e); }
}

function buildReviewPanel(type, parsed){
  try {
    const el = document.getElementById(type+'-review-panel');
    const hasU = parsed.hasUnreadable||parsed.items.some(i=>i.unreadable);
    let h = '<div class="review-panel">';
    h += '<div class="review-title">'+(hasU?'⚠ Review Scan — Some Parts Unclear':'✔ Scan Complete — Review Before Saving')+'</div>';
    if(hasU) h+='<div class="review-warn-note">AI could not read some parts clearly. Please correct the highlighted fields. Your corrections will improve future scans automatically.</div>';
    const cWarn = parsed.challanNo==='??UNREADABLE??';
    const dWarn = parsed.date==='??UNREADABLE??';
    h+='<div class="field"><label>Challan No.</label><input type="text" id="rv-'+type+'-challan" value="'+(cWarn?'':escQ(parsed.challanNo))+'" placeholder="Enter challan number..." style="'+(cWarn?'border-color:var(--warn);background:#fff8ec;':'')+'"></div>';
    if(cWarn)h+='<div style="font-size:0.56rem;color:var(--warn);margin:-5px 0 8px">⚠ Could not read challan number</div>';
    h+='<div class="field"><label>Date</label><input type="date" id="rv-'+type+'-date" value="'+(dWarn?new Date().toISOString().split('T')[0]:parsed.date)+'"></div>';
    h+='<div style="font-size:0.54rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Items ('+parsed.items.length+' found)</div>';
    h+='<div id="rv-'+type+'-items">';
    parsed.items.forEach((item,idx)=>{
      const iU=item.unreadable;
      h+='<div id="rv-'+type+'-blk-'+idx+'" class="'+(iU?'unreadable-block':'')+'">';
      if(iU){h+='<div class="unreadable-lbl">⚠ Item '+(idx+1)+' — Unclear</div>';if(item.aiGuess)h+='<div class="unreadable-guess">AI guess: "'+escQ(item.aiGuess)+'"</div>';}
      h+='<div class="rv-row">';
      h+='<input type="text" id="rv-'+type+'-n-'+idx+'" value="'+(iU?'':escQ(item.name))+'" placeholder="Item name..." style="'+(iU?'border-color:var(--warn);background:#fff8ec;':'')+'">';
      h+='<input type="number" id="rv-'+type+'-p-'+idx+'" value="'+(item.pcs||'')+'" placeholder="Pcs" min="0">';
      h+='<button class="remove-item" onclick="document.getElementById(\'rv-'+type+'-blk-'+idx+'\').remove()">✕</button>';
      h+='</div></div>';
    });
    h+='</div>';
    h+='<button style="background:transparent;border:1px dashed var(--border);border-radius:6px;color:var(--muted);font-family:inherit;font-size:0.6rem;padding:5px 9px;cursor:pointer;width:100%;margin-top:5px" onclick="addRVRow(\''+type+'\')">+ Add Missing Item</button>';
    h+='<div class="review-actions"><button class="review-confirm" onclick="confirmScan(\''+type+'\')">✔ CONFIRM & USE THIS DATA</button><button class="review-cancel" onclick="cancelScan(\''+type+'\')">✕ Cancel</button></div>';
    h+='</div>';
    el.innerHTML=h; el.style.display='block';
    setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
  } catch(e) { console.warn('[lookup:buildReviewPanel] error:', e); }
}

function addRVRow(type){
  try {
    const idx=rvIdx[type]++;
    const container=document.getElementById('rv-'+type+'-items');
    const div=document.createElement('div'); div.id='rv-'+type+'-blk-'+idx;
    div.innerHTML='<div class="rv-row"><input type="text" id="rv-'+type+'-n-'+idx+'" placeholder="Item name..."><input type="number" id="rv-'+type+'-p-'+idx+'" placeholder="Pcs" min="0"><button class="remove-item" onclick="this.closest(\'div[id]\').remove()">✕</button></div>';
    container.appendChild(div);
  } catch(e) { console.warn('[lookup:addRVRow] error:', e); }
}

function cancelScan(type){
  try {
    document.getElementById(type+'-review-panel').innerHTML='';
    document.getElementById(type+'-review-panel').style.display='none';
    const cls = type==='in'?' in-v':'';
    const sc = document.getElementById(type+'-scan-zone');
    sc.innerHTML='<div class="scan-icon">📷</div><div class="scan-hint"><strong>Tap to photograph challan</strong><br>AI reads handwriting &amp; fills all fields</div><input type="file" id="'+type+'-scan-file" accept="image/*" capture="environment" style="display:none" onchange="scanChallan(event,\''+type+'\')">';
    delete pendingScan[type];
  } catch(e) { console.warn('[lookup:cancelScan] error:', e); }
}

function showScannedHint(items){
  try {
    const old=document.getElementById('scanned-hint'); if(old)old.remove();
    const div=document.createElement('div'); div.id='scanned-hint'; div.className='scanned-hint';
    div.innerHTML='<div class="scanned-hint-ttl">📋 Scanned Items — Search & Add Below</div>'+items.map(i=>'<div class="scanned-hint-row"><span>'+i.name+'</span><span style="color:var(--muted);font-weight:600">'+i.pcs+' pcs</span></div>').join('');
    const sf=document.getElementById('item-search-box').closest('.field');
    sf.parentElement.insertBefore(div,sf);
  } catch(e) { console.warn('[lookup:showScannedHint] error:', e); }
}

function escQ(s){return(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function triggerPhotoUpload(itemName){
  try {
    const sid='cst-'+itemName.replace(/[^a-zA-Z0-9]/g,'_');
    const inp=document.getElementById('photo-inp-'+sid);
    if(inp)inp.click();
  } catch(e) { console.warn('[lookup:triggerPhotoUpload] error:', e); }
}

function openLB(url){document.getElementById('lb-img').src=url;document.getElementById('lightbox').classList.add('open');}

function closeLB(){document.getElementById('lightbox').classList.remove('open');}

function toggleSel(name){
  if(lookupSelected.has(name))lookupSelected.delete(name);else lookupSelected.add(name);
  renderLookupGrid();
}

function clearSel(){lookupSelected.clear();renderLookupGrid();}

function updateSelBar(){
  const bar=document.getElementById('sel-bar'),cnt=document.getElementById('sel-count');
  if(lookupSelected.size>0){bar.style.display='flex';cnt.textContent=lookupSelected.size+' selected';}else{bar.style.display='none';}
}

function printSel(){
  try {
    if(!lookupSelected.size){toast('Select at least one item first!');return;}
    const items=[...lookupSelected].map(name=>({name,cat:itemCatalog[name]||{},qty:getItemQty(name)}));
    const printArea=document.getElementById('print-area');
    printArea.innerHTML='<div class="pg">'+items.map(({name,cat,qty})=>{
      const photo=cat.photoURL?'<img src="'+cat.photoURL+'" loading="eager">':'<div class="noph">📦</div>';
      const stack=cat.stackNo?'<div class="ps">📍 Stack '+cat.stackNo+'</div>':'';
      return '<div class="pi">'+photo+'<div class="pd"><div class="pn">'+name+'</div>'+stack+'<div class="pq">Stock: '+qty+' pcs</div></div></div>';
    }).join('')+'</div>';
    printArea.style.display='block';
    window.print();
    setTimeout(()=>{printArea.style.display='none';},1000);
  } catch(e) { console.warn('[lookup:printSel] error:', e); }
}
// ── SHARED TAB ──

async function initFirebaseSync() {
  try {
    if (!window._db) { setSyncStatus('error'); return; }
    db      = window._db;
    storage = window._storage || null;
    fbDoc        = (_, ...path) => db.doc(path.join('/'));
    fbGetDoc     = (ref) => ref.get();
    fbSetDoc     = (ref, data) => ref.set(data, {merge:true});
    fbOnSnapshot = (ref, cb, eb) => ref.onSnapshot(cb, eb);
    fbSRef       = (st, path) => st.ref(path);
    fbUploadString   = (ref, data, fmt, meta) => ref.putString(data, fmt, meta);
    fbGetDownloadURL = (ref) => ref.getDownloadURL();
    isConfigured = true;
    try { const s = await db.doc('meta/item_catalog').get(); if(s.exists) itemCatalog = s.data().items||{}; } catch(e){}
    try { const s = await db.doc('meta/handwriting_corrections').get(); if(s.exists) hwCorrections = s.data().corrections||[]; } catch(e){}
    // Sync data for shared user
    try {
      const snap = await db.doc('users/shared/data/main').get();
      if (snap.exists) {
        const d = snap.data();
        data.outputs = d.outputs||data.outputs;
        data.inputs  = d.inputs||data.inputs;
        data.stock   = d.stock||data.stock;
        data.salesReports = d.salesReports||data.salesReports;
        data.processList = d.processList||data.processList;
        data.processChallans = d.processChallans||data.processChallans;
        data.outCounter = d.outCounter||data.outCounter;
        data.inCounter = d.inCounter||data.inCounter;
        if(typeof seedItemCatalog==='function') seedItemCatalog();
        renderOutputList(); renderInputList();
        if (document.querySelector('.tab.stock.active')) { renderStockInputRows(); renderStockRegister(); }
      }
    } catch(e) { console.warn('Sync error:', e); }
    setSyncStatus('synced');
    startRealtimeSync('shared');
  } catch(e) { console.warn('[shared:initFirebaseSync] error:', e); }
}

async function loadUserData(uid) {
  try {
    const ref = getUserDocRef(uid); if(!ref){ throw new Error('no-db'); } const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data();
      return { outputs:d.outputs||[], inputs:d.inputs||[], stock:d.stock||[], salesReports:d.salesReports||[], processList:d.processList||['Dyeing','Printing','Stitching','Embroidery','Washing'], processChallans:d.processChallans||[], stockTransfers:d.stockTransfers||[], outCounter:d.outCounter||1, inCounter:d.inCounter||1 };
    }
  } catch(e) { console.warn('Load error:', e); }
  // Fallback to localStorage
  const raw = localStorage.getItem('csm_data_v2_'+uid);
  return raw ? JSON.parse(raw) : { outputs:[], inputs:[], stock:[], salesReports:[] };
}

function startRealtimeSync(uid) {
  try {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    try {
      const _ref = getUserDocRef(uid); if(!_ref){ console.warn('No DB for realtime sync'); return; } unsubscribe = _ref.onSnapshot( (snap) => {
        if (!snap.exists) return;
        const d = snap.data();
        // Only update if we're not mid-save (avoid feedback loops)
        if (d.updatedAt && data._lastSaveAt === d.updatedAt) return;
        data.outputs = d.outputs || [];
        data.inputs  = d.inputs  || [];
        data.stock   = d.stock   || [];
        data.salesReports = d.salesReports || [];
        // Re-render current tab
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
          const tab = activeTab.className.replace('tab ','').replace(' active','').trim();
          if (tab==='out') renderOutputList();
          if (tab==='in') renderInputList();
          if (tab==='book') renderBook();
          if (tab==='stock') renderStockRegister();
          if (tab==='report') { renderReportList(); renderFinalStock(); }
        }
        setSyncStatus('synced');
      }, (err) => { console.warn('Sync error:', err); setSyncStatus('error'); });
    } catch(e) { console.warn('Could not start realtime sync:', e); }
  } catch(e) { console.warn('[shared:startRealtimeSync] error:', e); }
}

function save() {
  try {
    if (!currentUser) return; if (!window._db) { console.warn('DB not ready'); return; }
    // Debounce saves — wait 800ms after last change
    clearTimeout(saveTimer);
    setSyncStatus('syncing');
    saveTimer = setTimeout(async () => {
      try {
        await window._db.doc('users/'+currentUser+'/data/main').set({
          outputs: data.outputs,
          inputs: data.inputs,
          stock: data.stock,
          salesReports: data.salesReports,
          processList: data.processList,
          processChallans: data.processChallans,
          stockTransfers: data.stockTransfers || [],
          outCounter: data.outCounter,
          inCounter: data.inCounter,
          updatedAt: new Date().toISOString()
        }, {merge:true});
        setSyncStatus('synced');
        // Also save to localStorage as backup
        localStorage.setItem('csm_data_v2_'+currentUser, JSON.stringify(data));
      } catch(e) {
        console.error('Save error:', e);
        setSyncStatus('error');
        // Still save locally
        localStorage.setItem('csm_data_v2_'+currentUser, JSON.stringify(data));
      }
    }, 800);
  } catch(e) { console.warn('[shared:save] error:', e); }
}

function toast(msg, dur=2200) {
  try {
    const t=document.getElementById('toast');
    t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), dur);
  } catch(e) { console.warn('[shared:toast] error:', e); }
}

function setSyncStatus(status) {
  try {
    const dot = document.getElementById('sync-dot');
    const lbl = document.getElementById('sync-label');
    if (!dot) return;
    dot.className = 'sync-dot ' + status;
    lbl.textContent = status === 'syncing' ? 'SAVING...' : status === 'synced' ? 'SYNCED ☁' : status === 'error' ? 'SYNC ERROR' : '—';
  } catch(e) { console.warn('[shared:setSyncStatus] error:', e); }
}

function setTodayDates() {
  try {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('out-date').value = today;
    document.getElementById('in-date').value = today;
    var trd = document.getElementById('tr-date'); if(trd) trd.value = today;
  } catch(e) { console.warn('[shared:setTodayDates] error:', e); }
}

function switchTab(tab) {
  try {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('page-'+tab).classList.add('active');
    document.querySelector('.tab.'+tab).classList.add('active');
    if(tab==='out') { if(typeof initOutTab==='function') initOutTab(); renderOutputList(); }
    if(tab==='in') { if(typeof setInDest==='function') setInDest('warehouse'); if(typeof setInStatus==='function') setInStatus('ready'); renderInputList(); }
    if(tab==='book') renderBook();
    if(tab==='stock') { renderStockInputRows(); renderStockRegister(); }
    if(tab==='challan') { initChallanTab(); renderDcList(); }
    if(tab==='process') { renderProcessTracker(); }
    if(tab==='report') { renderReportList(); renderFinalStock(); populateReportFilterMonths(); }
    if(tab==='lookup') { renderCatalogEditor(); renderLookupGrid(); }
  } catch(e) { console.warn('[shared:switchTab] error:', e); }
}

async function autoLogin() {
  const SHARED_USER = 'shared';
  currentUser = SHARED_USER;
  function showAppShell() {
    try {
      document.getElementById('firebase-loading').style.display = 'none';
      var pwSc=document.getElementById('pw-screen'); if(pwSc) pwSc.style.display='none';
      var ls=document.getElementById('login-screen'); if(ls) ls.classList.remove('visible');
      document.getElementById('app-shell').style.display = 'block';
      var badge=document.getElementById('header-user-badge'); if(badge) badge.style.display='none';
    } catch(e) {}
  }
  try { await initFirebaseSync(); } catch(e) { console.warn('Firebase init failed:', e); }
  try { data = await loadUserData(SHARED_USER); } catch(e) { console.warn('Load data failed:', e); }
  showAppShell();
  try { if(typeof seedItemCatalog==='function') seedItemCatalog(); } catch(e) {}
  try { startRealtimeSync(SHARED_USER); } catch(e) { console.warn('Realtime sync failed:', e); }
  try { setTodayDates(); } catch(e) {}
  try { addOutItem(); } catch(e) {}
  try { if(typeof initOutTab==='function') initOutTab(); } catch(e) {}
  try { renderOutputList(); } catch(e) {}
  try { renderInputList(); } catch(e) {}
}
async function confirmScan(type){
  try {
    const challanNo = document.getElementById('rv-'+type+'-challan').value.trim();
    const date      = document.getElementById('rv-'+type+'-date').value;
    if(!challanNo){toast('⚠ Enter the challan number first!');return;}
    const items=[];
    document.querySelectorAll('#rv-'+type+'-items [id^="rv-'+type+'-blk-"]').forEach(blk=>{
      const idx=blk.id.split('-').pop();
      const nEl=document.getElementById('rv-'+type+'-n-'+idx);
      const pEl=document.getElementById('rv-'+type+'-p-'+idx);
      if(nEl&&nEl.value.trim())items.push({name:nEl.value.trim(),pcs:parseInt(pEl?.value)||0});
    });
    if(!items.length){toast('⚠ Add at least one item!');return;}
    // Save handwriting corrections
    const orig=pendingScan[type];
    if(orig){
      if(orig.challanNo==='??UNREADABLE??'&&challanNo) saveHWCorrection('??UNREADABLE??',challanNo,'challanNo');
      orig.items.forEach((oi,i)=>{if(oi.unreadable&&items[i]&&items[i].name) saveHWCorrection(oi.aiGuess||'??',items[i].name,'itemName');});
    }
    // Fill form
    document.getElementById(type+'-challan').value = challanNo;
    document.getElementById(type+'-date').value = date||new Date().toISOString().split('T')[0];
    if(type==='out'){
      document.getElementById('out-items-list').innerHTML='';
      items.forEach(item=>{
        makeOutItemRow(item.type||'grey');
        const rows=document.querySelectorAll('#out-items-list .item-row');
        const last=rows[rows.length-1];
        last.querySelector('.item-name-inp').value=item.name;
        last.querySelector('.item-pcs-inp').value=item.pcs;
      });
      toast('✔ '+items.length+' items filled in! Review then save.');
    }else{
      showScannedHint(items);
      if(items[0]){document.getElementById('item-search-box').value=items[0].name;onItemSearch();}
      toast('✔ Challan filled. Search and add items below.');
    }
    document.getElementById(type+'-review-panel').innerHTML='';
    document.getElementById(type+'-review-panel').style.display='none';
    delete pendingScan[type];
  } catch(e) { console.warn('[shared:confirmScan] error:', e); }
}

function buildHWContext(){
  try {
    if(!hwCorrections.length)return'';
    const recent = hwCorrections.slice(-40);
    return'\n\nPrevious handwriting corrections from this team (use to improve accuracy):\n'+recent.map(c=>'"'+c.original+'" → "'+c.corrected+'" ('+c.field+')').join('\n');
  } catch(e) { console.warn('[shared:buildHWContext] error:', e); }
}

async function saveHWCorrection(original, corrected, field){
  try {
    if(!original||!corrected||original===corrected)return;
    hwCorrections.push({original:original.trim(),corrected:corrected.trim(),field,ts:Date.now()});
    if(hwCorrections.length>500)hwCorrections=hwCorrections.slice(-500);
    try{ await fbSetDoc(fbDoc(db,'meta','handwriting_corrections'),{corrections:hwCorrections}); }catch(e){}
  } catch(e) { console.warn('[shared:saveHWCorrection] error:', e); }
}

async function handlePdfUpload(event){
  try {
    const file=event.target.files[0];if(!file)return;
    const month=document.getElementById('report-month').value,year=document.getElementById('report-year').value,monthYear=`${month} ${year}`;
    document.getElementById('ai-processing').style.display='flex';
    document.getElementById('ai-status').textContent='Reading PDF...';
    try{
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file);});
      document.getElementById('ai-status').textContent='AI extracting quantities...';
      if(!getGeminiKey()){ document.getElementById('ai-processing').style.display='none'; showGeminiKeyModal(); return; }
      const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+getGeminiKey(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:'application/pdf',data:base64}},{text:`Sales report PDF for ${monthYear}. Extract ALL items/products sold and quantities (pieces/units/pcs). Return ONLY a valid JSON array, no markdown, no code fences. Format: [{"name":"Item Name","qty":100},...]. Include every product line found.`}]}],generationConfig:{temperature:0.1,maxOutputTokens:2000}})});
      if(!response.ok){ const e=await response.json(); throw new Error('Gemini error: '+(e.error?.message||response.status)); }
      const result=await response.json();
      const rawText=result.candidates?.[0]?.content?.parts?.[0]?.text||'';
      let items=[];
      try{items=JSON.parse(rawText.replace(/```json|```/g,'').trim());}
      catch{const m=rawText.match(/\[[\s\S]*\]/);if(m)items=JSON.parse(m[0]);else throw new Error('Could not parse AI response');}
      if(!Array.isArray(items)||!items.length)throw new Error('No items found in PDF');
      const existingIdx=data.salesReports.findIndex(r=>r.monthYear===monthYear);
      const report={id:Date.now().toString(),monthYear,month,year,items,uploadedAt:new Date().toISOString()};
      existingIdx>=0?data.salesReports[existingIdx]=report:data.salesReports.push(report);
      save();
      document.getElementById('ai-processing').style.display='none';
      toast(`✔ Extracted ${items.length} items from ${monthYear}! Syncing...`,3000);
      event.target.value='';
      renderReportList();renderFinalStock();populateReportFilterMonths();
    }catch(err){document.getElementById('ai-processing').style.display='none';toast('❌ Error: '+err.message,3500);console.error(err);}
  } catch(e) { console.warn('[shared:handlePdfUpload] error:', e); }
}

async function getUsers() {
  try {
    if(!window._db) return []; const snap = await window._db.doc('meta/users').get();
    return snap.exists ? (snap.data().list || []) : [];
  } catch { return JSON.parse(localStorage.getItem('csm_users_fb')||'[]'); }
}

async function saveUsers(list) {
  try { if(window._db) await window._db.doc('meta/users').set({ list }); }
  catch { /* fallback */ }
  localStorage.setItem('csm_users_fb', JSON.stringify(list));
}

function getUserDocRef(uid) { return window._db ? window._db.doc('users/'+uid+'/data/main') : null; }

function quickLogin(uid) {
  document.getElementById('login-id-input').value = uid;
  doLogin();
}

async function doLogin() {
  try {
    const val = document.getElementById('login-id-input').value.trim();
    if (!val) { document.getElementById('login-id-input').focus(); return; }
    // Save to user list
    const users = await getUsers();
    if (!users.includes(val)) { users.push(val); await saveUsers(users); }

    setSyncStatus('syncing');
    currentUser = val;
    data = await loadUserData(val);

    document.getElementById('login-screen').classList.remove('visible');
    document.getElementById('app-shell').style.display = 'block';
    document.getElementById('header-user-badge').textContent = '👤 '+val;
    setSyncStatus('synced');
    startRealtimeSync(val);
    setTodayDates();
    addOutItem();
    renderOutputList(); renderInputList();
  } catch(e) { console.warn('[shared:doLogin] error:', e); }
}

function doLogout() {
  try {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    currentUser = null;
    data = { outputs:[], inputs:[], stock:[], salesReports:[] };
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('login-screen').classList.add('visible');
    document.getElementById('login-id-input').value = '';
    setSyncStatus('');
    renderLoginChips();
  } catch(e) { console.warn('[shared:doLogout] error:', e); }
}

async function addNewUser() {
  try {
    const val = document.getElementById('new-user-input').value.trim();
    if (!val) { document.getElementById('new-user-input').focus(); return; }
    const users = await getUsers();
    if (!users.includes(val)) { users.push(val); await saveUsers(users); await renderLoginChips(); }
    document.getElementById('new-user-input').value = '';
    document.getElementById('login-id-input').value = val;
    doLogin();
  } catch(e) { console.warn('[shared:addNewUser] error:', e); }
}

async function renderLoginChips() {
  try {
    const users = await getUsers();
    const c = document.getElementById('login-chips');
    if (!users.length) { c.innerHTML='<span style="font-size:0.62rem;color:#333;">No users yet. Add one below.</span>'; return; }
    c.innerHTML = users.map(u =>
      `<button class="login-user-chip" onclick="quickLogin('${u.replace(/'/g,"\\'")}')">👤 ${u}</button>`
    ).join('');
  } catch(e) { console.warn('[shared:renderLoginChips] error:', e); }
}

function checkPassword(){
  try {
    var val=document.getElementById('pw-input').value;
    if(val==='garg'){
      sessionStorage.setItem('ops_auth','1');
      document.getElementById('pw-screen').style.display='none';
      autoLogin();
    }else{
      document.getElementById('pw-err').textContent='✕ Incorrect password';
      document.getElementById('pw-input').value='';
      document.getElementById('pw-input').focus();
      setTimeout(function(){document.getElementById('pw-err').textContent='';},2000);
    }
  } catch(e) { console.warn('[shared:checkPassword] error:', e); }
}

async function scanChallan(event, type){
  try {
    const file = event.target.files[0]; if(!file)return;
    const statusEl = document.getElementById(type+'-scan-status');
    const msgEl    = document.getElementById(type+'-scan-msg');
    const reviewEl = document.getElementById(type+'-review-panel');

    // Check for API key
    if(!getGeminiKey()){ showGeminiKeyModal(); event.target.value=''; return; }

    statusEl.style.display='flex'; msgEl.textContent='Reading photo...';
    reviewEl.innerHTML=''; reviewEl.style.display='none';
    try{
      const base64 = await fileToBase64(file);
      const mime   = file.type||'image/jpeg';
      // Show preview
      const sz = document.getElementById(type+'-scan-zone');
      sz.innerHTML='<img class="scan-preview-img" src="data:'+mime+';base64,'+base64+'"><div class="scan-hint" style="font-size:0.6rem">AI scanning handwriting...</div>';
      msgEl.textContent='AI reading handwriting...';
      const hwCtx  = buildHWContext();
      const label  = type==='out'?'OUTPUT':'INPUT';
      const prompt = 'This is a handwritten '+label+' CHALLAN from a textile warehouse.\nExtract: challan number, date (as YYYY-MM-DD), all items with quantities (pcs).\nItem names may be fabric/saree designs like Pihu-19, Pihu-21 etc.\nFor any unclear text mark unreadable:true and put best guess in aiGuess.\n'+hwCtx+'\nReturn ONLY valid JSON (no markdown, no backticks):\n{"challanNo":"...","date":"YYYY-MM-DD","items":[{"name":"...","pcs":0,"unreadable":false,"aiGuess":""}],"hasUnreadable":false}';

      // Call Gemini 1.5 Flash — free tier: 1500 requests/day
      const apiKey = getGeminiKey();
      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+apiKey;
      const resp = await fetch(geminiUrl, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contents:[{parts:[
            {inline_data:{mime_type:mime, data:base64}},
            {text:prompt}
          ]}],
          generationConfig:{temperature:0.1, maxOutputTokens:1000}
        })
      });
      if(!resp.ok){
        const err = await resp.json();
        if(resp.status===400&&err.error?.message?.includes('API_KEY')) throw new Error('Invalid API key. Click 🔑 to update.');
        throw new Error('Gemini error: '+resp.status+' '+JSON.stringify(err.error?.message||''));
      }
      const result = await resp.json();
      const raw = result.candidates?.[0]?.content?.parts?.[0]?.text||'';
      if(!raw) throw new Error('Gemini returned empty response');
      let parsed;
      try{ parsed=JSON.parse(raw.replace(/```json|```/g,'').trim()); }
      catch{ const m=raw.match(/\{[\s\S]*\}/); if(m) parsed=JSON.parse(m[0]); else throw new Error('Could not parse AI response: '+raw.substring(0,100)); }
      pendingScan[type]={...parsed,base64,mime};
      statusEl.style.display='none';
      buildReviewPanel(type,parsed);
      event.target.value='';
    }catch(err){
      statusEl.style.display='none';
      toast('❌ '+err.message, 4000);
      console.error(err);
      event.target.value='';
    }
  } catch(e) { console.warn('[shared:scanChallan] error:', e); }
}
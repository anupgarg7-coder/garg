// ── OUT TAB ──

let currentOutSource = 'warehouse';
let _partyACInit = false;

// ─────────────────────────────────────────────────────────────
// Party name history  (localStorage)
// ─────────────────────────────────────────────────────────────
function _loadPartyHistory() {
  try { return JSON.parse(localStorage.getItem('out_party_history') || '[]'); }
  catch(e) { return []; }
}
function _savePartyToHistory(name) {
  if (!name) return;
  var list = _loadPartyHistory();
  list = list.filter(function(p) { return p.toLowerCase() !== name.toLowerCase(); });
  list.unshift(name);
  if (list.length > 40) list = list.slice(0, 40);
  localStorage.setItem('out_party_history', JSON.stringify(list));
}

// ─────────────────────────────────────────────────────────────
// Party autocomplete (wired once)
// ─────────────────────────────────────────────────────────────
function initPartyAutocomplete() {
  if (_partyACInit) return;
  try {
    var inp = document.getElementById('out-party');
    var dd  = document.getElementById('out-party-dd');
    if (!inp || !dd) return;
    _partyACInit = true;
    function showPartyDD() {
      var q = inp.value.trim().toLowerCase();
      var list = _loadPartyHistory();
      var matches = q ? list.filter(function(p) { return p.toLowerCase().includes(q); }) : list;
      if (!matches.length) { dd.style.display = 'none'; return; }
      dd.innerHTML = matches.map(function(p) {
        return '<div class="party-dd-item"'
          + ' onmousedown="event.preventDefault()"'
          + ' onclick="(function(){'
          +   'document.getElementById(\'out-party\').value=' + JSON.stringify(p) + ';'
          +   'document.getElementById(\'out-party-dd\').style.display=\'none\';'
          + '})()">' + p.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div>';
      }).join('');
      dd.style.display = 'block';
    }
    inp.addEventListener('focus', showPartyDD);
    inp.addEventListener('input', showPartyDD);
    inp.addEventListener('keydown', function(e) { if (e.key === 'Escape') dd.style.display = 'none'; });
    inp.addEventListener('blur', function() { setTimeout(function() { dd.style.display = 'none'; }, 200); });
  } catch(e) { console.warn('initPartyAutocomplete:', e); }
}

// ─────────────────────────────────────────────────────────────
// Warehouse / Shop toggle
// ─────────────────────────────────────────────────────────────
function setOutSource(src) {
  currentOutSource = src;
  var wBtn = document.getElementById('out-src-warehouse');
  var sBtn = document.getElementById('out-src-shop');
  if (!wBtn || !sBtn) return;
  if (src === 'warehouse') {
    wBtn.classList.add('out-src-active');
    sBtn.classList.remove('out-src-active');
  } else {
    sBtn.classList.add('out-src-active');
    wBtn.classList.remove('out-src-active');
  }
}

// ─────────────────────────────────────────────────────────────
// Item name autocomplete — sourced from stock inventory
// ─────────────────────────────────────────────────────────────
function _getStockItems() {
  var map = {};
  (data.stock || []).forEach(function(s) {
    if (!s.name) return;
    var k = s.name.toLowerCase();
    if (!map[k]) map[k] = { name: s.name, whQty: 0, shQty: 0, inStock: true };
    map[k].whQty = (s.preStockWarehouse || s.preStock || 0);
    map[k].shQty = (s.preStockShop || 0);
    map[k].inStock = true;
  });
  (data.outputs || []).forEach(function(o) {
    (o.items || []).forEach(function(i) {
      if (!i.name) return;
      var k = i.name.toLowerCase();
      if (!map[k]) map[k] = { name: i.name, whQty: 0, shQty: 0, inStock: false };
    });
  });
  return Object.values(map).sort(function(a, b) {
    if (a.inStock && !b.inStock) return -1;
    if (!a.inStock && b.inStock) return 1;
    return a.name.localeCompare(b.name);
  });
}

function _attachOutItemAutocomplete(nameInp) {
  var wrap = nameInp.closest('.name-wrap') || nameInp.parentElement;
  var old = wrap.querySelector('.out-item-dd');
  if (old) old.remove();
  var dd = document.createElement('div');
  dd.className = 'out-item-dd';
  wrap.appendChild(dd);
  var focusIdx = -1;

  function renderDD(q) {
    var items = _getStockItems();
    var matches = q ? items.filter(function(e) { return e.name.toLowerCase().includes(q); }) : items;
    if (!matches.length) { dd.style.display = 'none'; return; }
    focusIdx = -1;
    dd.innerHTML = matches.slice(0, 60).map(function(e, idx) {
      var qty = currentOutSource === 'shop' ? e.shQty : e.whQty;
      var qtyLabel = e.inStock
        ? '<span class="out-item-qty' + (qty <= 0 ? ' zero' : '') + '">' + qty + ' pcs</span>'
        : '<span class="out-item-new">＋ new</span>';
      var safe = e.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return '<div class="out-item-opt" data-idx="' + idx + '"'
        + ' onmousedown="event.preventDefault()"'
        + ' onclick="(function(el){'
        +   'var inp=el.closest(\'.name-wrap\').querySelector(\'.item-name-inp\');'
        +   'inp.value=\'' + safe + '\';'
        +   'inp.dispatchEvent(new Event(\'input\'));'
        +   'el.closest(\'.out-item-dd\').style.display=\'none\';'
        + '})(this)">'
        + '<span class="out-item-name">' + e.name + '</span>'
        + qtyLabel
        + '</div>';
    }).join('');
    dd.style.display = 'block';
  }

  nameInp.addEventListener('focus', function() { renderDD(nameInp.value.trim().toLowerCase()); });
  nameInp.addEventListener('input', function() { renderDD(nameInp.value.trim().toLowerCase()); });
  nameInp.addEventListener('blur', function() { setTimeout(function() { dd.style.display = 'none'; focusIdx = -1; }, 200); });
  nameInp.addEventListener('keydown', function(e) {
    var opts = dd.querySelectorAll('.out-item-opt');
    if (dd.style.display === 'none' || !opts.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx+1, opts.length-1); opts.forEach(function(o,i){o.classList.toggle('focused',i===focusIdx);}); if(opts[focusIdx])opts[focusIdx].scrollIntoView({block:'nearest'}); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx-1,0); opts.forEach(function(o,i){o.classList.toggle('focused',i===focusIdx);}); }
    else if (e.key === 'Enter' && focusIdx >= 0) { e.preventDefault(); opts[focusIdx].click(); }
    else if (e.key === 'Escape') { dd.style.display = 'none'; }
  });
}

// ─────────────────────────────────────────────────────────────
// Item row builder (output challan)
// ─────────────────────────────────────────────────────────────
function makeOutItemRow(typePrefill) {
  typePrefill = typePrefill || 'grey';
  var div      = document.createElement('div'); div.className = 'item-row';
  var nameWrap = document.createElement('div'); nameWrap.className = 'name-wrap'; nameWrap.style.position = 'relative';
  var nameInp  = document.createElement('input');
  nameInp.type = 'text'; nameInp.placeholder = 'Tap to search inventory...';
  nameInp.className = 'item-name-inp'; nameInp.autocomplete = 'off';
  nameWrap.appendChild(nameInp);
  var pcsInp = document.createElement('input');
  pcsInp.type = 'number'; pcsInp.placeholder = 'Pcs'; pcsInp.min = '0'; pcsInp.className = 'item-pcs-inp';
  var typeSel = document.createElement('select');
  typeSel.className = 'item-type-sel type-' + typePrefill;
  typeSel.innerHTML = '<option value="grey">⬜ Grey</option><option value="sample">🟢 Sample</option><option value="packing">🔵 Packing</option>';
  typeSel.value = typePrefill;
  typeSel.onchange = function() { typeSel.className = 'item-type-sel type-' + typeSel.value; };
  var rmBtn = document.createElement('button'); rmBtn.className = 'remove-item'; rmBtn.textContent = '✕';
  rmBtn.onclick = function() { div.remove(); };
  div.appendChild(nameWrap); div.appendChild(pcsInp); div.appendChild(typeSel); div.appendChild(rmBtn);
  document.getElementById('out-items-list').appendChild(div);
  _attachOutItemAutocomplete(nameInp);
}

function addOutItem() { makeOutItemRow(); }

function collectItems(containerId) {
  return Array.from(document.querySelectorAll('#' + containerId + ' .item-row')).map(function(row) {
    return {
      name: row.querySelector('.item-name-inp').value.trim(),
      pcs:  parseInt(row.querySelector('.item-pcs-inp').value) || 0,
      type: (row.querySelector('.item-type-sel') || {}).value || 'grey'
    };
  }).filter(function(i) { return i.name && i.pcs > 0; });
}

// ─────────────────────────────────────────────────────────────
// Auto-create items not yet in stock list
// ─────────────────────────────────────────────────────────────
function _ensureItemsInStock(items) {
  var created = [];
  items.forEach(function(item) {
    var exists = (data.stock || []).find(function(s) {
      return s.name.toLowerCase() === item.name.toLowerCase();
    });
    if (!exists) {
      if (!data.stock) data.stock = [];
      data.stock.push({ name: item.name, shelves: [], preStockWarehouse: 0, preStockShop: 0, lowWarn: 0, preStockDate: '' });
      created.push(item.name);
    }
  });
  return created;
}

// ─────────────────────────────────────────────────────────────
// Stock deduction — simple, no auto-transfer logic here
// ─────────────────────────────────────────────────────────────
function deductOutStock(items, source) {
  items.forEach(function(item) {
    var se = (data.stock || []).find(function(s) {
      return s.name.toLowerCase() === item.name.toLowerCase();
    });
    if (!se) return;
    if (source === 'warehouse') {
      se.preStockWarehouse = Math.max(0, (se.preStockWarehouse || 0) - item.pcs);
    } else {
      se.preStockShop = Math.max(0, (se.preStockShop || 0) - item.pcs);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Collect + validate + commit challan
// ─────────────────────────────────────────────────────────────
function _collectOutForm() {
  return {
    challan: document.getElementById('out-challan').value.trim(),
    date:    document.getElementById('out-date').value,
    party:   ((document.getElementById('out-party') || {}).value || '').trim(),
    items:   collectItems('out-items-list')
  };
}

function _validateOut(f) {
  if (!f.challan || !f.date) { toast('⚠ Fill challan no. and date!'); return false; }
  if (!f.items.length)       { toast('⚠ Add at least one item with quantity!'); return false; }
  if ((data.outputs || []).find(function(o) { return o.challan === f.challan; })) {
    toast('⚠ Challan no. already exists!'); return false;
  }
  return true;
}

function _commitOut(f) {
  var newItems = _ensureItemsInStock(f.items);
  if (newItems.length) toast('✔ ' + newItems.length + ' new item(s) added to inventory.', 2500);
  deductOutStock(f.items, currentOutSource);
  _savePartyToHistory(f.party);
  var obj = {
    id: Date.now().toString(),
    challan: f.challan, date: f.date,
    party: f.party, items: f.items,
    source: currentOutSource
  };
  data.outputs.push(obj);
  save();
  return obj;
}

function _resetOutForm() {
  document.getElementById('out-challan').value = '';
  var pe = document.getElementById('out-party'); if (pe) pe.value = '';
  document.getElementById('out-items-list').innerHTML = '';
  addOutItem();
  setOutSource('warehouse');
  if (typeof setTodayDates === 'function') setTodayDates();
  renderOutputList();
  if (typeof renderStockRegister === 'function') renderStockRegister();
}

function saveOutput() {
  try {
    var f = _collectOutForm();
    if (!_validateOut(f)) return;
    _commitOut(f);
    toast('✔ Output Challan saved! Stock updated.');
    _resetOutForm();
  } catch(e) { console.error('saveOutput:', e); toast('⚠ Error saving. Check console.'); }
}

function printOutChallan() {
  try {
    var f = _collectOutForm();
    if (!_validateOut(f)) return;
    var obj = _commitOut(f);
    toast('✔ Saved! Opening PDF...');
    _resetOutForm();
    generateOutPdf(obj);
  } catch(e) { console.error('printOutChallan:', e); toast('⚠ Error. Check console.'); }
}

function downloadOutPdf(id) {
  var o = (data.outputs || []).find(function(x) { return x.id === id; });
  if (o) generateOutPdf(o);
}

// ─────────────────────────────────────────────────────────────
// PDF generator
// ─────────────────────────────────────────────────────────────
function generateOutPdf(o) {
  try {
    var isShop  = o.source === 'shop';
    var company = isShop ? 'AMOHA SILK' : 'GARG INDUSTRIES';
    var accent  = isShop ? '#9c27b0' : '#c0392b';
    var hdrBg   = isShop ? '#f3e5f5' : '#fce4ec';
    var from    = isShop ? 'Shop \u2014 Amoha Silk' : 'Warehouse \u2014 Garg Industries';
    var total   = (o.items || []).reduce(function(s, i) { return s + i.pcs; }, 0);
    var rows = (o.items || []).map(function(item, idx) {
      return '<tr>'
        + '<td style="text-align:center;border:1px solid ' + accent + ';padding:6px 4px;">' + (idx+1) + '</td>'
        + '<td style="border:1px solid ' + accent + ';padding:6px 8px;">' + item.name + '</td>'
        + '<td style="text-align:center;border:1px solid ' + accent + ';padding:6px 4px;">' + item.pcs + '</td>'
        + '</tr>';
    }).join('');
    var blanks = '';
    for (var i = 0; i < Math.max(0, 8-(o.items||[]).length); i++) {
      blanks += '<tr><td style="border:1px solid ' + accent + ';padding:9px;"></td><td style="border:1px solid ' + accent + ';padding:9px;"></td><td style="border:1px solid ' + accent + ';padding:9px;"></td></tr>';
    }
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + o.challan + '</title>'
      + '<style>body{margin:0;font-family:Arial,sans-serif;background:#fff;}@media print{.no-print{display:none!important;}}.pg{padding:24px;max-width:440px;margin:0 auto;}.co{font-size:1.5rem;font-weight:900;letter-spacing:3px;color:' + accent + ';text-align:center;}.sub{font-size:0.6rem;color:#888;letter-spacing:1px;text-align:center;margin-top:2px;}.ct{font-size:0.72rem;font-weight:700;letter-spacing:2px;color:' + accent + ';text-align:center;margin-top:5px;}.hr{border-bottom:2px solid ' + accent + ';margin:10px 0 14px;}table{width:100%;border-collapse:collapse;font-size:0.68rem;}.mt td{padding:4px 2px;font-size:0.68rem;vertical-align:top;}.sig{margin-top:22px;display:flex;justify-content:space-between;font-size:0.6rem;color:#888;}.note{margin-top:10px;font-size:0.5rem;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:6px;}.btns{display:flex;gap:10px;justify-content:center;margin:22px 0 10px;}.btn{padding:10px 24px;border:none;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;}</style>'
      + '</head><body><div class="pg">'
      + '<div class="co">' + company + '</div><div class="sub">Textile &middot; Surat</div>'
      + '<div class="ct">DELIVERY CHALLAN</div><div class="hr"></div>'
      + '<table class="mt"><tbody>'
      + '<tr><td><b>Challan No.:</b> ' + o.challan + '</td><td style="text-align:right"><b>Date:</b> ' + o.date + '</td></tr>'
      + '<tr><td colspan="2"><b>To M/s:</b> ' + (o.party || '&mdash;') + '</td></tr>'
      + '<tr><td colspan="2"><b>Dispatch From:</b> ' + from + '</td></tr>'
      + '</tbody></table>'
      + '<table style="margin-top:12px"><thead><tr style="background:' + hdrBg + '">'
      + '<th style="border:1px solid ' + accent + ';padding:6px 4px;font-size:0.62rem;width:10%">Sr.</th>'
      + '<th style="border:1px solid ' + accent + ';padding:6px 8px;font-size:0.62rem;text-align:left">Description</th>'
      + '<th style="border:1px solid ' + accent + ';padding:6px 4px;font-size:0.62rem;width:18%">Qty (Pcs)</th>'
      + '</tr></thead><tbody>' + rows + blanks
      + '<tr style="background:' + hdrBg + '"><td colspan="2" style="border:1px solid ' + accent + ';padding:6px 8px;font-weight:700;text-align:right">TOTAL</td>'
      + '<td style="border:1px solid ' + accent + ';padding:6px 4px;font-weight:700;text-align:center">' + total + '</td></tr>'
      + '</tbody></table>'
      + '<div class="sig"><div>Received by: _______________</div><div>Prepared by: _______________</div></div>'
      + '<div class="note">Notify within 24 hrs of any discrepancy.</div>'
      + '<div class="btns no-print"><button class="btn" style="background:' + accent + ';color:#fff" onclick="window.print()">&#128424; PRINT / PDF</button>'
      + '<button class="btn" style="background:#eee;color:#333" onclick="window.close()">&#10005; Close</button></div>'
      + '</div></body></html>';
    var win = window.open('', '_blank');
    if (!win) { toast('\u26a0 Allow pop-ups to open the PDF'); return; }
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(function() { win.print(); }, 600);
  } catch(e) { console.error('generateOutPdf:', e); toast('\u26a0 Could not open PDF'); }
}

// ─────────────────────────────────────────────────────────────
// ══ STOCK TRANSFER (separate section) ══
// Garg → Amoha : reduces preStockWarehouse, adds preStockShop
// Amoha → Garg : reduces preStockShop, adds preStockWarehouse
// ─────────────────────────────────────────────────────────────
let _transferItems = [];   // [{ name, pcs }]

function setTransferDir(dir) {
  // dir: 'garg_to_amoha' | 'amoha_to_garg'
  var g2a = document.getElementById('tr-btn-g2a');
  var a2g = document.getElementById('tr-btn-a2g');
  if (!g2a || !a2g) return;
  if (dir === 'garg_to_amoha') {
    g2a.classList.add('tr-btn-active');
    a2g.classList.remove('tr-btn-active');
    document.getElementById('tr-from-label').textContent = 'From: Garg Industries (Warehouse)';
    document.getElementById('tr-to-label').textContent   = 'To: Amoha Silk (Shop)';
  } else {
    a2g.classList.add('tr-btn-active');
    g2a.classList.remove('tr-btn-active');
    document.getElementById('tr-from-label').textContent = 'From: Amoha Silk (Shop)';
    document.getElementById('tr-to-label').textContent   = 'To: Garg Industries (Warehouse)';
  }
  document.getElementById('tr-dir').value = dir;
  // Re-render item rows so qty badges reflect correct source
  document.querySelectorAll('#tr-items-list .tr-item-row').forEach(function(row) {
    var nameEl = row.querySelector('.tr-item-name');
    var qtyEl  = row.querySelector('.tr-item-avail');
    if (!nameEl || !qtyEl) return;
    var name = nameEl.value.trim();
    if (!name) return;
    var se = (data.stock || []).find(function(s) { return s.name.toLowerCase() === name.toLowerCase(); });
    if (!se) return;
    var avail = dir === 'garg_to_amoha' ? (se.preStockWarehouse || 0) : (se.preStockShop || 0);
    qtyEl.textContent = avail + ' avail';
    qtyEl.className = 'tr-item-avail' + (avail <= 0 ? ' zero' : '');
  });
}

function _attachTransferItemAC(nameInp, availEl) {
  var wrap = nameInp.closest('.tr-name-wrap') || nameInp.parentElement;
  var old = wrap.querySelector('.tr-item-dd'); if (old) old.remove();
  var dd = document.createElement('div'); dd.className = 'tr-item-dd out-item-dd';
  wrap.appendChild(dd);
  var focusIdx = -1;

  function renderDD(q) {
    var dir = (document.getElementById('tr-dir') || {}).value || 'garg_to_amoha';
    var items = _getStockItems();
    var matches = q ? items.filter(function(e) { return e.name.toLowerCase().includes(q); }) : items;
    if (!matches.length) { dd.style.display = 'none'; return; }
    focusIdx = -1;
    dd.innerHTML = matches.slice(0, 60).map(function(e) {
      var qty = dir === 'garg_to_amoha' ? e.whQty : e.shQty;
      var safe = e.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      var qtyLabel = '<span class="out-item-qty' + (qty<=0?' zero':'') + '">' + qty + ' pcs</span>';
      return '<div class="out-item-opt"'
        + ' onmousedown="event.preventDefault()"'
        + ' onclick="(function(el){'
        +   'var wrap=el.closest(\'.tr-name-wrap\');'
        +   'wrap.querySelector(\'.tr-item-name\').value=\'' + safe + '\';'
        +   'var dir=(document.getElementById(\'tr-dir\')||{}).value||\'garg_to_amoha\';'
        +   'var se=(data.stock||[]).find(function(s){return s.name.toLowerCase()===\'' + safe.toLowerCase() + '\';});'
        +   'var avail=se?(dir===\'garg_to_amoha\'?(se.preStockWarehouse||0):(se.preStockShop||0)):0;'
        +   'var av=wrap.querySelector(\'.tr-item-avail\');'
        +   'if(av){av.textContent=avail+\' avail\';av.className=\'tr-item-avail\'+(avail<=0?\' zero\':\'\');}'
        +   'el.closest(\'.tr-item-dd\').style.display=\'none\';'
        + '})(this)">'
        + '<span class="out-item-name">' + e.name + '</span>' + qtyLabel + '</div>';
    }).join('');
    dd.style.display = 'block';
  }

  nameInp.addEventListener('focus', function() { renderDD(nameInp.value.trim().toLowerCase()); });
  nameInp.addEventListener('input', function() { renderDD(nameInp.value.trim().toLowerCase()); });
  nameInp.addEventListener('blur',  function() { setTimeout(function() { dd.style.display='none'; focusIdx=-1; }, 200); });
  nameInp.addEventListener('keydown', function(e) {
    var opts = dd.querySelectorAll('.out-item-opt');
    if (dd.style.display==='none'||!opts.length) return;
    if (e.key==='ArrowDown'){e.preventDefault();focusIdx=Math.min(focusIdx+1,opts.length-1);opts.forEach(function(o,i){o.classList.toggle('focused',i===focusIdx);});if(opts[focusIdx])opts[focusIdx].scrollIntoView({block:'nearest'});}
    else if(e.key==='ArrowUp'){e.preventDefault();focusIdx=Math.max(focusIdx-1,0);opts.forEach(function(o,i){o.classList.toggle('focused',i===focusIdx);}); }
    else if(e.key==='Enter'&&focusIdx>=0){e.preventDefault();opts[focusIdx].click();}
    else if(e.key==='Escape'){dd.style.display='none';}
  });
}

function addTransferItem() {
  var list = document.getElementById('tr-items-list');
  var row  = document.createElement('div'); row.className = 'tr-item-row item-row';

  var wrap = document.createElement('div'); wrap.className = 'tr-name-wrap name-wrap'; wrap.style.position = 'relative';
  var nameInp = document.createElement('input');
  nameInp.type = 'text'; nameInp.placeholder = 'Tap to search...';
  nameInp.className = 'tr-item-name item-name-inp'; nameInp.autocomplete = 'off';
  wrap.appendChild(nameInp);

  var pcsInp = document.createElement('input');
  pcsInp.type = 'number'; pcsInp.placeholder = 'Pcs'; pcsInp.min = '1'; pcsInp.className = 'item-pcs-inp';

  var availEl = document.createElement('span');
  availEl.className = 'tr-item-avail'; availEl.textContent = '—';

  var rmBtn = document.createElement('button'); rmBtn.className = 'remove-item'; rmBtn.textContent = '✕';
  rmBtn.onclick = function() { row.remove(); };

  row.appendChild(wrap); row.appendChild(pcsInp); row.appendChild(availEl); row.appendChild(rmBtn);
  list.appendChild(row);
  _attachTransferItemAC(nameInp, availEl);
}

function saveStockTransfer() {
  try {
    var dir    = (document.getElementById('tr-dir') || {}).value || 'garg_to_amoha';
    var date   = document.getElementById('tr-date').value;
    var note   = (document.getElementById('tr-note') || {}).value || '';
    if (!date) { toast('⚠ Select transfer date!'); return; }

    var items = [];
    document.querySelectorAll('#tr-items-list .tr-item-row').forEach(function(row) {
      var name = row.querySelector('.tr-item-name').value.trim();
      var pcs  = parseInt(row.querySelector('.item-pcs-inp').value) || 0;
      if (name && pcs > 0) items.push({ name: name, pcs: pcs });
    });
    if (!items.length) { toast('⚠ Add at least one item with quantity!'); return; }

    // Validate available stock
    var errors = [];
    items.forEach(function(item) {
      var se = (data.stock || []).find(function(s) { return s.name.toLowerCase() === item.name.toLowerCase(); });
      var avail = se ? (dir === 'garg_to_amoha' ? (se.preStockWarehouse || 0) : (se.preStockShop || 0)) : 0;
      if (item.pcs > avail) errors.push(item.name + ' (need ' + item.pcs + ', have ' + avail + ')');
    });
    if (errors.length) { toast('⚠ Insufficient stock: ' + errors.join(', '), 4000); return; }

    // Apply transfer
    items.forEach(function(item) {
      var se = (data.stock || []).find(function(s) { return s.name.toLowerCase() === item.name.toLowerCase(); });
      if (!se) return;
      if (dir === 'garg_to_amoha') {
        se.preStockWarehouse = Math.max(0, (se.preStockWarehouse || 0) - item.pcs);
        se.preStockShop      = (se.preStockShop || 0) + item.pcs;
      } else {
        se.preStockShop      = Math.max(0, (se.preStockShop || 0) - item.pcs);
        se.preStockWarehouse = (se.preStockWarehouse || 0) + item.pcs;
      }
    });

    // Record transfer in data for history
    if (!data.stockTransfers) data.stockTransfers = [];
    data.stockTransfers.push({
      id: Date.now().toString(),
      dir: dir, date: date, note: note, items: items,
      createdAt: new Date().toISOString()
    });

    save();

    var label = dir === 'garg_to_amoha' ? 'Garg → Amoha' : 'Amoha → Garg';
    toast('✔ Transfer done! ' + label + ' · ' + items.length + ' item(s) moved.', 3000);

    // Reset transfer form
    document.getElementById('tr-items-list').innerHTML = '';
    document.getElementById('tr-note').value = '';
    setTodayDates();
    addTransferItem();
    renderTransferHistory();
    if (typeof renderStockRegister === 'function') renderStockRegister();
  } catch(e) { console.error('saveStockTransfer:', e); toast('⚠ Error. Check console.'); }
}

function renderTransferHistory() {
  var el = document.getElementById('tr-history');
  if (!el) return;
  var list = (data.stockTransfers || []).slice().reverse().slice(0, 20);
  if (!list.length) { el.innerHTML = '<div style="font-size:0.65rem;color:var(--muted);padding:8px 0;">No transfers yet.</div>'; return; }
  el.innerHTML = list.map(function(tr) {
    var label = tr.dir === 'garg_to_amoha' ? '🏭 Garg &rarr; Amoha 🏪' : '🏪 Amoha &rarr; Garg 🏭';
    var total = (tr.items||[]).reduce(function(s,i){return s+i.pcs;},0);
    return '<div class="tr-history-card">'
      + '<div class="tr-history-header"><span class="tr-history-dir">' + label + '</span><span class="tr-history-date">' + tr.date + '</span></div>'
      + (tr.items||[]).map(function(i){return '<div class="item-line"><span>'+i.name+'</span><span class="item-pcs">'+i.pcs+' pcs</span></div>';}).join('')
      + '<div class="ch-footer"><span class="ch-total">Total: <strong>' + total + ' pcs</strong></span>'
      + (tr.note ? '<span style="font-size:0.6rem;color:var(--muted);">📝 ' + tr.note + '</span>' : '')
      + '</div></div>';
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// Delete + list render
// ─────────────────────────────────────────────────────────────
function deleteOut(id) {
  if (!confirm('Delete this output challan?')) return;
  data.outputs = (data.outputs || []).filter(function(o) { return o.id !== id; });
  save(); renderOutputList(); toast('Deleted.');
}

function renderOutputList() {
  try {
    var q    = (document.getElementById('out-search').value || '').toLowerCase();
    var list = document.getElementById('out-list');
    var rows = (data.outputs || []).filter(function(o) {
      return o.challan.toLowerCase().includes(q)
        || (o.party || '').toLowerCase().includes(q)
        || (o.items || []).some(function(i) { return i.name.toLowerCase().includes(q); });
    });
    if (!rows.length) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">&#128228;</div>No output challans yet.</div>';
      return;
    }
    list.innerHTML = rows.slice().reverse().map(function(o) {
      var total  = (o.items || []).reduce(function(s, i) { return s + i.pcs; }, 0);
      var linked = (data.inputs || []).filter(function(inp) {
        return (inp.linkedOuts || (inp.linkedOut ? [inp.linkedOut] : [])).includes(o.challan);
      });
      var srcBadge = o.source === 'shop'
        ? '<span class="out-src-badge shop">&#127978; SHOP</span>'
        : '<span class="out-src-badge wh">&#127981; WH</span>';
      var partyLine = o.party ? ' &middot; ' + o.party : '';
      var eid = JSON.stringify(o.id);
      return '<div class="challan-card">'
        + '<div class="challan-header out">'
        +   '<div><div class="ch-num out">' + o.challan + '</div><div class="ch-date">' + o.date + partyLine + '</div></div>'
        +   '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">'
        +     srcBadge + '<span class="ch-badge out">OUT</span>'
        +     '<button class="del-ch-btn" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;" onclick="downloadOutPdf(' + eid + ')">&#128196;</button>'
        +     '<button class="del-ch-btn" onclick="deleteOut(' + eid + ')">&#128465;</button>'
        +   '</div>'
        + '</div>'
        + '<div class="challan-body">'
        +   (o.items||[]).map(function(i){return '<div class="item-line"><span>'+i.name+'</span><span class="item-pcs">'+i.pcs+' pcs</span></div>';}).join('')
        +   '<div class="ch-footer"><span class="ch-total">Total: <strong>' + total + ' pcs</strong></span>'
        +   (linked.length ? '<span class="linked-tag">&#128279; ' + linked.length + ' input(s)</span>' : '<span style="font-size:0.62rem;color:#bbb">No inputs yet</span>')
        +   '</div></div></div>';
    }).join('');
  } catch(e) { console.warn('renderOutputList:', e); }
}

// ─────────────────────────────────────────────────────────────
// Init (called by switchTab and autoLogin)
// ─────────────────────────────────────────────────────────────
function initOutTab() {
  setOutSource('warehouse');
  initPartyAutocomplete();
  setTransferDir('garg_to_amoha');
  if (!document.querySelector('#tr-items-list .tr-item-row')) addTransferItem();
  renderTransferHistory();
}

function pickItemName(optEl, name) {
  try {
    var dd = optEl.closest('.name-dropdown'), wrap = dd.parentElement, inp = wrap.querySelector('input');
    if (inp) { inp.value = name; inp.dispatchEvent(new Event('input')); inp.focus(); }
    dd.style.display = 'none';
  } catch(e) {}
}

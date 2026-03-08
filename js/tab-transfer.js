// ── TRANSFER TAB ──

// ─────────────────────────────────────────────────────────────
// Direction toggle — fully self-contained, no dependency on tab-out
// ─────────────────────────────────────────────────────────────
function setTransferDir(dir) {
  try {
    var g2a = document.getElementById('tr-btn-g2a');
    var a2g = document.getElementById('tr-btn-a2g');
    var fromLbl = document.getElementById('tr-from-label');
    var toLbl   = document.getElementById('tr-to-label');
    var dirInp  = document.getElementById('tr-dir');
    if (!g2a || !a2g) return;

    if (dir === 'garg_to_amoha') {
      g2a.classList.add('tr-btn-active');
      a2g.classList.remove('tr-btn-active');
      if (fromLbl) { fromLbl.textContent = 'From: Garg Industries (Warehouse)'; fromLbl.style.color = '#c0392b'; }
      if (toLbl)   { toLbl.textContent   = 'To: Amoha Silk (Shop)';             toLbl.style.color   = '#9c27b0'; }
    } else {
      a2g.classList.add('tr-btn-active');
      g2a.classList.remove('tr-btn-active');
      if (fromLbl) { fromLbl.textContent = 'From: Amoha Silk (Shop)';             fromLbl.style.color = '#9c27b0'; }
      if (toLbl)   { toLbl.textContent   = 'To: Garg Industries (Warehouse)';     toLbl.style.color   = '#c0392b'; }
    }
    if (dirInp) dirInp.value = dir;

    // Refresh avail badges on existing rows
    document.querySelectorAll('#tr-items-list .tr-item-row').forEach(function(row) {
      var nameEl  = row.querySelector('.tr-item-name');
      var availEl = row.querySelector('.tr-item-avail');
      if (!nameEl || !availEl) return;
      var name = nameEl.value.trim();
      if (!name) return;
      var se = (data.stock || []).find(function(s) { return s.name.toLowerCase() === name.toLowerCase(); });
      if (!se) return;
      var avail = dir === 'garg_to_amoha' ? (se.preStockWarehouse || 0) : (se.preStockShop || 0);
      availEl.textContent = avail + ' avail';
      availEl.className = 'tr-item-avail' + (avail <= 0 ? ' zero' : '');
    });
  } catch(e) { console.warn('[transfer:setTransferDir]', e); }
}

// ─────────────────────────────────────────────────────────────
// Item autocomplete for transfer rows
// ─────────────────────────────────────────────────────────────
function _attachTransferItemAC(nameInp, availEl) {
  try {
    var wrap = nameInp.closest('.tr-name-wrap') || nameInp.parentElement;
    var old = wrap.querySelector('.tr-item-dd'); if (old) old.remove();
    var dd = document.createElement('div'); dd.className = 'tr-item-dd out-item-dd';
    wrap.appendChild(dd);
    var focusIdx = -1;

    function getDir() { return (document.getElementById('tr-dir') || {}).value || 'garg_to_amoha'; }

    function renderDD(q) {
      var dir = getDir();
      var items = typeof _getStockItems === 'function' ? _getStockItems() : [];
      var matches = q ? items.filter(function(e) { return e.name.toLowerCase().includes(q); }) : items;
      if (!matches.length) { dd.style.display = 'none'; return; }
      focusIdx = -1;
      dd.innerHTML = matches.slice(0, 60).map(function(e) {
        var qty  = dir === 'garg_to_amoha' ? e.whQty : e.shQty;
        var safe = e.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var qtyLabel = '<span class="out-item-qty' + (qty <= 0 ? ' zero' : '') + '">' + qty + ' pcs</span>';
        return '<div class="out-item-opt"'
          + ' onmousedown="event.preventDefault()"'
          + ' onclick="(function(el){'
          +   'var row=el.closest(\'.tr-item-row\');'
          +   'var ni=row.querySelector(\'.tr-item-name\');'
          +   'ni.value=\'' + safe + '\';'
          +   'var d=(document.getElementById(\'tr-dir\')||{}).value||\'garg_to_amoha\';'
          +   'var se=(data.stock||[]).find(function(s){return s.name.toLowerCase()===\'' + safe.toLowerCase().replace(/'/g,"\\'") + '\';});'
          +   'var av=se?(d===\'garg_to_amoha\'?(se.preStockWarehouse||0):(se.preStockShop||0)):0;'
          +   'var ae=row.querySelector(\'.tr-item-avail\');'
          +   'if(ae){ae.textContent=av+\' avail\';ae.className=\'tr-item-avail\'+(av<=0?\' zero\':\'\');}'
          +   'el.closest(\'.tr-item-dd\').style.display=\'none\';'
          + '})(this)">'
          + '<span class="out-item-name">' + e.name + '</span>' + qtyLabel + '</div>';
      }).join('');
      dd.style.display = 'block';
    }

    nameInp.addEventListener('focus', function() { renderDD(nameInp.value.trim().toLowerCase()); });
    nameInp.addEventListener('input', function() { renderDD(nameInp.value.trim().toLowerCase()); });
    nameInp.addEventListener('blur',  function() { setTimeout(function() { dd.style.display = 'none'; focusIdx = -1; }, 200); });
    nameInp.addEventListener('keydown', function(e) {
      var opts = dd.querySelectorAll('.out-item-opt');
      if (dd.style.display === 'none' || !opts.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx+1, opts.length-1); opts.forEach(function(o,i){o.classList.toggle('focused',i===focusIdx);}); if(opts[focusIdx])opts[focusIdx].scrollIntoView({block:'nearest'}); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx-1,0); opts.forEach(function(o,i){o.classList.toggle('focused',i===focusIdx);}); }
      else if (e.key === 'Enter' && focusIdx >= 0) { e.preventDefault(); opts[focusIdx].click(); }
      else if (e.key === 'Escape') { dd.style.display = 'none'; }
    });
  } catch(e) { console.warn('[transfer:_attachTransferItemAC]', e); }
}

// ─────────────────────────────────────────────────────────────
// Add a transfer item row
// ─────────────────────────────────────────────────────────────
function addTransferItem() {
  try {
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
  } catch(e) { console.warn('[transfer:addTransferItem]', e); }
}

// ─────────────────────────────────────────────────────────────
// Save transfer
// ─────────────────────────────────────────────────────────────
function saveStockTransfer() {
  try {
    var dir  = (document.getElementById('tr-dir') || {}).value || 'garg_to_amoha';
    var date = document.getElementById('tr-date').value;
    var note = (document.getElementById('tr-note') || {}).value || '';
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

    if (!data.stockTransfers) data.stockTransfers = [];
    data.stockTransfers.push({
      id: Date.now().toString(),
      dir: dir, date: date, note: note, items: items,
      createdAt: new Date().toISOString()
    });

    save();

    var label = dir === 'garg_to_amoha' ? 'Garg → Amoha' : 'Amoha → Garg';
    toast('✔ Transfer done! ' + label + ' · ' + items.length + ' item(s) moved.', 3000);

    // Reset
    document.getElementById('tr-items-list').innerHTML = '';
    document.getElementById('tr-note').value = '';
    if (typeof setTodayDates === 'function') setTodayDates();
    addTransferItem();
    renderTransferHistory();
    if (typeof renderStockRegister === 'function') renderStockRegister();
  } catch(e) { console.error('[transfer:saveStockTransfer]', e); toast('⚠ Error. Check console.'); }
}

// ─────────────────────────────────────────────────────────────
// Transfer history
// ─────────────────────────────────────────────────────────────
function renderTransferHistory() {
  try {
    var el = document.getElementById('tr-history');
    if (!el) return;
    var list = (data.stockTransfers || []).slice().reverse().slice(0, 30);
    if (!list.length) {
      el.innerHTML = '<div style="font-size:0.65rem;color:var(--muted);padding:8px 0;">No transfers yet.</div>';
      return;
    }
    el.innerHTML = list.map(function(tr) {
      var label = tr.dir === 'garg_to_amoha'
        ? '🏭 Garg &rarr; Amoha 🏪'
        : '🏪 Amoha &rarr; Garg 🏭';
      var total = (tr.items || []).reduce(function(s, i) { return s + i.pcs; }, 0);
      return '<div class="tr-history-card">'
        + '<div class="tr-history-header">'
        +   '<span class="tr-history-dir">' + label + '</span>'
        +   '<span class="tr-history-date">' + tr.date + '</span>'
        + '</div>'
        + (tr.items || []).map(function(i) {
            return '<div class="item-line"><span>' + i.name + '</span><span class="item-pcs">' + i.pcs + ' pcs</span></div>';
          }).join('')
        + '<div class="ch-footer">'
        +   '<span class="ch-total">Total: <strong>' + total + ' pcs</strong></span>'
        +   (tr.note ? '<span style="font-size:0.6rem;color:var(--muted);">📝 ' + tr.note + '</span>' : '')
        + '</div>'
        + '</div>';
    }).join('');
  } catch(e) { console.warn('[transfer:renderTransferHistory]', e); }
}

// ─────────────────────────────────────────────────────────────
// Init — called by switchTab('transfer')
// ─────────────────────────────────────────────────────────────
function initTransferTab() {
  try {
    setTransferDir('garg_to_amoha');
    if (!document.querySelector('#tr-items-list .tr-item-row')) addTransferItem();
    if (typeof setTodayDates === 'function') setTodayDates();
    renderTransferHistory();
  } catch(e) { console.warn('[transfer:initTransferTab]', e); }
}

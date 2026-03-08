// ── IN TAB ──

let currentInDest   = 'warehouse';  // 'warehouse' | 'shop'
let currentInStatus = 'ready';      // 'ready' | 'process'

// ─────────────────────────────────────────────────────────────
// Destination toggle: Warehouse (Garg) vs Shop (Amoha)
// ─────────────────────────────────────────────────────────────
function setInDest(dest) {
  try {
    currentInDest = dest;
    var wBtn = document.getElementById('in-dest-warehouse');
    var sBtn = document.getElementById('in-dest-shop');
    if (!wBtn || !sBtn) return;
    if (dest === 'warehouse') {
      wBtn.classList.add('in-dest-active');
      sBtn.classList.remove('in-dest-active');
    } else {
      sBtn.classList.add('in-dest-active');
      wBtn.classList.remove('in-dest-active');
    }
  } catch(e) { console.warn('[in:setInDest]', e); }
}

// ─────────────────────────────────────────────────────────────
// Status toggle: Ready Goods vs Under Process
// ─────────────────────────────────────────────────────────────
function setInStatus(status) {
  try {
    currentInStatus = status;
    var rBtn = document.getElementById('in-status-ready');
    var pBtn = document.getElementById('in-status-process');
    if (!rBtn || !pBtn) return;
    if (status === 'ready') {
      rBtn.classList.add('in-status-active');
      rBtn.classList.remove('in-status-process-active');
      pBtn.classList.remove('in-status-active');
      pBtn.classList.remove('in-status-process-active');
    } else {
      pBtn.classList.add('in-status-active');
      pBtn.classList.add('in-status-process-active');
      rBtn.classList.remove('in-status-active');
    }
  } catch(e) { console.warn('[in:setInStatus]', e); }
}

// Keep legacy setInType alias (used in confirmScan and other places)
function setInType(t) {
  if (t === 'dyeing') { setInDest('warehouse'); setInStatus('ready'); }
  else if (t === 'packing') { setInDest('shop'); setInStatus('ready'); }
}

// ─────────────────────────────────────────────────────────────
// Transport custom field
// ─────────────────────────────────────────────────────────────
function toggleCustomTransport(sel) {
  try {
    var f = document.getElementById('transport-custom-field');
    if (sel.value === 'Other') {
      f.classList.add('show');
    } else {
      f.classList.remove('show');
      document.getElementById('in-transport-custom').value = '';
    }
  } catch(e) { console.warn('[in:toggleCustomTransport]', e); }
}

// ─────────────────────────────────────────────────────────────
// Added items state
// ─────────────────────────────────────────────────────────────
function updateInputPcs(n, i, v) {
  if (addedItems[n] && addedItems[n][i] !== undefined)
    addedItems[n][i].inputPcs = parseInt(v) || 0;
}

function removeAddedItem(n) {
  delete addedItems[n];
  renderAddedItems();
}

function renderAddedItems() {
  try {
    var container   = document.getElementById('in-added-items-container');
    var list        = document.getElementById('in-added-items-list');
    var saveSection = document.getElementById('in-save-section');
    var names = Object.keys(addedItems);
    if (!names.length) {
      container.style.display = 'none';
      saveSection.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    saveSection.style.display = 'block';
    list.innerHTML = names.map(function(name) {
      var rows = addedItems[name];
      var safeN = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '<div class="added-item-card">'
        + '<div class="added-item-header">'
        +   '<span class="added-item-name">' + name + '</span>'
        +   '<button class="remove-added-item" onclick="removeAddedItem(\'' + safeN + '\')">✕</button>'
        + '</div>'
        + '<div class="added-item-rows">'
        + rows.map(function(r, ri) {
            return '<div class="added-item-row">'
              + '<div>'
              +   '<div class="added-row-out">📤 ' + r.challanNo + ' <span style="font-size:0.58rem;color:var(--muted);">' + r.challanDate + '</span></div>'
              +   '<div class="added-row-meta">Out: ' + r.outPcs + ' &nbsp;·&nbsp; <span class="added-row-pending">' + r.pending + ' pending</span></div>'
              + '</div>'
              + '<div class="added-row-pcs">'
              +   '<input type="number" min="0" max="' + r.pending + '" value="' + (r.inputPcs || 0) + '"'
              +   ' oninput="updateInputPcs(\'' + safeN + '\',' + ri + ',this.value)">'
              +   '<span class="pcs-lbl">Pcs In</span>'
              + '</div>'
              + '</div>';
          }).join('')
        + '</div></div>';
    }).join('');
  } catch(e) { console.warn('[in:renderAddedItems]', e); }
}

// ─────────────────────────────────────────────────────────────
// Add inventory when ready goods received
// dest: 'warehouse' → preStockWarehouse
// dest: 'shop'      → preStockShop
// ─────────────────────────────────────────────────────────────
function _addInStock(items, dest) {
  items.forEach(function(item) {
    if (!item.name || !item.pcs) return;
    // Find or create stock entry
    var se = (data.stock || []).find(function(s) {
      return s.name.toLowerCase() === item.name.toLowerCase();
    });
    if (!se) {
      if (!data.stock) data.stock = [];
      se = { name: item.name, shelves: [], preStockWarehouse: 0, preStockShop: 0, lowWarn: 0, preStockDate: '' };
      data.stock.push(se);
    }
    if (dest === 'warehouse') {
      se.preStockWarehouse = (se.preStockWarehouse || 0) + item.pcs;
    } else {
      se.preStockShop = (se.preStockShop || 0) + item.pcs;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Save input challan
// ─────────────────────────────────────────────────────────────
function saveInput(mode) {
  try {
    var challan   = document.getElementById('in-challan').value.trim();
    var date      = document.getElementById('in-date').value;
    var ts        = document.getElementById('in-transport').value;
    var transport = ts === 'Other'
      ? (document.getElementById('in-transport-custom').value.trim() || 'Other')
      : ts;

    if (!challan || !date) { toast('⚠ Fill challan no. and date!'); return; }
    if (!Object.keys(addedItems).length) { toast('⚠ Add at least one item!'); return; }
    if (data.inputs.find(function(i) { return i.challan === challan; })) {
      toast('⚠ Challan no. already exists!'); return;
    }

    var perOut = {};
    Object.entries(addedItems).forEach(function(entry) {
      var name = entry[0], rows = entry[1];
      rows.forEach(function(r) {
        if (r.inputPcs <= 0) return;
        if (!perOut[r.challanNo]) perOut[r.challanNo] = [];
        perOut[r.challanNo].push({ name: name, pcs: r.inputPcs });
      });
    });

    var sections = Object.entries(perOut).map(function(e) {
      return { challanNo: e[0], items: e[1] };
    });
    if (!sections.length) { toast('⚠ Enter quantity for at least one item!'); return; }

    var allItems   = sections.flatMap(function(s) { return s.items; });
    var linkedOuts = sections.map(function(s) { return s.challanNo; });

    var inDest   = currentInDest;    // 'warehouse' | 'shop'
    var inStatus = currentInStatus;  // 'ready' | 'process'

    // ── Apply inventory only for ready goods ──
    if (inStatus === 'ready') {
      _addInStock(allItems, inDest);
    }

    if (!mode || mode === 'combined') {
      data.inputs.push({
        id: Date.now().toString(),
        challan: challan, date: date, transport: transport,
        inDest: inDest, inStatus: inStatus,
        // legacy field kept for backward compat
        inType: inDest === 'warehouse' ? 'dyeing' : 'packing',
        linkedOut: linkedOuts[0], linkedOuts: linkedOuts,
        linkedOutItems: sections, items: allItems
      });
      var destLabel = inDest === 'warehouse' ? 'Garg Warehouse' : 'Amoha Shop';
      var statusLabel = inStatus === 'ready' ? 'Stock updated ✔' : 'Under Process (no stock change)';
      toast('✔ Saved to ' + destLabel + '! ' + statusLabel, 3000);
    } else {
      sections.forEach(function(sec, idx) {
        data.inputs.push({
          id: (Date.now() + idx).toString(),
          challan: sections.length > 1 ? challan + '-' + (idx + 1) : challan,
          date: date, transport: transport,
          inDest: inDest, inStatus: inStatus,
          inType: inDest === 'warehouse' ? 'dyeing' : 'packing',
          linkedOut: sec.challanNo, linkedOuts: [sec.challanNo],
          linkedOutItems: [sec], items: sec.items
        });
      });
      toast('✔ Saved as ' + sections.length + ' challan(s). Syncing...', 2500);
    }

    save();
    addedItems = {};

    // Reset form
    ['in-challan', 'in-transport-custom', 'item-search-box'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('in-transport').value = '';
    document.getElementById('transport-custom-field').classList.remove('show');
    setInDest('warehouse');
    setInStatus('ready');
    var sug = document.getElementById('item-suggestions');
    if (sug) sug.style.display = 'none';
    document.getElementById('in-added-items-container').style.display = 'none';
    document.getElementById('in-save-section').style.display = 'none';
    document.getElementById('in-added-items-list').innerHTML = '';
    if (typeof setTodayDates === 'function') setTodayDates();
    renderInputList();
    if (typeof renderStockRegister === 'function') renderStockRegister();
  } catch(e) { console.warn('[in:saveInput]', e); }
}

// ─────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────
function deleteIn(id) {
  if (!confirm('Delete this input challan?')) return;
  data.inputs = data.inputs.filter(function(i) { return i.id !== id; });
  save(); renderInputList(); toast('Deleted.');
}

// ─────────────────────────────────────────────────────────────
// Render input list
// ─────────────────────────────────────────────────────────────
function renderInputList() {
  try {
    var q    = (document.getElementById('in-search').value || '').toLowerCase();
    var list = document.getElementById('in-list');
    var filtered = data.inputs.filter(function(i) {
      var outs = i.linkedOuts || (i.linkedOut ? [i.linkedOut] : []);
      return i.challan.toLowerCase().includes(q)
        || outs.some(function(lo) { return lo.toLowerCase().includes(q); })
        || i.items.some(function(it) { return it.name.toLowerCase().includes(q); });
    });
    if (!filtered.length) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">📥</div>No input challans yet.</div>';
      return;
    }
    var tI = { Direct: '🚶', Transport: '🚛', 'Kiran Deka': '👤', 'Cargo Tempo': '🚐' };

    list.innerHTML = filtered.slice().reverse().map(function(inp) {
      var total = inp.items.reduce(function(s, i) { return s + i.pcs; }, 0);
      var outs  = inp.linkedOuts || (inp.linkedOut ? [inp.linkedOut] : []);

      // Destination badge
      var dest = inp.inDest || (inp.inType === 'packing' ? 'shop' : 'warehouse');
      var destBadge = dest === 'shop'
        ? '<span class="in-dest-badge-sh">🏪 SHOP</span>'
        : '<span class="in-dest-badge-wh">🏭 WH</span>';

      // Status badge
      var status = inp.inStatus || 'ready';
      var statusBadge = status === 'process'
        ? '<span class="in-process-badge">⚙️ PROCESS</span>'
        : '<span class="in-process-badge" style="background:#e8f5e9;color:#2e7d32;">✅ READY</span>';

      var eid = JSON.stringify(inp.id);
      return '<div class="challan-card">'
        + '<div class="challan-header in">'
        +   '<div>'
        +     '<div class="ch-num in">' + inp.challan + '</div>'
        +     '<div class="ch-date">' + inp.date + '</div>'
        +   '</div>'
        +   '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">'
        +     destBadge + statusBadge
        +     '<span class="ch-badge in">IN</span>'
        +     '<button class="del-ch-btn" onclick="deleteIn(' + eid + ')">🗑</button>'
        +   '</div>'
        + '</div>'
        + '<div class="challan-body">'
        +   inp.items.map(function(i) {
              return '<div class="item-line"><span>' + i.name + '</span><span class="item-pcs">' + i.pcs + ' pcs</span></div>';
            }).join('')
        +   '<div class="ch-footer">'
        +     '<span class="ch-total">Total: <strong>' + total + ' pcs</strong></span>'
        +   '</div>'
        +   '<div style="margin-top:8px;">'
        +     (outs.map(function(lo) { return '<span class="linked-tag">🔗 ' + lo + '</span>'; }).join('') || '<span style="font-size:0.62rem;color:#bbb">Unlinked</span>')
        +   '</div>'
        +   (inp.transport ? '<div class="transport-tag">' + (tI[inp.transport] || '🚚') + ' ' + inp.transport + '</div>' : '')
        + '</div></div>';
    }).join('');
  } catch(e) { console.warn('[in:renderInputList]', e); }
}

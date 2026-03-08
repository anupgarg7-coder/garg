// ── OUT TAB ──

let currentOutSource = 'warehouse';

function setOutSource(src) {
  try {
    currentOutSource = src;
    document.getElementById('out-src-warehouse').className = 'out-src-btn' + (src === 'warehouse' ? ' out-src-active' : '');
    document.getElementById('out-src-shop').className = 'out-src-btn' + (src === 'shop' ? ' out-src-active' : '');
  } catch(e) { console.warn('setOutSource error:', e); }
}

function makeOutItemRow(typePrefill) {
  typePrefill = typePrefill || 'grey';
  try {
    const div = document.createElement('div'); div.className = 'item-row';
    const nameWrap = document.createElement('div'); nameWrap.className = 'name-wrap'; nameWrap.style.position = 'relative';
    const nameInp = document.createElement('input'); nameInp.type = 'text'; nameInp.placeholder = 'Item name'; nameInp.className = 'item-name-inp'; nameInp.autocomplete = 'off';
    nameWrap.appendChild(nameInp);
    const pcsInp = document.createElement('input'); pcsInp.type = 'number'; pcsInp.placeholder = 'Pcs'; pcsInp.min = '0'; pcsInp.className = 'item-pcs-inp';
    const typeSel = document.createElement('select'); typeSel.className = 'item-type-sel type-grey';
    typeSel.innerHTML = '<option value="grey">⬜ Grey Stage</option><option value="sample">🟢 Sample/Shop</option><option value="packing">🔵 Packing/Shop</option>';
    typeSel.value = typePrefill;
    typeSel.onchange = function() { typeSel.className = 'item-type-sel type-' + typeSel.value; };
    typeSel.className = 'item-type-sel type-' + typePrefill;
    const removeBtn = document.createElement('button'); removeBtn.className = 'remove-item'; removeBtn.textContent = '✕'; removeBtn.onclick = function() { div.remove(); };
    div.appendChild(nameWrap); div.appendChild(pcsInp); div.appendChild(typeSel); div.appendChild(removeBtn);
    document.getElementById('out-items-list').appendChild(div);
    if (typeof attachItemAutocomplete === 'function') attachItemAutocomplete(nameInp);
  } catch(e) { console.warn('makeOutItemRow error:', e); }
}

function collectItems(containerId) {
  try {
    return [...document.querySelectorAll('#' + containerId + ' .item-row')].map(function(row) {
      return {
        name: row.querySelector('.item-name-inp').value.trim(),
        pcs: parseInt(row.querySelector('.item-pcs-inp').value) || 0,
        type: (row.querySelector('.item-type-sel') && row.querySelector('.item-type-sel').value) || 'grey'
      };
    }).filter(function(i) { return i.name; });
  } catch(e) { console.warn('collectItems error:', e); return []; }
}

function addOutItem() { makeOutItemRow(); }

function saveOutput() {
  try {
    const challan = document.getElementById('out-challan').value.trim();
    const date = document.getElementById('out-date').value;
    const partyEl = document.getElementById('out-party');
    const party = partyEl ? partyEl.value.trim() : '';
    const items = collectItems('out-items-list');
    if (!challan || !date) { toast('⚠ Fill challan no. and date!'); return; }
    if (!items.length) { toast('⚠ Add at least one item!'); return; }
    if (data.outputs.find(function(o) { return o.challan === challan; })) { toast('⚠ Challan no. already exists!'); return; }

    // Deduct from stock based on source
    items.forEach(function(item) {
      const se = data.stock.find(function(s) { return s.name.toLowerCase() === item.name.toLowerCase(); });
      if (se) {
        if (currentOutSource === 'warehouse') {
          se.preStockWarehouse = Math.max(0, (se.preStockWarehouse || 0) - item.pcs);
        } else {
          se.preStockShop = Math.max(0, (se.preStockShop || 0) - item.pcs);
        }
      }
    });

    data.outputs.push({ id: Date.now().toString(), challan: challan, date: date, party: party, items: items, source: currentOutSource });
    save();
    toast('✔ Output Challan saved!');
    document.getElementById('out-challan').value = '';
    if (partyEl) partyEl.value = '';
    document.getElementById('out-items-list').innerHTML = '';
    addOutItem();
    if (typeof setTodayDates === 'function') setTodayDates();
    renderOutputList();
    if (typeof renderStockRegister === 'function') renderStockRegister();
  } catch(e) { console.error('saveOutput error:', e); toast('⚠ Error saving challan'); }
}

function saveAndDownloadOutput() {
  try {
    const challan = document.getElementById('out-challan').value.trim();
    const date = document.getElementById('out-date').value;
    const partyEl = document.getElementById('out-party');
    const party = partyEl ? partyEl.value.trim() : '';
    const items = collectItems('out-items-list');
    if (!challan || !date) { toast('⚠ Fill challan no. and date!'); return; }
    if (!items.length) { toast('⚠ Add at least one item!'); return; }
    if (data.outputs.find(function(o) { return o.challan === challan; })) { toast('⚠ Challan no. already exists!'); return; }

    items.forEach(function(item) {
      const se = data.stock.find(function(s) { return s.name.toLowerCase() === item.name.toLowerCase(); });
      if (se) {
        if (currentOutSource === 'warehouse') {
          se.preStockWarehouse = Math.max(0, (se.preStockWarehouse || 0) - item.pcs);
        } else {
          se.preStockShop = Math.max(0, (se.preStockShop || 0) - item.pcs);
        }
      }
    });

    const obj = { id: Date.now().toString(), challan: challan, date: date, party: party, items: items, source: currentOutSource };
    data.outputs.push(obj);
    save();
    toast('✔ Saved! Opening PDF...');
    document.getElementById('out-challan').value = '';
    if (partyEl) partyEl.value = '';
    document.getElementById('out-items-list').innerHTML = '';
    addOutItem();
    if (typeof setTodayDates === 'function') setTodayDates();
    renderOutputList();
    if (typeof renderStockRegister === 'function') renderStockRegister();
    generateOutPdf(obj);
  } catch(e) { console.error('saveAndDownloadOutput error:', e); toast('⚠ Error'); }
}

function downloadOutPdf(id) {
  try {
    const o = data.outputs.find(function(x) { return x.id === id; });
    if (o) generateOutPdf(o);
  } catch(e) { console.warn('downloadOutPdf error:', e); }
}

function generateOutPdf(o) {
  try {
    const isShop = o.source === 'shop';
    const company = isShop ? 'AMOHA SILK' : 'GARG INDUSTRIES';
    const accentColor = isShop ? '#9c27b0' : '#c0392b';
    const headerBg = isShop ? '#f3e5f5' : '#fce4ec';
    const total = o.items.reduce(function(s, i) { return s + i.pcs; }, 0);
    const rows = o.items.map(function(item, i) {
      return '<tr><td style="text-align:center;border:1px solid ' + accentColor + ';padding:6px 4px;">' + (i + 1) + '</td>' +
        '<td style="border:1px solid ' + accentColor + ';padding:6px 8px;">' + item.name + '</td>' +
        '<td style="text-align:center;border:1px solid ' + accentColor + ';padding:6px 4px;">' + item.pcs + '</td></tr>';
    }).join('');
    let emptyRows = '';
    for (let i = 0; i < Math.max(0, 8 - o.items.length); i++) {
      emptyRows += '<tr><td style="border:1px solid ' + accentColor + ';padding:9px;"></td><td style="border:1px solid ' + accentColor + ';padding:9px;"></td><td style="border:1px solid ' + accentColor + ';padding:9px;"></td></tr>';
    }
    const dispatchFrom = isShop ? 'Shop — Amoha Silk' : 'Warehouse — Garg Industries';

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + o.challan + '</title>' +
      '<style>' +
      'body{margin:0;font-family:Arial,sans-serif;background:#fff;}' +
      '@media print{body{margin:0;}.no-print{display:none !important;}}' +
      '.page{padding:24px;max-width:440px;margin:0 auto;}' +
      '.co-name{font-size:1.6rem;font-weight:900;letter-spacing:3px;color:' + accentColor + ';text-align:center;}' +
      '.co-tag{font-size:0.6rem;color:#888;letter-spacing:1px;text-align:center;margin-top:2px;}' +
      '.ch-type{font-size:0.72rem;font-weight:700;letter-spacing:2px;color:' + accentColor + ';text-align:center;margin-top:5px;}' +
      '.divider{border-bottom:2px solid ' + accentColor + ';margin:10px 0 14px;}' +
      'table{width:100%;border-collapse:collapse;font-size:0.68rem;}' +
      '.meta td{padding:4px 2px;font-size:0.68rem;vertical-align:top;}' +
      '.sig-row{margin-top:22px;display:flex;justify-content:space-between;font-size:0.6rem;color:#888;}' +
      '.notice{margin-top:10px;font-size:0.5rem;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:6px;}' +
      '.btn-row{display:flex;gap:10px;justify-content:center;margin:22px 0 10px;}' +
      '.btn{padding:10px 24px;border:none;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;letter-spacing:1px;}' +
      '.btn-print{background:' + accentColor + ';color:#fff;}' +
      '.btn-close{background:#eee;color:#333;}' +
      '</style></head><body>' +
      '<div class="page">' +
      '<div class="co-name">' + company + '</div>' +
      '<div class="co-tag">Textile &middot; Surat</div>' +
      '<div class="ch-type">DELIVERY CHALLAN</div>' +
      '<div class="divider"></div>' +
      '<table class="meta"><tbody>' +
      '<tr><td><b>Challan No.:</b> ' + o.challan + '</td><td style="text-align:right;"><b>Date:</b> ' + o.date + '</td></tr>' +
      '<tr><td colspan="2"><b>To M/s:</b> ' + (o.party || '&mdash;') + '</td></tr>' +
      '<tr><td colspan="2"><b>Dispatch From:</b> ' + dispatchFrom + '</td></tr>' +
      '</tbody></table>' +
      '<table style="margin-top:12px;"><thead>' +
      '<tr style="background:' + headerBg + ';">' +
      '<th style="border:1px solid ' + accentColor + ';padding:6px 4px;font-size:0.62rem;width:10%;">Sr.</th>' +
      '<th style="border:1px solid ' + accentColor + ';padding:6px 8px;font-size:0.62rem;text-align:left;">Description</th>' +
      '<th style="border:1px solid ' + accentColor + ';padding:6px 4px;font-size:0.62rem;width:18%;">Qty (Pcs)</th>' +
      '</tr></thead><tbody>' +
      rows + emptyRows +
      '<tr style="background:' + headerBg + ';"><td colspan="2" style="border:1px solid ' + accentColor + ';padding:6px 8px;font-weight:700;text-align:right;font-size:0.7rem;">TOTAL</td>' +
      '<td style="border:1px solid ' + accentColor + ';padding:6px 4px;font-weight:700;text-align:center;font-size:0.7rem;">' + total + '</td></tr>' +
      '</tbody></table>' +
      '<div class="sig-row"><div>Received by: _______________</div><div>Prepared by: _______________</div></div>' +
      '<div class="notice">Notify within 24 hrs of any discrepancy.</div>' +
      '<div class="btn-row no-print">' +
      '<button class="btn btn-print" onclick="window.print()">&#128424; PRINT / SAVE PDF</button>' +
      '<button class="btn btn-close" onclick="window.close()">&#10005; Close</button>' +
      '</div></div></body></html>';

    const win = window.open('', '_blank');
    if (!win) { toast('⚠ Allow pop-ups to download PDF'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); }, 600);
  } catch(e) { console.error('generateOutPdf error:', e); toast('⚠ Could not generate PDF'); }
}

function deleteOut(id) {
  try {
    if (!confirm('Delete this output challan?')) return;
    data.outputs = data.outputs.filter(function(o) { return o.id !== id; });
    save(); renderOutputList(); toast('Deleted.');
  } catch(e) { console.warn('deleteOut error:', e); }
}

function renderOutputList() {
  try {
    const q = (document.getElementById('out-search').value || '').toLowerCase();
    const list = document.getElementById('out-list');
    const filtered = data.outputs.filter(function(o) {
      return o.challan.toLowerCase().includes(q) || o.items.some(function(i) { return i.name.toLowerCase().includes(q); });
    });
    if (!filtered.length) { list.innerHTML = '<div class="empty"><div class="empty-icon">📤</div>No output challans yet.</div>'; return; }
    list.innerHTML = filtered.slice().reverse().map(function(o) {
      const total = o.items.reduce(function(s, i) { return s + i.pcs; }, 0);
      const li = data.inputs.filter(function(inp) {
        return (inp.linkedOuts || (inp.linkedOut ? [inp.linkedOut] : [])).includes(o.challan);
      });
      const srcLabel = o.source === 'shop'
        ? '<span style="font-size:0.55rem;background:#f3e5f5;color:#7b1fa2;padding:2px 7px;border-radius:10px;letter-spacing:1px;">🏪 SHOP</span>'
        : '<span style="font-size:0.55rem;background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:10px;letter-spacing:1px;">🏭 WH</span>';
      const partyLine = o.party ? ' &middot; ' + o.party : '';
      return '<div class="challan-card">' +
        '<div class="challan-header out">' +
          '<div><div class="ch-num out">' + o.challan + '</div>' +
          '<div class="ch-date">' + o.date + partyLine + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">' +
            srcLabel +
            '<span class="ch-badge out">OUT</span>' +
            '<button class="del-ch-btn" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;" onclick="downloadOutPdf(\'' + o.id + '\')">📄</button>' +
            '<button class="del-ch-btn" onclick="deleteOut(\'' + o.id + '\')">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div class="challan-body">' +
          o.items.map(function(i) { return '<div class="item-line"><span>' + i.name + '</span><span class="item-pcs">' + i.pcs + ' pcs</span></div>'; }).join('') +
          '<div class="ch-footer"><span class="ch-total">Total: <strong>' + total + ' pcs</strong></span>' +
            (li.length ? '<span class="linked-tag">🔗 ' + li.length + ' input(s)</span>' : '<span style="font-size:0.62rem;color:#bbb">No inputs yet</span>') +
          '</div>' +
        '</div></div>';
    }).join('');
  } catch(e) { console.warn('renderOutputList error:', e); }
}

function pickItemName(optEl, name) {
  try {
    const dd = optEl.closest('.name-dropdown'), wrap = dd.parentElement, inp = wrap.querySelector('input');
    if (inp) { inp.value = name; inp.dispatchEvent(new Event('input')); inp.focus(); }
    dd.style.display = 'none';
  } catch(e) {}
}

function typeLabel(t) { return t === 'sample' ? '🟢 Sample/Shop' : t === 'packing' ? '🔵 Packing/Shop' : '⬜ Grey Stage'; }
function typeCls(t) { return t === 'sample' ? 'sample' : t === 'packing' ? 'packing' : 'grey'; }

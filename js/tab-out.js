// ── OUT TAB ──

function makeOutItemRow(typePrefill='grey') {
  const div=document.createElement('div'); div.className='item-row';
  const nameWrap=document.createElement('div'); nameWrap.className='name-wrap'; nameWrap.style.position='relative';
  const nameInp=document.createElement('input'); nameInp.type='text'; nameInp.placeholder='Item name'; nameInp.className='item-name-inp'; nameInp.autocomplete='off';
  nameWrap.appendChild(nameInp);
  const pcsInp=document.createElement('input'); pcsInp.type='number'; pcsInp.placeholder='Pcs'; pcsInp.min='0'; pcsInp.className='item-pcs-inp';
  // Type dropdown
  const typeSel=document.createElement('select'); typeSel.className='item-type-sel type-grey';
  typeSel.innerHTML='<option value="grey">⬜ Grey Stage</option><option value="sample">🟢 Sample/Shop</option><option value="packing">🔵 Packing/Shop</option>';
  typeSel.value=typePrefill;
  typeSel.onchange=()=>{ typeSel.className='item-type-sel type-'+typeSel.value; };
  typeSel.className='item-type-sel type-'+typePrefill;
  const removeBtn=document.createElement('button'); removeBtn.className='remove-item'; removeBtn.textContent='✕'; removeBtn.onclick=()=>div.remove();
  div.appendChild(nameWrap); div.appendChild(pcsInp); div.appendChild(typeSel); div.appendChild(removeBtn);
  document.getElementById('out-items-list').appendChild(div);
  attachItemAutocomplete(nameInp);
}

function collectItems(containerId){
  return[...document.querySelectorAll('#'+containerId+' .item-row')].map(row=>({
    name:row.querySelector('.item-name-inp').value.trim(),
    pcs:parseInt(row.querySelector('.item-pcs-inp').value)||0,
    type:row.querySelector('.item-type-sel')?.value||'grey'
  })).filter(i=>i.name);
}

function addOutItem(){makeOutItemRow();}

function saveOutput(){
  const challan=document.getElementById('out-challan').value.trim();
  const date=document.getElementById('out-date').value;
  const items=collectItems('out-items-list');
  if(!challan||!date){toast('⚠ Fill challan no. and date!');return;}
  if(!items.length){toast('⚠ Add at least one item!');return;}
  if(data.outputs.find(o=>o.challan===challan)){toast('⚠ Challan no. already exists!');return;}
  data.outputs.push({id:Date.now().toString(),challan,date,items});
  save(); toast('✔ Output Challan saved!');
  document.getElementById('out-challan').value='';
  document.getElementById('out-items-list').innerHTML='';
  addOutItem(); setTodayDates(); renderOutputList();
}

function deleteOut(id){if(!confirm('Delete this output challan?'))return;data.outputs=data.outputs.filter(o=>o.id!==id);save();renderOutputList();toast('Deleted.');}

function renderOutputList(){
  const q=(document.getElementById('out-search').value||'').toLowerCase();
  const list=document.getElementById('out-list');
  const filtered=data.outputs.filter(o=>o.challan.toLowerCase().includes(q)||o.items.some(i=>i.name.toLowerCase().includes(q)));
  if(!filtered.length){list.innerHTML='<div class="empty"><div class="empty-icon">📤</div>No output challans yet.</div>';return;}
  list.innerHTML=filtered.slice().reverse().map(o=>{
    const total=o.items.reduce((s,i)=>s+i.pcs,0);
    const li=data.inputs.filter(inp=>(inp.linkedOuts||(inp.linkedOut?[inp.linkedOut]:[])).includes(o.challan));
    return `<div class="challan-card"><div class="challan-header out"><div><div class="ch-num out">${o.challan}</div><div class="ch-date">${o.date}</div></div><div style="display:flex;align-items:center;gap:8px;"><span class="ch-badge out">OUT</span><button class="del-ch-btn" onclick="deleteOut('${o.id}')">🗑</button></div></div><div class="challan-body">${o.items.map(i=>`<div class="item-line"><span>${i.name}</span><span class="item-pcs">${i.pcs} pcs</span></div>`).join('')}<div class="ch-footer"><span class="ch-total">Total: <strong>${total} pcs</strong></span>${li.length?`<span class="linked-tag">🔗 ${li.length} input(s)</span>`:'<span style="font-size:0.62rem;color:#bbb">No inputs yet</span>'}</div></div></div>`;
  }).join('');
}

function pickItemName(optEl, name) {
  const dd=optEl.closest('.name-dropdown'),wrap=dd.parentElement,inp=wrap.querySelector('input');
  if(inp){inp.value=name;inp.dispatchEvent(new Event('input'));inp.focus();}
  dd.style.display='none';
}

function typeLabel(t){return t==='sample'?'🟢 Sample/Shop':t==='packing'?'🔵 Packing/Shop':'⬜ Grey Stage';}

function typeCls(t){return t==='sample'?'sample':t==='packing'?'packing':'grey';}
    // ===================== PROCUREMENT =====================
    function renderProcurement() {
      const totalSpend = DB.procurement.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.totalPrice, 0), 0);
      document.getElementById('main-content').innerHTML = `
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card emerald"><div class="stat-label">Total Pengadaan</div><div class="stat-value">${fmt(totalSpend)}</div><i class="fas fa-truck stat-icon"></i></div>
      <div class="stat-card gold"><div class="stat-label">Jumlah Transaksi</div><div class="stat-value">${DB.procurement.length}</div><i class="fas fa-file-invoice stat-icon"></i></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:15px;font-weight:600">Riwayat Pengadaan</div>
      <button class="btn-primary" onclick="showProcurementModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Input Pengadaan</button>
    </div>
    <div id="procurement-list"></div>
  `;
      renderProcList();
    }
    function renderProcList() {
      const el = document.getElementById('procurement-list'); if (!el) return;
      el.innerHTML = DB.procurement.slice().reverse().map(p => {
        const total = p.items.reduce((s, i) => s + i.totalPrice, 0);
        return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-weight:600">${p.supplier || 'Supplier'}</div><div style="font-size:12px;color:var(--gray-400)">${p.date}</div></div>
        <div style="font-weight:700;color:var(--emerald)">${fmt(total)}</div>
      </div>
      ${p.items.map(it => { const ing = DB.ingredients.find(i => i.id === it.ingId); return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--gray-100)"><span>${ing?.name || '?'}</span><span style="color:var(--gray-400)">${it.qty} ${it.unit}</span><span style="color:var(--emerald)">${fmt(it.totalPrice)}</span></div>` }).join('')}
      <button class="btn-icon" onclick="deleteProcurement('${p.id}')" style="color:var(--danger);margin-top:8px;float:right"><i class="fas fa-trash"></i></button>
    </div>`;
      }).join('') || '<div class="empty-state"><i class="fas fa-truck"></i><p>Belum ada pengadaan</p></div>';
    }
    function showProcurementModal() {
      showModal(`
    <div class="modal-header"><div class="modal-title">Input Pengadaan</div><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Tanggal *</label><input type="date" id="pr-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Supplier</label><input type="text" id="pr-supplier" placeholder="Nama supplier"></div>
    </div>
    <div style="font-size:13px;font-weight:600;color:var(--gray-500);margin-bottom:8px">BAHAN YANG DIBELI</div>
    <div id="pr-items"></div>
    <button class="btn-secondary btn-sm" onclick="addPRItem()" style="margin-bottom:16px"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah Bahan</button>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveProcurement()">Simpan</button></div>
  `);
      prItems = [{ ingId: DB.ingredients[0]?.id || '', qty: 0, unit: 'gram', totalPrice: 0 }];
      renderPRItems();
    }
    let prItems = [];
    function renderPRItems() {
      const el = document.getElementById('pr-items'); if (!el) return;
      el.innerHTML = prItems.map((it, i) => `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:8px">
    <select onchange="prItems[${i}].ingId=this.value;updatePRUnit(${i})">${DB.ingredients.map(ing => `<option value="${ing.id}" ${ing.id === it.ingId ? 'selected' : ''}>${ing.name}</option>`).join('')}</select>
    <input type="number" placeholder="Qty" value="${it.qty}" oninput="prItems[${i}].qty=parseFloat(this.value)||0;updatePRCost(${i})">
    <select onchange="prItems[${i}].unit=this.value" id="pr-unit-${i}"><option ${it.unit === 'gram' ? 'selected' : ''}>gram</option><option ${it.unit === 'kg' ? 'selected' : ''}>kg</option><option ${it.unit === 'ml' ? 'selected' : ''}>ml</option><option ${it.unit === 'liter' ? 'selected' : ''}>liter</option><option ${it.unit === 'pcs' ? 'selected' : ''}>pcs</option></select>
    <input type="number" placeholder="Total (Rp)" value="${it.totalPrice}" oninput="prItems[${i}].totalPrice=parseFloat(this.value)||0">
    <button class="btn-icon" onclick="prItems.splice(${i},1);renderPRItems()" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
  </div>`).join('');
    }
    function addPRItem() { prItems.push({ ingId: DB.ingredients[0]?.id || '', qty: 0, unit: 'gram', totalPrice: 0 }); renderPRItems() }
    function saveProcurement() {
      const date = document.getElementById('pr-date').value;
      const supplier = document.getElementById('pr-supplier').value;
      if (!date || !prItems.length) { toast('Isi data pengadaan', 'warning'); return }
      const proc = { id: 'pr' + Date.now(), date, supplier, items: [...prItems] };
      DB.procurement.push(proc);
      updateIngredientPrices();
      updateStockFromProcurement(prItems);
      saveDB(); closeModal(); renderProcurement(); toast('Pengadaan disimpan & harga bahan diperbarui', 'success');
    }
    function updateIngredientPrices() {
      DB.ingredients.forEach(ing => {
        const allPurchases = [];
        DB.procurement.forEach(p => { p.items.forEach(it => { if (it.ingId === ing.id && it.qty > 0 && it.totalPrice > 0) { allPurchases.push({ date: p.date, pricePerUnit: it.totalPrice / it.qty, unit: it.unit }) } }) });
        if (allPurchases.length) {
          allPurchases.sort((a, b) => b.date.localeCompare(a.date));
          const latest = allPurchases[0];
          let pricePerBase = latest.pricePerUnit;
          if (latest.unit === 'kg' && ing.unit === 'gram') pricePerBase /= 1000;
          if (latest.unit === 'liter' && ing.unit === 'ml') pricePerBase /= 1000;
          ing.price = pricePerBase;
        }
      });
    }
    function updateStockFromProcurement(items) {
      items.forEach(it => {
        const ing = DB.ingredients.find(i => i.id === it.ingId);
        if (ing) {
          let addQty = it.qty;
          if (it.unit === 'kg' && ing.unit === 'gram') addQty *= 1000;
          if (it.unit === 'liter' && ing.unit === 'ml') addQty *= 1000;
          ing.stock += addQty;
        }
      });
      updateBadgeStock();
    }
    function deleteProcurement(id) {
      if (!confirm('Hapus data pengadaan ini?')) return;
      DB.procurement = DB.procurement.filter(p => p.id !== id);
      updateIngredientPrices(); saveDB(); renderProcurement();
    }


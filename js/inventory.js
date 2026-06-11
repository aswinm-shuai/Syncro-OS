    // ===================== INGREDIENTS =====================
    function renderIngredients() {
      document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="search-bar" style="max-width:300px"><i class="fas fa-search"></i><input type="text" placeholder="Cari bahan..." oninput="filterIngredients(this.value)"></div>
      <button class="btn-primary" onclick="showIngModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Bahan</button>
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Nama Bahan</th><th>Satuan</th><th>Harga/Satuan</th><th>Stok</th><th>Stok Min</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="ing-tbody"></tbody></table></div></div>
  `;
      renderIngTable(DB.ingredients);
    }
    function renderIngTable(ings) {
      const tb = document.getElementById('ing-tbody');
      if (!tb) return;
      tb.innerHTML = ings.map(i => `<tr>
    <td><strong>${i.name}</strong></td>
    <td>${i.unit}</td>
    <td>${fmtSmall(i.price)}/${i.unit}</td>
    <td><strong>${i.stock}</strong> ${i.unit}</td>
    <td>${i.minStock} ${i.unit}</td>
    <td><span class="badge ${i.stock <= i.minStock ? 'badge-danger' : 'badge-success'}">${i.stock <= i.minStock ? 'Menipis' : 'Normal'}</span></td>
    <td><div style="display:flex;gap:4px"><button class="btn-icon" onclick="showIngModal('${i.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="deleteIng('${i.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></div></td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada bahan</td></tr>`;
    }
    function filterIngredients(v) { renderIngTable(DB.ingredients.filter(i => i.name.toLowerCase().includes(v.toLowerCase()))) }
    function showIngModal(id = null) {
      editingId = id;
      const i = id ? DB.ingredients.find(x => x.id === id) : { name: '', unit: 'gram', price: 0, stock: 0, minStock: 0 };
      showModal(`
    <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'Tambah'} Bahan</div><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nama Bahan *</label><input type="text" id="if-name" value="${i.name}"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Satuan *</label><select id="if-unit"><option ${i.unit === 'gram' ? 'selected' : ''}>gram</option><option ${i.unit === 'kg' ? 'selected' : ''}>kg</option><option ${i.unit === 'ml' ? 'selected' : ''}>ml</option><option ${i.unit === 'liter' ? 'selected' : ''}>liter</option><option ${i.unit === 'pcs' ? 'selected' : ''}>pcs</option><option ${i.unit === 'sdm' ? 'selected' : ''}>sdm</option></select></div>
      <div class="form-group"><label class="form-label">Harga/Satuan (Rp)</label><input type="number" id="if-price" value="${i.price}"></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Stok Saat Ini</label><input type="number" id="if-stock" value="${i.stock}"></div>
      <div class="form-group"><label class="form-label">Stok Minimum</label><input type="number" id="if-minstock" value="${i.minStock}"></div>
    </div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveIng()">${id ? 'Simpan' : 'Tambah'}</button></div>
  `);
    }
    function saveIng() {
      const name = document.getElementById('if-name').value.trim();
      if (!name) { toast('Nama bahan wajib diisi', 'warning'); return }
      const data = { name, unit: document.getElementById('if-unit').value, price: parseFloat(document.getElementById('if-price').value) || 0, stock: parseFloat(document.getElementById('if-stock').value) || 0, minStock: parseFloat(document.getElementById('if-minstock').value) || 0 };
      if (editingId) { Object.assign(DB.ingredients.find(x => x.id === editingId), data); toast('Bahan diperbarui', 'success') }
      else { DB.ingredients.push({ id: 'i' + Date.now(), ...data }); toast('Bahan ditambahkan', 'success') }
      saveDB(); closeModal(); renderIngredients(); updateBadgeStock();
    }
    function deleteIng(id) {
      if (!confirm('Hapus bahan ini?')) return;
      DB.ingredients = DB.ingredients.filter(i => i.id !== id); saveDB(); renderIngredients();
    }

    // ===================== INVENTORY =====================
    function renderInventory() {
      const low = DB.ingredients.filter(i => i.stock <= i.minStock);
      document.getElementById('main-content').innerHTML = `
    ${low.length ? `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i><div><strong>Stok Menipis!</strong><br>${low.map(i => `<span class="badge badge-danger" style="margin-right:4px">${i.name}: ${i.stock} ${i.unit}</span>`).join('')}</div></div>` : '<div class="alert alert-success"><i class="fas fa-check-circle"></i><div>Semua stok dalam kondisi aman.</div></div>'}
    <div class="card">
      <div class="card-header"><div class="card-title">Stok Bahan Baku</div><button class="btn-secondary btn-sm" onclick="navigate('procurement')"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah Stok</button></div>
      <div class="table-wrap"><table><thead><tr><th>Bahan</th><th>Satuan</th><th>Stok Saat Ini</th><th>Stok Min</th><th>Harga/Satuan</th><th>Status</th></tr></thead><tbody>
        ${DB.ingredients.map(i => {
        const pct = Math.min(100, i.minStock > 0 ? i.stock / Math.max(i.minStock * 3, 1) * 100 : 100);
        return `<tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.unit}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <strong>${i.stock}</strong>
                <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${pct}%;background:${i.stock <= i.minStock ? 'var(--danger)' : 'var(--emerald)'}"></div></div>
              </div>
            </td>
            <td>${i.minStock}</td>
            <td>${fmtSmall(i.price)}/${i.unit}</td>
            <td><span class="badge ${i.stock <= i.minStock ? 'badge-danger' : i.stock <= i.minStock * 2 ? 'badge-warning' : 'badge-success'}">${i.stock <= i.minStock ? 'Menipis' : i.stock <= i.minStock * 2 ? 'Hampir Habis' : 'Normal'}</span></td>
          </tr>`;
      }).join('')}
      </tbody></table></div>
    </div>
  `;
    }


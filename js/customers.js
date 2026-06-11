    // ===================== CUSTOMERS =====================
    function renderCustomers() {
      document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="search-bar" style="max-width:300px"><i class="fas fa-search"></i><input type="text" placeholder="Cari pelanggan..." oninput="filterCustomers(this.value)"></div>
      <button class="btn-primary" onclick="showCustModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Pelanggan</button>
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>WhatsApp</th><th>Alamat</th><th>Total Order</th><th>Total Belanja</th><th>Aksi</th></tr></thead><tbody id="cust-tbody"></tbody></table></div></div>
  `;
      renderCustTable(DB.customers);
    }
    function renderCustTable(custs) {
      const tb = document.getElementById('cust-tbody'); if (!tb) return;
      tb.innerHTML = custs.map(c => `<tr>
    <td><div style="font-weight:500">${c.name}</div></td>
    <td><a href="https://wa.me/${c.wa?.replace(/\D/g, '')}" target="_blank" style="color:var(--emerald)">${c.wa || '-'}</a></td>
    <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.address || '-'}</td>
    <td>${c.totalOrders || 0}x</td>
    <td style="font-weight:600;color:var(--emerald)">${fmt(c.totalSpent || 0)}</td>
    <td><div style="display:flex;gap:4px"><button class="btn-icon" onclick="showCustModal('${c.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="deleteCust('${c.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada pelanggan</td></tr>`;
    }
    function filterCustomers(v) { renderCustTable(DB.customers.filter(c => c.name.toLowerCase().includes(v.toLowerCase()) || c.wa?.includes(v))) }
    function showCustModal(id = null) {
      editingId = id; const c = id ? DB.customers.find(x => x.id === id) : { name: '', wa: '', address: '' };
      showModal(`
    <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'Tambah'} Pelanggan</div><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nama *</label><input type="text" id="cf-name" value="${c.name}"></div>
    <div class="form-group"><label class="form-label">WhatsApp</label><input type="tel" id="cf-wa" value="${c.wa || ''}" placeholder="08xxxxxxxxxx"></div>
    <div class="form-group"><label class="form-label">Alamat</label><textarea id="cf-addr" rows="2">${c.address || ''}</textarea></div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveCust()">${id ? 'Simpan' : 'Tambah'}</button></div>
  `);
    }
    function saveCust() {
      const name = document.getElementById('cf-name').value.trim();
      if (!name) { toast('Nama wajib diisi', 'warning'); return }
      const data = { name, wa: document.getElementById('cf-wa').value, address: document.getElementById('cf-addr').value };
      if (editingId) { Object.assign(DB.customers.find(x => x.id === editingId), data); toast('Data diperbarui', 'success') }
      else { DB.customers.push({ id: 'c' + Date.now(), ...data, totalOrders: 0, totalSpent: 0 }); toast('Pelanggan ditambahkan', 'success') }
      saveDB(); closeModal(); renderCustomers();
    }
    function deleteCust(id) { if (!confirm('Hapus pelanggan ini?')) return; DB.customers = DB.customers.filter(c => c.id !== id); saveDB(); renderCustomers(); }


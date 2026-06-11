    // ===================== PRODUCTS =====================
    function renderProducts() {
      const cats = [...new Set(DB.products.map(p => p.category))];
      document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="search-bar" style="max-width:300px"><i class="fas fa-search"></i><input type="text" placeholder="Cari produk..." oninput="filterProducts(this.value)"></div>
      <button class="btn-primary" onclick="showProductModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Produk</button>
    </div>
    <div class="product-grid" id="products-grid"></div>
  `;
      renderProductGrid(DB.products);
    }
    function renderProductGrid(prods) {
      const g = document.getElementById('products-grid');
      if (!g) return;
      if (!prods.length) { g.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-utensils"></i><p>Belum ada produk</p></div>`; return }
      g.innerHTML = prods.map(p => `
    <div class="product-card">
      <div class="product-img">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : `<span style="font-size:48px">${p.emoji || '🍽️'}</span>`}</div>
      <div class="product-info">
        <div style="display:flex;align-items:start;justify-content:space-between;gap:8px">
          <div class="product-name">${p.name}</div>
          <span class="badge ${p.available ? 'badge-success' : 'badge-danger'}" style="flex-shrink:0;font-size:11px">${p.available ? 'Tersedia' : 'Habis'}</span>
        </div>
        <div class="product-price">${fmt(p.price)}</div>
        <div class="product-hpp">HPP: ${fmt(calcHPP(p.id))} · Margin: ${p.price ? Math.round((p.price - calcHPP(p.id)) / p.price * 100) : 0}%</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:4px;line-height:1.4">${p.desc || ''}</div>
        <div class="product-actions">
          <button class="btn-secondary btn-sm" style="flex:1" onclick="showProductModal('${p.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-icon" onclick="toggleProductAvail('${p.id}')" title="${p.available ? 'Tandai Habis' : 'Tandai Tersedia'}"><i class="fas fa-${p.available ? 'eye-slash' : 'eye'}"></i></button>
          <button class="btn-icon" onclick="deleteProduct('${p.id}')" title="Hapus" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
    }
    function filterProducts(v) {
      const f = DB.products.filter(p => p.name.toLowerCase().includes(v.toLowerCase()) || p.desc?.toLowerCase().includes(v.toLowerCase()));
      renderProductGrid(f);
    }
    function calcHPP(productId) {
      const recipe = DB.recipes.find(r => r.productId === productId);
      if (!recipe) return 0;
      return recipe.items.reduce((s, ri) => {
        const ing = DB.ingredients.find(i => i.id === ri.ingId);
        return s + (ing ? ing.price * ri.qty : 0);
      }, 0);
    }
    function showProductModal(id = null) {
      editingId = id;
      const p = id ? DB.products.find(x => x.id === id) : { name: '', price: '', desc: '', category: 'Makanan', available: true, emoji: '🍽️', imageUrl: '' };
      showModal(`
    <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'Tambah'} Produk</div><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nama Produk *</label><input type="text" id="pf-name" value="${p.name}"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Harga Jual *</label><div class="input-group"><span class="input-addon">Rp</span><input type="number" id="pf-price" value="${p.price}" style="border-radius:0 var(--radius) var(--radius) 0;border-left:none"></div></div>
      <div class="form-group"><label class="form-label">Kategori</label><select id="pf-cat"><option ${p.category === 'Makanan' ? 'selected' : ''}>Makanan</option><option ${p.category === 'Minuman' ? 'selected' : ''}>Minuman</option><option ${p.category === 'Snack' ? 'selected' : ''}>Snack</option><option ${p.category === 'Lainnya' ? 'selected' : ''}>Lainnya</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Deskripsi</label><textarea id="pf-desc" rows="2">${p.desc || ''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">URL Foto</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="pf-img" value="${p.imageUrl || ''}" placeholder="URL Gambar / Kosongkan untuk upload">
          <button class="btn-secondary" onclick="openCloudinaryWidget()" style="white-space:nowrap"><i class="fas fa-upload"></i> Upload</button>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Emoji (jika tanpa foto)</label><input type="text" id="pf-emoji" value="${p.emoji || '🍽️'}" style="font-size:20px"></div>
    </div>
    <div class="form-group"><label class="form-check"><input type="checkbox" id="pf-avail" ${p.available ? 'checked' : ''}><span>Produk tersedia (tampil di menu)</span></label></div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveProduct()">${id ? 'Simpan' : 'Tambah'}</button></div>
  `);
    }

    function openCloudinaryWidget() {
      if (!window.cloudinaryConfig.cloudName || window.cloudinaryConfig.cloudName === 'CLOUD_NAME_ANDA') {
        toast('Konfigurasi Cloudinary belum diset di index.html', 'warning');
        return;
      }
      var myWidget = cloudinary.createUploadWidget({
        cloudName: window.cloudinaryConfig.cloudName,
        uploadPreset: window.cloudinaryConfig.uploadPreset,
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ["images"]
      }, (error, result) => {
        if (!error && result && result.event === "success") {
          document.getElementById('pf-img').value = result.info.secure_url;
          toast('Gambar berhasil diupload!', 'success');
        }
      });
      myWidget.open();
    }
    function saveProduct() {
      const name = document.getElementById('pf-name').value.trim();
      const price = parseInt(document.getElementById('pf-price').value) || 0;
      if (!name || !price) { toast('Nama dan harga wajib diisi', 'warning'); return }
      if (editingId) {
        const p = DB.products.find(x => x.id === editingId);
        Object.assign(p, { name, price, desc: document.getElementById('pf-desc').value, category: document.getElementById('pf-cat').value, available: document.getElementById('pf-avail').checked, imageUrl: document.getElementById('pf-img').value, emoji: document.getElementById('pf-emoji').value });
        toast('Produk diperbarui', 'success');
      } else {
        DB.products.push({ id: 'p' + Date.now(), name, price, desc: document.getElementById('pf-desc').value, category: document.getElementById('pf-cat').value, available: document.getElementById('pf-avail').checked, imageUrl: document.getElementById('pf-img').value, emoji: document.getElementById('pf-emoji').value, hpp: 0 });
        toast('Produk ditambahkan', 'success');
      }
      saveDB(); closeModal(); renderProducts();
    }
    function toggleProductAvail(id) {
      const p = DB.products.find(x => x.id === id);
      if (p) { p.available = !p.available; saveDB(); renderProducts(); }
    }
    function deleteProduct(id) {
      if (!confirm('Hapus produk ini?')) return;
      DB.products = DB.products.filter(p => p.id !== id); saveDB(); renderProducts(); toast('Produk dihapus', 'success');
    }


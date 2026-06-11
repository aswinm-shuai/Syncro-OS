    // ===================== POS =====================
    function renderPOS() {
      document.getElementById('main-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 360px;gap:20px;height:calc(100vh - 120px)">
      <div style="overflow-y:auto">
        <div class="search-bar" style="margin-bottom:16px"><i class="fas fa-search"></i><input type="text" placeholder="Cari menu..." oninput="filterPOSMenu(this.value)" id="pos-search"></div>
        <div class="product-grid" id="pos-menu-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))"></div>
      </div>
      <div style="display:flex;flex-direction:column">
        <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div style="font-size:16px;font-weight:600;margin-bottom:12px"><i class="fas fa-shopping-cart" style="color:var(--emerald);margin-right:8px"></i>Keranjang</div>
          <div id="pos-cart" style="flex:1;overflow-y:auto"></div>
          <div style="border-top:1px solid var(--gray-200);padding-top:12px;margin-top:8px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;color:var(--gray-500)"><span>Subtotal</span><span id="pos-subtotal">Rp 0</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:17px;margin-bottom:12px"><span>Total</span><span style="color:var(--emerald)" id="pos-total">Rp 0</span></div>
            <input type="text" id="pos-customer" placeholder="Nama pelanggan (opsional)" style="margin-bottom:8px">
            <button class="btn-primary" style="width:100%;padding:12px" onclick="doCheckoutPOS()"><i class="fas fa-check" style="margin-right:6px"></i>Bayar / Selesaikan</button>
            <button class="btn-secondary btn-sm" style="width:100%;margin-top:6px" onclick="clearPOSCart()">Bersihkan Keranjang</button>
          </div>
        </div>
      </div>
    </div>
  `;
      renderPOSMenu(DB.products.filter(p => p.available));
      renderPOSCart();
      if (window.innerWidth < 768) { document.querySelector('#main-content > div').style.gridTemplateColumns = '1fr'; document.querySelectorAll('#main-content > div > div')[1].style.display = 'none' }
    }
    let posCart = {};
    function filterPOSMenu(v) { renderPOSMenu(DB.products.filter(p => p.available && (p.name.toLowerCase().includes(v.toLowerCase()) || p.category.toLowerCase().includes(v.toLowerCase())))) }
    function renderPOSMenu(prods) {
      const g = document.getElementById('pos-menu-grid'); if (!g) return;
      g.innerHTML = prods.map(p => `<div class="product-card" onclick="addToPOSCart('${p.id}')" style="cursor:pointer">
    <div class="product-img" style="height:120px">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : `<span style="font-size:36px">${p.emoji || '🍽️'}</span>`}</div>
    <div class="product-info" style="padding:10px">
      <div class="product-name" style="font-size:13px">${p.name}</div>
      <div class="product-price" style="font-size:14px">${fmt(p.price)}</div>
      ${posCart[p.id] ? `<div style="font-size:12px;color:var(--emerald);font-weight:600;margin-top:4px">${posCart[p.id]}x dipilih</div>` : ''}
    </div>
  </div>`).join('') || '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-utensils"></i><p>Tidak ada menu tersedia</p></div>';
    }
    function addToPOSCart(id) {
      posCart[id] = (posCart[id] || 0) + 1;
      renderPOSCart(); filterPOSMenu(document.getElementById('pos-search')?.value || '');
    }
    function renderPOSCart() {
      const c = document.getElementById('pos-cart'); if (!c) return;
      const items = Object.entries(posCart);
      if (!items.length) { c.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fas fa-shopping-cart"></i><p>Belum ada item</p></div>'; updatePOSTotal(0); return }
      let total = 0;
      c.innerHTML = items.map(([id, qty]) => {
        const p = DB.products.find(x => x.id === id); if (!p) return '';
        total += p.price * qty;
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
      <div style="font-size:16px">${p.emoji || '🍽️'}</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${p.name}</div><div style="font-size:12px;color:var(--emerald)">${fmt(p.price * qty)}</div></div>
      <div style="display:flex;align-items:center;gap:4px">
        <button class="btn-icon" onclick="changePOSQty('${id}',-1)" style="width:24px;height:24px;padding:0;border:1px solid var(--gray-200);border-radius:50%;font-size:12px;display:flex;align-items:center;justify-content:center">-</button>
        <span style="font-size:13px;font-weight:600;min-width:20px;text-align:center">${qty}</span>
        <button class="btn-icon" onclick="changePOSQty('${id}',1)" style="width:24px;height:24px;padding:0;border:1px solid var(--gray-200);border-radius:50%;font-size:12px;display:flex;align-items:center;justify-content:center">+</button>
      </div>
    </div>`;
      }).join('');
      updatePOSTotal(total);
    }
    function changePOSQty(id, delta) {
      posCart[id] = (posCart[id] || 0) + delta;
      if (posCart[id] <= 0) delete posCart[id];
      renderPOSCart(); filterPOSMenu(document.getElementById('pos-search')?.value || '');
    }
    function clearPOSCart() { posCart = {}; renderPOSCart(); filterPOSMenu(''); }
    function updatePOSTotal(total) {
      const s = document.getElementById('pos-subtotal'); const t = document.getElementById('pos-total');
      if (s) s.textContent = fmt(total); if (t) t.textContent = fmt(total);
    }
    function doCheckoutPOS() {
      const items = Object.entries(posCart);
      if (!items.length) { toast('Keranjang kosong', 'warning'); return }
      const txItems = items.map(([id, qty]) => { const p = DB.products.find(x => x.id === id); return { productId: id, qty, price: p.price } });
      const total = txItems.reduce((s, i) => s + i.price * i.qty, 0);
      const tx = { id: 't' + Date.now(), date: new Date().toISOString().split('T')[0], items: txItems, total, status: 'lunas', source: 'kasir', customer: document.getElementById('pos-customer')?.value || '' };
      DB.transactions.push(tx);
      deductStock(txItems);
      saveDB(); clearPOSCart();
      toast(`Transaksi Rp${total.toLocaleString()} berhasil dicatat!`, 'success');
      renderPOS();
    }
    function deductStock(items) {
      items.forEach(it => {
        const recipe = DB.recipes.find(r => r.productId === it.productId);
        if (!recipe) return;
        recipe.items.forEach(ri => {
          const ing = DB.ingredients.find(i => i.id === ri.ingId);
          if (ing) { ing.stock = Math.max(0, ing.stock - ri.qty * it.qty); }
        });
      });
      updateBadgeStock();
    }

    // ===================== ORDERS =====================
    function renderOrders() {
      const pending = DB.orders.filter(o => o.status === 'pending').length;
      document.getElementById('main-content').innerHTML = `
    ${pending ? `<div class="alert alert-warning"><i class="fas fa-bell"></i><div><strong>${pending} pesanan baru</strong> menunggu konfirmasi Anda</div></div>` : ''}
    <div class="tabs">
      <div class="tab active" onclick="switchOrderTab('semua',this)">Semua</div>
      <div class="tab" onclick="switchOrderTab('pending',this)">Menunggu</div>
      <div class="tab" onclick="switchOrderTab('proses',this)">Diproses</div>
      <div class="tab" onclick="switchOrderTab('selesai',this)">Selesai</div>
    </div>
    <div id="orders-list"></div>
  `;
      renderOrderList('semua');
    }
    function switchOrderTab(status, el) {
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      renderOrderList(status);
    }
    function renderOrderList(status) {
      const orders = status === 'semua' ? DB.orders : DB.orders.filter(o => o.status === status);
      const el = document.getElementById('orders-list');
      if (!orders.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tidak ada pesanan</p></div>'; return }
      el.innerHTML = orders.slice().reverse().map(o => {
        const prod_names = o.items.map(it => { const p = DB.products.find(x => x.id === it.productId); return p ? `${p.name}x${it.qty}` : '' }).filter(Boolean).join(', ');
        return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-weight:600;font-size:15px">${o.customerName}</div><div style="font-size:12px;color:var(--gray-400)">${new Date(o.date).toLocaleString('id-ID')} · ${o.payment || 'transfer'}</div></div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${o.status === 'selesai' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info'}">${o.status}</span>
          <span class="badge ${o.paymentStatus === 'lunas' ? 'badge-success' : 'badge-danger'}">${o.paymentStatus || 'menunggu'}</span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:8px"><i class="fas fa-list" style="margin-right:6px"></i>${prod_names}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:700;font-size:16px;color:var(--emerald)">${fmt(o.total)}</div>
        <div style="display:flex;gap:6px">
          ${o.wa ? `<a href="https://wa.me/${o.wa.replace(/\D/g, '')}" target="_blank" class="btn-secondary btn-sm"><i class="fab fa-whatsapp" style="color:#25D366"></i> WA</a>` : ''}
          ${o.status !== 'selesai' ? `<button class="btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','proses')" style="${o.status === 'proses' ? 'display:none' : ''}">Proses</button><button class="btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','selesai')">Selesai</button>` : ''}
        </div>
      </div>
    </div>`;
      }).join('');
    }
    function updateOrderStatus(id, status) {
      const o = DB.orders.find(x => x.id === id);
      if (o) {
        o.status = status;
        if (status === 'selesai') {
          o.paymentStatus = 'lunas';
          DB.transactions.push({ id: 't' + Date.now(), date: new Date().toISOString().split('T')[0], items: o.items, total: o.total, status: 'lunas', source: 'online', customer: o.customerName });
          deductStock(o.items);
        }
        saveDB(); toast(`Pesanan ditandai: ${status}`, 'success');
        renderOrders(); updateBadgeOrders();
      }
    }
    function updateBadgeOrders() {
      const b = document.getElementById('badge-orders');
      const n = DB.orders.filter(o => o.status === 'pending').length;
      if (b) { b.textContent = n; b.style.display = n ? 'inline-flex' : 'none'; }
    }
    function updateBadgeStock() {
      const b = document.getElementById('badge-stock');
      const low = DB.ingredients.filter(i => i.stock <= i.minStock).length;
      if (b) b.style.display = low ? 'inline-flex' : 'none';
    }
    function checkLowStock() {
      const low = DB.ingredients.filter(i => i.stock <= i.minStock);
      if (low.length) toast(`Stok menipis: ${low.map(i => i.name).join(', ')}`, 'warning');
      else toast('Semua stok aman', 'success');
    }


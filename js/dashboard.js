    // ===================== DASHBOARD =====================
    function renderDashboard() {
      const today = new Date().toISOString().split('T')[0];
      const todayTx = DB.transactions.filter(t => t.date === today);
      const todayOrders = DB.orders.filter(o => o.date.startsWith(today));
      const totalOmzet = todayTx.reduce((s, t) => s + t.total, 0) + todayOrders.filter(o => o.paymentStatus === 'lunas').reduce((s, o) => s + o.total, 0);
      const totalOrders = todayTx.length + todayOrders.length;
      const expenses = DB.expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
      const hpp = calcTotalHPP(todayTx);
      const grossProfit = totalOmzet - hpp;
      const netProfit = grossProfit - expenses;

      // Weekly data
      const weekSales = []; const weekLabels = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const s = DB.transactions.filter(t => t.date === d).reduce((a, t) => a + t.total, 0);
        weekSales.push(s); weekLabels.push(d.split('-')[2] + '/' + d.split('-')[1]);
      }
      const maxSale = Math.max(...weekSales, 1);

      // Top products
      const prodCount = {};
      DB.transactions.forEach(t => t.items.forEach(it => { prodCount[it.productId] = (prodCount[it.productId] || 0) + it.qty }));
      const topProds = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => ({ prod: DB.products.find(p => p.id === id), qty })).filter(x => x.prod);

      // Low stock
      const lowStock = DB.ingredients.filter(i => i.stock <= i.minStock);

      document.getElementById('main-content').innerHTML = `
    ${lowStock.length ? `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i><div><strong>Stok Menipis!</strong> ${lowStock.map(i => `${i.name} (${i.stock} ${i.unit})`).join(', ')}</div></div>` : ''}
    <div class="stat-grid">
      <div class="stat-card emerald"><div class="stat-label">Omzet Hari Ini</div><div class="stat-value">${fmt(totalOmzet)}</div><div class="stat-sub"><i class="fas fa-arrow-up" style="color:var(--success)"></i> Dari ${totalOrders} transaksi</div><i class="fas fa-coins stat-icon"></i></div>
      <div class="stat-card gold"><div class="stat-label">Gross Profit</div><div class="stat-value">${fmt(grossProfit)}</div><div class="stat-sub">Margin ${totalOmzet ? Math.round(grossProfit / totalOmzet * 100) : 0}%</div><i class="fas fa-chart-line stat-icon"></i></div>
      <div class="stat-card blue"><div class="stat-label">Net Profit</div><div class="stat-value">${fmt(netProfit)}</div><div class="stat-sub">Setelah biaya ops ${fmt(expenses)}</div><i class="fas fa-piggy-bank stat-icon"></i></div>
      <div class="stat-card danger"><div class="stat-label">Total Pesanan</div><div class="stat-value">${totalOrders}</div><div class="stat-sub">${todayOrders.filter(o => o.status === 'pending').length} menunggu konfirmasi</div><i class="fas fa-shopping-bag stat-icon"></i></div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px" class="responsive-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Penjualan 7 Hari Terakhir</div></div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding-top:10px">
          ${weekSales.map((s, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="font-size:10px;color:var(--gray-400)">${s ? fmt(s) : ''}</div>
            <div class="chart-bar" style="width:100%;height:${Math.max(4, s / maxSale * 140)}px;background:${i === 6 ? 'var(--emerald)' : 'var(--emerald-light)'}"></div>
            <div style="font-size:11px;color:var(--gray-400)">${weekLabels[i]}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Produk Terlaris</div></div>
        ${topProds.length ? topProds.map((x, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
          <div style="width:24px;height:24px;background:var(--emerald-light);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--emerald);flex-shrink:0">${i + 1}</div>
          <div style="flex:1;font-size:13px;font-weight:500">${x.prod.name}</div>
          <div style="font-size:13px;color:var(--gray-400)">${x.qty}x</div>
        </div>`).join('') : `<div class="empty-state" style="padding:20px"><i class="fas fa-chart-bar"></i><p>Belum ada data</p></div>`}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="responsive-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Pesanan Terbaru</div><button class="btn-sm btn-secondary" onclick="navigate('orders')">Lihat Semua</button></div>
        ${DB.orders.slice(-5).reverse().map(o => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
          <div style="flex:1"><div style="font-size:13px;font-weight:500">${o.customerName}</div><div style="font-size:11px;color:var(--gray-400)">${fmt(o.total)}</div></div>
          <span class="badge ${o.status === 'selesai' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info'}">${o.status}</span>
        </div>`).join('') || '<div class="empty-state" style="padding:20px"><i class="fas fa-inbox"></i><p>Belum ada pesanan</p></div>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Ringkasan Stok</div><button class="btn-sm btn-secondary" onclick="navigate('inventory')">Detail</button></div>
        ${DB.ingredients.slice(0, 5).map(i => `<div style="padding:8px 0;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:13px;font-weight:500">${i.name}</span>
            <span style="font-size:12px;color:${i.stock <= i.minStock ? 'var(--danger)' : 'var(--gray-400)'}">${i.stock} ${i.unit}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, i.stock / Math.max(i.minStock * 3, 1) * 100)}%;background:${i.stock <= i.minStock ? 'var(--danger)' : 'var(--emerald)'}"></div></div>
        </div>`).join('')}
      </div>
    </div>
  `;
      document.querySelectorAll('.responsive-grid').forEach(g => { if (window.innerWidth < 640) g.style.gridTemplateColumns = '1fr' });
    }

    function calcTotalHPP(transactions) {
      let total = 0;
      transactions.forEach(t => {
        t.items.forEach(it => {
          const recipe = DB.recipes.find(r => r.productId === it.productId);
          if (!recipe) return;
          let hpp = 0;
          recipe.items.forEach(ri => {
            const ing = DB.ingredients.find(i => i.id === ri.ingId);
            if (ing) hpp += ing.price * ri.qty;
          });
          total += hpp * it.qty;
        });
      });
      return total;
    }

    // ===================== LANDING PAGE =====================
    function openLandingPage() {
      window.open('https://aswinm-shuai.github.io/srisoengkem/', '_blank');
    }
    function closeLandingPage() {
      const lpView = document.getElementById('landing-page-view');
      if (lpView) lpView.style.display = 'none';
    }

    // ===================== ORDER PAGE =====================
    function openOrderPage() {
      window.open('https://aswinm-shuai.github.io/srisoengkem/#menu', '_blank');
    }
    function closeOrderPage() {
      const opView = document.getElementById('order-page-view');
      const lpView = document.getElementById('landing-page-view');
      if (opView) opView.style.display = 'none';
      if (lpView) lpView.style.display = 'none';
    }
    function renderOrderMenuGrid() {
      const g = document.getElementById('order-menu-grid'); if (!g) return;
      const prods = DB.products.filter(p => p.available);
      g.innerHTML = prods.map(p => `<div class="product-card">
    <div class="product-img">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : `<span style="font-size:48px">${p.emoji || '🍽️'}</span>`}</div>
    <div class="product-info">
      <div class="product-name">${p.name}</div>
      <div class="product-price">${fmt(p.price)}</div>
      <div style="font-size:12px;color:var(--gray-400);margin-top:4px;line-height:1.4">${p.desc || ''}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
        ${cart[p.id] ? `<button onclick="changeCartQty('${p.id}',-1)" style="width:30px;height:30px;border-radius:50%;border:1px solid var(--gray-200);background:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">−</button>
        <span style="font-weight:600;min-width:20px;text-align:center">${cart[p.id]}</span>
        <button onclick="changeCartQty('${p.id}',1)" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--emerald);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">+</button>` : `<button onclick="changeCartQty('${p.id}',1)" style="flex:1;background:var(--emerald);color:#fff;border:none;padding:8px;border-radius:var(--radius);cursor:pointer;font-weight:500"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah</button>`}
      </div>
    </div>
  </div>`).join('') || '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-utensils"></i><p>Belum ada menu tersedia</p></div>';
      updateCartBubble();
    }
    function filterOrderMenu(v) {
      const prods = DB.products.filter(p => p.available && p.name.toLowerCase().includes(v.toLowerCase()));
      const g = document.getElementById('order-menu-grid'); if (!g) return;
      // Re-render filtered
      document.getElementById('order-search').value = v;
      renderOrderMenuGrid_filtered(prods);
    }
    function renderOrderMenuGrid_filtered(prods) {
      const g = document.getElementById('order-menu-grid'); if (!g) return;
      g.innerHTML = prods.map(p => `<div class="product-card">
    <div class="product-img">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : `<span style="font-size:48px">${p.emoji || '🍽️'}</span>`}</div>
    <div class="product-info">
      <div class="product-name">${p.name}</div>
      <div class="product-price">${fmt(p.price)}</div>
      <div style="font-size:12px;color:var(--gray-400);margin-top:4px;line-height:1.4">${p.desc || ''}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
        ${cart[p.id] ? `<button onclick="changeCartQty('${p.id}',-1)" style="width:30px;height:30px;border-radius:50%;border:1px solid var(--gray-200);background:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">−</button>
        <span style="font-weight:600;min-width:20px;text-align:center">${cart[p.id]}</span>
        <button onclick="changeCartQty('${p.id}',1)" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--emerald);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">+</button>` : `<button onclick="changeCartQty('${p.id}',1)" style="flex:1;background:var(--emerald);color:#fff;border:none;padding:8px;border-radius:var(--radius);cursor:pointer;font-weight:500"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah</button>`}
      </div>
    </div>
  </div>`).join('') || '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-utensils"></i><p>Tidak ada menu ditemukan</p></div>';
    }
    function changeCartQty(id, delta) {
      cart[id] = (cart[id] || 0) + delta;
      if (cart[id] <= 0) delete cart[id];
      renderOrderMenuGrid();
    }
    function updateCartBubble() {
      const total = Object.values(cart).reduce((s, v) => s + v, 0);
      const b = document.getElementById('cart-bubble'); const c = document.getElementById('cart-count');
      if (b) { b.style.display = total > 0 ? 'flex' : 'none'; }
      if (c) c.textContent = total;
    }
    function goToCheckout() {
      if (!Object.keys(cart).length) { toast('Keranjang kosong', 'warning'); return }
      document.getElementById('order-step-menu').style.display = 'none';
      document.getElementById('order-step-checkout').style.display = 'block';
      const el = document.getElementById('checkout-items');
      let total = 0;
      el.innerHTML = Object.entries(cart).map(([id, qty]) => {
        const p = DB.products.find(x => x.id === id); if (!p) return '';
        total += p.price * qty;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-100)">
      <div style="font-size:20px">${p.emoji || '🍽️'}</div>
      <div style="flex:1"><div style="font-weight:500">${p.name}</div><div style="font-size:12px;color:var(--gray-400)">${fmt(p.price)} x ${qty}</div></div>
      <div style="font-weight:600;color:var(--emerald)">${fmt(p.price * qty)}</div>
    </div>`;
      }).join('');
      document.getElementById('checkout-total').textContent = fmt(total);
      document.getElementById('cart-bubble').style.display = 'none';
    }
    function backToMenu() {
      document.getElementById('order-step-menu').style.display = 'block';
      document.getElementById('order-step-checkout').style.display = 'none';
      updateCartBubble();
    }
    function getLocation() {
      if (!navigator.geolocation) { toast('Geolokasi tidak didukung', 'warning'); return }
      navigator.geolocation.getCurrentPosition(pos => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        document.getElementById('cust-maps').value = url;
        toast('Lokasi berhasil didapat', 'success');
      }, () => toast('Gagal mendapatkan lokasi', 'danger'));
    }
    function submitOrder() {
      const name = document.getElementById('cust-name').value.trim();
      const wa = document.getElementById('cust-wa').value.trim();
      const addr = document.getElementById('cust-addr').value.trim();
      if (!name || !wa || !addr) { toast('Nama, WhatsApp, dan alamat wajib diisi', 'warning'); return }
      const payment = document.querySelector('input[name="payment"]:checked')?.value || 'transfer';
      const items = Object.entries(cart).map(([id, qty]) => { const p = DB.products.find(x => x.id === id); return { productId: id, qty, price: p?.price || 0 } });
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const order = { id: 'o' + Date.now(), date: new Date().toISOString(), customerName: name, wa, address: addr, mapsLink: document.getElementById('cust-maps')?.value || '', note: document.getElementById('cust-note')?.value || '', items, total, payment, status: 'pending', paymentStatus: 'menunggu' };
      DB.orders.push(order);
      // Add/update customer
      const existing = DB.customers.find(c => c.wa === wa);
      if (existing) { existing.totalOrders++; existing.totalSpent += total }
      else DB.customers.push({ id: 'c' + Date.now(), name, wa, address: addr, totalOrders: 1, totalSpent: total });
      saveDB(); updateBadgeOrders();
      // Build WA message
      const itemList = items.map(it => { const p = DB.products.find(x => x.id === it.productId); return `- ${p?.name || '?'} x${it.qty} = ${fmt(it.price * it.qty)}` }).join('%0A');
      const maps = order.mapsLink ? `%0A📍 Lokasi: ${encodeURIComponent(order.mapsLink)}` : '';
      const msg = `🛒 *PESANAN BARU - Syncro OS*%0A%0A👤 Nama: ${encodeURIComponent(name)}%0A📱 WA: ${wa}%0A🏠 Alamat: ${encodeURIComponent(addr)}${maps}%0A%0A📦 *Detail Pesanan:*%0A${itemList}%0A%0A💰 *Total: ${fmt(total)}*%0A💳 Pembayaran: ${payment.toUpperCase()}%0A%0A✅ Status: Sudah Bayar%0A%0A_Dikirim via Syncro OS_`;
      cart = {};
      window.open(`https://wa.me/${DB.settings.waNumber}?text=${msg}`, '_blank');
      toast('Pesanan berhasil dikirim! Mengarahkan ke WhatsApp...', 'success');
      setTimeout(closeOrderPage, 2000);
    }


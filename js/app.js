    // ===================== DATA STORE =====================
    let DB = {
      users: [],
      products: [],
      ingredients: [],
      recipes: [],
      orders: [],
      transactions: [],
      procurement: [],
      expenses: [],
      customers: [],
      inventory: [],
      settings: { bizName: 'Warung Syncro', bizDesc: 'Makanan Lezat, Pesan Online', waNumber: '6281234567890', address: 'Jl. Contoh No. 1', tagline: 'Makanan Lezat, Pesan Online' }
    };
    let currentUser = null;
    let cart = {};
    let currentPage = 'dashboard';
    let editingId = null;
    let auditLog = [];

    // ===================== FIREBASE BRIDGE =====================
    let isFirebaseReady = false;
    setTimeout(() => {
      if (window.db) {
        isFirebaseReady = true;
        initFirebaseListeners();
      }
    }, 1000);

    function initFirebaseListeners() {
      if (!window.db) return;

      // Listen for Orders from Landing Page
      window.fbOnSnapshot(window.fbCollection(window.db, 'orders'), (snapshot) => {
        let hasNewData = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const idx = DB.orders.findIndex(o => o.id === data.id);
            if (idx >= 0) {
              // Ignore updates if they match exactly to avoid loops, or just update
              if (JSON.stringify(DB.orders[idx]) !== JSON.stringify(data)) {
                DB.orders[idx] = data;
                hasNewData = true;
              }
            } else {
              DB.orders.push(data);
              hasNewData = true;
            }
          }
        });
        if (hasNewData) {
          localStorage.setItem('syncro_db', JSON.stringify(DB));
          if (currentPage === 'dashboard') renderDashboard();
          if (currentPage === 'orders') renderOrders();
          updateBadgeOrders();
        }
      });

      // Listen for Customers
      window.fbOnSnapshot(window.fbCollection(window.db, 'customers'), (snapshot) => {
        let hasNewData = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const idx = DB.customers.findIndex(c => c.id === data.id);
            if (idx >= 0) {
              if (JSON.stringify(DB.customers[idx]) !== JSON.stringify(data)) {
                DB.customers[idx] = data;
                hasNewData = true;
              }
            } else {
              DB.customers.push(data);
              hasNewData = true;
            }
          }
        });
        if (hasNewData) {
          localStorage.setItem('syncro_db', JSON.stringify(DB));
          if (currentPage === 'customers') renderCustomers();
        }
      });
    }

    async function syncToFirebase() {
      if (!isFirebaseReady || !window.db) return;
      try {
        const batch = window.fbWriteBatch(window.db);

        // Sync Products
        DB.products.forEach(p => {
          const ref = window.fbDoc(window.db, 'products', p.id);
          batch.set(ref, p);
        });

        // Sync Orders
        DB.orders.forEach(o => {
          const ref = window.fbDoc(window.db, 'orders', o.id);
          batch.set(ref, o);
        });

        // Sync Customers
        DB.customers.forEach(c => {
          const ref = window.fbDoc(window.db, 'customers', c.id);
          batch.set(ref, c);
        });

        // Sync Settings
        if (DB.settings) {
          const settingsRef = window.fbDoc(window.db, 'settings', 'store');
          batch.set(settingsRef, DB.settings);
        }

        await batch.commit();
      } catch (e) {
        console.error("Firebase Sync Error: ", e);
      }
    }

    // ===================== DATA STORE =====================
    function loadDB() {
      const saved = localStorage.getItem('syncro_db');
      if (saved) DB = { ...DB, ...JSON.parse(saved) };
      const session = localStorage.getItem('syncro_session');
      if (session) currentUser = JSON.parse(session);
    }

    function saveDB() {
      localStorage.setItem('syncro_db', JSON.stringify(DB));
      syncToFirebase(); // Sync to Firestore whenever DB changes
    }

    function saveSession() { localStorage.setItem('syncro_session', JSON.stringify(currentUser)) }
    function clearSession() { localStorage.removeItem('syncro_session') }
    function log(action, detail) { auditLog.push({ time: new Date().toISOString(), user: currentUser?.name, action, detail }) }

    function initDemoData() {
      if (DB.users.length === 0) {
        DB.users.push({ id: 'u1', name: 'Admin Syncro', email: 'admin@syncro.id', password: btoa('admin123'), role: 'admin', business: 'Warung Syncro' });
        DB.users.push({ id: 'u2', name: 'Staff 1', email: 'staff@syncro.id', password: btoa('staff123'), role: 'staff', business: 'Warung Syncro' });
      }
      if (DB.ingredients.length === 0) {
        DB.ingredients = [
          { id: 'i1', name: 'Beras', unit: 'gram', price: 0, stock: 5000, minStock: 1000 },
          { id: 'i2', name: 'Ayam', unit: 'gram', price: 0, stock: 2000, minStock: 500 },
          { id: 'i3', name: 'Minyak Goreng', unit: 'ml', price: 0, stock: 3000, minStock: 500 },
          { id: 'i4', name: 'Bumbu Nasi Goreng', unit: 'pcs', price: 0, stock: 20, minStock: 5 },
          { id: 'i5', name: 'Telur', unit: 'pcs', price: 0, stock: 30, minStock: 10 },
          { id: 'i6', name: 'Garam', unit: 'gram', price: 0, stock: 1000, minStock: 200 },
        ];
      }
      if (DB.products.length === 0) {
        DB.products = [
          { id: 'p1', name: 'Nasi Goreng Spesial', price: 18000, desc: 'Nasi goreng dengan bumbu rahasia, telur, dan ayam suwir', category: 'Makanan', available: true, emoji: '🍳', hpp: 0 },
          { id: 'p2', name: 'Ayam Bakar', price: 25000, desc: 'Ayam bakar dengan bumbu rempah pilihan', category: 'Makanan', available: true, emoji: '🍗', hpp: 0 },
          { id: 'p3', name: 'Es Teh Manis', price: 5000, desc: 'Teh manis segar dengan es batu', category: 'Minuman', available: true, emoji: '🧋', hpp: 0 },
          { id: 'p4', name: 'Nasi Putih', price: 5000, desc: 'Nasi putih pulen', category: 'Makanan', available: true, emoji: '🍚', hpp: 0 },
          { id: 'p5', name: 'Sop Ayam', price: 20000, desc: 'Sop ayam hangat dengan sayuran segar', category: 'Makanan', available: true, emoji: '🍲', hpp: 0 },
        ];
      }
      if (DB.recipes.length === 0) {
        DB.recipes = [
          { id: 'r1', productId: 'p1', items: [{ ingId: 'i1', qty: 200 }, { ingId: 'i5', qty: 1 }, { ingId: 'i2', qty: 100 }, { ingId: 'i3', qty: 20 }, { ingId: 'i4', qty: 1 }] },
          { id: 'r2', productId: 'p2', items: [{ ingId: 'i2', qty: 250 }, { ingId: 'i3', qty: 15 }] },
        ];
      }
      if (DB.procurement.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        DB.procurement = [
          { id: 'pr1', date: yesterday, supplier: 'Pasar Tradisional', items: [{ ingId: 'i1', qty: 10000, unit: 'gram', totalPrice: 90000 }, { ingId: 'i6', qty: 500, unit: 'gram', totalPrice: 5000 }] },
          { id: 'pr2', date: yesterday, supplier: 'Peternakan Maju', items: [{ ingId: 'i2', qty: 3000, unit: 'gram', totalPrice: 120000 }, { ingId: 'i5', qty: 30, unit: 'pcs', totalPrice: 45000 }] },
          { id: 'pr3', date: today, supplier: 'Toko Minyak', items: [{ ingId: 'i3', qty: 5000, unit: 'ml', totalPrice: 60000 }, { ingId: 'i4', qty: 30, unit: 'pcs', totalPrice: 30000 }] },
        ];
        updateIngredientPrices();
      }
      if (DB.transactions.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        DB.transactions = [
          { id: 't1', date: today, items: [{ productId: 'p1', qty: 3, price: 18000 }, { productId: 'p3', qty: 3, price: 5000 }], total: 69000, status: 'lunas', source: 'kasir' },
          { id: 't2', date: today, items: [{ productId: 'p2', qty: 2, price: 25000 }, { productId: 'p4', qty: 2, price: 5000 }], total: 60000, status: 'lunas', source: 'kasir' },
          { id: 't3', date: today, items: [{ productId: 'p5', qty: 1, price: 20000 }, { productId: 'p3', qty: 1, price: 5000 }], total: 25000, status: 'lunas', source: 'online' },
        ];
      }
      if (DB.expenses.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        DB.expenses = [
          { id: 'e1', date: today, category: 'Listrik', desc: 'Tagihan listrik bulan ini', amount: 300000 },
          { id: 'e2', date: today, category: 'Gaji', desc: 'Gaji karyawan', amount: 1500000 },
        ];
      }
      if (DB.orders.length === 0) {
        DB.orders = [
          { id: 'o1', date: new Date().toISOString(), customerName: 'Budi Santoso', wa: '081234567890', address: 'Jl. Mawar No.5', items: [{ productId: 'p1', qty: 2, price: 18000 }, { productId: 'p3', qty: 2, price: 5000 }], total: 46000, payment: 'transfer', status: 'pending', paymentStatus: 'menunggu' },
        ];
      }
      if (DB.customers.length === 0) {
        DB.customers = [
          { id: 'c1', name: 'Budi Santoso', wa: '081234567890', address: 'Jl. Mawar No.5', totalOrders: 3, totalSpent: 138000 },
          { id: 'c2', name: 'Siti Rahayu', wa: '082345678901', address: 'Jl. Melati No.3', totalOrders: 5, totalSpent: 230000 },
        ];
      }
      saveDB();
    }

    // ===================== AUTH =====================
    function switchAuthTab(t) {
      document.querySelectorAll('.auth-tab').forEach(x => x.classList.toggle('active', x.textContent.trim() === (t === 'login' ? 'Masuk' : 'Daftar')));
      document.getElementById('login-form').style.display = t === 'login' ? 'block' : 'none';
      document.getElementById('register-form').style.display = t === 'register' ? 'block' : 'none';
    }
    function togglePwd(id, icon) {
      const inp = document.getElementById(id);
      if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; icon.style.cssText = icon.style.cssText }
      else { inp.type = 'password'; icon.className = 'fas fa-eye' }
    }
    function showForgotPwd() {
      const email = prompt('Masukkan email Anda:');
      if (email) {
        const u = DB.users.find(x => x.email === email);
        if (u) toast('Link reset password telah "dikirim" ke ' + email, 'success');
        else toast('Email tidak ditemukan', 'danger');
      }
    }
    function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const pwd = document.getElementById('login-password').value;
      const remember = document.getElementById('remember-me').checked;
      if (!email || !pwd) { toast('Isi email dan password', 'warning'); return }
      if (!/\S+@\S+\.\S+/.test(email)) { toast('Email tidak valid', 'warning'); return }
      const user = DB.users.find(u => u.email === email && u.password === btoa(pwd));
      if (!user) { toast('Email atau password salah', 'danger'); return }
      currentUser = user;
      if (remember) saveSession();
      log('LOGIN', 'User masuk: ' + email);
      startApp();
    }
    function doRegister() {
      const name = document.getElementById('reg-name').value.trim();
      const biz = document.getElementById('reg-business').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pwd = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;
      if (!name || !email || !pwd) { toast('Semua field wajib diisi', 'warning'); return }
      if (!/\S+@\S+\.\S+/.test(email)) { toast('Email tidak valid', 'warning'); return }
      if (pwd.length < 6) { toast('Password minimal 6 karakter', 'warning'); return }
      if (DB.users.find(u => u.email === email)) { toast('Email sudah terdaftar', 'danger'); return }
      const u = { id: 'u' + Date.now(), name, email, password: btoa(pwd), role, business: biz || name };
      DB.users.push(u); saveDB();
      toast('Akun berhasil dibuat! Silakan login.', 'success');
      switchAuthTab('login');
      document.getElementById('login-email').value = email;
    }
    function doLogout() {
      if (!confirm('Yakin ingin logout?')) return;
      clearSession(); currentUser = null; cart = {};
      document.getElementById('app').style.display = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      log('LOGOUT', 'User keluar');
    }
    function startApp() {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.getElementById('sidebar-name').textContent = currentUser.name;
      document.getElementById('sidebar-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
      document.getElementById('sidebar-avatar').textContent = currentUser.name[0].toUpperCase();
      updateBadgeOrders(); updateBadgeStock();
      navigate('dashboard');
    }

    // ===================== NAVIGATION =====================
    function navigate(page) {
      currentPage = page;
      document.querySelectorAll('.nav-item').forEach(x => {
        x.classList.toggle('active', x.getAttribute('onclick') === `navigate('${page}')`);
      });
      const titles = { dashboard: 'Dashboard', products: 'Menu & Produk', ingredients: 'Master Bahan', recipes: 'Resep & HPP', orders: 'Pesanan Online', pos: 'Point of Sale', procurement: 'Pengadaan Bahan', expenses: 'Biaya Operasional', reports: 'Laporan', customers: 'Data Pelanggan', landing: 'Pengaturan Landing Page', inventory: 'Inventaris Stok', profile: 'Profil', settings: 'Pengaturan' };
      document.getElementById('topbar-title').textContent = titles[page] || page;
      const content = document.getElementById('main-content');
      content.innerHTML = '';
      closeSidebar();
      const pages = { dashboard: renderDashboard, products: renderProducts, ingredients: renderIngredients, recipes: renderRecipes, orders: renderOrders, pos: renderPOS, procurement: renderProcurement, expenses: renderExpenses, reports: renderReports, customers: renderCustomers, landing: renderLanding, inventory: renderInventory, profile: renderProfile, settings: renderSettings };
      if (pages[page]) pages[page]();
    }
    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('show');
    }
    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('show');
    }

    // ===================== HELPERS =====================
    function fmt(n) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') }
    function fmtSmall(n) { if (n >= 1000) return 'Rp ' + Math.round(n).toLocaleString('id-ID'); return 'Rp ' + n.toFixed(1) }
    function showModal(html) {
      let m = document.getElementById('modal-backdrop');
      if (!m) { m = document.createElement('div'); m.id = 'modal-backdrop'; m.className = 'modal-backdrop'; document.body.appendChild(m); }
      m.innerHTML = `<div class="modal">${html}</div>`;
      m.style.display = 'flex';
      m.onclick = e => { if (e.target === m) closeModal() };
    }
    function closeModal() { const m = document.getElementById('modal-backdrop'); if (m) m.style.display = 'none'; }
    function toast(msg, type = '') {
      const t = document.getElementById('toast');
      t.textContent = msg; t.className = 'toast show';
      if (type) t.classList.add('toast-' + type);
      setTimeout(() => t.className = 'toast', 3000);
    }
    function toggleDark() {
      const d = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', d ? '' : 'dark');
      document.getElementById('dark-icon').className = d ? 'fas fa-moon' : 'fas fa-sun';
      localStorage.setItem('syncro_theme', d ? '' : 'dark');
    }

    // ===================== PWA =====================
    const swCode = `
self.addEventListener('install',e=>{e.waitUntil(caches.open('syncro-v1').then(c=>c.addAll(['${location.pathname}'])))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
`;
    const manifestData = { name: 'Syncro OS', short_name: 'Syncro', description: 'Business Operations in Sync.', start_url: '.', display: 'standalone', background_color: '#FFFFFF', theme_color: '#0F6A4A', icons: [{ src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230F6A4A"/><text y=".9em" font-size="80" x="10">S</text></svg>', sizes: '192x192', type: 'image/svg+xml' }] };

    // ===================== INIT =====================
    function init() {
      loadDB();
      initDemoData();
      const theme = localStorage.getItem('syncro_theme');
      if (theme) { document.documentElement.setAttribute('data-theme', theme); if (theme === 'dark') document.getElementById('dark-icon').className = 'fas fa-sun'; }
      // Register SW
      if ('serviceWorker' in navigator) {
        const blob = new Blob([swCode], { type: 'application/javascript' });
        navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => { });
      }
      // Inject manifest
      const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
      document.getElementById('manifest-link').href = URL.createObjectURL(manifestBlob);
      // Auto-login
      if (currentUser) { startApp(); }
    }
    document.addEventListener('DOMContentLoaded', init);

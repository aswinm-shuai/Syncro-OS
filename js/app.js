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
    window.unsubscribers = [];
    setTimeout(() => { if (window.db) isFirebaseReady = true; }, 1000);

    function initFirebaseListeners() {
      if (!window.db) return;
      if (window.unsubscribers) window.unsubscribers.forEach(u => u());
      window.unsubscribers = [];


      // Listen for Transactions
      window.unsubscribers.push(window.fbOnSnapshot(window.fbCollection(window.db, 'transactions'), (snapshot) => {
        let hasNew = false;
        snapshot.docChanges().forEach((c) => {
          if (c.type === 'added' || c.type === 'modified') {
            const data = c.doc.data();
            const idx = DB.transactions.findIndex(x => x.id === data.id);
            if (idx >= 0) { if (JSON.stringify(DB.transactions[idx]) !== JSON.stringify(data)) { DB.transactions[idx] = data; hasNew = true; } }
            else { DB.transactions.push(data); hasNew = true; }
          } else if (c.type === 'removed') {
            DB.transactions = DB.transactions.filter(x => x.id !== c.doc.id); hasNew = true;
          }
        });
        if (hasNew) { localStorage.setItem('syncro_db', JSON.stringify(DB)); if (currentPage === 'dashboard') renderDashboard(); if (currentPage === 'reports') renderReports(); }
      }));
      // Listen for Procurement
      window.unsubscribers.push(window.fbOnSnapshot(window.fbCollection(window.db, 'procurement'), (snapshot) => {
        let hasNew = false;
        snapshot.docChanges().forEach((c) => {
          if (c.type === 'added' || c.type === 'modified') {
            const data = c.doc.data();
            const idx = DB.procurement.findIndex(x => x.id === data.id);
            if (idx >= 0) { if (JSON.stringify(DB.procurement[idx]) !== JSON.stringify(data)) { DB.procurement[idx] = data; hasNew = true; } }
            else { DB.procurement.push(data); hasNew = true; }
          } else if (c.type === 'removed') {
            DB.procurement = DB.procurement.filter(x => x.id !== c.doc.id); hasNew = true;
          }
        });
        if (hasNew) { localStorage.setItem('syncro_db', JSON.stringify(DB)); if (currentPage === 'dashboard') renderDashboard(); if (currentPage === 'procurement') renderProcurement(); }
      }));
      // Listen for Expenses
      window.unsubscribers.push(window.fbOnSnapshot(window.fbCollection(window.db, 'expenses'), (snapshot) => {
        let hasNew = false;
        snapshot.docChanges().forEach((c) => {
          if (c.type === 'added' || c.type === 'modified') {
            const data = c.doc.data();
            const idx = DB.expenses.findIndex(x => x.id === data.id);
            if (idx >= 0) { if (JSON.stringify(DB.expenses[idx]) !== JSON.stringify(data)) { DB.expenses[idx] = data; hasNew = true; } }
            else { DB.expenses.push(data); hasNew = true; }
          } else if (c.type === 'removed') {
            DB.expenses = DB.expenses.filter(x => x.id !== c.doc.id); hasNew = true;
          }
        });
        if (hasNew) { localStorage.setItem('syncro_db', JSON.stringify(DB)); if (currentPage === 'dashboard') renderDashboard(); if (currentPage === 'expenses') renderExpenses(); }
      }));


      // Listen for Orders from Landing Page
      window.unsubscribers.push(window.fbOnSnapshot(window.fbCollection(window.db, 'orders'), (snapshot) => {
        let hasNewData = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const idx = DB.orders.findIndex(o => o.id === data.id);
            if (idx >= 0) {
              if (JSON.stringify(DB.orders[idx]) !== JSON.stringify(data)) { DB.orders[idx] = data; hasNewData = true; }
            } else { DB.orders.push(data); hasNewData = true; }
          } else if (change.type === 'removed') {
            DB.orders = DB.orders.filter(x => x.id !== change.doc.id); hasNewData = true;
          }
        });
        if (hasNewData) {
          localStorage.setItem('syncro_db', JSON.stringify(DB));
          if (currentPage === 'dashboard') renderDashboard();
          if (currentPage === 'orders') renderOrders();
          updateBadgeOrders();
        }
      }));

      // Listen for Customers
      window.unsubscribers.push(window.fbOnSnapshot(window.fbCollection(window.db, 'customers'), (snapshot) => {
        let hasNewData = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const idx = DB.customers.findIndex(c => c.id === data.id);
            if (idx >= 0) {
              if (JSON.stringify(DB.customers[idx]) !== JSON.stringify(data)) { DB.customers[idx] = data; hasNewData = true; }
            } else { DB.customers.push(data); hasNewData = true; }
          } else if (change.type === 'removed') {
            DB.customers = DB.customers.filter(x => x.id !== change.doc.id); hasNewData = true;
          }
        });
        if (hasNewData) {
          localStorage.setItem('syncro_db', JSON.stringify(DB));
          if (currentPage === 'customers') renderCustomers();
        }
      }));
    }

    async function syncToFirebase() {
      // Dihapus untuk mencegah Quota Exceeded (write loops).
      // Sinkronisasi kini dilakukan secara atomik di masing-masing fungsi save.
    }

    // ===================== DATA STORE =====================
    function loadDB() {
      const saved = localStorage.getItem('syncro_db');
      if (saved) DB = { ...DB, ...JSON.parse(saved) };
    }

    function deleteFromFirestore(col, id) {
      if (window.db) {
        const batch = window.fbWriteBatch(window.db);
        batch.delete(window.fbDoc(window.db, col, id));
        batch.commit().catch(e => console.error("Firebase delete error:", e));
      }
    }

    function saveDB() {
      localStorage.setItem('syncro_db', JSON.stringify(DB));
      syncToFirebase(); // Sync to Firestore whenever DB changes
    }

    function log(action, detail) { auditLog.push({ time: new Date().toISOString(), user: currentUser?.name, action, detail }) }

    function initDemoData() {
      if (localStorage.getItem('syncro_demo_injected')) return;
      if (DB.users.length === 0) {
        DB.users.push({ id: 'u1', name: 'Admin Syncro', email: 'admin@syncro.id', password: btoa('admin123'), role: 'admin', business: 'Warung Syncro' });
        DB.users.push({ id: 'u2', name: 'Staff 1', email: 'staff@syncro.id', password: btoa('staff123'), role: 'staff', business: 'Warung Syncro' });
      }
      if (DB.ingredients.length === 0) {
        DB.ingredients = [
          { id: 'i1', name: 'Beras', unit: 'gram', price: 0, stock: 5000 },
          { id: 'i2', name: 'Ayam', unit: 'gram', price: 0, stock: 2000 },
          { id: 'i3', name: 'Minyak Goreng', unit: 'ml', price: 0, stock: 3000 },
          { id: 'i4', name: 'Bumbu Nasi Goreng', unit: 'pcs', price: 0, stock: 20 },
          { id: 'i5', name: 'Telur', unit: 'pcs', price: 0, stock: 30 },
          { id: 'i6', name: 'Garam', unit: 'gram', price: 0, stock: 1000 },
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
        const today = getLocalDateStr();
        const yesterday = getLocalDateStr(new Date(Date.now() - 86400000));
        DB.procurement = [
          { id: 'pr1', date: yesterday, supplier: 'Pasar Tradisional', items: [{ ingId: 'i1', qty: 10000, unit: 'gram', totalPrice: 90000 }, { ingId: 'i6', qty: 500, unit: 'gram', totalPrice: 5000 }] },
          { id: 'pr2', date: yesterday, supplier: 'Peternakan Maju', items: [{ ingId: 'i2', qty: 3000, unit: 'gram', totalPrice: 120000 }, { ingId: 'i5', qty: 30, unit: 'pcs', totalPrice: 45000 }] },
          { id: 'pr3', date: today, supplier: 'Toko Minyak', items: [{ ingId: 'i3', qty: 5000, unit: 'ml', totalPrice: 60000 }, { ingId: 'i4', qty: 30, unit: 'pcs', totalPrice: 30000 }] },
        ];
        updateIngredientPrices();
      }
      if (DB.transactions.length === 0) {
        const today = getLocalDateStr();
        DB.transactions = [
          { id: 't1', date: today, items: [{ productId: 'p1', qty: 3, price: 18000 }, { productId: 'p3', qty: 3, price: 5000 }], total: 69000, status: 'lunas', source: 'kasir' },
          { id: 't2', date: today, items: [{ productId: 'p2', qty: 2, price: 25000 }, { productId: 'p4', qty: 2, price: 5000 }], total: 60000, status: 'lunas', source: 'kasir' },
          { id: 't3', date: today, items: [{ productId: 'p5', qty: 1, price: 20000 }, { productId: 'p3', qty: 1, price: 5000 }], total: 25000, status: 'lunas', source: 'online' },
        ];
      }
      if (DB.expenses.length === 0) {
        const today = getLocalDateStr();
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
      localStorage.setItem('syncro_demo_injected', 'true');
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
    async function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const pwd = document.getElementById('login-password').value;
      if (!email || !pwd) { toast('Isi email dan password', 'warning'); return }
      if (!/\S+@\S+\.\S+/.test(email)) { toast('Email tidak valid', 'warning'); return }
      
      try {
        await window.fbSignIn(window.auth, email, pwd);
        log('LOGIN', 'User masuk: ' + email);
      } catch (err) {
        console.log("LOGIN ERROR:", err.code || err.message || err);
        toast('Email atau password salah', 'danger');
      }
    }
    async function doRegister() {
      const name = document.getElementById('reg-name').value.trim();
      const biz = document.getElementById('reg-business').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pwd = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;
      if (!name || !email || !pwd) { toast('Semua field wajib diisi', 'warning'); return }
      if (!/\S+@\S+\.\S+/.test(email)) { toast('Email tidak valid', 'warning'); return }
      if (pwd.length < 6) { toast('Password minimal 6 karakter', 'warning'); return }
      
      try {
        const userCred = await window.fbCreateUser(window.auth, email, pwd);
        const user = userCred.user;
        const u = { id: user.uid, name, email, role, business: biz || name };
        
        if (window.db) {
          try { await window.fbSetDoc(window.fbDoc(window.db, 'users', user.uid), u); } catch(e) { console.log("FIRESTORE ERROR:", e.code || e.message || e); }
        }
        
        DB.users.push(u); saveDB();
        toast('Akun berhasil dibuat!', 'success');
      } catch (err) {
        console.log("REGISTER ERROR:", err.code || err.message || err);
        if (err.code === 'auth/email-already-in-use') { toast('Email sudah terdaftar', 'danger'); }
        else { toast('Gagal daftar: ' + err.message, 'danger'); }
      }
    }
    async function doLogout() {
      if (window.unsubscribers) window.unsubscribers.forEach(u => u());
      window.unsubscribers = [];
      if (!confirm('Yakin ingin logout?')) return;
      try { await window.fbSignOut(window.auth); } catch(e) {}
      localStorage.removeItem('syncro_session');
      currentUser = null; cart = {};
      log('LOGOUT', 'User keluar');
    }
    function startApp() {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.getElementById('sidebar-name').textContent = currentUser.name;
      document.getElementById('sidebar-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
      document.getElementById('sidebar-avatar').textContent = currentUser.name[0].toUpperCase();
      updateBadgeOrders(); 
      initFirebaseListeners();
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
    // Manifest and SW are now loaded from separate files

    // ===================== INIT =====================
    function init() {
      localStorage.removeItem('syncro_session');
      loadDB();
      initDemoData();
      cleanupGhostTransactions();
      const theme = localStorage.getItem('syncro_theme');
      if (theme) { document.documentElement.setAttribute('data-theme', theme); if (theme === 'dark') document.getElementById('dark-icon').className = 'fas fa-sun'; }
      
      // Register SW
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('service-worker.js');
        });
      }
      
      // Auth State Listener
      if (window.fbOnAuthStateChanged && window.auth) {
        window.fbOnAuthStateChanged(window.auth, async (user) => {
          if (user) {
            let profile = DB.users.find(u => u.email === user.email);
            if (!profile && window.db) {
               try {
                 const docSnap = await window.fbGetDoc(window.fbDoc(window.db, 'users', user.uid));
                 if (docSnap.exists()) {
                   profile = docSnap.data();
                   DB.users.push(profile);
                   saveDB();
                 }
               } catch(e) {}
            }
            if (profile) {
              currentUser = profile;
            } else {
              currentUser = { id: user.uid, name: user.email.split('@')[0], email: user.email, role: 'staff', business: 'Warung Syncro' };
            }
            startApp();
          } else {
            currentUser = null;
            document.getElementById('app').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
          }
        });
      } else {
        if (currentUser) { startApp(); }
      }
    }
    document.addEventListener('DOMContentLoaded', init);

    // ===================== BUSINESS LOGIC =====================
    function getLocalDateStr(dateObj = new Date()) {
      const offset = dateObj.getTimezoneOffset() * 60000;
      const localDate = new Date(dateObj.getTime() - offset);
      return localDate.toISOString().split('T')[0];
    }

    function calculateBusinessMetrics(txs, exps) {
      const totalRevenue = txs.reduce((sum, t) => sum + (t.status !== 'cancelled' ? t.total : 0), 0);
      const totalTransactions = txs.filter(t => t.status !== 'cancelled').length;
      
      let totalHPP = 0;
      txs.forEach(t => {
        if (t.status === 'cancelled') return;
        t.items.forEach(it => {
          if (it.hpp !== undefined) {
             totalHPP += it.hpp * it.qty;
          } else {
             totalHPP += calcHPP(it.productId) * it.qty;
          }
        });
      });

      const grossProfit = totalRevenue - totalHPP;
      const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;
      const margin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

      return { totalRevenue, totalTransactions, totalHPP, grossProfit, totalExpenses, netProfit, margin };
    }

    function getValidOrders() {
      return DB.orders;
    }

    function getValidOnlineTransactions() {
      return DB.transactions.filter(t => {
        if (t.source === 'online' || t.orderId) {
          if (!t.orderId) return false; // invalid online tx
          const validOrders = getValidOrders();
          return validOrders.some(o => o.id === t.orderId);
        }
        return true; // kasir, pos, dll
      });
    }

    function cleanupGhostTransactions() {
      const validTx = getValidOnlineTransactions();
      if (validTx.length !== DB.transactions.length) {
        console.warn(`Cleanup: Removed ${DB.transactions.length - validTx.length} ghost transactions from local calculation.`);
        DB.transactions = validTx;
      }
    }

    let currentFilters = {
       dashboard: { type: 'tanggal', value: '' },
       orders: { type: 'semua', value: '' },
       reports: { type: 'bulan', value: '' }
    };

    function filterDataByDate(dataArray, filterState) {
      if (!dataArray || !dataArray.length || !filterState || filterState.type === 'semua') return dataArray;
      
      return dataArray.filter(item => {
         let d = '';
         if(item.date) { d = item.date.includes('T') ? getLocalDateStr(new Date(item.date)) : item.date; }
         if (!d) return false;

         if (filterState.type === 'tanggal') {
           return d === filterState.value;
         } else if (filterState.type === 'hari_seminggu') {
           const day = new Date(d).getDay();
           return day.toString() === filterState.value.toString();
         } else if (filterState.type === 'bulan') {
           return d.startsWith(filterState.value);
         } else if (filterState.type === 'tahun') {
           return d.startsWith(filterState.value);
         } else if (filterState.type === 'custom') {
           return d >= filterState.value.start && d <= filterState.value.end;
         }
         return true;
      });
    }

    function renderFilterUI(pageName) {
      const f = currentFilters[pageName];
      // Initialize defaults if empty
      if (!f.value && f.type !== 'semua') {
         const today = getLocalDateStr();
         if (f.type === 'tanggal') f.value = today;
         if (f.type === 'hari_seminggu') f.value = new Date().getDay().toString();
         if (f.type === 'bulan') f.value = today.substring(0,7);
         if (f.type === 'tahun') f.value = today.substring(0,4);
         if (f.type === 'custom') f.value = { start: today, end: today };
      }

      let valueInput = '';
      if (f.type === 'tanggal') {
         valueInput = `<input type="date" id="filter-val-${pageName}" class="form-control" value="${f.value}" onchange="updateFilter('${pageName}')" style="width:auto; display:inline-block">`;
      } else if (f.type === 'hari_seminggu') {
         valueInput = `<select id="filter-val-${pageName}" class="form-control" onchange="updateFilter('${pageName}')" style="width:auto; display:inline-block">
            <option value="1" ${f.value=='1'?'selected':''}>Senin</option>
            <option value="2" ${f.value=='2'?'selected':''}>Selasa</option>
            <option value="3" ${f.value=='3'?'selected':''}>Rabu</option>
            <option value="4" ${f.value=='4'?'selected':''}>Kamis</option>
            <option value="5" ${f.value=='5'?'selected':''}>Jumat</option>
            <option value="6" ${f.value=='6'?'selected':''}>Sabtu</option>
            <option value="0" ${f.value=='0'?'selected':''}>Minggu</option>
         </select>`;
      } else if (f.type === 'bulan') {
         valueInput = `<input type="month" id="filter-val-${pageName}" class="form-control" value="${f.value}" onchange="updateFilter('${pageName}')" style="width:auto; display:inline-block">`;
      } else if (f.type === 'tahun') {
         valueInput = `<input type="number" id="filter-val-${pageName}" class="form-control" value="${f.value}" placeholder="2026" onchange="updateFilter('${pageName}')" style="width:80px; display:inline-block">`;
      } else if (f.type === 'custom') {
         valueInput = `<input type="date" id="filter-val-start-${pageName}" class="form-control" value="${f.value.start||''}" onchange="updateFilter('${pageName}')" style="width:auto; display:inline-block"> <span style="margin:0 5px">-</span> 
                       <input type="date" id="filter-val-end-${pageName}" class="form-control" value="${f.value.end||''}" onchange="updateFilter('${pageName}')" style="width:auto; display:inline-block">`;
      }

      return `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:15px; flex-wrap:wrap; background:var(--white); padding:10px 15px; border-radius:var(--radius); border:1px solid var(--gray-200);">
          <i class="fas fa-filter" style="color:var(--gray-400)"></i>
          <span style="font-size:13px; font-weight:500">Filter:</span>
          <select id="filter-type-${pageName}" class="form-control" onchange="changeFilterType('${pageName}')" style="width:auto; display:inline-block">
             <option value="semua" ${f.type==='semua'?'selected':''}>Semua Waktu</option>
             <option value="tanggal" ${f.type==='tanggal'?'selected':''}>Hari/Tanggal</option>
             <option value="hari_seminggu" ${f.type==='hari_seminggu'?'selected':''}>Hari dalam Seminggu</option>
             <option value="bulan" ${f.type==='bulan'?'selected':''}>Bulan</option>
             <option value="tahun" ${f.type==='tahun'?'selected':''}>Tahun</option>
             <option value="custom" ${f.type==='custom'?'selected':''}>Rentang Tanggal</option>
          </select>
          ${f.type !== 'semua' ? valueInput : ''}
        </div>
      `;
    }

    window.changeFilterType = function(page) {
       const type = document.getElementById('filter-type-' + page).value;
       const today = getLocalDateStr();
       let val = '';
       if (type === 'tanggal') val = today;
       if (type === 'hari_seminggu') val = new Date().getDay().toString();
       if (type === 'bulan') val = today.substring(0,7);
       if (type === 'tahun') val = today.substring(0,4);
       if (type === 'custom') val = { start: today, end: today };
       currentFilters[page] = { type, value: val };
       if(page === 'dashboard') renderDashboard();
       if(page === 'orders') renderOrders();
       if(page === 'reports') renderReports();
    }

    window.updateFilter = function(page) {
       const f = currentFilters[page];
       if (f.type === 'custom') {
          f.value = { 
            start: document.getElementById('filter-val-start-'+page).value,
            end: document.getElementById('filter-val-end-'+page).value
          };
       } else if (f.type !== 'semua') {
          f.value = document.getElementById('filter-val-'+page).value;
       }
       if(page === 'dashboard') renderDashboard();
       if(page === 'orders') renderOrders();
       if(page === 'reports') renderReports();
    }

    // ===================== DASHBOARD =====================
    function renderDashboard() {
      const today = getLocalDateStr();
      const validTxs = getValidOnlineTransactions();
      
      const filteredTx = filterDataByDate(validTxs, currentFilters['dashboard']);
      const filteredExps = filterDataByDate(DB.expenses, currentFilters['dashboard']);
      
      // Ambil metrik dari fungsi tunggal (berdasarkan filter)
      const metrics = calculateBusinessMetrics(filteredTx, filteredExps);
      
      const filteredOrders = filterDataByDate(DB.orders, currentFilters['dashboard']);
      const totalOrdersFiltered = filteredOrders.length;
      const pendingOrdersCount = filteredOrders.filter(o => o.status === 'pending').length;

      // Weekly data (Trend chart 7 hari terakhir - tetap fixed)
      const weekSales = []; const weekLabels = [];
      for (let i = 6; i >= 0; i--) {
        const d = getLocalDateStr(new Date(Date.now() - i * 86400000));
        const dayMetrics = calculateBusinessMetrics(validTxs.filter(t => t.date === d), []);
        weekSales.push(dayMetrics.totalRevenue); weekLabels.push(d.split('-')[2] + '/' + d.split('-')[1]);
      }
      const maxSale = Math.max(...weekSales, 1);

      // Top products (berdasarkan filter)
      const prodCount = {};
      filteredTx.forEach(t => t.items.forEach(it => { 
        if (DB.products.some(p => p.id === it.productId)) {
          prodCount[it.productId] = (prodCount[it.productId] || 0) + it.qty;
        }
      }));
      const topProds = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => ({ prod: DB.products.find(p => p.id === id), qty }));

      // Low stock
      const lowStock = [];

      // Audit Logs
      console.log('--- DASHBOARD AUDIT ---');
      console.log('Today Local Date:', today);
      console.log('Dashboard Filter:', currentFilters['dashboard']);
      console.log('Filtered Transactions:', filteredTx.length);
      console.log('Filtered Orders:', filteredOrders.length);
      console.log('Filtered Expenses:', filteredExps.length);
      console.log('Current Page:', currentPage);

      let labelOmzet = currentFilters['dashboard'].type === 'semua' ? 'Total Omzet' : 'Omzet Filtered';
      let labelPesanan = currentFilters['dashboard'].type === 'semua' ? 'Total Pesanan' : 'Pesanan Filtered';
      if (currentFilters['dashboard'].type === 'tanggal' && currentFilters['dashboard'].value === today) {
          labelOmzet = 'Omzet Hari Ini';
          labelPesanan = 'Pesanan Hari Ini';
      }

      document.getElementById('main-content').innerHTML = `
    ${renderFilterUI('dashboard')}
    <div class="stat-grid">
      <div class="stat-card emerald"><div class="stat-label">${labelOmzet}</div><div class="stat-value">${fmt(metrics.totalRevenue)}</div><div class="stat-sub"><i class="fas fa-arrow-up" style="color:var(--success)"></i> Dari ${metrics.totalTransactions} transaksi</div><i class="fas fa-coins stat-icon"></i></div>
      <div class="stat-card gold"><div class="stat-label">Gross Profit</div><div class="stat-value">${fmt(metrics.grossProfit)}</div><div class="stat-sub">Margin ${metrics.margin}%</div><i class="fas fa-chart-line stat-icon"></i></div>
      <div class="stat-card blue"><div class="stat-label">Net Profit</div><div class="stat-value">${fmt(metrics.netProfit)}</div><div class="stat-sub">Setelah biaya ops ${fmt(metrics.totalExpenses)}</div><i class="fas fa-piggy-bank stat-icon"></i></div>
      <div class="stat-card danger"><div class="stat-label">${labelPesanan}</div><div class="stat-value">${totalOrdersFiltered}</div><div class="stat-sub">${pendingOrdersCount} menunggu konfirmasi</div><i class="fas fa-shopping-bag stat-icon"></i></div>
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
          <div style="flex:1;font-size:13px;font-weight:500">${x.prod ? x.prod.name : (x.productName || 'Produk Terhapus')}</div>
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
            <span style="font-size:12px;color:var(--gray-400)">${i.stock} ${i.unit}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:100%;background:var(--emerald)"></div></div>
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
    <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'Tambah'} Produk</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nama Produk *</label><input type="text" id="pf-name" value="${p.name}"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Harga Jual *</label><div class="input-group"><span class="input-addon">Rp</span><input type="number" id="pf-price" value="${p.price}" style="border-radius:0 var(--radius) var(--radius) 0;border-left:none"></div></div>
      <div class="form-group"><label class="form-label">Kategori</label><select id="pf-cat" aria-label="Pilihan"><option ${p.category === 'Makanan' ? 'selected' : ''}>Makanan</option><option ${p.category === 'Minuman' ? 'selected' : ''}>Minuman</option><option ${p.category === 'Snack' ? 'selected' : ''}>Snack</option><option ${p.category === 'Lainnya' ? 'selected' : ''}>Lainnya</option></select></div>
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
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()" aria-label="Tutup">Batal</button><button class="btn-primary" onclick="saveProduct()">${id ? 'Simpan' : 'Tambah'}</button></div>
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
      let newP;
      if (editingId) {
        newP = DB.products.find(x => x.id === editingId);
        Object.assign(newP, { name, price, desc: document.getElementById('pf-desc').value, category: document.getElementById('pf-cat').value, available: document.getElementById('pf-avail').checked, imageUrl: document.getElementById('pf-img').value, emoji: document.getElementById('pf-emoji').value });
        toast('Produk diperbarui', 'success');
      } else {
        newP = { id: 'p' + Date.now(), name, price, desc: document.getElementById('pf-desc').value, category: document.getElementById('pf-cat').value, available: document.getElementById('pf-avail').checked, imageUrl: document.getElementById('pf-img').value, emoji: document.getElementById('pf-emoji').value, hpp: 0 };
        DB.products.push(newP);
        toast('Produk ditambahkan', 'success');
      }
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'products', newP.id), newP).catch(e => console.error(e));
      saveDB(); closeModal(); renderProducts();
    }
    function toggleProductAvail(id) {
      const p = DB.products.find(x => x.id === id);
      if (p) { 
        p.available = !p.available; 
        if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'products', id), p).catch(e => console.error(e));
        saveDB(); renderProducts(); 
      }
    }
    function deleteProduct(id) {
      if (!confirm('Hapus produk ini?')) return;
      DB.products = DB.products.filter(p => p.id !== id); 
      deleteFromFirestore('products', id);
      saveDB(); renderProducts(); toast('Produk dihapus', 'success');
    }


    // ===================== INGREDIENTS =====================
    function renderIngredients() {
      document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="search-bar" style="max-width:300px"><i class="fas fa-search"></i><input type="text" placeholder="Cari bahan..." oninput="filterIngredients(this.value)"></div>
      <button class="btn-primary" onclick="showIngModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Bahan</button>
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Nama Bahan</th><th>Satuan</th><th>Stok</th><th>Aksi</th></tr></thead><tbody id="ing-tbody"></tbody></table></div></div>
  `;
      renderIngTable(DB.ingredients);
    }
    function renderIngTable(ings) {
      const tb = document.getElementById('ing-tbody');
      if (!tb) return;
      tb.innerHTML = ings.map(i => `<tr>
    <td><strong>${i.name}</strong></td>
    <td>${i.unit}</td>
    <td><strong>${i.stock}</strong> ${i.unit}</td>
    <td><div style="display:flex;gap:4px"><button class="btn-icon" onclick="showIngModal('${i.id}')" aria-label="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="deleteIng('${i.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></div></td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada bahan</td></tr>`;
    }
    function filterIngredients(v) { renderIngTable(DB.ingredients.filter(i => i.name.toLowerCase().includes(v.toLowerCase()))) }
    function showIngModal(id = null) {
      editingId = id;
      const i = id ? DB.ingredients.find(x => x.id === id) : { name: '', unit: 'gram', price: 0, stock: 0 };
      showModal(`
    <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'Tambah'} Bahan</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nama Bahan *</label><input type="text" id="if-name" value="${i.name}"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Satuan *</label><select id="if-unit" aria-label="Pilihan"><option ${i.unit === 'gram' ? 'selected' : ''}>gram</option><option ${i.unit === 'kg' ? 'selected' : ''}>kg</option><option ${i.unit === 'ml' ? 'selected' : ''}>ml</option><option ${i.unit === 'liter' ? 'selected' : ''}>liter</option><option ${i.unit === 'pcs' ? 'selected' : ''}>pcs</option><option ${i.unit === 'sdm' ? 'selected' : ''}>sdm</option></select></div>
      
    </div>
    <div class="form-group"><label class="form-label">Stok Awal</label><input type="number" id="if-stock" value="${i.stock}"></div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()" aria-label="Tutup">Batal</button><button class="btn-primary" onclick="saveIng()">${id ? 'Simpan' : 'Tambah'}</button></div>
  `);
    }
    function saveIng() {
      const name = document.getElementById('if-name').value.trim();
      if (!name) { toast('Nama bahan wajib diisi', 'warning'); return }
      const data = { name, unit: document.getElementById('if-unit').value, stock: parseFloat(document.getElementById('if-stock').value) || 0 };
      if (editingId) { Object.assign(DB.ingredients.find(x => x.id === editingId), data); toast('Bahan diperbarui', 'success') }
      else { DB.ingredients.push({ id: 'i' + Date.now(), ...data }); toast('Bahan ditambahkan', 'success') }
      saveDB(); closeModal(); renderIngredients(); 
    }
    function deleteIng(id) {
      if (!confirm('Hapus bahan ini?')) return;
      DB.ingredients = DB.ingredients.filter(i => i.id !== id); 
      deleteFromFirestore('ingredients', id);
      saveDB(); renderIngredients();
    }

    // ===================== INVENTORY =====================
    function renderInventory() {
      const low = DB.ingredients.filter(i => i.stock <= i.minStock);
      document.getElementById('main-content').innerHTML = `
    
    <div class="card">
      <div class="card-header"><div class="card-title">Stok Bahan Baku</div><button class="btn-secondary btn-sm" onclick="navigate('procurement')"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah Stok</button></div>
      <div class="table-wrap"><table><thead><tr><th>Bahan</th><th>Satuan</th><th>Stok Saat Ini</th><th>Harga/Satuan (HPP)</th></tr></thead><tbody>
        ${DB.ingredients.map(i => {
        const pct = 100;
        return `<tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.unit}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <strong>${i.stock}</strong>
                <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:100%;background:var(--emerald)"></div></div>
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


    // ===================== RECIPES =====================
    function renderRecipes() {
      document.getElementById('main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div style="font-size:14px;color:var(--gray-500)">Kelola resep dan lihat HPP otomatis per produk</div>
      <button class="btn-primary" onclick="showRecipeModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Buat Resep</button>
    </div>
    <div class="product-grid" id="recipe-grid"></div>
  `;
      const g = document.getElementById('recipe-grid');
      if (!DB.products.length) { g.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-book-open"></i><p>Belum ada produk. Tambah produk dulu.</p></div>'; return }
      g.innerHTML = DB.products.map(p => {
        const recipe = DB.recipes.find(r => r.productId === p.id);
        const hpp = calcHPP(p.id);
        const margin = p.price ? ((p.price - hpp) / p.price * 100).toFixed(1) : 0;
        return `<div class="card" style="position:relative">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="font-size:28px">${p.emoji || '🍽️'}</div>
        <div><div style="font-weight:600;font-size:15px">${p.name}</div><div style="font-size:12px;color:var(--gray-400)">Harga jual: ${fmt(p.price)}</div></div>
      </div>
      <div style="background:var(--emerald-light);border-radius:var(--radius);padding:10px;margin-bottom:12px;display:flex;justify-content:space-between">
        <div><div style="font-size:11px;color:var(--emerald);font-weight:600">HPP OTOMATIS</div><div style="font-size:18px;font-weight:700;color:var(--emerald)">${fmt(hpp)}</div></div>
        <div style="text-align:right"><div style="font-size:11px;color:var(--emerald);font-weight:600">MARGIN</div><div style="font-size:18px;font-weight:700;color:var(--emerald)">${margin}%</div></div>
      </div>
      ${recipe ? `<div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:8px">KOMPOSISI BAHAN</div>
      ${recipe.items.map(ri => { const ing = DB.ingredients.find(i => i.id === ri.ingId); return ing ? `<div class="recipe-row"><div style="flex:1;font-size:13px">${ing.name}</div><div style="font-size:12px;color:var(--gray-400)">${ri.qty} ${ing.unit}</div><div style="font-size:12px;color:var(--emerald);min-width:70px;text-align:right">${fmt(ing.price * ri.qty)}</div></div>` : '' }).join('')}` : '<div style="text-align:center;color:var(--gray-300);padding:20px;font-size:13px"><i class="fas fa-plus-circle" style="font-size:24px;display:block;margin-bottom:8px"></i>Belum ada resep</div>'}
      <button class="btn-secondary btn-sm" style="width:100%;margin-top:12px" onclick="showRecipeModal('${p.id}')"><i class="fas fa-${recipe ? 'edit' : 'plus'}" style="margin-right:6px"></i>${recipe ? 'Edit Resep' : 'Buat Resep'}</button>
    </div>`;
      }).join('');
    }
    function showRecipeModal(productId = null) {
      const prods = DB.products;
      showModal(`
    <div class="modal-header"><div class="modal-title">Buat / Edit Resep</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Produk *</label><select id="rp-product" onchange="loadRecipeItems(this.value)" aria-label="Pilihan">${prods.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`).join('')}</select></div>
    <div id="recipe-items-form" style="margin-bottom:16px"></div>
    <button class="btn-secondary btn-sm" onclick="addRecipeItemRow()" style="margin-bottom:16px"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah Bahan</button>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()" aria-label="Tutup">Batal</button><button class="btn-primary" onclick="saveRecipe()">Simpan Resep</button></div>
  `);
      loadRecipeItems(productId || prods[0]?.id);
    }
    let recipeRows = [];
    function loadRecipeItems(productId) {
      recipeRows = [];
      const recipe = DB.recipes.find(r => r.productId === productId);
      if (recipe) recipeRows = [...recipe.items.map(ri => ({ ingId: ri.ingId, qty: ri.qty }))];
      renderRecipeRows();
    }
    function renderRecipeRows() {
      const f = document.getElementById('recipe-items-form');
      if (!f) return;
      f.innerHTML = recipeRows.map((row, i) => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
    <select style="flex:2" onchange="recipeRows[${i}].ingId=this.value" aria-label="Pilihan">${DB.ingredients.map(ing => `<option value="${ing.id}" ${ing.id === row.ingId ? 'selected' : ''}>${ing.name} (${ing.unit})</option>`).join('')}</select>
    <input type="number" style="width:90px" placeholder="Qty" value="${row.qty}" oninput="recipeRows[${i}].qty=parseFloat(this.value)||0">
    <button class="btn-icon" onclick="recipeRows.splice(${i},1);renderRecipeRows()" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
  </div>`).join('') || '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:12px">Belum ada bahan. Klik "Tambah Bahan".</div>';
    }
    function addRecipeItemRow() { recipeRows.push({ ingId: DB.ingredients[0]?.id || '', qty: 0 }); renderRecipeRows() }
    function saveRecipe() {
      const productId = document.getElementById('rp-product').value;
      if (!productId) { toast('Pilih produk', 'warning'); return }
      const existing = DB.recipes.find(r => r.productId === productId);
      if (existing) existing.items = [...recipeRows];
      else DB.recipes.push({ id: 'r' + Date.now(), productId, items: [...recipeRows] });
      saveDB(); closeModal(); renderRecipes(); toast('Resep disimpan', 'success');
    }


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

      const orderItems = items.map(([id, qty]) => {
         const p = DB.products.find(x => x.id === id);
         return { productId: id, qty, price: p.price };
      });

      const txItems = items.map(([id, qty]) => { 
        const p = DB.products.find(x => x.id === id); 
        return { productId: id, qty, price: p.price, productName: p.name, hpp: calcHPP(id) } 
      });

      const total = txItems.reduce((s, i) => s + i.price * i.qty, 0);
      const customerName = document.getElementById('pos-customer')?.value || 'Pelanggan POS';
      const dateStr = getLocalDateStr();

      const orderId = 'o' + Date.now();
      const order = {
         id: orderId,
         date: new Date().toISOString(), // Use full ISO for order date to allow time tracking
         customerName: customerName,
         items: orderItems,
         total: total,
         payment: 'kasir',
         status: 'selesai',
         paymentStatus: 'lunas',
         source: 'pos'
      };
      DB.orders.push(order);
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'orders', order.id), order).catch(e => console.error(e));

      const tx = { id: 't' + Date.now() + Math.floor(Math.random()*100), orderId: orderId, date: dateStr, items: txItems, total, status: 'lunas', source: 'pos', customer: customerName };
      DB.transactions.push(tx);
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'transactions', tx.id), tx).catch(e => console.error(e));
      
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
      
    }

    // ===================== ORDERS =====================
    async function refreshOrders() {
      if(!window.db) return;
      try {
        const snap = await window.fbGetDocs(window.fbCollection(window.db, 'orders'));
        const newOrders = [];
        snap.forEach(d => newOrders.push(d.data()));
        DB.orders = newOrders;
        saveDB();
        renderOrders();
        toast('Pesanan disinkronkan', 'success');
      } catch(e) { toast('Gagal sync pesanan', 'danger') }
    }

    function renderOrders() {
      const pending = DB.orders.filter(o => o.status === 'pending').length;
      document.getElementById('main-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div style="flex:1">${renderFilterUI('orders')}</div>
      <button class="btn-secondary btn-sm" onclick="refreshOrders()" style="margin-left:10px;height:36px;white-space:nowrap"><i class="fas fa-sync-alt" style="margin-right:6px"></i>Refresh</button>
    </div>
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
      const filteredByDate = filterDataByDate(DB.orders, currentFilters['orders']);
      const orders = status === 'semua' ? filteredByDate : filteredByDate.filter(o => o.status === status);
      const el = document.getElementById('orders-list');
      if (!orders.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tidak ada pesanan</p></div>'; return }
      el.innerHTML = orders.slice().reverse().map(o => {
        const prod_names = o.items.map(it => { const p = DB.products.find(x => x.id === it.productId); return p ? `${p.name}x${it.qty}` : '' }).filter(Boolean).join(', ');
        return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-weight:600;font-size:15px">${o.customerName}</div><div style="font-size:12px;color:var(--gray-400)">${new Date(o.date).toLocaleString('id-ID')} · ${o.source === 'pos' ? 'POS' : (o.payment || 'transfer')}</div></div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${o.status === 'selesai' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info'}">${o.status}</span>
          <span class="badge ${o.paymentStatus === 'lunas' ? 'badge-success' : 'badge-danger'}">${o.paymentStatus || 'menunggu'}</span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:8px"><i class="fas fa-list" style="margin-right:6px"></i>${prod_names}</div>
      ${o.notes ? `<div style="font-size:12px;color:var(--warning);margin-bottom:8px"><i>Catatan: ${o.notes}</i></div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:700;font-size:16px;color:var(--emerald)">${fmt(o.total)}</div>
        <div style="display:flex;gap:6px">
          ${o.wa ? `<a href="https://wa.me/${o.wa.replace(/\D/g, '')}" target="_blank" class="btn-secondary btn-sm"><i class="fab fa-whatsapp" style="color:#25D366"></i> WA</a>` : ''}
          ${o.status !== 'selesai' ? `<button class="btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','proses')" style="${o.status === 'proses' ? 'display:none' : ''}">Proses</button><button class="btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','selesai')">Selesai</button>` : ''}
          <button class="btn-secondary btn-sm" onclick="editOrder('${o.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" onclick="deleteOrder(\'${o.id}\')" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
      }).join('');
    }

    function editOrder(id) {
      const o = DB.orders.find(x => x.id === id);
      if(!o) return;
      editingId = id;
      showModal(`
        <div class="modal-header"><div class="modal-title">Edit Pesanan</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
        <div class="form-group">
          <label class="form-label">Status Pesanan</label>
          <select id="edit-o-status" class="form-control">
             <option value="pending" ${o.status==='pending'?'selected':''}>Menunggu (Pending)</option>
             <option value="proses" ${o.status==='proses'?'selected':''}>Diproses</option>
             <option value="selesai" ${o.status==='selesai'?'selected':''}>Selesai</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Catatan</label>
          <input type="text" id="edit-o-notes" class="form-control" value="${o.notes||''}" placeholder="Catatan tambahan">
        </div>
        <div class="form-group">
          <label class="form-label">Items (Qty)</label>
          <div id="edit-o-items" style="max-height:200px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:4px">
             ${o.items.map((it, idx) => {
                 const p = DB.products.find(x => x.id === it.productId);
                 const pName = p ? p.name : 'Produk Dihapus';
                 return `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="font-size:13px">${pName}</div>
                    <input type="number" id="edit-o-qty-${idx}" value="${it.qty}" min="0" class="form-control" style="width:70px; padding:4px">
                 </div>`;
             }).join('')}
          </div>
        </div>
        <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveEditOrder()">Simpan</button></div>
      `);
    }

    function saveEditOrder() {
       const o = DB.orders.find(x => x.id === editingId);
       if(!o) return closeModal();

       const newStatus = document.getElementById('edit-o-status').value;
       o.notes = document.getElementById('edit-o-notes').value;

       let newTotal = 0;
       o.items.forEach((it, idx) => {
          const newQty = parseInt(document.getElementById('edit-o-qty-'+idx).value) || 0;
          it.qty = newQty;
          newTotal += it.price * newQty;
       });
       
       o.items = o.items.filter(it => it.qty > 0);
       o.total = newTotal;

       if (newStatus === 'selesai' && o.status !== 'selesai') {
           o.paymentStatus = 'lunas';
           const txItems = o.items.map(it => {
               const p = DB.products.find(x => x.id === it.productId);
               return { productId: it.productId, qty: it.qty, price: it.price, productName: p?.name || 'Produk Dihapus', hpp: p ? calcHPP(p.id) : 0 };
           });
           const newTx = { id: 't' + Date.now(), orderId: o.id, date: getLocalDateStr(), items: txItems, total: o.total, status: 'lunas', source: o.source || 'online', customer: o.customerName };
           DB.transactions.push(newTx);
           if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'transactions', newTx.id), newTx).catch(e => console.error(e));
           deductStock(o.items);
       } else if (newStatus === 'selesai' || o.status === 'selesai') {
           const tx = DB.transactions.find(t => t.orderId === o.id);
           if (tx) {
               tx.items = o.items.map(it => {
                   const p = DB.products.find(x => x.id === it.productId);
                   return { productId: it.productId, qty: it.qty, price: it.price, productName: p?.name || 'Produk Dihapus', hpp: p ? calcHPP(p.id) : 0 };
               });
               tx.total = o.total;
               if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'transactions', tx.id), tx).catch(e => console.error(e));
           }
       }
       o.status = newStatus;

       if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'orders', o.id), o).catch(e => console.error(e));
       saveDB(); toast('Pesanan berhasil diperbarui', 'success');
       closeModal(); renderOrders(); updateBadgeOrders();
    }

    function updateOrderStatus(id, status) {
      const o = DB.orders.find(x => x.id === id);
      if (o) {
        o.status = status;
        if (status === 'selesai') {
          o.paymentStatus = 'lunas';
          const txItems = o.items.map(it => {
              const p = DB.products.find(x => x.id === it.productId);
              return { productId: it.productId, qty: it.qty, price: it.price, productName: p?.name || 'Produk Dihapus', hpp: p ? calcHPP(p.id) : 0 };
          });
          const newTx = { id: 't' + Date.now(), orderId: o.id, date: getLocalDateStr(), items: txItems, total: o.total, status: 'lunas', source: o.source || 'online', customer: o.customerName };
          DB.transactions.push(newTx);
          if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'transactions', newTx.id), newTx).catch(e => console.error(e));
          deductStock(o.items);
        }
        if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'orders', o.id), o).catch(e => console.error(e));
        saveDB(); toast(`Pesanan ditandai: ${status}`, 'success');
        renderOrders(); updateBadgeOrders();
      }
    }

    function deleteOrder(id) {
      if (!confirm('Hapus pesanan ini?')) return;
      DB.orders = DB.orders.filter(o => o.id !== id);
      deleteFromFirestore('orders', id);
      
      const relatedTx = DB.transactions.filter(t => t.orderId === id);
      relatedTx.forEach(tx => {
         DB.transactions = DB.transactions.filter(t => t.id !== tx.id);
         deleteFromFirestore('transactions', tx.id);
      });

      saveDB(); renderOrders(); updateBadgeOrders(); toast('Pesanan dihapus', 'success');
    }
    function updateBadgeOrders() {
      const b = document.getElementById('badge-orders');
      const n = DB.orders.filter(o => o.status === 'pending').length;
      if (b) { b.textContent = n; b.style.display = n ? 'inline-flex' : 'none'; }
    }
    function updateBadgeStock() {}
    function checkLowStock() {}


    // ===================== PROCUREMENT =====================
    async function refreshProcurement() {
      if(!window.db) return;
      try {
        const snap = await window.fbGetDocs(window.fbCollection(window.db, 'procurement'));
        const newProc = [];
        snap.forEach(d => newProc.push(d.data()));
        DB.procurement = newProc;
        saveDB();
        renderProcurement();
        toast('Data pengadaan disinkronkan', 'success');
      } catch(e) { toast('Gagal sync pengadaan', 'danger') }
    }

    function renderProcurement() {
      const totalSpend = DB.procurement.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.totalPrice, 0), 0);
      document.getElementById('main-content').innerHTML = `
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card emerald"><div class="stat-label">Total Pengadaan</div><div class="stat-value">${fmt(totalSpend)}</div><i class="fas fa-truck stat-icon"></i></div>
      <div class="stat-card gold"><div class="stat-label">Jumlah Transaksi</div><div class="stat-value">${DB.procurement.length}</div><i class="fas fa-file-invoice stat-icon"></i></div>
    </div>
    
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center">
        <div style="font-size:15px;font-weight:600">Riwayat Pengadaan</div>
        <select id="pr-filter" onchange="renderProcList()" style="padding:4px;border-radius:4px;border:1px solid #ddd;font-size:12px" aria-label="Pilihan">
          <option value="all">Semua Waktu</option>
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-secondary btn-sm" onclick="refreshProcurement()"><i class="fas fa-sync-alt" style="margin-right:6px"></i>Refresh</button>
        <button class="btn-primary btn-sm" onclick="showProcurementModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Input Pengadaan</button>
      </div>
    </div>

    <div id="procurement-list"></div>
  `;
      renderProcList();
    }
    
    function isDateInRange(dateStr, filter) {
      if (filter === 'all') return true;
      const today = new Date();
      const d = new Date(dateStr);
      if (filter === 'today') return d.toDateString() === today.toDateString();
      if (filter === 'week') {
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= lastWeek && d <= today;
      }
      if (filter === 'month') return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      return true;
    }

    function renderProcList() {
      const el = document.getElementById('procurement-list'); if (!el) return;
      const filter = document.getElementById('pr-filter')?.value || 'all';
      const filteredProc = DB.procurement.filter(p => isDateInRange(p.date, filter));
      
      const totalSpend = filteredProc.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.totalPrice, 0), 0);
      const statTotal = document.querySelector('.emerald .stat-value');
      const statCount = document.querySelector('.gold .stat-value');
      if (statTotal) statTotal.textContent = fmt(totalSpend);
      if (statCount) statCount.textContent = filteredProc.length;

      el.innerHTML = filteredProc.slice().reverse().map(p => {
        const total = p.items.reduce((s, i) => s + i.totalPrice, 0);
        return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-weight:600">${p.supplier || 'Supplier'}</div><div style="font-size:12px;color:var(--gray-400)">${p.date}</div></div>
        <div style="font-weight:700;color:var(--emerald)">${fmt(total)}</div>
      </div>
      ${p.items.map(it => { const ing = DB.ingredients.find(i => i.id === it.ingId); return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--gray-100)"><span>${ing?.name || '?'}</span><span style="color:var(--gray-400)">${it.qty} ${it.unit}</span><span style="color:var(--emerald)">${fmt(it.totalPrice)}</span></div>` }).join('')}
      <div style="margin-top:8px;display:flex;justify-content:flex-end;gap:6px"><button class="btn-secondary btn-sm" onclick="editProcurement('${p.id}')"><i class="fas fa-edit"></i> Edit</button><button class="btn-icon" onclick="deleteProcurement('${p.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></div>
    </div>`;
      }).join('') || '<div class="empty-state"><i class="fas fa-truck"></i><p>Belum ada pengadaan</p></div>';
    }
    function showProcurementModal() {
      showModal(`
    <div class="modal-header"><div class="modal-title">Input Pengadaan</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Tanggal *</label><input type="date" id="pr-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Supplier</label><input type="text" id="pr-supplier" placeholder="Nama supplier"></div>
    </div>
    <div style="font-size:13px;font-weight:600;color:var(--gray-500);margin-bottom:8px">BAHAN YANG DIBELI</div>
    <div id="pr-items"></div>
    <button class="btn-secondary btn-sm" onclick="addPRItem()" style="margin-bottom:16px"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah Bahan</button>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()" aria-label="Tutup">Batal</button><button class="btn-primary" onclick="saveProcurement()">Simpan</button></div>
  `);
      prItems = [{ ingId: DB.ingredients[0]?.id || '', qty: 0, unit: 'gram', totalPrice: 0 }];
      renderPRItems();
    }
    let prItems = [];
    function renderPRItems() {
      const el = document.getElementById('pr-items'); if (!el) return;
      el.innerHTML = prItems.map((it, i) => `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:8px">
    <select onchange="prItems[${i}].ingId=this.value;updatePRUnit(${i})" aria-label="Pilihan">${DB.ingredients.map(ing => `<option value="${ing.id}" ${ing.id === it.ingId ? 'selected' : ''}>${ing.name}</option>`).join('')}</select>
    <input type="number" placeholder="Qty" value="${it.qty}" oninput="prItems[${i}].qty=parseFloat(this.value)||0;updatePRCost(${i})">
    <select onchange="prItems[${i}].unit=this.value" id="pr-unit-${i}" aria-label="Pilihan"><option ${it.unit === 'gram' ? 'selected' : ''}>gram</option><option ${it.unit === 'kg' ? 'selected' : ''}>kg</option><option ${it.unit === 'ml' ? 'selected' : ''}>ml</option><option ${it.unit === 'liter' ? 'selected' : ''}>liter</option><option ${it.unit === 'pcs' ? 'selected' : ''}>pcs</option></select>
    <input type="number" placeholder="Total (Rp)" value="${it.totalPrice}" oninput="prItems[${i}].totalPrice=parseFloat(this.value)||0">
    <button class="btn-icon" onclick="prItems.splice(${i},1);renderPRItems()" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
  </div>`).join('');
    }
    function addPRItem() { prItems.push({ ingId: DB.ingredients[0]?.id || '', qty: 0, unit: 'gram', totalPrice: 0 }); renderPRItems() }
    
    function editProcurement(id) {
      const p = DB.procurement.find(x => x.id === id);
      if (!p) return;
      updateStockFromProcurement(p.items, true); // Reverse stock
      DB.procurement = DB.procurement.filter(x => x.id !== id);
      
      showProcurementModal();
      document.getElementById('pr-date').value = p.date;
      document.getElementById('pr-supplier').value = p.supplier;
      prItems = JSON.parse(JSON.stringify(p.items));
      renderPRItems();
    }
    function saveProcurement() {
      const date = document.getElementById('pr-date').value;
      const supplier = document.getElementById('pr-supplier').value;
      if (!date || !prItems.length) { toast('Isi data pengadaan', 'warning'); return }
      const proc = { id: 'pr' + Date.now(), date, supplier, items: [...prItems] };
      DB.procurement.push(proc);
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'procurement', proc.id), proc).catch(e => console.error(e));
      updateIngredientPrices();
      updateStockFromProcurement(prItems);
      saveDB(); closeModal(); renderProcurement(); toast('Pengadaan disimpan & harga bahan diperbarui', 'success');
    }
    
    function getConvertedQty(qty, unit, ingUnit) {
      let q = qty;
      if (unit === 'kg' && ingUnit === 'gram') q *= 1000;
      if (unit === 'liter' && ingUnit === 'ml') q *= 1000;
      return q;
    }

    function updateIngredientPrices() {
      DB.ingredients.forEach(ing => {
        let latestProcDate = '';
        let latestPrice = ing.price || 0;
        
        DB.procurement.forEach(p => {
          p.items.forEach(it => {
            if (it.ingId === ing.id && it.qty > 0 && it.totalPrice > 0) {
              if (p.date >= latestProcDate) {
                latestProcDate = p.date;
                const convertedQty = getConvertedQty(it.qty, it.unit, ing.unit);
                latestPrice = it.totalPrice / convertedQty;
              }
            }
          });
        });
        
        ing.price = latestPrice;
      });
    }
    function updateStockFromProcurement(items, reverse = false) {
      items.forEach(it => {
        const ing = DB.ingredients.find(i => i.id === it.ingId);
        if (ing) {
          const convertedQty = getConvertedQty(it.qty, it.unit, ing.unit);
          if (reverse) ing.stock = Math.max(0, ing.stock - convertedQty);
          else ing.stock += convertedQty;
        }
      });
    }


    function deleteProcurement(id) {
      if (!confirm('Hapus data pengadaan ini?')) return;
      const p = DB.procurement.find(x => x.id === id);
      if (p) updateStockFromProcurement(p.items, true); // Reverse stock
      DB.procurement = DB.procurement.filter(x => x.id !== id);
      deleteFromFirestore('procurement', id);
      updateIngredientPrices(); saveDB(); renderProcurement();
    }


    // ===================== EXPENSES =====================
    function renderExpenses() {
      const total = DB.expenses.reduce((s, e) => s + e.amount, 0);
      const cats = [...new Set(DB.expenses.map(e => e.category))];
      const catTotals = cats.map(c => ({ cat: c, total: DB.expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) })).sort((a, b) => b.total - a.total);
      document.getElementById('main-content').innerHTML = `
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card danger"><div class="stat-label">Total Biaya</div><div class="stat-value">${fmt(total)}</div><i class="fas fa-receipt stat-icon"></i></div>
      ${catTotals.slice(0, 3).map(c => `<div class="stat-card blue"><div class="stat-label">${c.cat}</div><div class="stat-value">${fmt(c.total)}</div></div>`).join('')}
    </div>
    
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center">
        <div style="font-size:15px;font-weight:600">Riwayat Biaya</div>
        <select id="ex-filter" onchange="renderExpensesList()" style="padding:4px;border-radius:4px;border:1px solid #ddd;font-size:12px" aria-label="Pilihan">
          <option value="all">Semua Waktu</option>
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
        </select>
      </div>
      <button class="btn-primary" onclick="showExpenseModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Biaya</button>
    </div>

    <div class="card"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody>
      
    </tbody></table></div></div>
  `;
      renderExpensesList();
    }
    
    function renderExpensesList() {
      const filter = document.getElementById('ex-filter')?.value || 'all';
      const filteredExp = DB.expenses.filter(e => isDateInRange(e.date, filter));
      
      const total = filteredExp.reduce((s, e) => s + e.amount, 0);
      const statTotal = document.querySelector('.danger .stat-value');
      if (statTotal) statTotal.textContent = fmt(total);

      const tb = document.querySelector('#main-content table tbody');
      if (tb) {
        tb.innerHTML = filteredExp.slice().reverse().map(e => `<tr><td>${e.date}</td><td><span class="badge badge-gray">${e.category}</span></td><td>${e.desc || '-'}</td><td style="font-weight:600;color:var(--danger)">${fmt(e.amount)}</td><td><button class="btn-icon" onclick="deleteExpense('${e.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada biaya</td></tr>';
      }
    }

    function showExpenseModal() {
      showModal(`
    <div class="modal-header"><div class="modal-title">Tambah Biaya</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Tanggal *</label><input type="date" id="ef-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Kategori *</label><select id="ef-cat" aria-label="Pilihan"><option>Listrik</option><option>Air</option><option>Gas</option><option>Gaji</option><option>Sewa</option><option>Bahan Bakar</option><option>Kebersihan</option><option>Lainnya</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Deskripsi</label><input type="text" id="ef-desc" placeholder="Keterangan biaya"></div>
    <div class="form-group"><label class="form-label">Jumlah (Rp) *</label><input type="number" id="ef-amount" placeholder="0"></div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()" aria-label="Tutup">Batal</button><button class="btn-primary" onclick="saveExpense()">Simpan</button></div>
  `);
    }
    function saveExpense() {
      const amount = parseInt(document.getElementById('ef-amount').value) || 0;
      if (!amount) { toast('Masukkan jumlah biaya', 'warning'); return }
      const e = { id: 'e' + Date.now(), date: document.getElementById('ef-date').value, category: document.getElementById('ef-cat').value, desc: document.getElementById('ef-desc').value, amount };
      DB.expenses.push(e);
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'expenses', e.id), e).catch(err => console.error(err));
      saveDB(); closeModal(); renderExpenses(); toast('Biaya ditambahkan', 'success');
    }
    function deleteExpense(id) { if (!confirm('Hapus biaya ini?')) return; DB.expenses = DB.expenses.filter(e => e.id !== id); deleteFromFirestore('expenses', id); saveDB(); renderExpenses(); }

    // ===================== REPORTS =====================
    function renderReports() {
      const validTxs = getValidOnlineTransactions();
      const filteredTx = filterDataByDate(validTxs, currentFilters['reports']);
      const filteredExps = filterDataByDate(DB.expenses, currentFilters['reports']);
      
      const metrics = calculateBusinessMetrics(filteredTx, filteredExps);

      let reportTitle = "Sesuai Filter";
      if (currentFilters['reports'].type === 'bulan') reportTitle = "Bulan Ini";
      if (currentFilters['reports'].type === 'tanggal') reportTitle = "Hari Ini";

      document.getElementById('main-content').innerHTML = `
    ${renderFilterUI('reports')}
    <div style="margin-bottom:16px;display:flex;gap:10px;align-items:center">
      <button class="btn-secondary btn-sm" onclick="exportPDF()"><i class="fas fa-file-pdf" style="margin-right:4px"></i>Export PDF</button>
      <button class="btn-secondary btn-sm" onclick="exportExcel()"><i class="fas fa-file-excel" style="margin-right:4px"></i>Export Excel</button>
    </div>
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-card emerald"><div class="stat-label">Total Omzet</div><div class="stat-value">${fmt(metrics.totalRevenue)}</div><div class="stat-sub">${metrics.totalTransactions} transaksi</div></div>
      <div class="stat-card blue"><div class="stat-label">Total HPP</div><div class="stat-value">${fmt(metrics.totalHPP)}</div></div>
      <div class="stat-card gold"><div class="stat-label">Gross Profit</div><div class="stat-value">${fmt(metrics.grossProfit)}</div><div class="stat-sub">${metrics.margin}% margin</div></div>
      <div class="stat-card danger"><div class="stat-label">Net Profit</div><div class="stat-value">${fmt(metrics.netProfit)}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px" class="responsive-grid">
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Laporan Laba Rugi</div>
        <table style="width:100%">
          <tr><td style="padding:8px 0;color:var(--gray-500)">Pendapatan</td><td style="text-align:right;font-weight:600;color:var(--emerald)">${fmt(metrics.totalRevenue)}</td></tr>
          <tr><td style="padding:8px 0;color:var(--gray-500)">(-) HPP</td><td style="text-align:right;color:var(--danger)">(${fmt(metrics.totalHPP)})</td></tr>
          <tr><td style="padding:8px 0;font-weight:600">= Gross Profit</td><td style="text-align:right;font-weight:700;color:var(--emerald)">${fmt(metrics.grossProfit)}</td></tr>
          <tr><td style="padding:8px 0;color:var(--gray-500)">(-) Biaya Ops</td><td style="text-align:right;color:var(--danger)">(${fmt(metrics.totalExpenses)})</td></tr>
          <tr style="border-top:2px solid var(--gray-200)"><td style="padding:12px 0 4px;font-weight:700;font-size:15px">= Net Profit</td><td style="text-align:right;font-weight:700;font-size:15px;color:${metrics.netProfit >= 0 ? 'var(--emerald)' : 'var(--danger)'}">${fmt(metrics.netProfit)}</td></tr>
        </table>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Produk Terlaris (${reportTitle})</div>
        ${getTopProds(filteredTx).map((x, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
          <div style="width:22px;height:22px;background:var(--emerald-light);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--emerald)">${i + 1}</div>
          <div style="flex:1;font-size:13px">${x.name}</div>
          <div style="font-size:13px;color:var(--emerald);font-weight:600">${x.qty}x</div>
          <div style="font-size:13px;color:var(--gray-400)">${fmt(x.revenue)}</div>
        </div>`).join('') || '<div class="empty-state" style="padding:20px"><p>Belum ada data</p></div>'}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Riwayat Transaksi</div></div>
      <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Sumber</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${filteredTx.slice().reverse().map(t => `<tr><td>${t.date}</td><td><span class="badge badge-gray">${t.source || 'kasir'}</span></td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.items.map(i => { const p = DB.products.find(x => x.id === i.productId); return (p ? p.name : (i.productName || 'Produk Dihapus')) + 'x' + i.qty }).join(', ')}</td><td style="font-weight:600;color:var(--emerald)">${fmt(t.total)}</td><td><span class="badge badge-success">${t.status}</span></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada transaksi</td></tr>'}
      </tbody></table></div>
    </div>
  `;
    }
    function getTopProds(transactions) {
      const map = {};
      transactions.forEach(t => t.items.forEach(it => {
        if (DB.products.some(p => p.id === it.productId)) {
          if (!map[it.productId]) map[it.productId] = { qty: 0, revenue: 0, productName: DB.products.find(p => p.id === it.productId).name };
          map[it.productId].qty += it.qty; 
          map[it.productId].revenue += it.price * it.qty;
        }
      }));
      return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5).map(([id, v]) => {
        return { name: v.productName, qty: v.qty, revenue: v.revenue };
      });
    }
    function exportPDF() {
      window.print(); toast('Halaman siap dicetak / disimpan sebagai PDF', 'success');
    }
    function exportExcel() {
      const validTxs = getValidOnlineTransactions();
      const rows = [['Tanggal', 'Sumber', 'Total', 'Status'], ...validTxs.map(t => [t.date, t.source, t.total, t.status])];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'laporan_syncro.csv'; a.click();
      toast('Laporan diunduh sebagai CSV (buka di Excel)', 'success');
    }


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
    <td><div style="display:flex;gap:4px"><button class="btn-icon" onclick="showCustModal('${c.id}')" aria-label="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="deleteCust('${c.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada pelanggan</td></tr>`;
    }
    function filterCustomers(v) { renderCustTable(DB.customers.filter(c => c.name.toLowerCase().includes(v.toLowerCase()) || c.wa?.includes(v))) }
    function showCustModal(id = null) {
      editingId = id; const c = id ? DB.customers.find(x => x.id === id) : { name: '', wa: '', address: '' };
      showModal(`
    <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'Tambah'} Pelanggan</div><button class="btn-icon" onclick="closeModal()" aria-label="Tutup"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nama *</label><input type="text" id="cf-name" value="${c.name}"></div>
    <div class="form-group"><label class="form-label">WhatsApp</label><input type="tel" id="cf-wa" value="${c.wa || ''}" placeholder="08xxxxxxxxxx"></div>
    <div class="form-group"><label class="form-label">Alamat</label><textarea id="cf-addr" rows="2">${c.address || ''}</textarea></div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()" aria-label="Tutup">Batal</button><button class="btn-primary" onclick="saveCust()">${id ? 'Simpan' : 'Tambah'}</button></div>
  `);
    }
    function saveCust() {
      const name = document.getElementById('cf-name').value.trim();
      if (!name) { toast('Nama wajib diisi', 'warning'); return }
      const data = { name, wa: document.getElementById('cf-wa').value, address: document.getElementById('cf-addr').value };
      let c;
      if (editingId) { c = DB.customers.find(x => x.id === editingId); Object.assign(c, data); toast('Data diperbarui', 'success') }
      else { c = { id: 'c' + Date.now(), ...data, totalOrders: 0, totalSpent: 0 }; DB.customers.push(c); toast('Pelanggan ditambahkan', 'success') }
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'customers', c.id), c).catch(e => console.error(e));
      saveDB(); closeModal(); renderCustomers();
    }
    function deleteCust(id) { if (!confirm('Hapus pelanggan ini?')) return; DB.customers = DB.customers.filter(c => c.id !== id); deleteFromFirestore('customers', id); saveDB(); renderCustomers(); }


    // ===================== LANDING SETTINGS =====================
    function renderLanding() {
      document.getElementById('main-content').innerHTML = `
    <div class="grid-2" style="gap:24px">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px">Informasi Bisnis</div>
          <div class="form-group"><label class="form-label">Nama Bisnis</label><input type="text" id="lp-biz" value="${DB.settings.bizName}"></div>
          <div class="form-group"><label class="form-label">Tagline / Deskripsi Singkat</label><input type="text" id="lp-tag" value="${DB.settings.tagline}"></div>
          <div class="form-group"><label class="form-label">Deskripsi Lengkap</label><textarea id="lp-desc" rows="3">${DB.settings.bizDesc}</textarea></div>
          <div class="form-group"><label class="form-label">Nomor WhatsApp Admin</label><div class="input-group"><span class="input-addon">+62</span><input type="tel" id="lp-wa" value="${DB.settings.waNumber}" style="border-radius:0 var(--radius) var(--radius) 0;border-left:none"></div></div>
          <div class="form-group"><label class="form-label">Alamat Usaha</label><textarea id="lp-addr" rows="2">${DB.settings.address}</textarea></div>
          <button class="btn-primary" onclick="saveLandingSettings()">Simpan Pengaturan</button>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><div class="card-title">Preview & Aksi</div></div>
          <div style="text-align:center;padding:20px">
            <div style="font-size:48px;margin-bottom:16px">🌐</div>
            <div style="font-weight:600;font-size:16px;margin-bottom:8px">${DB.settings.bizName}</div>
            <div style="font-size:13px;color:var(--gray-400);margin-bottom:20px">${DB.settings.tagline}</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn-primary" onclick="openLandingPage()"><i class="fas fa-globe" style="margin-right:6px"></i>Buka Landing Page</button>
              <button class="btn-secondary" onclick="openOrderPage()"><i class="fas fa-shopping-bag" style="margin-right:6px"></i>Preview Halaman Order</button>
            </div>
          </div>
          <div style="border-top:1px solid var(--gray-200);padding-top:12px;margin-top:4px">
            <div style="font-size:12px;font-weight:600;color:var(--gray-400);margin-bottom:8px">STATUS MENU</div>
            ${DB.products.slice(0, 4).map(p => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-100)"><span style="font-size:16px">${p.emoji || '🍽️'}</span><span style="flex:1;font-size:13px">${p.name}</span><span class="badge ${p.available ? 'badge-success' : 'badge-danger'}" style="font-size:11px">${p.available ? 'Tampil' : 'Tersembunyi'}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
    }
    function saveLandingSettings() {
      DB.settings.bizName = document.getElementById('lp-biz').value;
      DB.settings.tagline = document.getElementById('lp-tag').value;
      DB.settings.bizDesc = document.getElementById('lp-desc').value;
      DB.settings.waNumber = document.getElementById('lp-wa').value;
      DB.settings.address = document.getElementById('lp-addr').value;
      if(window.db) window.fbSetDoc(window.fbDoc(window.db, 'settings', 'store'), DB.settings).catch(e => console.error(e));
      saveDB(); toast('Pengaturan landing page disimpan', 'success');
    }

    // ===================== PROFILE =====================
    function renderProfile() {
      const u = currentUser;
      document.getElementById('main-content').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar-big">${u.name[0].toUpperCase()}</div>
      <div>
        <div style="font-size:20px;font-weight:700">${u.name}</div>
        <div style="color:var(--gray-400);margin-top:2px">${u.email}</div>
        <span class="badge ${u.role === 'admin' ? 'badge-success' : 'badge-info'}" style="margin-top:6px">${u.role === 'admin' ? 'Administrator' : 'Staff'}</span>
      </div>
    </div>
    <div class="card" style="max-width:500px">
      <div class="card-title" style="margin-bottom:20px">Edit Profil</div>
      <div class="form-group"><label class="form-label">Nama Lengkap</label><input type="text" id="prf-name" value="${u.name}"></div>
      <div class="form-group"><label class="form-label">Email</label><input type="email" id="prf-email" value="${u.email}"></div>
      <div class="form-group"><label class="form-label">Password Baru (kosongkan jika tidak ingin ganti)</label><input type="password" id="prf-pwd" placeholder="Password baru..."></div>
      <button class="btn-primary" onclick="saveProfile()">Simpan Perubahan</button>
    </div>
  `;
    }
    function saveProfile() {
      const name = document.getElementById('prf-name').value.trim();
      const email = document.getElementById('prf-email').value.trim();
      const pwd = document.getElementById('prf-pwd').value;
      if (!name || !email) { toast('Nama dan email wajib diisi', 'warning'); return }
      const u = DB.users.find(x => x.id === currentUser.id);
      u.name = name; u.email = email;
      if (pwd.length >= 6) u.password = btoa(pwd);
      else if (pwd.length > 0 && pwd.length < 6) { toast('Password minimal 6 karakter', 'warning'); return }
      currentUser = { ...u }; saveDB(); saveSession();
      document.getElementById('sidebar-name').textContent = name;
      document.getElementById('sidebar-avatar').textContent = name[0].toUpperCase();
      toast('Profil diperbarui', 'success');
    }

    // ===================== SETTINGS =====================
    function renderSettings() {
      document.getElementById('main-content').innerHTML = `
    <div style="max-width:600px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Pengaturan Tampilan</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100)">
          <div><div style="font-weight:500">Mode Gelap</div><div style="font-size:12px;color:var(--gray-400)">Ubah tampilan menjadi dark mode</div></div>
          <button class="btn-secondary" onclick="toggleDark()" aria-label="Toggle Dark Mode"><i class="fas fa-moon" style="margin-right:6px"></i>Toggle</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Pengaturan Bisnis</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100)">
          <div><div style="font-weight:500">Nama Bisnis</div><div style="font-size:12px;color:var(--gray-400)">${DB.settings.bizName}</div></div>
          <button class="btn-secondary btn-sm" onclick="navigate('landing')">Edit</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0">
          <div><div style="font-weight:500">WhatsApp Admin</div><div style="font-size:12px;color:var(--gray-400)">+${DB.settings.waNumber}</div></div>
          <button class="btn-secondary btn-sm" onclick="navigate('landing')">Edit</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Data & Backup</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-secondary" onclick="backupData()"><i class="fas fa-download" style="margin-right:6px"></i>Backup Data</button>
          <button class="btn-secondary" onclick="document.getElementById('restore-file').click()"><i class="fas fa-upload" style="margin-right:6px"></i>Restore Data</button>
          <input type="file" id="restore-file" style="display:none" accept=".json" onchange="restoreData(this)">
          <button class="btn-danger btn-sm" onclick="resetData()"><i class="fas fa-trash" style="margin-right:6px"></i>Reset Semua Data</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px">Tentang Syncro OS</div>
        <div style="font-size:13px;color:var(--gray-400);line-height:1.8">
          <p><strong style="color:var(--emerald)">Syncro OS</strong> v1.0</p>
          <p>Business Operations in Sync.</p>
          <p>Platform operasional bisnis kuliner terintegrasi untuk UMKM dan usaha F&B.</p>
        </div>
      </div>
    </div>
  `;
    }
    function backupData() {
      const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'syncro_backup_' + new Date().toISOString().split('T')[0] + '.json'; a.click();
      toast('Backup berhasil diunduh', 'success');
    }
    function restoreData(input) {
      const file = input.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { try { DB = { ...DB, ...JSON.parse(e.target.result) }; saveDB(); toast('Data berhasil direstore', 'success'); navigate('dashboard') } catch { toast('File tidak valid', 'danger') } };
      reader.readAsText(file);
    }
    function resetData() {
      if (!confirm('PERHATIAN! Semua data akan dihapus permanen. Yakin?')) return;
      if (!confirm('Konfirmasi terakhir: Hapus semua data?')) return;
      localStorage.removeItem('syncro_db'); location.reload();
    }



import { dbService } from '../../../shared/services/db.js';
import { uploadImageToCloudinary } from '../../../shared/services/cloudinary.js';
import { logAudit } from '../../../shared/utils/audit.js';

// Global State
const state = {
  products: [],
  orders: [],
  transactions: [],
  auditLogs: []
};

// Current User Mock
const currentUser = { name: 'Admin', role: 'Superadmin' };

// Format Utilities
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
const formatDate = (isoStr) => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Router
let currentPage = 'dashboard';
const contentBody = document.getElementById('content-body');
const pageTitle = document.getElementById('page-title');

const initApp = () => {
  // Listeners
  dbService.listenCollection('products', data => { state.products = data; if(currentPage === 'products') renderProducts(); });
  dbService.listenCollection('orders', data => { state.orders = data; if(currentPage === 'orders') renderOrders(); });
  dbService.listenCollection('transactions', data => { state.transactions = data; if(currentPage === 'transactions') renderTransactions(); });
  dbService.listenCollection('audit_logs', data => { state.auditLogs = data; if(currentPage === 'audit') renderAuditLog(); });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const page = e.currentTarget.getAttribute('data-page');
      navigate(page);
    });
  });

  navigate('dashboard');
};

const navigate = (page) => {
  currentPage = page;
  const titles = { dashboard: 'Dashboard', products: 'Master Produk', orders: 'Pesanan Masuk', transactions: 'Data Transaksi', audit: 'Audit Log' };
  pageTitle.textContent = titles[page];
  
  if (page === 'dashboard') renderDashboard();
  else if (page === 'products') renderProducts();
  else if (page === 'orders') renderOrders();
  else if (page === 'transactions') renderTransactions();
  else if (page === 'audit') renderAuditLog();
};

// ======================= MODAL =======================
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnSaveModal = document.getElementById('btn-save-modal');

let currentModalAction = null;

const openModal = (title, bodyHtml, onSave) => {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalOverlay.classList.add('active');
  
  // Clean up old listener
  const newBtnSave = btnSaveModal.cloneNode(true);
  btnSaveModal.parentNode.replaceChild(newBtnSave, btnSaveModal);
  
  newBtnSave.addEventListener('click', onSave);
};

document.getElementById('btn-close-modal').addEventListener('click', () => modalOverlay.classList.remove('active'));
document.getElementById('btn-cancel-modal').addEventListener('click', () => modalOverlay.classList.remove('active'));

// ======================= VIEWS =======================

const renderDashboard = () => {
  contentBody.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
      <div class="card">
        <div class="card-body">
          <div style="color:var(--text-muted); font-size:13px; margin-bottom:8px;">Total Produk</div>
          <div style="font-size:24px; font-weight:700;">${state.products.length}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div style="color:var(--text-muted); font-size:13px; margin-bottom:8px;">Pesanan Aktif</div>
          <div style="font-size:24px; font-weight:700;">${state.orders.filter(o => o.status === 'pending').length}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div style="color:var(--text-muted); font-size:13px; margin-bottom:8px;">Total Transaksi</div>
          <div style="font-size:24px; font-weight:700;">${state.transactions.length}</div>
        </div>
      </div>
    </div>
  `;
};

// ======================= PRODUCTS =======================
const renderProducts = () => {
  contentBody.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Daftar Produk</div>
        <button class="btn btn-primary" id="btn-add-product"><i class="fas fa-plus"></i> Tambah Produk</button>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>Gambar</th><th>Nama Produk</th><th>Harga</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${state.products.map(p => `
                <tr>
                  <td><img src="${p.secure_url || p.image || 'https://via.placeholder.com/50'}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;"></td>
                  <td>${p.name}</td>
                  <td>${formatRupiah(p.price)}</td>
                  <td><span class="badge ${p.available !== false ? 'badge-success' : 'badge-danger'}">${p.available !== false ? 'Tersedia' : 'Habis'}</span></td>
                  <td>
                    <button class="btn-icon" onclick="window.editProduct('${p.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="window.deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-product').addEventListener('click', () => {
    openProductForm(null);
  });
};

const openProductForm = (product = null) => {
  const isEdit = !!product;
  const html = `
    <div class="form-group">
      <label class="form-label">Gambar Produk (Cloudinary)</label>
      <div class="image-upload-wrapper" id="upload-wrapper">
        <input type="file" id="product-image" class="image-upload-input" accept="image/png, image/jpeg, image/webp">
        <img id="image-preview" class="preview" src="${product?.secure_url || product?.image || ''}" style="display: ${product?.secure_url || product?.image ? 'block' : 'none'}">
        <div class="upload-placeholder" id="upload-placeholder" style="display: ${product?.secure_url || product?.image ? 'none' : 'block'}">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>Klik atau drag gambar ke sini</p>
          <p style="font-size:11px; opacity:0.7;">JPG, PNG, WEBP (Maks 5MB)</p>
        </div>
        <div class="upload-progress" id="upload-progress">
          <div class="upload-progress-bar" id="upload-progress-bar"></div>
        </div>
      </div>
      <input type="hidden" id="product-secure-url" value="${product?.secure_url || product?.image || ''}">
    </div>
    <div class="form-group"><label class="form-label">Nama Produk</label><input type="text" id="product-name" value="${product?.name || ''}"></div>
    <div class="form-group"><label class="form-label">Harga (Rp)</label><input type="number" id="product-price" value="${product?.price || ''}"></div>
    <div class="form-group"><label class="form-label">Deskripsi</label><textarea id="product-desc" rows="3">${product?.desc || ''}</textarea></div>
    <div class="form-group">
      <label class="form-label">Status Ketersediaan</label>
      <select id="product-available">
        <option value="true" ${product?.available !== false ? 'selected' : ''}>Tersedia</option>
        <option value="false" ${product?.available === false ? 'selected' : ''}>Habis</option>
      </select>
    </div>
  `;

  openModal(isEdit ? 'Edit Produk' : 'Tambah Produk', html, async () => {
    const name = document.getElementById('product-name').value;
    const price = Number(document.getElementById('product-price').value);
    const desc = document.getElementById('product-desc').value;
    const available = document.getElementById('product-available').value === 'true';
    const secure_url = document.getElementById('product-secure-url').value;

    if (!name || !price) return alert('Nama dan Harga wajib diisi!');

    const newData = { name, price, desc, available, secure_url };

    if (isEdit) {
      await dbService.updateDocument('products', product.id, newData);
      logAudit({ action: 'EDIT', module: 'Products', previousData: product, newData }, currentUser);
    } else {
      const added = await dbService.addDocument('products', newData);
      logAudit({ action: 'CREATE', module: 'Products', previousData: null, newData: added }, currentUser);
    }
    modalOverlay.classList.remove('active');
  });

  // Cloudinary Upload Logic
  const fileInput = document.getElementById('product-image');
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('upload-placeholder');
  const progressContainer = document.getElementById('upload-progress');
  const progressBar = document.getElementById('upload-progress-bar');
  const urlInput = document.getElementById('product-secure-url');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview local
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Show progress
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    try {
      const secureUrl = await uploadImageToCloudinary(file, (percent) => {
        progressBar.style.width = `${percent}%`;
      });
      urlInput.value = secureUrl;
      progressBar.style.background = 'var(--success)';
      setTimeout(() => progressContainer.style.display = 'none', 1000);
    } catch (error) {
      alert('Gagal mengupload gambar: ' + error.message);
      progressContainer.style.display = 'none';
    }
  });
};

window.editProduct = (id) => openProductForm(state.products.find(p => p.id === id));
window.deleteProduct = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    const prod = state.products.find(p => p.id === id);
    await dbService.deleteDocument('products', id);
    logAudit({ action: 'DELETE', module: 'Products', previousData: prod, newData: null }, currentUser);
  }
};

// ======================= ORDERS & TRANSACTIONS =======================
const renderOrders = () => {
  contentBody.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Pesanan Masuk</div></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>Tanggal</th><th>Pelanggan</th><th>No. WA</th><th>Total</th><th>Status Bayar</th><th>Status Pesanan</th><th>Aksi</th></tr></thead>
            <tbody>
              ${state.orders.map(o => `
                <tr>
                  <td>${formatDate(o.date)}</td>
                  <td>${o.customerName}</td>
                  <td>${o.wa}</td>
                  <td>${formatRupiah(o.total)}</td>
                  <td><span class="badge ${o.paymentStatus === 'lunas' ? 'badge-success' : 'badge-warning'}">${o.paymentStatus}</span></td>
                  <td><span class="badge badge-primary">${o.status}</span></td>
                  <td>
                    <button class="btn-icon" onclick="window.editOrder('${o.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="window.deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};

window.editOrder = (id) => {
  const o = state.orders.find(x => x.id === id);
  const html = `
    <div class="form-group"><label class="form-label">Nama Pelanggan</label><input type="text" id="edit-o-name" value="${o.customerName}"></div>
    <div class="form-group"><label class="form-label">Nomor WhatsApp</label><input type="text" id="edit-o-wa" value="${o.wa}"></div>
    <div class="form-group"><label class="form-label">Alamat</label><textarea id="edit-o-address">${o.address}</textarea></div>
    <div class="form-group">
      <label class="form-label">Status Pembayaran</label>
      <select id="edit-o-pay">
        <option value="menunggu" ${o.paymentStatus === 'menunggu' ? 'selected' : ''}>Menunggu</option>
        <option value="lunas" ${o.paymentStatus === 'lunas' ? 'selected' : ''}>Lunas</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Status Pesanan</label>
      <select id="edit-o-status">
        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="diproses" ${o.status === 'diproses' ? 'selected' : ''}>Diproses</option>
        <option value="selesai" ${o.status === 'selesai' ? 'selected' : ''}>Selesai</option>
      </select>
    </div>
  `;
  openModal('Edit Pesanan', html, async () => {
    const newData = {
      customerName: document.getElementById('edit-o-name').value,
      wa: document.getElementById('edit-o-wa').value,
      address: document.getElementById('edit-o-address').value,
      paymentStatus: document.getElementById('edit-o-pay').value,
      status: document.getElementById('edit-o-status').value
    };
    await dbService.updateDocument('orders', id, newData);
    logAudit({ action: 'EDIT', module: 'Orders', previousData: o, newData: { ...o, ...newData } }, currentUser);
    modalOverlay.classList.remove('active');
  });
};
window.deleteOrder = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    const o = state.orders.find(x => x.id === id);
    await dbService.deleteDocument('orders', id);
    logAudit({ action: 'DELETE', module: 'Orders', previousData: o, newData: null }, currentUser);
  }
};

const renderTransactions = () => {
  contentBody.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Data Transaksi</div></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>ID</th><th>Tanggal</th><th>Sumber</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${state.transactions.map(t => `
                <tr>
                  <td>${t.id.substring(0,8)}</td>
                  <td>${formatDate(t.date)}</td>
                  <td>${t.source || 'POS'}</td>
                  <td>${formatRupiah(t.total)}</td>
                  <td><span class="badge ${t.status === 'lunas' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
                  <td>
                    <button class="btn-icon" onclick="window.editTx('${t.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon" style="color:var(--danger)" onclick="window.deleteTx('${t.id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};

window.editTx = (id) => {
  const t = state.transactions.find(x => x.id === id);
  const html = `
    <div class="form-group">
      <label class="form-label">Status</label>
      <select id="edit-tx-status">
        <option value="lunas" ${t.status === 'lunas' ? 'selected' : ''}>Lunas</option>
        <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
      </select>
    </div>
  `;
  openModal('Edit Transaksi', html, async () => {
    const newData = { status: document.getElementById('edit-tx-status').value };
    await dbService.updateDocument('transactions', id, newData);
    logAudit({ action: 'EDIT', module: 'Transactions', previousData: t, newData: { ...t, ...newData } }, currentUser);
    modalOverlay.classList.remove('active');
  });
};
window.deleteTx = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    const t = state.transactions.find(x => x.id === id);
    await dbService.deleteDocument('transactions', id);
    logAudit({ action: 'DELETE', module: 'Transactions', previousData: t, newData: null }, currentUser);
  }
};

// ======================= AUDIT LOG =======================
const renderAuditLog = () => {
  // Sort descending by timestamp
  const logs = [...state.auditLogs].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  contentBody.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Audit Log</div>
        <button class="btn btn-secondary" onclick="alert('Mengekspor ke Excel...')"><i class="fas fa-file-excel"></i> Export</button>
      </div>
      <div class="card-body">
        <div class="table-toolbar">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="audit-search" placeholder="Cari data...">
          </div>
          <div class="filters">
            <select id="filter-module"><option value="">Semua Modul</option><option value="Products">Products</option><option value="Orders">Orders</option><option value="Transactions">Transactions</option></select>
            <select id="filter-action"><option value="">Semua Aksi</option><option value="CREATE">Create</option><option value="EDIT">Edit</option><option value="DELETE">Delete</option></select>
          </div>
        </div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Modul</th><th>IP Address</th></tr></thead>
            <tbody id="audit-tbody">
              <!-- Rendered via function -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const renderTable = () => {
    const search = document.getElementById('audit-search').value.toLowerCase();
    const mod = document.getElementById('filter-module').value;
    const act = document.getElementById('filter-action').value;
    
    const filtered = logs.filter(l => {
      const matchSearch = l.userName.toLowerCase().includes(search) || l.module.toLowerCase().includes(search);
      const matchMod = !mod || l.module === mod;
      const matchAct = !act || l.actionType === act;
      return matchSearch && matchMod && matchAct;
    });

    document.getElementById('audit-tbody').innerHTML = filtered.map(l => {
      const actColor = l.actionType === 'CREATE' ? 'success' : l.actionType === 'DELETE' ? 'danger' : 'warning';
      return `
      <tr>
        <td>${formatDate(l.timestamp)}</td>
        <td><div>${l.userName}</div><div style="font-size:11px;color:var(--text-muted)">${l.userRole}</div></td>
        <td><span class="badge badge-${actColor}">${l.actionType}</span></td>
        <td>${l.module}</td>
        <td><span style="font-family:monospace;font-size:12px">${l.ipAddress || 'N/A'}</span></td>
      </tr>
    `}).join('');
  };

  document.getElementById('audit-search').addEventListener('input', renderTable);
  document.getElementById('filter-module').addEventListener('change', renderTable);
  document.getElementById('filter-action').addEventListener('change', renderTable);
  
  renderTable();
};

document.addEventListener('DOMContentLoaded', initApp);

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
      <div style="font-size:15px;font-weight:600">Riwayat Biaya</div>
      <button class="btn-primary" onclick="showExpenseModal()"><i class="fas fa-plus" style="margin-right:6px"></i>Tambah Biaya</button>
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody>
      ${DB.expenses.slice().reverse().map(e => `<tr><td>${e.date}</td><td><span class="badge badge-gray">${e.category}</span></td><td>${e.desc || '-'}</td><td style="font-weight:600;color:var(--danger)">${fmt(e.amount)}</td><td><button class="btn-icon" onclick="deleteExpense('${e.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada biaya</td></tr>'}
    </tbody></table></div></div>
  `;
    }
    function showExpenseModal() {
      showModal(`
    <div class="modal-header"><div class="modal-title">Tambah Biaya</div><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Tanggal *</label><input type="date" id="ef-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Kategori *</label><select id="ef-cat"><option>Listrik</option><option>Air</option><option>Gas</option><option>Gaji</option><option>Sewa</option><option>Bahan Bakar</option><option>Kebersihan</option><option>Lainnya</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Deskripsi</label><input type="text" id="ef-desc" placeholder="Keterangan biaya"></div>
    <div class="form-group"><label class="form-label">Jumlah (Rp) *</label><input type="number" id="ef-amount" placeholder="0"></div>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveExpense()">Simpan</button></div>
  `);
    }
    function saveExpense() {
      const amount = parseInt(document.getElementById('ef-amount').value) || 0;
      if (!amount) { toast('Masukkan jumlah biaya', 'warning'); return }
      DB.expenses.push({ id: 'e' + Date.now(), date: document.getElementById('ef-date').value, category: document.getElementById('ef-cat').value, desc: document.getElementById('ef-desc').value, amount });
      saveDB(); closeModal(); renderExpenses(); toast('Biaya ditambahkan', 'success');
    }
    function deleteExpense(id) { if (!confirm('Hapus biaya ini?')) return; DB.expenses = DB.expenses.filter(e => e.id !== id); saveDB(); renderExpenses(); }

    // ===================== REPORTS =====================
    function renderReports() {
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = today.substring(0, 7);
      const monthTx = DB.transactions.filter(t => t.date.startsWith(thisMonth));
      const monthOrders = DB.orders.filter(o => o.date.startsWith(thisMonth) && o.paymentStatus === 'lunas');
      const omzet = monthTx.reduce((s, t) => s + t.total, 0) + monthOrders.reduce((s, o) => s + o.total, 0);
      const hpp = calcTotalHPP(monthTx);
      const expenses = DB.expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
      const procurement = DB.procurement.filter(p => p.date.startsWith(thisMonth)).reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.totalPrice, 0), 0);
      const grossProfit = omzet - hpp;
      const netProfit = grossProfit - expenses;
      document.getElementById('main-content').innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:10px;align-items:center">
      <input type="month" id="report-month" value="${thisMonth}" onchange="renderReports()" style="width:auto">
      <button class="btn-secondary btn-sm" onclick="exportPDF()"><i class="fas fa-file-pdf" style="margin-right:4px"></i>Export PDF</button>
      <button class="btn-secondary btn-sm" onclick="exportExcel()"><i class="fas fa-file-excel" style="margin-right:4px"></i>Export Excel</button>
    </div>
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-card emerald"><div class="stat-label">Total Omzet</div><div class="stat-value">${fmt(omzet)}</div><div class="stat-sub">${monthTx.length + monthOrders.length} transaksi</div></div>
      <div class="stat-card blue"><div class="stat-label">Total HPP</div><div class="stat-value">${fmt(hpp)}</div></div>
      <div class="stat-card gold"><div class="stat-label">Gross Profit</div><div class="stat-value">${fmt(grossProfit)}</div><div class="stat-sub">${omzet ? Math.round(grossProfit / omzet * 100) : 0}% margin</div></div>
      <div class="stat-card danger"><div class="stat-label">Net Profit</div><div class="stat-value">${fmt(netProfit)}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Laporan Laba Rugi</div>
        <table style="width:100%">
          <tr><td style="padding:8px 0;color:var(--gray-500)">Pendapatan</td><td style="text-align:right;font-weight:600;color:var(--emerald)">${fmt(omzet)}</td></tr>
          <tr><td style="padding:8px 0;color:var(--gray-500)">(-) HPP</td><td style="text-align:right;color:var(--danger)">(${fmt(hpp)})</td></tr>
          <tr><td style="padding:8px 0;font-weight:600">= Gross Profit</td><td style="text-align:right;font-weight:700;color:var(--emerald)">${fmt(grossProfit)}</td></tr>
          <tr><td style="padding:8px 0;color:var(--gray-500)">(-) Biaya Ops</td><td style="text-align:right;color:var(--danger)">(${fmt(expenses)})</td></tr>
          <tr style="border-top:2px solid var(--gray-200)"><td style="padding:12px 0 4px;font-weight:700;font-size:15px">= Net Profit</td><td style="text-align:right;font-weight:700;font-size:15px;color:${netProfit >= 0 ? 'var(--emerald)' : 'var(--danger)'}">${fmt(netProfit)}</td></tr>
        </table>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Produk Terlaris Bulan Ini</div>
        ${getTopProds(monthTx).map((x, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
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
        ${monthTx.slice().reverse().map(t => `<tr><td>${t.date}</td><td><span class="badge badge-gray">${t.source || 'kasir'}</span></td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.items.map(i => { const p = DB.products.find(x => x.id === i.productId); return p ? `${p.name}x${i.qty}` : '' }).filter(Boolean).join(', ')}</td><td style="font-weight:600;color:var(--emerald)">${fmt(t.total)}</td><td><span class="badge badge-success">${t.status}</span></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:32px">Belum ada transaksi</td></tr>'}
      </tbody></table></div>
    </div>
  `;
    }
    function getTopProds(transactions) {
      const map = {};
      transactions.forEach(t => t.items.forEach(it => {
        if (!map[it.productId]) map[it.productId] = { qty: 0, revenue: 0 };
        map[it.productId].qty += it.qty; map[it.productId].revenue += it.price * it.qty;
      }));
      return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5).map(([id, v]) => {
        const p = DB.products.find(x => x.id === id); return { name: p?.name || '?', ...v };
      });
    }
    function exportPDF() {
      window.print(); toast('Halaman siap dicetak / disimpan sebagai PDF', 'success');
    }
    function exportExcel() {
      const rows = [['Tanggal', 'Sumber', 'Total', 'Status'], ...DB.transactions.map(t => [t.date, t.source, t.total, t.status])];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'laporan_syncro.csv'; a.click();
      toast('Laporan diunduh sebagai CSV (buka di Excel)', 'success');
    }


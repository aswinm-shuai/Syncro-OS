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
          <button class="btn-secondary" onclick="toggleDark()"><i class="fas fa-moon" style="margin-right:6px"></i>Toggle</button>
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


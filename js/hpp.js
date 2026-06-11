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
    <div class="modal-header"><div class="modal-title">Buat / Edit Resep</div><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Produk *</label><select id="rp-product" onchange="loadRecipeItems(this.value)">${prods.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`).join('')}</select></div>
    <div id="recipe-items-form" style="margin-bottom:16px"></div>
    <button class="btn-secondary btn-sm" onclick="addRecipeItemRow()" style="margin-bottom:16px"><i class="fas fa-plus" style="margin-right:4px"></i>Tambah Bahan</button>
    <div class="modal-footer"><button class="btn-secondary" onclick="closeModal()">Batal</button><button class="btn-primary" onclick="saveRecipe()">Simpan Resep</button></div>
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
    <select style="flex:2" onchange="recipeRows[${i}].ingId=this.value">${DB.ingredients.map(ing => `<option value="${ing.id}" ${ing.id === row.ingId ? 'selected' : ''}>${ing.name} (${ing.unit})</option>`).join('')}</select>
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


function sellerTab(t) {
  ['overview', 'products', 'add', 'orders'].forEach(x => {
    $('tab-' + x).style.display = x === t ? 'block' : 'none';
    const sb = $('sb-' + x); if (sb) sb.classList.toggle('on', x === t);
  });
  document.querySelectorAll('.mdt').forEach((b, i) => {
    b.classList.toggle('on', ['overview', 'products', 'add', 'orders'][i] === t);
  });
  if (t === 'products') loadSellerProducts();
  if (t === 'orders') loadSellerOrders();
}

async function loadSellerDash() {
  if (!S.user || S.profile?.role !== 'seller') return;
  $('sb-store-name').textContent = S.profile.store_name || 'My Store';
  $('sb-role-lbl').textContent = 'Seller Dashboard';
  sellerTab('overview');
  try {
    const [orders, prods, bankRow] = await Promise.all([
      db('orders?seller_account=eq.' + S.user.account_number + '&select=*&order=created_at.desc', 'GET'),
      db('products?seller_account=eq.' + S.user.account_number + '&select=*', 'GET'),
      db('bank_accounts?account_number=eq.' + S.user.account_number + '&select=balance', 'GET')
    ]);
    const rev = (orders || []).reduce((a, o) => a + o.price, 0);
    $('st-rev').textContent = fmt(rev);
    $('st-orders').textContent = (orders || []).length;
    $('st-prods').textContent = (prods || []).length;
    $('st-bal').textContent = fmt(bankRow?.[0]?.balance || 0);
    const recent = (orders || []).slice(0, 5);
    $('s-rec-orders').innerHTML = recent.length
      ? recent.map(o => `<tr><td>${o.product_name}</td><td>${o.buyer_name}</td><td style="font-weight:700">${fmt(o.price)}</td><td><span class="pill p-green">${o.status}</span></td><td>${fmtDate(o.created_at)}</td></tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">No orders yet</td></tr>';
  } catch(e) { showToast(e.message); }
}

async function loadSellerProducts() {
  try {
    const prods = await db('products?seller_account=eq.' + S.user.account_number + '&select=*&order=created_at.desc', 'GET');
    $('s-prods-tbl').innerHTML = (prods || []).length
      ? prods.map(p => `<tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td>${fmt(p.price)}</td>
          <td>${p.stock}</td>
          <td><span class="stars">${stars(p.avg_rating)}</span> (${p.review_count})</td>
          <td><span class="pill ${p.active ? 'p-green' : 'p-red'}">${p.active ? 'Active' : 'Paused'}</span></td>
          <td>
            <button class="edit-btn" onclick="toggleProd('${p.id}',${!p.active})">${p.active ? 'Pause' : 'Activate'}</button>
            <button class="del-btn" onclick="delProd('${p.id}')" style="margin-left:4px">Del</button>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:#888;padding:20px">No products yet</td></tr>';
  } catch(e) { showToast(e.message); }
}

async function loadSellerOrders() {
  try {
    const orders = await db('orders?seller_account=eq.' + S.user.account_number + '&select=*&order=created_at.desc', 'GET');
    $('s-orders-tbl').innerHTML = (orders || []).length
      ? orders.map(o => `<tr>
          <td style="font-family:monospace;font-size:11px">${o.order_id?.slice(-8)}</td>
          <td>${o.product_name}</td>
          <td>${o.buyer_name}</td>
          <td style="font-weight:700">${fmt(o.price)}</td>
          <td>
            <select onchange="updOrderStatus('${o.id}',this.value)" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid #ddd;font-family:inherit">
              <option ${o.status === 'confirmed' ? 'selected' : ''}>confirmed</option>
              <option ${o.status === 'shipped' ? 'selected' : ''}>shipped</option>
              <option ${o.status === 'delivered' ? 'selected' : ''}>delivered</option>
            </select>
          </td>
          <td>${fmtDate(o.created_at)}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">No orders yet</td></tr>';
  } catch(e) { showToast(e.message); }
}

async function addProduct() {
  const name = $('p-name').value.trim();
  const desc = $('p-desc').value.trim();
  const price = parseInt($('p-price').value);
  const ogPrice = parseInt($('p-og-price').value) || null;
  const stock = parseInt($('p-stock').value) || 10;
  const cat = $('p-cat').value;
  const img = $('p-img').value.trim();
  const ok = $('add-ok'); const err = $('add-err');
  ok.style.display = 'none'; err.style.display = 'none';
  if (!name || !price) { err.textContent = 'Name and price are required'; err.style.display = 'block'; return; }
  try {
    await db('products', 'POST', { seller_account: S.user.account_number, name, description: desc, price, original_price: ogPrice, image_url: img || null, category: cat, stock, active: true, avg_rating: 0, review_count: 0 });
    ok.style.display = 'block';
    $('p-name').value = ''; $('p-desc').value = ''; $('p-price').value = ''; $('p-og-price').value = ''; $('p-stock').value = ''; $('p-img').value = '';
    loadProducts();
    showToast('Product listed!');
    setTimeout(() => ok.style.display = 'none', 3000);
  } catch(e) { err.textContent = e.message; err.style.display = 'block'; }
}

async function toggleProd(id, active) {
  try {
    await db('products?id=eq.' + id, 'PATCH', { active });
    loadSellerProducts();
    showToast(active ? 'Product activated' : 'Product paused');
  } catch(e) { showToast(e.message); }
}

async function delProd(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await db('products?id=eq.' + id, 'DELETE');
    loadSellerProducts();
    loadProducts();
    showToast('Deleted');
  } catch(e) { showToast(e.message); }
}

async function updOrderStatus(id, status) {
  try {
    await db('orders?id=eq.' + id, 'PATCH', { status });
    showToast('Status: ' + status);
  } catch(e) { showToast(e.message); }
}

function openBecomeSeller() {
  closeOv('ov-user');
  if (S.profile?.role === 'seller') { goPage('sell'); }
  else { goPage('become-seller'); }
}

async function registerSeller() {
  const sname = $('ns-name').value.trim();
  const sbio = $('ns-bio').value.trim();
  const ok = $('seller-ok'); const err = $('seller-err');
  ok.style.display = 'none'; err.style.display = 'none';
  if (!sname) { err.textContent = 'Store name required'; err.style.display = 'block'; return; }
  try {
    if (S.profile) {
      await db('profiles?account_number=eq.' + S.user.account_number, 'PATCH', { role: 'seller', store_name: sname, store_bio: sbio });
      S.profile.role = 'seller'; S.profile.store_name = sname; S.profile.store_bio = sbio;
    } else {
      const p = await db('profiles', 'POST', { account_number: S.user.account_number, role: 'seller', store_name: sname, store_bio: sbio, email: '' });
      S.profile = p[0];
    }
    $('btn-sell').style.display = 'block';
    ok.style.display = 'block';
    showToast('Store created!');
    setTimeout(() => goPage('sell'), 1500);
  } catch(e) { err.textContent = e.message; err.style.display = 'block'; }
}

async function loadProducts() {
  const grid = $('product-grid');
  grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Loading...</h3></div>';
  try {
    const data = await db('products?active=eq.true&select=*&order=created_at.desc', 'GET');
    S.products = data || [];
    renderProducts();
  } catch(e) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Error: ' + e.message + '</h3></div>';
  }
}

function renderProducts() {
  let prods = [...S.products];
  if (S.cat !== 'All') prods = prods.filter(p => p.category === S.cat);
  if (S.search) prods = prods.filter(p =>
    (p.name + p.description + p.category).toLowerCase().includes(S.search.toLowerCase())
  );
  const sort = $('sort-sel')?.value || 'newest';
  if (sort === 'price-asc') prods.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') prods.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') prods.sort((a, b) => b.avg_rating - a.avg_rating);
  else if (sort === 'popular') prods.sort((a, b) => b.review_count - a.review_count);

  $('market-count').textContent = prods.length + ' products';
  const grid = $('product-grid');
  if (!prods.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>No products found</h3><p>Try a different category or search.</p></div>';
    return;
  }
  grid.innerHTML = prods.map(p => {
    const isNew = (Date.now() - new Date(p.created_at)) < 86400000 * 3;
    const hasDiscount = p.original_price && p.original_price > p.price;
    const badge = p.stock === 0 ? '<span class="badge b-out">Out of Stock</span>'
      : hasDiscount ? '<span class="badge b-sale">Sale</span>'
      : isNew ? '<span class="badge b-new">New</span>'
      : p.review_count > 10 ? '<span class="badge b-hot">Popular</span>' : '';
    const wished = S.wishlist.includes(p.id);
    return `<div class="pcard" onclick="openProduct('${p.id}')">
      <img src="${p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'" loading="lazy">
      <button class="wish-btn ${wished ? 'on' : ''}" onclick="event.stopPropagation();toggleWishlist('${p.id}')">${wished ? '♥' : '♡'}</button>
      <div class="pcard-body">
        ${badge}
        <div class="pcard-name">${p.name}</div>
        <div class="pcard-store">${p.seller_account}</div>
        <div class="pcard-foot">
          <span class="pprice">${fmt(p.price)}</span>
          <span><span class="stars">${stars(p.avg_rating)}</span> <span style="font-size:10px;color:#aaa">(${p.review_count})</span></span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterCat(el, cat) {
  S.cat = cat; S.search = '';
  document.querySelectorAll('.cat').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  renderProducts();
}

function doSearch() {
  S.search = $('si').value.trim();
  renderProducts();
}

function doSearch2() {
  S.search = $('si2').value.trim();
  goPage('market');
  renderProducts();
}

async function loadMyOrders() {
  if (!S.user) return;
  try {
    const orders = await db('orders?buyer_account=eq.' + S.user.account_number + '&select=*&order=created_at.desc', 'GET');
    const list = $('my-orders-list');
    if (!orders || !orders.length) { list.innerHTML = '<div class="empty"><h3>No orders yet</h3><p>Go shop something!</p></div>'; return; }
    list.innerHTML = orders.map(o => `<div class="order-item">
      <div class="order-info"><div class="order-name">${o.product_name}</div><div class="order-meta">ID: ${o.order_id?.slice(-8)} · Seller: ${o.seller_account} · ${fmtDate(o.created_at)}</div></div>
      <div class="order-right"><div class="order-price">${fmt(o.price)}</div><span class="pill ${o.status === 'delivered' ? 'p-green' : o.status === 'shipped' ? 'p-blue' : 'p-yellow'}">${o.status}</span></div>
    </div>`).join('');
  } catch(e) { showToast(e.message); }
}

async function loadTxns() {
  if (!S.user) return;
  try {
    const txns = await db('transactions?or=(from_account.eq.' + S.user.account_number + ',to_account.eq.' + S.user.account_number + ')&order=created_at.desc&select=*', 'GET');
    const list = $('txns-list');
    if (!txns || !txns.length) { list.innerHTML = '<div class="empty"><h3>No transactions yet</h3></div>'; return; }
    list.innerHTML = txns.map(t => {
      const isOut = t.from_account === S.user.account_number;
      return `<div class="txn-item">
        <div class="txn-icon ${isOut ? 'out' : 'in'}">${isOut ? '↑' : '↓'}</div>
        <div class="txn-info"><div class="txn-desc">${t.description || 'Transaction'}</div><div class="txn-sub">${isOut ? 'To: ' + t.to_account : 'From: ' + t.from_account} · ${fmtDate(t.created_at)}</div></div>
        <div class="txn-amt ${isOut ? 'out' : 'in'}">${isOut ? '-' : '+'} ${fmt(t.amount)}</div>
      </div>`;
    }).join('');
  } catch(e) { showToast(e.message); }
}

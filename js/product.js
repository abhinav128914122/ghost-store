async function openProduct(id) {
  const p = S.products.find(x => x.id === id);
  if (!p) return;
  S.curProduct = p;
  $('det-img').src = p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
  $('det-name').textContent = p.name;
  $('det-price').textContent = fmt(p.price);
  $('det-desc').textContent = p.description || '';
  $('det-stars').textContent = stars(p.avg_rating);
  $('det-rcount').textContent = p.avg_rating ? p.avg_rating.toFixed(1) + ' (' + p.review_count + ' reviews)' : 'No reviews yet';
  $('det-stock-badge').innerHTML = p.stock > 0
    ? `<span class="stock-badge in-stock">In Stock (${p.stock} left)</span>`
    : '<span class="stock-badge out-stock">Out of Stock</span>';
  $('det-buy-btn').disabled = p.stock === 0;
  $('det-buy-btn').style.opacity = p.stock === 0 ? '0.5' : '1';
  $('det-badge').innerHTML = `<span class="badge b-new">${p.category}</span>`;
  const hasDiscount = p.original_price && p.original_price > p.price;
  $('det-og-price').style.display = hasDiscount ? 'inline' : 'none';
  $('det-discount').style.display = hasDiscount ? 'inline' : 'none';
  if (hasDiscount) {
    $('det-og-price').textContent = fmt(p.original_price);
    $('det-discount').textContent = Math.round((1 - p.price / p.original_price) * 100) + '% off';
  }
  const wished = S.wishlist.includes(p.id);
  $('det-wish-btn').textContent = wished ? '♥ Remove from Wishlist' : '♡ Add to Wishlist';
  $('det-wish-btn').style.color = wished ? '#b91c1c' : '';
  try {
    const sp = await db('profiles?account_number=eq.' + p.seller_account + '&select=*', 'GET');
    const sn = sp?.[0]?.store_name || p.seller_account;
    const sb = sp?.[0]?.store_bio || 'Verified seller';
    $('det-seller-name').textContent = sn;
    $('det-seller-bio').textContent = sb;
    $('det-seller-av').textContent = sn.charAt(0).toUpperCase();
  } catch(e) {
    $('det-seller-name').textContent = p.seller_account;
    $('det-seller-bio').textContent = "Seller on Abhinav's Market";
  }
  goPage('product');
  loadReviews(id);
  $('rev-prod-name').textContent = p.name;
}

async function loadReviews(pid) {
  try {
    const revs = await db('reviews?product_id=eq.' + pid + '&order=created_at.desc&select=*', 'GET');
    const list = $('reviews-list');
    const sum = $('rev-summary');
    if (!revs || !revs.length) {
      list.innerHTML = '<div class="empty"><p>No reviews yet. Be the first!</p></div>';
      sum.style.display = 'none';
      return;
    }
    const avg = revs.reduce((a, r) => a + r.rating, 0) / revs.length;
    sum.style.display = 'flex';
    sum.innerHTML = `<div style="text-align:center"><div class="rev-big-num">${avg.toFixed(1)}</div><div class="rev-big-stars">${stars(avg)}</div><div class="rev-big-count">${revs.length} reviews</div></div>`;
    list.innerHTML = revs.map(r => `<div class="rev-card">
      <div class="rev-top"><span class="rev-name">${r.buyer_name}</span><span class="stars">${stars(r.rating)} <span style="color:#aaa;font-size:11px">${r.rating}/5</span></span></div>
      <div class="rev-text">${r.comment || ''}</div>
      <div class="rev-date">${fmtDate(r.created_at)}</div>
    </div>`).join('');
  } catch(e) {}
}

function buyCurrentProduct() {
  requireLogin(() => { if (S.curProduct) openPayment(S.curProduct); });
}

function openReviewModal() {
  if (!S.curProduct) return;
  S.reviewRating = 0;
  $('rev-text').value = '';
  $('rev-err').style.display = 'none';
  document.querySelectorAll('#star-input span').forEach(s => s.classList.remove('on'));
  openOv('ov-review');
}

function setRating(n) {
  S.reviewRating = n;
  document.querySelectorAll('#star-input span').forEach((s, i) => s.classList.toggle('on', i < n));
}

async function submitReview() {
  const err = $('rev-err');
  err.style.display = 'none';
  if (!S.reviewRating) { err.textContent = 'Please select a rating'; err.style.display = 'block'; return; }
  try {
    await db('reviews', 'POST', {
      product_id: S.curProduct.id,
      buyer_account: S.user.account_number,
      buyer_name: S.user.account_holder,
      rating: S.reviewRating,
      comment: $('rev-text').value.trim()
    });
    const revs = await db('reviews?product_id=eq.' + S.curProduct.id + '&select=rating', 'GET');
    const avg = revs.reduce((a, r) => a + r.rating, 0) / revs.length;
    await db('products?id=eq.' + S.curProduct.id, 'PATCH', { avg_rating: +avg.toFixed(1), review_count: revs.length });
    const idx = S.products.findIndex(x => x.id === S.curProduct.id);
    if (idx >= 0) { S.products[idx].avg_rating = +avg.toFixed(1); S.products[idx].review_count = revs.length; }
    closeOv('ov-review');
    loadReviews(S.curProduct.id);
    showToast('Review submitted!');
  } catch(e) { err.textContent = e.message; err.style.display = 'block'; }
}

async function openSellerProfile() {
  if (!S.curProduct) return;
  try {
    const acc = S.curProduct.seller_account;
    const [prof, orders, prods] = await Promise.all([
      db('profiles?account_number=eq.' + acc + '&select=*', 'GET'),
      db('orders?seller_account=eq.' + acc + '&select=id', 'GET'),
      db('products?seller_account=eq.' + acc + '&active=eq.true&select=*', 'GET')
    ]);
    const sn = prof?.[0]?.store_name || acc;
    const sb = prof?.[0]?.store_bio || "Seller on Abhinav's Market";
    $('sp-av').textContent = sn.charAt(0).toUpperCase();
    $('sp-name').textContent = sn;
    $('sp-bio').textContent = sb;
    $('sp-stats').innerHTML = `
      <div class="stat"><div class="stat-lbl">Products</div><div class="stat-val">${(prods || []).length}</div></div>
      <div class="stat"><div class="stat-lbl">Total Sales</div><div class="stat-val">${(orders || []).length}</div></div>`;
    $('sp-products').innerHTML = (prods || []).slice(0, 4).map(p => `<div class="pcard" onclick="closeOv('ov-seller-profile');openProduct('${p.id}')">
      <img src="${p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}" alt="${p.name}" style="height:100px;object-fit:cover;width:100%">
      <div class="pcard-body"><div class="pcard-name" style="font-size:12px">${p.name}</div><div class="pprice" style="font-size:13px">${fmt(p.price)}</div></div>
    </div>`).join('');
    openOv('ov-seller-profile');
  } catch(e) { showToast(e.message); }
}

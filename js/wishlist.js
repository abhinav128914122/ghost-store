async function loadWishlist() {
  if (!S.user) return;
  try {
    const w = await db('wishlist?account_number=eq.' + S.user.account_number + '&select=product_id', 'GET');
    S.wishlist = (w || []).map(x => x.product_id);
  } catch(e) {}
}

async function toggleWishlist(id) {
  if (!S.user) { openLogin(); return; }
  const inW = S.wishlist.includes(id);
  try {
    if (inW) {
      await db('wishlist?account_number=eq.' + S.user.account_number + '&product_id=eq.' + id, 'DELETE');
      S.wishlist = S.wishlist.filter(x => x !== id);
      showToast('Removed from wishlist');
    } else {
      await db('wishlist', 'POST', { account_number: S.user.account_number, product_id: id });
      S.wishlist.push(id);
      showToast('Added to wishlist!');
    }
    renderProducts();
  } catch(e) { showToast(e.message); }
}

async function toggleWishlistCurrent() {
  if (!S.curProduct) return;
  await toggleWishlist(S.curProduct.id);
  const wished = S.wishlist.includes(S.curProduct.id);
  $('det-wish-btn').textContent = wished ? '♥ Remove from Wishlist' : '♡ Add to Wishlist';
  $('det-wish-btn').style.color = wished ? '#b91c1c' : '';
}

async function loadWishlistPage() {
  if (!S.user) return;
  const grid = $('wish-grid');
  grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Loading...</h3></div>';
  try {
    const w = await db('wishlist?account_number=eq.' + S.user.account_number + '&select=product_id', 'GET');
    const ids = (w || []).map(x => x.product_id);
    if (!ids.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Wishlist empty</h3><p>Heart products to save them here.</p></div>';
      return;
    }
    const prods = S.products.filter(p => ids.includes(p.id));
    grid.innerHTML = prods.map(p => `<div class="pcard" onclick="openProduct('${p.id}')">
      <img src="${p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}" alt="${p.name}" style="height:140px;object-fit:cover;width:100%">
      <div class="pcard-body">
        <div class="pcard-name">${p.name}</div>
        <div class="pcard-foot">
          <span class="pprice">${fmt(p.price)}</span>
          <button onclick="event.stopPropagation();toggleWishlist('${p.id}')" style="font-size:18px;background:none;border:none;cursor:pointer;color:#ef4444">♥</button>
        </div>
      </div>
    </div>`).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Error loading</h3></div>';
  }
}

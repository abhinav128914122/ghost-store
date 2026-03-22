const $ = id => document.getElementById(id);
const openOv = id => $(id).classList.add('on');
const closeOv = id => $(id).classList.remove('on');

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2600);
}

function stars(r) {
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= Math.round(r) ? '★' : '☆';
  return s;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function initials(name) {
  return name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
}

function setBN(p) {
  document.querySelectorAll('.bni').forEach(b => b.classList.remove('on'));
  const el = $('bn-' + p);
  if (el) el.classList.add('on');
}

function goPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('on'));
  $('page-' + p).classList.add('on');
  window.scrollTo(0, 0);
  if (p === 'sell') loadSellerDash();
  if (p === 'orders') loadMyOrders();
  if (p === 'wishlist') loadWishlistPage();
  if (p === 'txns') loadTxns();
  if (p === 'market') loadProducts();
}

function requireLogin(fn) {
  if (S.user) { fn(); }
  else { S.pendingAction = fn; openLogin(); }
}

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) closeOv(ov.id); });
});

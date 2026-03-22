function openLogin() {
  $('login-err').style.display = 'none';
  $('l-acc').value = '';
  $('l-pin').value = '';
  openOv('ov-login');
}

function fillAcc(a) {
  $('l-acc').value = a;
  $('l-pin').value = '';
  $('l-pin').focus();
}

async function doLogin() {
  const acc = $('l-acc').value.trim().toUpperCase();
  const pin = $('l-pin').value.trim();
  const err = $('login-err');
  err.style.display = 'none';
  if (!acc || !pin) { err.textContent = 'Enter account and PIN'; err.style.display = 'block'; return; }
  try {
    const data = await db('bank_accounts?account_number=eq.' + acc + '&pin=eq.' + pin + '&select=*', 'GET');
    if (!data || !data.length) { err.textContent = 'Wrong account or PIN'; err.style.display = 'block'; return; }
    S.user = data[0];
    let prof = await db('profiles?account_number=eq.' + acc + '&select=*', 'GET');
    if (!prof || !prof.length) { closeOv('ov-login'); openOv('ov-role'); }
    else { S.profile = prof[0]; closeOv('ov-login'); onLoggedIn(); }
  } catch(e) { err.textContent = e.message; err.style.display = 'block'; }
}

function selRole(r) {
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('on'));
  $('rc-' + r).classList.add('on');
  $('role-seller-fields').style.display = r === 'seller' ? 'block' : 'none';
}

async function saveRole() {
  const isSeller = $('rc-seller').classList.contains('on');
  const sname = $('r-sname').value.trim() || S.user.account_holder + "'s Store";
  const sbio = $('r-sbio').value.trim();
  try {
    const p = await db('profiles', 'POST', {
      account_number: S.user.account_number,
      role: isSeller ? 'seller' : 'buyer',
      store_name: isSeller ? sname : null,
      store_bio: isSeller ? sbio : null,
      email: ''
    });
    S.profile = p[0];
    closeOv('ov-role');
    onLoggedIn();
  } catch(e) { showToast('Error: ' + e.message); }
}

function onLoggedIn() {
  $('btn-login').style.display = 'none';
  $('upill').style.display = 'flex';
  $('u-av').textContent = initials(S.user.account_holder);
  $('u-name').textContent = S.user.account_holder.split(' ')[0];
  $('btn-wishlist').style.display = 'block';
  $('btn-orders').style.display = 'block';
  $('btn-sell').style.display = 'block';
  $('notif-btn').style.display = 'flex';
  loadWishlist();
  checkNotifs();
  if (S.pendingAction) { S.pendingAction(); S.pendingAction = null; }
  showToast('Welcome, ' + S.user.account_holder.split(' ')[0] + '!');
}

function doLogout() {
  S.user = null; S.profile = null; S.wishlist = [];
  $('btn-login').style.display = 'block';
  $('upill').style.display = 'none';
  $('btn-wishlist').style.display = 'none';
  $('btn-orders').style.display = 'none';
  $('btn-sell').style.display = 'none';
  $('notif-btn').style.display = 'none';
  closeOv('ov-user');
  goPage('market');
  showToast('Logged out.');
}

function openUserMenu() {
  if (!S.user) return;
  $('menu-av').textContent = initials(S.user.account_holder);
  $('menu-name').textContent = S.user.account_holder;
  $('menu-acc').textContent = S.user.account_number;
  $('menu-bal').textContent = fmt(S.user.balance);
  const hasStore = S.profile?.store_name;
  $('menu-store-box').style.display = hasStore ? 'block' : 'none';
  if (hasStore) $('menu-store-name').textContent = S.profile.store_name;
  openOv('ov-user');
}

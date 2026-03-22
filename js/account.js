let caData = { name: '', email: '', role: 'buyer', storeName: '', storeBio: '' };

function openCreateAccount() {
  goPage('create-account');
  caReset();
}

function caReset() {
  caData = { name: '', email: '', role: 'buyer', storeName: '', storeBio: '' };
  $('ca-step1').style.display = 'block';
  $('ca-step2').style.display = 'none';
  $('ca-step3').style.display = 'none';
  $('cs1').className = 'cstep on';
  $('cs2').className = 'cstep';
  $('cs3').className = 'cstep';
  $('ca-name').value = ''; $('ca-email').value = '';
  $('ca-role').value = 'buyer';
  $('ca-store-fields').style.display = 'none';
  $('ca-err1').style.display = 'none';
  $('ca-accno').value = ''; $('ca-pin').value = ''; $('ca-pin2').value = '';
  $('ca-err2').style.display = 'none';
  $('ca-role').addEventListener('change', () => {
    $('ca-store-fields').style.display = $('ca-role').value !== 'buyer' ? 'block' : 'none';
  });
}

function caNext1() {
  const name = $('ca-name').value.trim();
  const err = $('ca-err1');
  err.style.display = 'none';
  if (!name) { err.textContent = 'Please enter your full name'; err.style.display = 'block'; return; }
  caData.name = name;
  caData.email = $('ca-email').value.trim();
  caData.role = $('ca-role').value;
  caData.storeName = $('ca-store-name')?.value.trim() || '';
  caData.storeBio = $('ca-store-bio')?.value.trim() || '';
  $('ca-step1').style.display = 'none';
  $('ca-step2').style.display = 'block';
  $('cs1').className = 'cstep done';
  $('cs2').className = 'cstep on';
}

function caBack() {
  $('ca-step2').style.display = 'none';
  $('ca-step1').style.display = 'block';
  $('cs1').className = 'cstep on';
  $('cs2').className = 'cstep';
}

async function caCreate() {
  const accno = $('ca-accno').value.trim().toUpperCase();
  const pin = $('ca-pin').value.trim();
  const pin2 = $('ca-pin2').value.trim();
  const err = $('ca-err2');
  err.style.display = 'none';
  if (!accno || accno.length < 4) { err.textContent = 'Account number must be 4–10 characters'; err.style.display = 'block'; return; }
  if (!/^[A-Z0-9]+$/.test(accno)) { err.textContent = 'Only letters and numbers allowed'; err.style.display = 'block'; return; }
  if (!pin || pin.length !== 4 || isNaN(pin)) { err.textContent = 'PIN must be exactly 4 digits'; err.style.display = 'block'; return; }
  if (pin !== pin2) { err.textContent = 'PINs do not match'; err.style.display = 'block'; return; }
  try {
    const exists = await db('bank_accounts?account_number=eq.' + accno + '&select=account_number', 'GET');
    if (exists && exists.length) { err.textContent = 'Account number already taken. Try another.'; err.style.display = 'block'; return; }
    await db('bank_accounts', 'POST', { account_number: accno, account_holder: caData.name, balance: 10000, pin });
    const isSeller = caData.role !== 'buyer';
    await db('profiles', 'POST', { account_number: accno, role: isSeller ? 'seller' : 'buyer', store_name: isSeller ? caData.storeName || caData.name + "'s Store" : null, store_bio: isSeller ? caData.storeBio : null, email: caData.email });
    await db('notifications', 'POST', { account_number: accno, message: "Welcome to Abhinav's Market! Your account is ready with ₹10,000 starter balance. Happy shopping!", type: 'welcome' }).catch(() => {});
    $('ca-done-acc').textContent = accno;
    $('ca-done-name').textContent = caData.name;
    $('ca-step2').style.display = 'none';
    $('ca-step3').style.display = 'block';
    $('cs2').className = 'cstep done';
    $('cs3').className = 'cstep on';
  } catch(e) { err.textContent = 'Error: ' + e.message; err.style.display = 'block'; }
}

function caLoginNow() {
  $('l-acc').value = $('ca-done-acc').textContent;
  $('l-pin').value = '';
  goPage('market');
  openLogin();
}

function openTopup() {
  $('topup-cur-bal').textContent = fmt(S.user.balance);
  $('topup-err').style.display = 'none';
  $('topup-ok').style.display = 'none';
  $('topup-pin').value = '';
  $('topup-custom').value = '';
  document.querySelectorAll('.topup-opt').forEach(o => o.classList.remove('on'));
  S.selectedTopup = 0;
  openOv('ov-topup');
}

function selTopup(n) {
  S.selectedTopup = n;
  document.querySelectorAll('.topup-opt').forEach(o => o.classList.remove('on'));
  event.currentTarget.classList.add('on');
  $('topup-custom').value = '';
}

async function doTopup() {
  const amt = parseInt($('topup-custom').value) || S.selectedTopup;
  const pin = $('topup-pin').value.trim();
  const err = $('topup-err'); const ok = $('topup-ok');
  err.style.display = 'none'; ok.style.display = 'none';
  if (!amt || amt < 1) { err.textContent = 'Select or enter an amount'; err.style.display = 'block'; return; }
  if (pin !== String(S.user.pin)) { err.textContent = 'Wrong PIN'; err.style.display = 'block'; return; }
  try {
    const newBal = S.user.balance + amt;
    await db('bank_accounts?account_number=eq.' + S.user.account_number, 'PATCH', { balance: newBal });
    await db('wallet_topups', 'POST', { account_number: S.user.account_number, amount: amt });
    S.user.balance = newBal;
    $('topup-cur-bal').textContent = fmt(newBal);
    ok.textContent = fmt(amt) + ' added! New balance: ' + fmt(newBal);
    ok.style.display = 'block';
    showToast('Balance topped up: +' + fmt(amt));
    setTimeout(() => closeOv('ov-topup'), 2000);
  } catch(e) { err.textContent = e.message; err.style.display = 'block'; }
}

async function checkNotifs() {
  if (!S.user) return;
  try {
    const n = await db('notifications?account_number=eq.' + S.user.account_number + '&read=eq.false&select=id', 'GET');
    $('notif-dot').style.display = (n && n.length) ? 'block' : 'none';
  } catch(e) {}
}

async function openNotifs() {
  try {
    const notifs = await db('notifications?account_number=eq.' + S.user.account_number + '&order=created_at.desc&select=*', 'GET');
    const list = $('notifs-list');
    if (!notifs || !notifs.length) {
      list.innerHTML = '<div class="empty" style="padding:30px"><h3>No notifications yet</h3></div>';
    } else {
      list.innerHTML = notifs.map(n => `<div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="notif-dot2" style="background:${n.type === 'order' ? '#f59e0b' : n.type === 'info' ? '#3b82f6' : '#22c55e'}"></div>
        <div><div class="notif-text">${n.message}</div><div class="notif-time">${fmtDate(n.created_at)}</div></div>
      </div>`).join('');
      await db('notifications?account_number=eq.' + S.user.account_number, 'PATCH', { read: true }).catch(() => {});
      $('notif-dot').style.display = 'none';
    }
    openOv('ov-notifs');
  } catch(e) { showToast(e.message); }
}

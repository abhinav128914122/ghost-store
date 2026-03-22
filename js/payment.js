function openPayment(product) {
  S.pay = { product, discount: 0, couponCode: '' };
  $('pay-pname').textContent = product.name;
  $('pay-seller').textContent = product.seller_account;
  $('pay-total').textContent = fmt(product.price);
  $('pay-acc-name').textContent = S.user.account_holder + ' (' + S.user.account_number + ')';
  $('pay-acc-bal').textContent = 'Balance: ' + fmt(S.user.balance);
  $('pay-pin').value = '';
  $('pay-err').style.display = 'none';
  $('coupon-input').value = '';
  $('coupon-ok').style.display = 'none';
  $('pay-disc-row').style.display = 'none';
  $('pay-confirm').style.display = 'block';
  $('pay-proc').classList.remove('on');
  $('pay-suc').classList.remove('on');
  $('pay-insuf').style.display = S.user.balance < product.price ? 'block' : 'none';
  $('pay-btn').disabled = S.user.balance < product.price;
  openOv('ov-pay');
}

async function applyCoupon() {
  const code = $('coupon-input').value.trim().toUpperCase();
  if (!code) return;
  try {
    const data = await db('coupons?code=eq.' + code + '&active=eq.true&select=*', 'GET');
    if (!data || !data.length) { showToast('Invalid or expired coupon'); return; }
    const c = data[0];
    if (c.used_count >= c.max_uses) { showToast('Coupon usage limit reached'); return; }
    const disc = Math.floor(S.pay.product.price * c.discount_pct / 100);
    S.pay.discount = disc;
    S.pay.couponCode = code;
    const newTotal = S.pay.product.price - disc;
    $('pay-total').textContent = fmt(newTotal);
    $('pay-disc-row').style.display = 'flex';
    $('pay-disc-amt').textContent = '-' + fmt(disc) + ' (' + c.discount_pct + '% off)';
    $('coupon-ok').textContent = 'Coupon applied! You save ' + fmt(disc);
    $('coupon-ok').style.display = 'block';
    $('pay-insuf').style.display = S.user.balance < newTotal ? 'block' : 'none';
    $('pay-btn').disabled = S.user.balance < newTotal;
    showToast('Coupon applied: ' + c.discount_pct + '% off!');
  } catch(e) { showToast(e.message); }
}

async function confirmPay() {
  const pin = $('pay-pin').value.trim();
  const err = $('pay-err');
  err.style.display = 'none';
  if (pin !== String(S.user.pin)) { err.textContent = 'Wrong PIN'; err.style.display = 'block'; return; }
  $('pay-confirm').style.display = 'none';
  $('pay-proc').classList.add('on');
  await new Promise(r => setTimeout(r, 1800));
  try {
    const p = S.pay.product;
    const finalAmt = p.price - S.pay.discount;
    const newBal = S.user.balance - finalAmt;
    const oid = 'ORD' + Date.now();
    await db('bank_accounts?account_number=eq.' + S.user.account_number, 'PATCH', { balance: newBal });
    const sRows = await db('bank_accounts?account_number=eq.' + p.seller_account + '&select=balance', 'GET');
    await db('bank_accounts?account_number=eq.' + p.seller_account, 'PATCH', { balance: sRows[0].balance + finalAmt });
    await db('products?id=eq.' + p.id, 'PATCH', { stock: Math.max(0, p.stock - 1) });
    await db('transactions', 'POST', { from_account: S.user.account_number, to_account: p.seller_account, amount: finalAmt, description: 'Purchase: ' + p.name, status: 'success' });
    await db('orders', 'POST', { order_id: oid, product_id: p.id, product_name: p.name, price: finalAmt, buyer_account: S.user.account_number, buyer_name: S.user.account_holder, seller_account: p.seller_account, status: 'confirmed' });
    if (S.pay.couponCode) await db('coupons?code=eq.' + S.pay.couponCode, 'PATCH', { used_count: 0 }).catch(() => {});
    await db('notifications', 'POST', { account_number: p.seller_account, message: 'New order! ' + S.user.account_holder + ' bought "' + p.name + '" for ' + fmt(finalAmt), type: 'order' }).catch(() => {});
    S.user.balance = newBal;
    const idx = S.products.findIndex(x => x.id === p.id);
    if (idx >= 0) S.products[idx].stock = Math.max(0, S.products[idx].stock - 1);
    $('pay-proc').classList.remove('on');
    $('pay-suc').classList.add('on');
    $('s-oid').textContent = oid;
    $('s-prod').textContent = p.name;
    $('s-amt').textContent = fmt(finalAmt);
    $('s-from').textContent = S.user.account_number;
    $('s-to').textContent = p.seller_account;
    $('s-time').textContent = new Date().toLocaleTimeString('en-IN');
    $('s-newbal').textContent = 'New balance: ' + fmt(newBal);
  } catch(e) {
    $('pay-proc').classList.remove('on');
    $('pay-confirm').style.display = 'block';
    err.textContent = 'Payment failed: ' + e.message;
    err.style.display = 'block';
  }
}

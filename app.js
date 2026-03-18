const BACKEND = "";

let stripe, elements, paymentIntentId;
let payAmount       = 0;   //orig_amount
let payEmail        = "";
let appliedCoupon   = "";  //coupon_code
let redeemPct       = 0;   // % coupon covers
let redeemedRupees  = 0;   //rupees covered by coupon
let finalPayRupees  = 0;   //customer_pays

const fmt = v => '₹' + Math.round(v).toLocaleString('en-IN');


function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => {
  showPage('page-landing');
  initLanding();
});


function initLanding() {
  const amountEl = document.getElementById('amount-input');
  const emailEl  = document.getElementById('email-input');

  
  document.querySelectorAll('.chip').forEach(c => {
    c.dataset.val = c.textContent.replace(/[₹,]/g, '');
  });

  amountEl.addEventListener('input', () => {
    const val = parseInt(amountEl.value);
    amountEl.classList.remove('error');
    document.getElementById('amount-err').classList.remove('show');

    if (val > 0) {
      payAmount      = val;
      finalPayRupees = val;
      document.querySelectorAll('.chip').forEach(c =>
        c.classList.toggle('active', parseInt(c.dataset.val) === val)
      );
      
      if (appliedCoupon) recalcWithCoupon();
      else updateSummary();
    } else {
      payAmount = 0; finalPayRupees = 0;
      document.getElementById('summary-strip').style.display = 'none';
    }
  });

  emailEl.addEventListener('input', () => {
    emailEl.classList.remove('error');
    document.getElementById('email-err').classList.remove('show');
  });

  document.addEventListener('keydown', e => {
    if (!document.getElementById('page-landing').classList.contains('active')) return;
    if (e.key === 'Enter') {
      if (document.activeElement === document.getElementById('coupon-input')) {
        redeemCoupon();
      } else {
        goToCheckout();
      }
    }
  });
}

function setAmount(val) {
  const el = document.getElementById('amount-input');
  el.value = val;
  el.dispatchEvent(new Event('input'));
  el.focus();
}

function updateSummary() {
  const strip = document.getElementById('summary-strip');
  if (payAmount <= 0) { strip.style.display = 'none'; return; }

  strip.style.display = 'block';
  document.getElementById('summary-original').textContent = fmt(payAmount);

  const redeemRow = document.getElementById('summary-redeem-row');
  const finalRow  = document.getElementById('summary-final-row');

  if (redeemPct > 0) {
    redeemRow.style.display = 'flex';
    document.getElementById('summary-redeem-pct').textContent  = redeemPct + '%';
    document.getElementById('summary-redeemed').textContent    = '− ' + fmt(redeemedRupees);
    finalRow.style.display  = 'flex';
    document.getElementById('summary-final').textContent       = fmt(finalPayRupees);
  } else {
    redeemRow.style.display = 'none';
    finalRow.style.display  = 'none';
  }
}

function recalcWithCoupon() {
  redeemedRupees = Math.round(payAmount * redeemPct / 100);
  finalPayRupees = payAmount - redeemedRupees;
  updateSummary();
}


async function redeemCoupon() {
  const couponInput = document.getElementById('coupon-input');
  const code = couponInput.value.trim().toUpperCase();

  if (!code) return;

  if (payAmount <= 0) {
    showCouponResult(false, 'Please enter amount first');
    return;
  }

  const btn = document.getElementById('redeem-btn');
  btn.disabled    = true;
  btn.textContent = '...';

  try {
    const res  = await fetch(`${BACKEND}/validate-coupon`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, amount_inr: payAmount }),
    });
    const data = await res.json();

    if (data.valid) {
      appliedCoupon  = data.code;
      redeemPct      = data.redeem_pct;
      redeemedRupees = data.redeemed_rupees;
      finalPayRupees = data.pay_rupees;

      couponInput.classList.add('input-success');
      couponInput.classList.remove('input-error');
      couponInput.readOnly = true;

      document.getElementById('coupon-card').classList.add('active-coupon');
      document.getElementById('coupon-card').classList.remove('error-coupon');

      const msg = data.is_free
        ? `${data.code} — 100% redeemed! Completely FREE`
        : `${data.code} — ${redeemPct}% redeemed! You pay only ${fmt(finalPayRupees)}`;

      showCouponResult(true, msg);
      updateSummary();

    } else {
      couponInput.classList.add('input-error');
      couponInput.classList.remove('input-success');
      document.getElementById('coupon-card').classList.add('error-coupon');
      document.getElementById('coupon-card').classList.remove('active-coupon');
      showCouponResult(false, data.error || 'Invalid redeem code');
      clearCouponState();
      updateSummary();
    }

  } catch (e) {
    showCouponResult(false, 'Could not validate. Try again.');
  }

  btn.disabled    = false;
  btn.textContent = 'Redeem';
}

function clearCouponState() {
  appliedCoupon  = '';
  redeemPct      = 0;
  redeemedRupees = 0;
  finalPayRupees = payAmount;
}

//Remove coupon
function removeCoupon() {
  clearCouponState();
  const couponInput = document.getElementById('coupon-input');
  couponInput.value    = '';
  couponInput.readOnly = false;
  couponInput.classList.remove('input-success', 'input-error');
  document.getElementById('coupon-card').classList.remove('active-coupon', 'error-coupon');
  hideCouponResult();
  updateSummary();
}

function showCouponResult(success, msg) {
  const el = document.getElementById('coupon-result-strip');
  el.className = 'coupon-result-strip show ' + (success ? 'res-success' : 'res-error');
  document.getElementById('coupon-result-text').textContent = msg;
  document.getElementById('coupon-remove-btn').style.display = success ? 'inline' : 'none';
}

function hideCouponResult() {
  document.getElementById('coupon-result-strip').className = 'coupon-result-strip';
}

//pay
async function goToCheckout() {
  const amountEl = document.getElementById('amount-input');
  const emailEl  = document.getElementById('email-input');
  let valid = true;

  const amount = parseInt(amountEl.value);
  if (!amount || amount < 1) {
    amountEl.classList.add('error');
    document.getElementById('amount-err').classList.add('show');
    valid = false;
  }

  const email = emailEl.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailEl.classList.add('error');
    document.getElementById('email-err').classList.add('show');
    valid = false;
  }

  if (!valid) return;

  payAmount = amount;
  payEmail  = email;
  if (!appliedCoupon) finalPayRupees = amount;

  showPage('page-checkout');
  populateCheckout();
  await initStripe();
}


function goBack() {
  showPage('page-landing');
  document.getElementById('form-area').style.display       = 'block';
  document.getElementById('success-screen').classList.remove('show');
  document.getElementById('payment-element').innerHTML     = '';
  document.getElementById('pe-loader').style.display       = 'block';
  document.getElementById('pay-btn').disabled              = true;
  document.getElementById('msg').className                 = '';
  elements = null; paymentIntentId = null;
}

function populateCheckout() {
  const hasRedeem = redeemPct > 0;

  document.getElementById('order-amount').textContent = fmt(finalPayRupees);
  document.getElementById('btn-amount').textContent   = fmt(finalPayRupees);

  //coupon_tag
  const tag = document.getElementById('coupon-tag');
  if (appliedCoupon) {
    tag.style.display = 'inline-flex';
    tag.textContent   = appliedCoupon + ' — ' + redeemPct + '% redeemed';
  } else {
    tag.style.display = 'none';
  }

  document.getElementById('fb-original').textContent = fmt(payAmount);

  const redeemRow = document.getElementById('fb-redeem-row');
  const payRow    = document.getElementById('fb-pay-row');

  if (hasRedeem) {
    redeemRow.style.display = 'flex';
    document.getElementById('fb-redeem-pct').textContent  = redeemPct + '% redeemed';
    document.getElementById('fb-redeemed').textContent    = '− ' + fmt(redeemedRupees);
    payRow.style.display = 'flex';
    document.getElementById('fb-pay').textContent         = fmt(finalPayRupees);
  } else {
    redeemRow.style.display = 'none';
    payRow.style.display    = 'none';
  }

  const stripeFee   = Math.round(finalPayRupees * 0.02);
  const receiverAmt = finalPayRupees - stripeFee;
  document.getElementById('fb-stripe').textContent   = '~' + fmt(stripeFee);
  document.getElementById('fb-receiver').textContent = '~' + fmt(receiverAmt);
}

async function initStripe() {
  try {
    const res  = await fetch(`${BACKEND}/config`);
    const data = await res.json();
    if (!data.publishableKey || data.publishableKey.includes('YOUR_')) {
      showMsg('Add Stripe keys to payment.py and restart.', 'error');
      hideSkeleton(); return;
    }
    if (!stripe) stripe = Stripe(data.publishableKey);
    await createAndMount();
  } catch (e) {
    showMsg('Cannot connect to backend. Run: python payment.py', 'error');
    hideSkeleton();
  }
}

async function createAndMount() {
  try {
    const res = await fetch(`${BACKEND}/create-payment-intent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_inr  : payAmount,
        email       : payEmail,
        coupon_code : appliedCoupon,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.isFree) {
      hideSkeleton();
      document.getElementById('form-area').style.display = 'none';
      document.getElementById('success-screen').classList.add('show');
      document.getElementById('success-sub').textContent = `Paid by ${payEmail}`;
      document.getElementById('receipt').innerHTML = buildReceipt(0, payAmount, redeemedRupees, redeemPct, appliedCoupon);
      return;
    }

    paymentIntentId = data.paymentIntentId;
    elements = stripe.elements({
      clientSecret: data.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary:    '#4f46e5', colorBackground: '#ffffff',
          colorText:       '#0f0f12', colorDanger:     '#dc2626',
          fontFamily:      "'Sora', system-ui, sans-serif",
          borderRadius:    '10px',   spacingUnit:     '4px',
        },
      },
    });

    const payEl = elements.create('payment', {
      layout: { type: 'tabs', defaultCollapsed: false, radios: false },
      defaultValues: { billingDetails: { email: payEmail } },
    });
    payEl.on('ready', () => {
      hideSkeleton();
      document.getElementById('pay-btn').disabled = false;
    });
    payEl.mount('#payment-element');

  } catch (e) {
    showMsg(e.message, 'error');
    hideSkeleton();
  }
}

async function handlePay() {
  setLoading(true);
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: window.location.href, receipt_email: payEmail },
    redirect: 'if_required',
  });
  if (error) { showMsg(error.message, 'error'); setLoading(false); return; }

  try {
    const res  = await fetch(`${BACKEND}/confirm-payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('form-area').style.display = 'none';
      document.getElementById('success-screen').classList.add('show');
      document.getElementById('success-sub').textContent = `Paid by ${payEmail}`;
      document.getElementById('receipt').innerHTML = buildReceipt(
        data.payRupees, data.originalRupees,
        data.redeemedRupees, data.redeemPct, data.couponCode
      );
    } else {
      showMsg(data.message || 'Payment not confirmed.', 'error');
      setLoading(false);
    }
  } catch (e) {
    showMsg('Verification failed. Please try again.', 'error');
    setLoading(false);
  }
}

//recipt
function buildReceipt(paid, original, redeemed, rPct, coupon) {
  const isFree    = paid === 0;
  const stripeFee = Math.round(paid * 0.02);
  const recvAmt   = paid - stripeFee;
  let html = '';

  html += `<div class="receipt-row"><span>Original amount</span><span>${fmt(original)}</span></div>`;

  if (rPct > 0) {
    html += `<div class="receipt-row redeem-receipt">
      <span>${coupon} — ${rPct}% redeemed</span>
      <span>− ${fmt(redeemed)}</span>
    </div>`;
  }

  if (isFree) {
    html += `<div class="receipt-row">
      <span>You paid</span>
      <span><span class="free-badge">FREE</span></span>
    </div>`;
  } else {
    html += `<div class="receipt-row"><span>You paid</span><span>${fmt(paid)}</span></div>`;
    html += `<div class="receipt-row"><span>Stripe fee</span><span style="color:#b45309">~${fmt(stripeFee)}</span></div>`;
    html += `<div class="receipt-row success-row"><span>Receiver gets</span><span>~${fmt(recvAmt)}</span></div>`;
  }

  html += `<div class="receipt-row"><span>Status</span><span style="color:var(--success)">Succeeded ✓</span></div>`;
  return html;
}

function hideSkeleton() { document.getElementById('pe-loader').style.display = 'none'; }
function showMsg(t, type) { const el = document.getElementById('msg'); el.textContent = t; el.className = type; }
function setLoading(on) {
  document.getElementById('pay-btn').disabled       = on;
  document.getElementById('btn-text').style.display = on ? 'none'  : 'flex';
  document.getElementById('spinner').style.display  = on ? 'block' : 'none';
}
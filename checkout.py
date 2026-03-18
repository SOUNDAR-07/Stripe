import stripe
from flask import request, jsonify, Blueprint
from backend.coupons import validate_coupon

checkout_bp = Blueprint("checkout", __name__)

FIXED_RECEIVER_ACCOUNT = "acct_XXXXXXXXXX"  #replace with receiver account


@checkout_bp.route("/validate-coupon", methods=["POST"])
def validate_coupon_route():    #coupon validation
    data   = request.json
    code   = data.get("code", "")
    amount = int(data.get("amount_inr", 0))

    if amount <= 0:
        return jsonify(valid=False, error="Invalid amount"), 400

    return jsonify(validate_coupon(code, amount))


@checkout_bp.route("/create-payment-intent", methods=["POST"])
def create_payment_intent():    #payment Intent ceration
    data         = request.json
    original_amt = int(data.get("amount_inr", 100))
    email        = data.get("email", "")
    coupon_code  = data.get("coupon_code", "").strip().upper()

    redeemed_rupees = 0
    pay_rupees      = original_amt
    redeem_pct      = 0
    is_free         = False

    if coupon_code:
        result = validate_coupon(coupon_code, original_amt)
        if result["valid"]:
            redeemed_rupees = result["redeemed_rupees"]
            pay_rupees      = result["pay_rupees"]
            redeem_pct      = result["redeem_pct"]
            is_free         = result["is_free"]

    if is_free:                  # reedem percentage 
        return jsonify(
            clientSecret    = None,
            paymentIntentId = None,
            payRupees       = 0,
            redeemedRupees  = redeemed_rupees,
            originalRupees  = original_amt,
            redeem_pct      = redeem_pct,
            isFree          = True,
        )

    amount_paise = pay_rupees * 100

    try:
        customer = stripe.Customer.create(email=email) if email else None

        intent_params = dict(
            amount                    = amount_paise,
            currency                  = "inr",
            customer                  = customer.id if customer else None,
            automatic_payment_methods = {"enabled": True},
            metadata={
                "email"           : email,
                "original_rupees" : original_amt,
                "redeemed_rupees" : redeemed_rupees,
                "pay_rupees"      : pay_rupees,
                "redeem_pct"      : redeem_pct,
                "coupon_code"     : coupon_code,
                "receiver_account": FIXED_RECEIVER_ACCOUNT,
            },
        )

        if FIXED_RECEIVER_ACCOUNT and not FIXED_RECEIVER_ACCOUNT.startswith("acct_XXX"):
            intent_params["transfer_data"] = {"destination": FIXED_RECEIVER_ACCOUNT}

        intent = stripe.PaymentIntent.create(**intent_params)

        return jsonify(
            clientSecret    = intent.client_secret,
            paymentIntentId = intent.id,
            payRupees       = pay_rupees,
            redeemedRupees  = redeemed_rupees,
            originalRupees  = original_amt,
            redeem_pct      = redeem_pct,
            isFree          = False,
        )

    except stripe.error.StripeError as e:
        return jsonify(error=str(e.user_message)), 400
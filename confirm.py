import stripe
from flask import request, jsonify, Blueprint

confirm_bp = Blueprint("confirm", __name__)


@confirm_bp.route("/confirm-payment", methods=["POST"])
def confirm_payment():               #payment status check success/failure
    data              = request.json
    payment_intent_id = data.get("paymentIntentId")

    if not payment_intent_id:
        return jsonify(error="paymentIntentId is required"), 400

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if intent.status == "succeeded":
            meta             = intent.metadata
            pay_rupees       = intent.amount // 100
            stripe_fee       = round(pay_rupees * 0.02, 2)
            receiver_rupees  = pay_rupees - stripe_fee

            return jsonify(
                success         = True,
                status          = intent.status,
                payRupees       = pay_rupees,
                stripeFee       = stripe_fee,
                receiverRupees  = receiver_rupees,
                originalRupees  = int(meta.get("original_rupees", pay_rupees)),
                redeemedRupees  = int(meta.get("redeemed_rupees", 0)),
                redeemPct       = int(meta.get("redeem_pct", 0)),
                couponCode      = meta.get("coupon_code", ""),
                message         = "Payment successful!",
            )
        else:
            return jsonify(
                success=False,
                status=intent.status,
                message=f"Payment status: {intent.status}",
            ), 400

    except stripe.error.StripeError as e:
        return jsonify(error=str(e.user_message)), 400
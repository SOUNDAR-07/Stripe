import stripe
from flask import request, jsonify, Blueprint, current_app

webhook_bp = Blueprint("webhook", __name__)


@webhook_bp.route("/webhook", methods=["POST"])
def webhook(): #secure 
    payload        = request.data
    sig_header     = request.headers.get("Stripe-Signature")
    webhook_secret = current_app.config.get("WEBHOOK_SECRET", "")

    try: # Signature verify
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return jsonify(error="Invalid payload"), 400
    except stripe.error.SignatureVerificationError:
        return jsonify(error="Invalid signature"), 400

    event_type = event["type"]
    obj        = event["data"]["object"]

    if event_type == "payment_intent.succeeded":
        _handle_payment_succeeded(obj)

    elif event_type == "payment_intent.payment_failed":
        _handle_payment_failed(obj)

    elif event_type == "payment_intent.processing":
        _handle_payment_processing(obj)

    elif event_type == "transfer.created":
        _handle_transfer_created(obj)

    elif event_type == "charge.refunded":
        _handle_refund(obj)

    else:
        print(f"[webhook] Unhandled event: {event_type}")

    return jsonify(received=True), 200


def _handle_payment_succeeded(pi: dict):   #if payment sucesses show reedem details 
    meta            = pi.get("metadata", {})
    pay_rupees      = pi["amount"] // 100
    original_rupees = int(meta.get("original_rupees", pay_rupees))
    redeemed_rupees = int(meta.get("redeemed_rupees", 0))
    redeem_pct      = int(meta.get("redeem_pct", 0))
    coupon_code     = meta.get("coupon_code", "")
    email           = meta.get("email", "")
    receiver        = meta.get("receiver_account", "direct")

    print("\n" + "=" * 50)
    print("  PAYMENT SUCCEEDED")
    print(f"  Intent ID : {pi['id']}")
    print(f"  Email     : {email}")
    print("-" * 50)
    print(f"  Original  : Rs.{original_rupees:,}")

    if coupon_code and redeem_pct > 0:
        print(f"  Coupon    : {coupon_code}  ({redeem_pct}% redeemed)")
        print(f"  Redeemed  : Rs.{redeemed_rupees:,}")

    print(f"  Paid      : Rs.{pay_rupees:,}")
    print(f"  Receiver  : {receiver}")
    print("=" * 50 + "\n")



def _handle_payment_failed(pi: dict):  #if payment fails error show agum
    meta          = pi.get("metadata", {})
    email         = meta.get("email", "")
    last_error    = pi.get("last_payment_error") or {}
    error_message = last_error.get("message", "Unknown error")

    print("\n" + "=" * 50)
    print("  PAYMENT FAILED")
    print(f"  Intent ID : {pi['id']}")
    print(f"  Email     : {email}")
    print(f"  Reason    : {error_message}")
    print("=" * 50 + "\n")



def _handle_payment_processing(pi: dict): #if payment processing/slow network
    meta  = pi.get("metadata", {})
    email = meta.get("email", "")
    print(f"[webhook] Processing: {pi['id']} | {email}")



def _handle_transfer_created(transfer: dict):   #transfer amount to receiver
    amount_rupees = transfer["amount"] // 100
    destination   = transfer.get("destination", "")

    print(f"[webhook] Transfer: {transfer['id']}")
    print(f"          Amount  : Rs.{amount_rupees:,}")
    print(f"          To      : {destination}")



def _handle_refund(charge: dict):   #if Refund happends
    amount_rupees = charge["amount_refunded"] // 100
    email         = (charge.get("billing_details") or {}).get("email", "")

    print(f"[webhook] Refund : {charge['id']}")
    print(f"          Amount : Rs.{amount_rupees:,}")
    print(f"          Email  : {email}")


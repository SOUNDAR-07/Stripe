COUPONS = {

    #10% reedem - pay 90%
    "REDEEM10": {
        "redeem_pct":  10,
        "description": "10% redeemed — pay 90%",
    },

    #20% reedem
    "REDEEM20": {
        "redeem_pct":  20,
        "description": "20% redeemed — pay 80%",
    },

    #30% reedem
    "REDEEM30": {
        "redeem_pct":  30,
        "description": "30% redeemed — pay 70%",
    },

    #50% reedem
    "HALF50": {
        "redeem_pct":  50,
        "description": "50% redeemed — pay 50%",
    },

    #70% reedem
    "REDEEM70": {
        "redeem_pct":  70,
        "description": "70% redeemed — pay 30%",
    },

    #100% reedem
    "FREE100": {
        "redeem_pct":  100,
        "description": "100% redeemed — completely FREE",
    },

    #15% reedem
    "WELCOME15": {
        "redeem_pct":  15,
        "description": "Welcome offer — 15% redeemed",
    },
}


def validate_coupon(code: str, original_amount: int) -> dict:

    code = code.strip().upper()

    if not code:
        return {"valid": False, "error": "Please enter a redeem code"}

    coupon = COUPONS.get(code)

    if not coupon:
        return {"valid": False, "error": f'"{code}" is not a valid redeem code'}

    redeem_pct      = coupon["redeem_pct"]
    pay_pct         = 100 - redeem_pct
    redeemed_rupees = int(original_amount * redeem_pct / 100)
    pay_rupees      = original_amount - redeemed_rupees  

    return {
        "valid"          : True,
        "code"           : code,
        "redeem_pct"     : redeem_pct,
        "pay_pct"        : pay_pct,
        "redeemed_rupees": redeemed_rupees,
        "pay_rupees"     : pay_rupees,
        "is_free"        : redeem_pct == 100,
        "description"    : coupon["description"],
        "original_amount": original_amount,
    }
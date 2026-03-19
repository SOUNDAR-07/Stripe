import stripe
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from backend.checkout import checkout_bp
from backend.confirm  import confirm_bp
from backend.webhook  import webhook_bp

app = Flask(__name__, static_folder="frontend")
CORS(app)

# stripe api key
stripe.api_key  = "sk_test_51TBVs1BfmOnOmUcn5QRxjCZQTjyWuBsD18JmHjuNkCok9SO7bpUNsvfuve6iqLAdJgMNce2VXi3MetLbFG4MXVrV00ZJMk8NbB"
PUBLISHABLE_KEY = "pk_test_51TBVs1BfmOnOmUcntyesCjMxUjZxykhJe8qjcx36FpLZucSvIjslNJBJEdgyzDgwy9ugzlWqfy60JlCvApZw75Ym00f74nlGjx"
WEBHOOK_SECRET  = "whsec_YOUR_WEBHOOK_SECRET_HERE"


app.config["PUBLISHABLE_KEY"] = PUBLISHABLE_KEY
app.config["WEBHOOK_SECRET"]  = WEBHOOK_SECRET

app.register_blueprint(checkout_bp)
app.register_blueprint(confirm_bp)
app.register_blueprint(webhook_bp)


# Landing page 
@app.route("/")
def landing():
    return send_from_directory("frontend", "landing.html")

# Checkout page 
@app.route("/checkout")
def checkout():
    return send_from_directory("frontend", "index.html")

@app.route("/config")
def config():
    return jsonify(publishableKey=app.config["PUBLISHABLE_KEY"])

@app.route("/onboard-complete")
def onboard_complete():
    return "<h2 style='font-family:sans-serif;padding:2rem'> Account connected!</h2>"

@app.route("/onboard-refresh")
def onboard_refresh():
    return "<h2 style='font-family:sans-serif;padding:2rem'> Session expired. Try again.</h2>"


if __name__ == "__main__":
    print("\n   Server running  →  http://localhost:4242")
    print("  Landing page  →  http://localhost:4242/")
    print("  Checkout page →  http://localhost:4242/checkout\n")
    app.run(port=4242, debug=True)
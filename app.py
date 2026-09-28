from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route("/")
def home():
    return "WhatsApp Bot is running!"

@app.route("/health")
def health():
    return jsonify({
        "status": "online",
        "bot": "WhatsApp Auto Reply Bot"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

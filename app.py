from flask import Flask, request, jsonify, session, render_template, redirect, url_for
import smtplib
from email.mime.text import MIMEText
import random
import time
import json
import os
import re
from functools import wraps

# Google Gemini Library
try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None
    print("WARNING: google-generativeai package is not installed. Install it with: pip install google-generativeai")

import config

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.permanent_session_lifetime = 60 * 60 * 24 * 7  # সেশন ৭ দিন থাকবে

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
CHAT_LOG_FILE = "chat_history.json"

# ================= GEMINI CONFIGURATION =================
# আপনার config.py ফাইলে GEMINI_API_KEY ভেরিয়েবলটি রাখতে হবে।
GEMINI_API_KEY = getattr(config, 'GEMINI_API_KEY', os.getenv("GEMINI_API_KEY"))

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
    # সিস্টেম ইন্সট্রাকশন ব্যাকএন্ডে রাখা হলো
    system_instruction = "You are Beyonder AI — a friendly, smart, and helpful AI assistant. You explain things in simple, clear language. Your name is Beyonder AI, created by Anubhab Dutta & Arnab Adhikari. Keep answers short for simple questions, detailed for complex ones."
    
    # মডেল ইনিশিয়ালাইজ 
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        system_instruction=system_instruction
    )
else:
    print("WARNING: GEMINI_API_KEY is not set in config.py or environment!")


# -----------------------------------------------------------------
# OTP স্টোর
# -----------------------------------------------------------------
otp_store = {}

def send_otp_email(to_email, otp):
    """Gmail App Password দিয়ে OTP মেইল পাঠানো হচ্ছে।"""
    subject = "Your Beyonder AI Login Code"
    body = f"""Hello,

Your one-time login code for Beyonder AI is:

    {otp}

This code will expire in {config.OTP_EXPIRY_SECONDS // 60} minutes.
If you didn't request this, you can safely ignore this email.

— Beyonder AI
"""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = config.GMAIL_ADDRESS
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(config.GMAIL_ADDRESS, config.GMAIL_APP_PASSWORD)
        server.sendmail(config.GMAIL_ADDRESS, [to_email], msg.as_string())


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_email"):
            return redirect(url_for("login_page"))
        return view(*args, **kwargs)
    return wrapped


# ================= PAGES =================

@app.route("/")
@login_required
def index():
    return render_template("index.html", user_email=session.get("user_email"))

@app.route("/login")
def login_page():
    if session.get("user_email"):
        return redirect(url_for("index"))
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


# ================= AUTH API =================

@app.route("/api/send-otp", methods=["POST"])
def api_send_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "message": "সঠিক ইমেইল ঠিকানা দিন।"}), 400

    existing = otp_store.get(email)
    now = time.time()
    if existing and now - existing["last_sent"] < config.OTP_RESEND_COOLDOWN_SECONDS:
        wait = int(config.OTP_RESEND_COOLDOWN_SECONDS - (now - existing["last_sent"]))
        return jsonify({
            "success": False,
            "message": f"আবার চেষ্টা করার আগে {wait} সেকেন্ড অপেক্ষা করুন।"
        }), 429

    otp = f"{random.randint(0, 999999):06d}"
    otp_store[email] = {
        "otp": otp,
        "expires_at": now + config.OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "last_sent": now,
    }

    try:
        send_otp_email(email, otp)
    except Exception as e:
        print("OTP mail error:", e)
        return jsonify({
            "success": False,
            "message": "OTP পাঠানো যায়নি। Gmail address/App Password ঠিক আছে কিনা চেক করুন।"
        }), 500

    return jsonify({"success": True, "message": "OTP পাঠানো হয়েছে, ইমেইল চেক করুন।"})


@app.route("/api/verify-otp", methods=["POST"])
def api_verify_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    record = otp_store.get(email)
    if not record:
        return jsonify({"success": False, "message": "প্রথমে OTP চেয়ে নিন।"}), 400

    if time.time() > record["expires_at"]:
        otp_store.pop(email, None)
        return jsonify({"success": False, "message": "OTP-র মেয়াদ শেষ হয়ে গেছে, আবার চেষ্টা করুন।"}), 400

    record["attempts"] += 1
    if record["attempts"] > 5:
        otp_store.pop(email, None)
        return jsonify({"success": False, "message": "অনেকবার ভুল হয়েছে, নতুন করে OTP চান।"}), 429

    if otp != record["otp"]:
        return jsonify({"success": False, "message": "ভুল OTP।"}), 400

    otp_store.pop(email, None)
    session.permanent = True
    session["user_email"] = email

    return jsonify({"success": True, "message": "লগইন সফল হয়েছে!"})


@app.route("/api/me")
def api_me():
    if session.get("user_email"):
        return jsonify({"logged_in": True, "email": session["user_email"]})
    return jsonify({"logged_in": False})

import google.generativeai as genai
import config

# জেমিনি এপিআই কনফিগার করা
genai.configure(api_key=config.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# ফ্রন্টএন্ড থেকে মেসেজ গ্রহণ করার রুট
@app.route("/api/chat", methods=["POST"])
@login_required
def api_chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"success": False, "reply": "কোনো মেসেজ পাওয়া যায়নি।"})

    try:
        response = model.generate_content(user_message)
        return jsonify({"success": True, "reply": response.text})
    except Exception as e:
        return jsonify({"success": False, "reply": f"সার্ভার এরর: {str(e)}"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
# Beyonder AI — Email OTP Login সহ Flask অ্যাপ

## এই প্রোজেক্টে কী আছে

- `app.py` — Flask ব্যাকএন্ড। এখানেই OTP পাঠানো, ভেরিফাই করা, সেশন লগইন, এবং চ্যাট সেভ করার কাজ হয়।
- `config.py` — আপনার Gmail address আর App Password এখানে বসাতে হবে (নিচে ধাপ দেওয়া আছে)।
- `templates/login.html`, `templates/index.html` — পেজগুলো (একই ডিজাইন সিস্টেম, `style.css` অপরিবর্তিত)।
- `static/style.css` — আপনার আগের CSS, একদম অপরিবর্তিত।
- `static/config.js` — Gemini API key, আগের মতোই।
- `static/app.js` — চ্যাট UI + Gemini কল করার লজিক, আগের মতোই (শুধু চ্যাট-সেভ করার URL-টা এখন relative করা হয়েছে যাতে Flask সার্ভারের সাথে মিলে যায়)।
- `static/login.js` — নতুন, শুধু ইমেইল + OTP ফ্লো হ্যান্ডেল করে।

## ধাপ ১ — Gmail App Password বানান

1. আপনার Google Account-এ যান → **Security**
2. **2-Step Verification** চালু করুন (এটা ছাড়া App Password পাওয়া যায় না)
3. **App passwords**-এ গিয়ে "Mail" এর জন্য একটা নতুন পাসওয়ার্ড জেনারেট করুন (16 digit)
4. `config.py` ফাইলে:
   ```python
   GMAIL_ADDRESS = "your-email@gmail.com"
   GMAIL_APP_PASSWORD = "xxxx xxxx xxxx xxxx"
   ```
   এখানে আপনার আসল Gmail address আর App Password বসান। **এই ফাইলটা কখনো GitHub-এ পাবলিকলি আপলোড করবেন না।**

5. `SECRET_KEY`-টাও যেকোনো র‍্যান্ডম লম্বা string দিয়ে বদলে দিন।

## ধাপ ২ — ইনস্টল ও রান

```bash
cd beyonder-ai
pip install -r requirements.txt
python app.py
```

তারপর ব্রাউজারে যান: `http://127.0.0.1:5000/login`

## এটা কীভাবে কাজ করে

1. ইউজার `/login` পেজে ইমেইল দেয়।
2. Flask ৬-সংখ্যার OTP জেনারেট করে, মেমোরিতে (email → otp, expiry) রাখে, এবং আপনার Gmail App Password দিয়ে সেই OTP-টা ইউজারের ইমেইলে পাঠায়।
3. ইউজার OTP দিলে, Flask চেক করে ঠিক আছে কিনা আর মেয়াদ শেষ হয়নি তো — মিলে গেলে Flask সেশন কুকি সেট করে (httpOnly, লগইন হয়ে যায়)।
4. OTP ছাড়া কেউ `/` (চ্যাট পেজ) খুলতে পারবে না — `login_required` ডেকোরেটর সেটা আটকায়, সরাসরি `/login`-এ রিডাইরেক্ট করে দেয়।
5. চ্যাট পেজে (`index.html` + `app.js`) সব আগের মতোই — Gemini API key (`config.js`) দিয়ে সরাসরি ব্রাউজার থেকে Gemini-কে কল করা হয়, আর প্রতিটা কথাবার্তা `/api/save-chat`-এ পাঠিয়ে `chat_history.json`-এ সেভ হয়।
6. নেভবারের logout আইকনে ক্লিক করলে সেশন ক্লিয়ার হয়ে `/login`-এ ফিরে যায়।

## মনে রাখার মতো কিছু বিষয়

- OTP গুলো এখন মেমোরিতে (RAM) রাখা হচ্ছে, তাই সার্ভার রিস্টার্ট করলে সব OTP মুছে যাবে — ছোট/পার্সোনাল প্রোজেক্টের জন্য এটা যথেষ্ট। বড় স্কেলে ব্যবহার করতে চাইলে Redis বা একটা ডাটাবেসে সরানো ভালো।
- একই ইমেইলে বারবার OTP চাইলে ৬০ সেকেন্ড wait করতে হবে, আর একটানা ৫ বার ভুল OTP দিলে সেটা ইনভ্যালিড হয়ে যাবে — এই দুইটা `config.py`-তে বদলানো যায়।
- PythonAnywhere-এ ডিপ্লয় করার সময় `config.py`-এর মান (Gmail address, App password, secret key) production-এর জন্য environment variable-এ রাখাটা আরও নিরাপদ, কিন্তু এই ভার্সনে সরাসরি ফাইলে রাখা আছে যেহেতু আপনি নিজে সেভাবেই চেয়েছেন।

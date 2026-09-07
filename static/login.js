/* ============================================================
   THEME TOGGLE (index.html-er shathe sync — ekoi key use kora hocche)
   ============================================================ */
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeIcon = themeToggleBtn.querySelector("i");
const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    themeIcon.className = theme === "light" ? "fa-solid fa-moon" : "fa-solid fa-sun";
    localStorage.setItem("beyonder-theme", theme);
};
const savedTheme = localStorage.getItem("beyonder-theme");
applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
themeToggleBtn.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
});

/* ============================================================
   SCREEN SWITCHER
   ============================================================ */
const screens = ['email-screen', 'otp-screen'];
const switchScreen = (target) => {
    screens.forEach(s => document.getElementById(s).classList.remove('active'));
    document.getElementById(target).classList.add('active');
    clearAllErrors();
};

document.getElementById('back-to-email').addEventListener('click', () => switchScreen('email-screen'));

/* ============================================================
   HELPERS
   ============================================================ */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(id, msg){
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}
function hideError(id){
    document.getElementById(id).style.display = 'none';
}
function clearAllErrors(){
    ['email-error', 'otp-error'].forEach(hideError);
}
function setLoading(btn, loading, loadingText){
    const label = btn.querySelector('.btn-text');
    if (loading){
        btn.dataset.originalText = label.textContent;
        label.innerHTML = `<i class="fa-solid fa-spinner"></i> ${loadingText}`;
        btn.disabled = true;
    } else {
        label.textContent = btn.dataset.originalText || label.textContent;
        btn.disabled = false;
    }
}

/* ============================================================
   API HELPER — একই origin-e Flask backend থাকায় relative path
   ব্যবহার করা হচ্ছে (127.0.0.1:5000 হার্ডকোড করার দরকার নেই),
   ar session cookie pathanor jonno credentials:'include' rakha hoyeche
   ============================================================ */
async function apiRequest(url, payload){
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok){
        throw new Error(data.message || 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    }
    return data;
}

let pendingEmail = '';
let resendCooldownTimer = null;

function startResendCooldown(seconds){
    const resendBtn = document.getElementById('resend-btn');
    resendBtn.classList.add('disabled');
    let remaining = seconds;
    resendBtn.textContent = `Resend OTP (${remaining}s)`;

    clearInterval(resendCooldownTimer);
    resendCooldownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0){
            clearInterval(resendCooldownTimer);
            resendBtn.classList.remove('disabled');
            resendBtn.textContent = 'Resend OTP';
        } else {
            resendBtn.textContent = `Resend OTP (${remaining}s)`;
        }
    }, 1000);
}

/* ============================================================
   SEND OTP
   ============================================================ */
async function requestOtp(email, btn, loadingLabel){
    setLoading(btn, true, loadingLabel);
    try {
        await apiRequest('/api/send-otp', { email });
        pendingEmail = email;
        document.getElementById('otp-subtitle').textContent = `We sent a 6-digit code to ${email}`;
        document.getElementById('otp-success-msg').style.display = 'block';
        document.getElementById('otp-input').value = '';
        switchScreen('otp-screen');
        startResendCooldown(60);
    } catch (err) {
        showError('email-error', err.message);
    } finally {
        setLoading(btn, false);
    }
}

document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('email-error');

    const email = document.getElementById('email-input').value.trim();
    if (!email || !emailRegex.test(email)){
        showError('email-error', 'সঠিক ইমেইল ঠিকানা দিন।');
        return;
    }

    const btn = document.getElementById('email-submit-btn');
    await requestOtp(email, btn, 'Sending OTP...');
});

document.getElementById('resend-btn').addEventListener('click', async () => {
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn.classList.contains('disabled') || !pendingEmail) return;
    hideError('otp-error');
    await requestOtp(pendingEmail, document.getElementById('otp-submit-btn'), 'Resending...');
});

/* ============================================================
   VERIFY OTP
   ============================================================ */
document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('otp-error');

    const otp = document.getElementById('otp-input').value.trim();
    if (!otp || otp.length !== 6){
        showError('otp-error', '৬ সংখ্যার OTP দিন।');
        return;
    }

    const btn = document.getElementById('otp-submit-btn');
    setLoading(btn, true, 'Verifying...');

    try {
        await apiRequest('/api/verify-otp', { email: pendingEmail, otp });
        window.location.href = '/';
    } catch (err) {
        showError('otp-error', err.message);
        setLoading(btn, false);
    }
});

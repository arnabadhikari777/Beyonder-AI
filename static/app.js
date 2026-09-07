/* =========================================================
   THEME (dark / light) — persisted + follows system default
   ========================================================= */
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeIcon = themeToggleBtn.querySelector("i");

const applyTheme = (theme) => {
    if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        themeIcon.className = "fa-solid fa-sun";
    } else {
        document.documentElement.removeAttribute("data-theme");
        themeIcon.className = "fa-solid fa-moon";
    }
    localStorage.setItem("beyonder-theme", theme);
};

const savedTheme = localStorage.getItem("beyonder-theme");
const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
applyTheme(savedTheme || (systemPrefersLight ? "light" : "dark"));

themeToggleBtn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    applyTheme(isLight ? "dark" : "light");
});


/* =========================================================
   CODE-BLOCK COPY BUTTONS
   ========================================================= */
const addCodeCopyButtons = (container) => {
    container.querySelectorAll("pre").forEach((pre) => {
        if (pre.querySelector(".code-copy-btn")) return; // already added
        const btn = document.createElement("button");
        btn.className = "code-copy-btn";
        btn.textContent = "Copy";
        btn.addEventListener("click", () => {
            const code = pre.querySelector("code");
            navigator.clipboard.writeText(code ? code.innerText : pre.innerText).then(() => {
                btn.textContent = "Copied";
                setTimeout(() => { btn.textContent = "Copy"; }, 1200);
            });
        });
        pre.appendChild(btn);
    });
};


/* =========================================================
   TYPEWRITER EFFECT
   ========================================================= */
const typeWriterEffect = (element, htmlText, parentDiv) => {
    let plainText = htmlText;
    let i = 0;
    element.innerHTML = "";

    const typeNextChar = () => {
        if (i < plainText.length) {
            const currentSlice = plainText.slice(0, i + 1);
            const parsedHtml = marked.parse(currentSlice + " @@CURSOR@@");
            element.innerHTML = parsedHtml.replace(
                "@@CURSOR@@",
                `<span class="typing-cursor">&nbsp;</span>`
            );

            chat.scrollTop = chat.scrollHeight;

            const char = plainText[i];
            i++;

            let delay = 15 + Math.random() * 25;
            if (".,!?।".includes(char)) delay += 150;

            setTimeout(typeNextChar, delay);
        } else {
            element.innerHTML = marked.parse(plainText);
            renderMathInElement(element, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ]
            });
            addCodeCopyButtons(element);

            const copyBtn = document.createElement("button");
            copyBtn.classList.add("copy-btn-outside");
            copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(plainText).then(() => {
                    copyBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
                    setTimeout(() => {
                        copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
                    }, 1500);
                });
            });
            parentDiv.insertAdjacentElement("afterend", copyBtn);
            chat.scrollTop = chat.scrollHeight;
        }
    };

    typeNextChar();
};

const renderInstant = (element, plainText, parentDiv) => {
    element.innerHTML = marked.parse(plainText);
    renderMathInElement(element, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
        ]
    });
    addCodeCopyButtons(element);

    const copyBtn = document.createElement("button");
    copyBtn.classList.add("copy-btn-outside");
    copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(plainText).then(() => {
            copyBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
            setTimeout(() => {
                copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
            }, 1500);
        });
    });
    parentDiv.insertAdjacentElement("afterend", copyBtn);
};


/* =========================================================
   DOM ELEMENTS & VARIABLES
   ========================================================= */
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const input = document.getElementById("user-input");
const chat = document.getElementById("chat-area");

const WELCOME_MESSAGE = "Hello, I am Beyonder. How can I help you?";
const STORAGE_KEY = "beyonder-chat-history";
let chatHistory = [];

input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
});


/* =========================================================
   MESSAGE RENDERING
   ========================================================= */
const appendMessage = (text, type, { animate = true } = {}) => {
    const newChatDiv = document.createElement("div");

    if (type === "incoming") {
        newChatDiv.classList.add("message", "incoming");
        newChatDiv.innerHTML = `
            <div class="msg-logo">
                <i class="fa-solid fa-atom"></i>
            </div>
            <div class="msg-text"></div>
        `;
        chat.appendChild(newChatDiv);
        const textDiv = newChatDiv.querySelector(".msg-text");
        if (animate) {
            typeWriterEffect(textDiv, text, newChatDiv);
        } else {
            renderInstant(textDiv, text, newChatDiv);
        }
        return;
    }

    newChatDiv.classList.add("message", "outgoing");
    newChatDiv.innerHTML = `<p></p>`;
    newChatDiv.querySelector("p").textContent = text;

    chat.appendChild(newChatDiv);
    chat.scrollTop = chat.scrollHeight;
};

const showTypingIndicator = () => {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "incoming");
    typingDiv.id = "typing-indicator";
    typingDiv.innerHTML = `
        <div class="msg-logo">
            <i class="fa-solid fa-atom"></i>
        </div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    chat.appendChild(typingDiv);
    chat.scrollTop = chat.scrollHeight;
};

const removeTypingIndicator = () => {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }
};


/* =========================================================
   PERSISTENCE & NEW CHAT
   ========================================================= */
const saveHistory = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (e) {
        console.warn("Could not save chat history:", e);
    }
};

const loadHistory = () => {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
        saved = null;
    }

    chat.innerHTML = "";

    if (saved && Array.isArray(saved) && saved.length > 0) {
        chatHistory = saved;
        chatHistory.forEach((turn) => {
            const text = turn.parts[0].text;
            appendMessage(text, turn.role === "user" ? "outgoing" : "incoming", { animate: false });
        });
        chat.scrollTop = chat.scrollHeight;
    } else {
        chatHistory = [];
        appendMessage(WELCOME_MESSAGE, "incoming", { animate: false });
    }
};

const startNewChat = () => {
    chatHistory = [];
    localStorage.removeItem(STORAGE_KEY);
    chat.innerHTML = "";
    appendMessage(WELCOME_MESSAGE, "incoming");
};

newChatBtn.addEventListener("click", startNewChat);
loadHistory();


/* =========================================================
   SEND / RECEIVE (Connects to Flask Backend)
   ========================================================= */
const setComposerDisabled = (disabled) => {
    sendBtn.disabled = disabled;
    input.disabled = disabled;
};

const getGeminiResponse = async (userText) => {
    // ১. ইউজারের মেসেজ মেমোরিতে সেভ
    chatHistory.push({ role: "user", parts: [{ text: userText }] });
    saveHistory();

    try {
        // গুগলের বদলে সরাসরি আপনার পাইথন সার্ভারে রিকোয়েস্ট পাঠানো হচ্ছে
        const response = await fetch('/api/chat', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });

        const data = await response.json();
        let aiText = "";

        if (data.success) {
            aiText = data.reply;
            
            // ২. এআই-এর উত্তর মেমোরিতে সেভ
            chatHistory.push({ role: "model", parts: [{ text: aiText }] });
            saveHistory();

            // ডাটাবেসে সেভ
            if (typeof saveToFriendDatabase === "function") {
                saveToFriendDatabase(userText, aiText);
            }
        } else {
            aiText = data.reply || "সার্ভার থেকে কোনো উত্তর আসেনি।";
            chatHistory.pop();
            saveHistory();
        }

        removeTypingIndicator();
        appendMessage(aiText, "incoming");

    } catch (error) {
        console.error("Fetch Error:", error);
        removeTypingIndicator();
        appendMessage("Sorry, server or network error. Please try again!", "incoming");
        chatHistory.pop();
        saveHistory();
    } finally {
        setComposerDisabled(false);
        input.focus();
    }
};

    saveHistory();

    try {
        // সরাসরি আমাদের ফ্লাস্ক ব্যাকএন্ডে কল পাঠানো হচ্ছে (এখানে API KEY নেই)
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                history: chatHistory
            })
        });

        const data = await response.json();

        if (data.success && data.reply) {
            const aiText = data.reply;
            
            // ২. এআই-এর উত্তর লোকাল মেমোরিতে সেভ
            chatHistory.push({
                role: "model",
                parts: [{ text: aiText }]
            });
            saveHistory();

            removeTypingIndicator();
            appendMessage(aiText, "incoming");

        } else {
            console.error("Server Error:", data.message);
            throw new Error(data.message || "Something went wrong");
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        removeTypingIndicator();
        appendMessage("Sorry, server or network error. Please try again!", "incoming");
        
        // এরর হলে ইউজারের মেসেজ ডিলিট করে দিচ্ছি যাতে আবার পাঠাতে পারে
        chatHistory.pop();
        saveHistory();
    } finally {
        setComposerDisabled(false);
        input.focus();
    }
};

const handleSend = () => {
    let userMessage = input.value.trim();
    if (userMessage === "") return;

    appendMessage(userMessage, "outgoing");

    input.value = "";
    input.style.height = "auto";

    setComposerDisabled(true);
    showTypingIndicator();

    getGeminiResponse(userMessage);
};

sendBtn.addEventListener("click", handleSend);

// Enter চাপলে মেসেজ যাবে, Shift + Enter চাপলে নতুন লাইন হবে
input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); 
        handleSend();
    }
});
// content.js - The Core Logic

// Configuration
const CONFIG = {
    selectors: {
        chatgpt: {
            message: ".markdown", // Common class for message text
            container: "main",
        },
        gemini: {
            message: ".message-content, .model-response-text", // Approximation
            container: "local-response-container", // Approximation
        },
        qwen: {
            message: ".ant-typography, .message-content", // Common Ant Design classes Qwen uses
            container: "main"
        },
        claude: {
            message: ".font-claude-message, .grid-cols-1", // Approximation for Claude
            container: "main"
        },
        test_page: {
            message: ".markdown",
            container: "body"
        }
    }
};

// State
let currentPlatform = "test_page";
if (window.location.hostname.includes("chatgpt")) currentPlatform = "chatgpt";
if (window.location.hostname.includes("google")) currentPlatform = "gemini";
if (window.location.hostname.includes("qwen")) currentPlatform = "qwen";
if (window.location.hostname.includes("claude")) currentPlatform = "claude";
let lastProcessedMessageId = null;

// Initialize
console.log("[Hallucination Detector] Initialized on " + currentPlatform);
observeChat();

function observeChat() {
    const targetNode = document.body;

    const observer = new MutationObserver((mutations) => {
        // Simple debounce/check: Look for the *last* assistant message
        const messages = document.querySelectorAll(CONFIG.selectors[currentPlatform].message);
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];

        // Check if we already injected our button
        if (lastMessage.getAttribute("data-hallucination-checked")) return;

        // In Chat interfaces, messages stream. We need to wait for streaming to stop.
        // Heuristic: Check if "Stop Generating" button is gone, OR just wait a bit.
        // For prototype, we'll append a "Verify" button immediately that updates.

        injectVerifyButton(lastMessage);
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}

function injectVerifyButton(messageElement) {
    // Prevent double injection
    if (messageElement.querySelector(".hd-verify-btn")) return;

    const btn = document.createElement("button");
    btn.className = "hd-verify-btn";
    btn.innerText = "🔍 Verify Claims";
    btn.onclick = () => runVerification(messageElement);

    // Inject at the bottom of the message
    messageElement.appendChild(btn);
    messageElement.setAttribute("data-hallucination-checked", "true");
}

async function runVerification(messageElement) {
    const text = messageElement.innerText.replace("🔍 Verify Claims", "");

    // 1. Extract Claims (Stricter Logic)
    // Filter out conversational filler: "Here is...", "I think...", "Sure!"
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

    const likelyClaims = sentences.filter(s => {
        const clean = s.trim();

        // Rule 1: Must be decent length (avoid "Yes.", "1995.")
        if (clean.length < 20) return false;

        // Rule 2: Anti-Conversational Blocklist
        const conversationalStarts = ["I ", "Here", "Sure", "Please", "The user", "As an AI", "Note"];
        if (conversationalStarts.some(start => clean.startsWith(start))) return false;

        // Rule 3: Must contain a "Fact Signal"
        // (A 4-digit Year OR A Capitalized Word + Number)
        const hasYear = /\b(19|20)\d{2}\b/.test(clean);
        const hasNumber = /\d+/.test(clean);
        const hasCaps = /[A-Z][a-z]+/.test(clean); // Looks for "India", "NASA", "James Webb"

        return hasYear || (hasNumber && hasCaps);
    }).slice(0, 3); // Limit to top 3

    if (likelyClaims.length === 0) {
        alert("No verifiable claims detected.");
        return;
    }

    // Show Loading State
    const resultBox = createResultBox(messageElement);
    resultBox.innerHTML = "<p>Analyzing claims...</p>";

    // 2. Verified Loop
    let html = "<h3>Verification Results</h3><ul>";

    for (const claim of likelyClaims) {
        const res = await chrome.runtime.sendMessage({ action: "verify_claim", claim: claim.trim() });

        html += `
      <li class="hd-claim-item">
        <div class="hd-claim-text">"${claim.substring(0, 60)}..."</div>
        <div class="hd-claim-status ${res.verified ? 'hd-safe' : 'hd-warning'}">
          ${res.verified ? '✅ Sources Found' : '⚠️ Unverified'}
        </div>
        <a href="${res.sourceUrl}" target="_blank" class="hd-source-link">Check Source</a>
      </li>
    `;
    }

    html += "</ul>";
    resultBox.innerHTML = html;
}

function createResultBox(parent) {
    let box = parent.querySelector(".hd-result-box");
    if (!box) {
        box = document.createElement("div");
        box.className = "hd-result-box";
        parent.appendChild(box);
    }
    return box;
}

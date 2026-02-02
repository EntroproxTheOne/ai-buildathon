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
            message: ".ant-typography, .message-content, .markdown-body, .bot-message, div[class*='message']", // Fallback added
            container: "body" // Observe the whole body to be safe
        },
        claude: {
            message: ".font-claude-message, .grid-cols-1", // Approximation for Claude
            container: "main"
        },
        groq: {
            message: ".prose, .markdown, .message-content, div[class*='message']", // Groq AI selectors
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
if (window.location.hostname.includes("groq")) currentPlatform = "groq";
let lastProcessedMessageId = null;

// Initialize
console.log("[BanaScrape] Platform Detected: " + currentPlatform);
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

    // 1. Extract Claims (Improved Context Awareness)
    // SPlit by Newlines first (to separate bullet points/headers), then by punctuation.
    const rawLines = text.split(/\n/);
    const sentences = [];

    rawLines.forEach(line => {
        // Remove markdown bullets (*, -) or numbers (1.)
        const cleanLine = line.replace(/^[\*\-•]|\d+\.\s/g, "").trim();
        if (!cleanLine) return;

        // If line is short or ends in colon, treat as list header (often noise),
        // UNLESS it has strong fact signals itself.
        if (cleanLine.endsWith(":") && cleanLine.length < 100) {
            // Check if header itself has a fact?
            if (!/\d{4}/.test(cleanLine)) return; // Skip "Here are the stages:"
        }

        // Further split long lines by punctuation
        const parts = cleanLine.match(/[^\.!\?]+[\.!\?]+/g) || [cleanLine];
        sentences.push(...parts);
    });

    const likelyClaims = sentences.filter(s => {
        const clean = s.trim();

        // Rule 1: Must be decent length (avoid "Yes.", "1995.")
        if (clean.length < 20) return false;

        // Rule 2: Anti-Conversational Blocklist
        const conversationalStarts = ["I ", "Here", "Sure", "Please", "The user", "As an AI", "Note", "This"];
        if (conversationalStarts.some(start => clean.startsWith(start))) return false;

        // Rule 3: Must contain a "Fact Signal"
        // (A 4-digit Year OR A Capitalized Word + Number)
        const hasYear = /\b(19|20)\d{2}\b/.test(clean);
        const hasNumber = /\d+/.test(clean);
        const hasCaps = /[A-Z][a-z]+/.test(clean); // Looks for "India", "NASA", "James Webb"

        return hasYear || (hasNumber && hasCaps);
    }).slice(0, 4); // Increase limit slightly as we are cleaner now

    if (likelyClaims.length === 0) {
        alert("No verifiable claims detected.");
        return;
    }

    // Show Loading State
    const resultBox = createResultBox(messageElement);
    resultBox.innerHTML = "<p>Analyzing claims...</p>";

    // 2. Verified Loop
    let html = "<h3>Verification Results</h3><ul>";

    // NEW Optimization: Check for Native Sources (Gemini/Perplexity style)
    // If the chat already has citations, use them!
    const nativeSources = scanForNativeSources(messageElement);

    if (nativeSources.length > 0) {
        html += `<li class="hd-claim-item"><div class="hd-claim-text" style="font-weight:bold; color:#4caf50;">Using AI Provided Sources:</div></li>`;

        nativeSources.forEach(source => {
            html += `
             <li class="hd-claim-item">
                <div class="hd-claim-text">${source.title || source.url}</div>
                <div class="hd-claim-status hd-safe">✅ Native Citation</div>
                <a href="${source.url}" target="_blank" class="hd-source-link">Check Source</a>
             </li>`;
        });
        html += "</ul>";
        resultBox.innerHTML = html;
        return; // Skip the slow Google Search!
    }

    // Get platform accuracy first
    let platformInfo = { name: "AI", accuracy: 75, color: "#888" };
    try {
        platformInfo = await chrome.runtime.sendMessage({
            action: "get_platform_accuracy",
            platform: currentPlatform
        });
    } catch (e) {
        console.warn("Could not get platform accuracy");
    }

    // Show platform accuracy header
    html += `
        <li class="hd-claim-item" style="border-left-color: ${platformInfo.color};">
            <div class="hd-claim-text" style="font-weight:bold;">
                📊 ${platformInfo.name} Accuracy Rating: 
                <span style="color: ${platformInfo.accuracy >= 80 ? '#4caf50' : platformInfo.accuracy >= 70 ? '#ff9800' : '#f44336'};">
                    ${platformInfo.accuracy}%
                </span>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
                Based on hallucination research data
            </div>
        </li>
    `;

    for (const claim of likelyClaims) {
        try {
            // Check if extension context is still valid
            if (!chrome.runtime?.id) {
                throw new Error("Extension context invalidated");
            }

            const res = await chrome.runtime.sendMessage({
                action: "verify_claim",
                claim: claim.trim(),
                platform: currentPlatform
            });

            // Check if response is valid
            if (!res || res.status === "error") {
                throw new Error(res?.message || "Verification failed");
            }

            const sourceLabel = res.source === "groq" ? "📊 Advanced Analysis" : "🔍 Web Search";
            const confidenceColor = res.confidence >= 70 ? '#4caf50' : res.confidence >= 40 ? '#ff9800' : '#f44336';

            html += `
              <li class="hd-claim-item">
                <div class="hd-claim-text">"${claim.substring(0, 60)}..."</div>
                <div class="hd-claim-status ${res.verified ? 'hd-safe' : 'hd-warning'}">
                  ${res.verified ? '✅ Verified' : '⚠️ Unverified'}
                  <span style="font-size: 10px; margin-left: 8px; color: ${confidenceColor};">
                    (${res.confidence || 50}% confidence)
                  </span>
                </div>
                <div style="font-size: 10px; color: #888; margin: 4px 0;">
                  Source: ${sourceLabel}
                  ${res.explanation ? `<br><em>${res.explanation.substring(0, 100)}...</em>` : ''}
                </div>
                <a href="${res.sourceUrl || '#'}" target="_blank" class="hd-source-link">Check Source</a>
              </li>
            `;
        } catch (err) {
            console.error("[BanaScrape] Verification error:", err);
            // Show one error and break the loop
            html += `
              <li class="hd-claim-item">
                 <div class="hd-claim-status hd-warning">⚠️ Verification Error</div>
                 <div class="hd-claim-text" style="color:#ff9800; font-size:11px;">
                    ${err.message || "Please refresh the page and try again."}
                 </div>
              </li>
            `;
            break; // Stop trying more claims if connection is lost
        }
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

function scanForNativeSources(root, deepScan = false) {
    const sources = [];

    // Strategy 1: Look for common "Source" chips (Gemini style)
    // These often have classes like "source-chip", "attribution-link", or just <a> tags in a footer

    // Generic Finder: Look for links with "source" in class or aria-label
    const potentialLinks = root.querySelectorAll("a[href^='http']");

    potentialLinks.forEach(link => {
        const isCitation = link.className.includes("source") ||
            link.parentElement.className.includes("source") ||
            link.getAttribute("aria-label")?.includes("Source");

        if (isCitation) {
            sources.push({
                url: link.href,
                title: link.innerText || "Citation"
            });
        }
    });

    // Strategy 2 (User Request "DOM and OCR"): 
    // If we can't find specific classes, look for a "Sources" header and grab sibling links
    // This is "Visual DOM Reading"
    if (sources.length === 0) {
        // Look for "Sources" text header
        const allDivs = root.querySelectorAll("div, h3, h4, span");
        for (const el of allDivs) {
            if (el.innerText.trim() === "Sources") {
                // Found the header! Look for links in next sibling or parent's container
                const container = el.parentElement;
                const links = container.querySelectorAll("a");
                links.forEach(l => {
                    if (l.href) sources.push({ url: l.href, title: l.innerText });
                });
            }
        }
    }

    return sources.slice(0, 5); // Return top 5
}

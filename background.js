// background.js

// Load API key from config.js (not committed to git)
importScripts('config.js');

// Groq AI API Configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// AI Platform Accuracy Ratings (based on hallucination research)
const PLATFORM_ACCURACY = {
  chatgpt: { name: "ChatGPT", accuracy: 85, color: "#10a37f" },
  gemini: { name: "Gemini", accuracy: 80, color: "#4285f4" },
  claude: { name: "Claude", accuracy: 88, color: "#cc785c" },
  qwen: { name: "Qwen", accuracy: 75, color: "#6366f1" },
  groq: { name: "Groq", accuracy: 82, color: "#f55036" },
  test_page: { name: "Unknown", accuracy: 70, color: "#888" }
};

// Comprehensive Whitelist for trusted sources
const TRUSTED_DOMAINS = [
  "nature.com", "thelancet.com", "science.org", "nejm.org",
  "scholar.google", "jstor.org", "pubmed", "ieee.org", "arxiv.org",
  ".edu", ".gov", "who.int", "un.org", "worldbank.org", "esa.int",
  "reuters.com", "apnews.com", "afp.com", "bloomberg.com",
  "bbc.com", "bbc.co.uk", "npr.org", "pbs.org", "cbc.ca",
  "nytimes.com", "wsj.com", "ft.com", "theguardian.com", "washingtonpost.com",
  "britannica.com", "wikipedia.org"
];

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verify_claim") {
    handleVerification(request.claim, request.platform).then(sendResponse);
    return true;
  }
  if (request.action === "get_platform_accuracy") {
    const platform = request.platform || "test_page";
    sendResponse(PLATFORM_ACCURACY[platform] || PLATFORM_ACCURACY.test_page);
    return true;
  }
});

async function handleVerification(claim, platform = "test_page") {
  // Try Groq AI first (primary source)
  try {
    const groqResult = await verifyWithGroq(claim);
    if (groqResult.status === "success") {
      return {
        ...groqResult,
        source: "groq",
        platformAccuracy: PLATFORM_ACCURACY[platform] || PLATFORM_ACCURACY.test_page
      };
    }
  } catch (error) {
    console.warn("[BanaScrape] Groq API failed, falling back to Google:", error.message);
  }

  // Fallback to Google Search
  try {
    const googleResult = await verifyWithGoogle(claim);
    return {
      ...googleResult,
      source: "google_fallback",
      platformAccuracy: PLATFORM_ACCURACY[platform] || PLATFORM_ACCURACY.test_page
    };
  } catch (error) {
    console.error("[BanaScrape] All verification methods failed:", error);
    return {
      status: "error",
      message: "Verification failed",
      platformAccuracy: PLATFORM_ACCURACY[platform] || PLATFORM_ACCURACY.test_page
    };
  }
}

async function verifyWithGroq(claim) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a fact-checking assistant. Analyze the following claim and respond with JSON only:
{
  "verified": true/false,
  "confidence": 0-100,
  "explanation": "brief explanation",
  "sources": ["suggested sources to verify"]
}
Be skeptical and only mark as verified if the claim is factually accurate.`
        },
        {
          role: "user",
          content: `Verify this claim: "${claim}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  // Parse JSON response from Groq
  try {
    const parsed = JSON.parse(content);
    return {
      status: "success",
      verified: parsed.verified === true,
      confidence: parsed.confidence || 50,
      explanation: parsed.explanation || "",
      suggestedSources: parsed.sources || [],
      sourceUrl: "https://groq.com",
      claim: claim
    };
  } catch (e) {
    // If JSON parsing fails, try to extract meaning
    const isVerified = content.toLowerCase().includes("verified") &&
      !content.toLowerCase().includes("not verified") &&
      !content.toLowerCase().includes("cannot verify");
    return {
      status: "success",
      verified: isVerified,
      confidence: 50,
      explanation: content.substring(0, 200),
      suggestedSources: [],
      sourceUrl: "https://groq.com",
      claim: claim
    };
  }
}

async function verifyWithGoogle(claim) {
  const query = encodeURIComponent(claim);
  const url = `https://www.google.com/search?q=${query}`;

  const response = await fetch(url);
  const text = await response.text();

  const claimNumbers = (claim.match(/\b\d+\b/g) || []).map(Number);
  const snippetText = extractTextContent(text).toLowerCase();

  const isVerified = TRUSTED_DOMAINS.some(domain => snippetText.includes(domain));

  let verificationStatus = isVerified ? "verified" : "unverified";
  let mismatchDetails = "";

  if (claimNumbers.length > 0) {
    const context = snippetText.substring(0, 2000);
    const foundAllNumbers = claimNumbers.every(num => context.includes(num.toString()));

    if (!foundAllNumbers && isVerified) {
      verificationStatus = "warning";
      mismatchDetails = "Potential data mismatch found in sources.";
    }
  }

  return {
    status: "success",
    sourceUrl: url,
    verified: verificationStatus === "verified",
    warning: verificationStatus === "warning",
    confidence: isVerified ? 70 : 30,
    details: mismatchDetails,
    claim: claim
  };
}

function extractTextContent(html) {
  return html.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, "")
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, "")
    .replace(/<[^>]+>/g, " ");
}

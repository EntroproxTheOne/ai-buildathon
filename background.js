// background.js

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verify_claim") {
    handleVerification(request.claim).then(sendResponse);
    return true; // Keep channel open for async response
  }
});

async function handleVerification(claim) {
  try {
    const query = encodeURIComponent(claim);
    const url = `https://www.google.com/search?q=${query}`;

    const response = await fetch(url);
    const text = await response.text();

    // Improved Snippet Extraction (still regex based, but better)
    // Look for text inside specific Google result classes (B03hCm, st, etc - these change often!)
    // Fallback: Look for text blocks surrounding the query keywords.

    // For prototype: Let's extract any 4-digit years or long numbers from the HTML
    // and see if they contradict the Claim's numbers.

    const claimNumbers = (claim.match(/\b\d+\b/g) || []).map(Number);
    const snippetText = extractTextContent(text).toLowerCase(); // Helper to strip HTML tags roughly

    // Comprehensive Whitelist based on User User Request
    const TRUSTED_DOMAINS = [
      // 1. Academic & Scholarly
      "nature.com", "thelancet.com", "science.org", "nejm.org", // Journals
      "scholar.google", "jstor.org", "pubmed", "ieee.org", "arxiv.org", // Databases
      ".edu", // Universities

      // 2. Government
      ".gov", "who.int", "un.org", "worldbank.org", "esa.int",

      // 3. News / Wire
      "reuters.com", "apnews.com", "afp.com", "bloomberg.com",
      "bbc.com", "bbc.co.uk", "npr.org", "pbs.org", "cbc.ca",
      "nytimes.com", "wsj.com", "ft.com", "theguardian.com", "washingtonpost.com",

      // 4. Reference
      "britannica.com", "wikipedia.org"
    ];

    const isVerified = TRUSTED_DOMAINS.some(domain => snippetText.includes(domain));

    // Regex Logic: Mismatch Detection
    let verificationStatus = isVerified ? "verified" : "unverified";
    let mismatchDetails = "";

    if (claimNumbers.length > 0) {
      // Check if the claim's numbers appear in the search results context
      // This is a naive check. If I claim "1995" and Google is full of "2021", warn.

      const context = snippetText.substring(0, 2000); // Check first 2000 chars of text content
      const foundAllNumbers = claimNumbers.every(num => context.includes(num.toString()));

      if (!foundAllNumbers && isVerified) {
        verificationStatus = "warning"; // Reliable source found, but numbers don't match!
        mismatchDetails = "Potential data mismatch found in sources.";
      }
    }

    return {
      status: "success",
      sourceUrl: url,
      verified: verificationStatus === "verified",
      warning: verificationStatus === "warning",
      details: mismatchDetails,
      claim: claim
    };

  } catch (error) {
    console.error("Verification failed", error);
    return { status: "error", message: error.message };
  }
}

function extractTextContent(html) {
  // Very rough HTML to Text for search results
  // Removes scripts, styles, and tags
  return html.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, "")
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, "")
    .replace(/<[^>]+>/g, " ");
}

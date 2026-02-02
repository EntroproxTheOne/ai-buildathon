# Analysis Logic (Prototype v1)

Currently, the extension uses a lightweight **Client-Side Heuristic** combined with **Google Search Scraping** to verify claims. It does **not** yet use an LLM for reasoning.

## 1. Claim Extraction (`content.js`)
The extension monitors the chat DOM. When a message finishes generation, it runs this logic:
-   **Split**: Text is split into sentences.
-   **Filter**: It identifies "Fact Candidates" using a regex heuristic:
    -   Must contain a **Number** (0-9) OR be longer than **50 characters**.
    -   Must **not** contain a question mark (?).
-   *Limit*: It only checks the top 3 candidates to prevent spamming.

## 2. Verification Process (`background.js`)
For each candidate claim, the background script performs a logic check:
-   **Search**: It fetches `https://www.google.com/search?q=[Claim Text]`.
-   **Result Parsing (Fragile)**: It scans the raw HTML of the Google Search Results page.
-   **Trust Check**: It looks for specific keywords in the HTML that indicate a high-quality source is present:
    -   `"Wikipedia"`
    -   `".gov"` (Government sites)
    -   `".edu"` (Universities)

## 3. Verdict
-   **Verified (Green Check)**: If any "Trust Keyword" is found in the search results.
-   **Unverified (Yellow Warning)**: If no trust keywords are found on the first page.

## Limitations
-   **Context Blind**: It checks if a source *exists*, not if the source *supports* the claim.
    -   *Example*: "The moon is made of cheese" -> If a Wikipedia article discusses this myth, the detector might see "Wikipedia" and mark it ✅ Verified.
-   **CAPTCHA Risk**: Rapid searches might trigger Google's automated traffic blocks.

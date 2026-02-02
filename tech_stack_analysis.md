# Accuracy & AI Model Options

## 1. Local NLI Models (Small, In-Browser)
*   **Examples**: `distilbert-mnli`, `Xenova/nli-deberta-v3-xsmall`
*   **Pros**:
    *   ✅ **Free**: No API costs.
    *   ✅ **Private**: Data never leaves the browser.
    *   ✅ **Offline-ish**: Only needs internet for the Google Search part.
*   **Cons**:
    *   ❌ **"Dumber"**: Can only check "A vs B" logic. Can't reason about nuance (e.g., sarcasm, slight context shifts).
    *   ❌ **Heavy Download**: Users download ~40-100MB model.

## 2. Trusted Cloud AI (The "Pro" Approach)
*   **Examples**: GPT-4o, Gemini 1.5 Pro, Perplexity API.
*   **Pros**:
    *   ✅ **Smarter**: Can handle Noise Removal + Verification + Search in one go.
    *   ✅ **Reasoning**: Understands context ("It was 1995" might be true in *some* context).
    *   ✅ **Simple Code**: We just send the text and get a JSON result.
*   **Cons**:
    *   ❌ **Cost**: Requires an API Key (money).
    *   ❌ **Latency**: Slower (needs to send data -> process -> return).

## 🏆 Recommendation: Hyper-Hybrid
**Use Cloud AI (Gemini/OpenAI) for the best results.**
If you want "Fast, Quick, and Easy Verification" that handles noise reduction automatically:
1.  **Add an API Key Settings Page**: Let the user add their Gemini/OpenAI key.
2.  **Send the Claim + Search Results** to the AI.
3.  **Prompt**: "Verify this claim using these search snippets. Ignore if it's just chatty noise."

This gives you the power of GPTZero-level detection without building a massive local system.

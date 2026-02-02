# Accuracy & AI Model Options

## 1. Current Approach: "Live Search + Regex"
*   **Accuracy**: High for **Numbers & Dates**. Low for **Reasoning**.
*   **Pros**: Fast, Real-time news.
*   **Cons**: Context-blind.

## 2. Option A: Browser-Native AI (Transformers.js) 🚀 *Recommended for "Wow" factor*
We can inject a **Tiny AI Model** directly into the extension.

### A. For Noise Removal (Classification)
*   **Model**: `Xenova/distilbert-base-uncased` (Small, General)
*   **Task**: "Is this sentence a fact?" (Yes/No)

### B. For Verification (NLI - Natural Language Inference) **<-- YOUR REQUEST**
This is the "Magic" you are looking for.
*   **Task**: Logic Checking (Entailment).
    *   *Input*: Premise (Google Snippet) + Hypothesis (User Claim).
    *   *Output*: "Contradiction", "Neutral", or "Entailment".
*   **Recommended Model**: `Xenova/distilbert-base-uncased-mnli`
    *   **Size**: ~67 MB (Quantized).
    *   **Accuracy**: Very good at spotting contradictions (e.g., "Launched in 2021" vs "Launched in 1995").
    *   **Speed**: Runs locally in browser (WebGPU/WASM) in milliseconds.

## 3. Option B: Specialized Check-Model (RAG API)
*   **Pros**: Smarter.
*   **Cons**: Expensive, slower.

## 🎨 Logo & Icons
**YES!** Please work on the logo.
*   **Needs**: `icon16.png`, `icon48.png`, `icon128.png`.

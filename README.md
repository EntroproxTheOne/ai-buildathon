# BanaScrape

**Hallucination Detector for LLMs**

![BanaScrape Logo](icons/logo.jpg)

BanaScrape is a Chrome extension that verifies claims made by AI chatbots in real-time. It helps you identify potential hallucinations and fact-check AI-generated content.

## Features

- Real-time claim verification on AI platforms
- Support for ChatGPT, Gemini, Claude, Qwen, and Groq
- Platform accuracy ratings based on hallucination research
- Advanced analysis with confidence scores
- Fallback to web search when primary verification unavailable

## Supported Platforms

| Platform | Accuracy Rating |
|----------|-----------------|
| Claude   | 88%             |
| ChatGPT  | 85%             |
| Groq     | 82%             |
| Gemini   | 80%             |
| Qwen     | 75%             |

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `hallucination-detector` folder
5. The BanaScrape icon will appear in your extensions bar

## Configuration

1. Copy `config.example.js` to `config.js`
2. Add your Groq API key to `config.js`
3. Reload the extension in Chrome

## Usage

1. Navigate to any supported AI platform (ChatGPT, Gemini, etc.)
2. Chat with the AI as usual
3. Click the "Verify Claims" button that appears below AI responses
4. View verification results with confidence scores

## How It Works

BanaScrape extracts factual claims from AI responses and verifies them using:

1. **Advanced Analysis** - Primary verification using AI-powered fact-checking
2. **Web Search** - Fallback verification using trusted source matching

Claims containing dates, numbers, and proper nouns are prioritized for verification.

## Project Structure

```
hallucination-detector/
├── manifest.json      # Extension configuration
├── background.js      # Service worker for API calls
├── content.js         # Content script for claim detection
├── popup.html         # Extension popup UI
├── styles.css         # Styling for verification results
├── icons/             # Extension icons
└── landing/           # Landing page for downloads
```

## Trusted Sources

Verification cross-references claims against:

- Academic sources (Nature, Science, PubMed, arXiv)
- Government sources (.gov, WHO, UN)
- News agencies (Reuters, AP, BBC, NPR)
- Reference sites (Britannica, Wikipedia)

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions`
3. Click the refresh icon on the BanaScrape card
4. Refresh any open AI chat pages to reconnect

## License

MIT License

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

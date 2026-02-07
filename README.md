# ContextBox

Chrome extension that captures UI context from webpages and sends it to AI coding tools via [AiBridge](https://github.com/AiBridge-io/aibridge) and [AiBridge cursor extension](https://github.com/MobAI-App/ai-bridge-cursor-extension).

## Features

- **Element Selection**: Click to select elements, Shift+click to add to group, Alt+click to select parent
- **Context Extraction**: Captures HTML, CSS, accessibility info, and screenshots with bounding boxes
- **AiBridge Integration**: Send context directly to Claude Code, Cursor, or other AI tools
- **Clipboard Support**: Copy formatted prompt when AiBridge is unavailable

## Installation

### From Chrome Web Store

Coming soon.

### Manual Installation

1. Clone or download this repository
2. Run `npm install && npm run build`
3. Open `chrome://extensions/` in Chrome
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `dist` folder

## Usage

1. Click the ContextBox icon in Chrome toolbar
2. Click "Start Selection" to enable selection mode
3. Click elements on the page to select them (numbered boxes appear)
4. Add instructions in the popup that appears near selections
5. Press Enter or click Send (if AiBridge connected) or Copy

### Keyboard Shortcuts

- **Click**: Select/deselect element
- **Shift+Click**: Add element to current group
- **Alt+Click**: Select parent element
- **Enter**: Send (if connected) or Copy
- **Escape**: Clear all selections

## AiBridge Setup

ContextBox works best with [AiBridge](https://github.com/MobAI-App/aibridge) for direct AI tool integration.

### For terminal-based AI tools (Claude Code, Codex, Gemini CLI)

Install AiBridge:

```bash
# macOS/Linux/WSL
curl -fsSL https://raw.githubusercontent.com/MobAI-App/aibridge/main/install.sh | bash
```

Launch your AI tool through AiBridge:

```bash
aibridge claude    # Claude Code
aibridge codex     # Codex
aibridge gemini    # Gemini CLI
```

### For Cursor

Install the [AiBridge Cursor extension](https://github.com/MobAI-App/ai-bridge-cursor-extension) (also available in the Cursor marketplace as **AiBridge**). The extension runs the bridge server automatically within Cursor.

### Connection

ContextBox automatically detects AiBridge on `http://127.0.0.1:9999`. Without AiBridge, use the Copy button to copy the prompt to clipboard.

## Configuration

In the popup:

- **Include HTML snippets**: Include element HTML in context
- **Include computed styles**: Include CSS properties
- **Include accessibility info**: Include ARIA attributes
- **AiBridge URL**: Change if using custom port (default: `http://127.0.0.1:9999`)

## Development

```bash
npm install        # Install dependencies
npm run build      # Build extension
npm run watch      # Watch mode
```

## Mobile Devices

For a similar experience on mobile devices, check out [MobAI](https://mobai.run).

## Privacy

ContextBox:

- Only activates when you click "Start Selection"
- Processes data locally in your browser
- Only sends data to AiBridge on your local machine
- Automatically redacts sensitive attributes (passwords, tokens, etc.)
- Does not collect or transmit any analytics

## License

MIT License - see [LICENSE](LICENSE)

# Prompt Library Chrome Extension

A Chrome MV3 extension that provides a native side panel for managing and inserting prompts into AI chat platforms.

## Features

- **Universal LLM Support**: Works with Claude, ChatGPT, Gemini, and Perplexity
- **Organized Library**: Nested folders for prompt organization  
- **Scheduled Prompts**: Schedule prompts for automatic submission at specific times
- **Local Storage**: All data stored locally in your browser - zero data collection
- **Export/Import**: Backup and restore your prompt library between devices
- **Apple-Minimal Design**: Clean, modern interface optimized for productivity

## Installation

1. Download or clone this extension
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the extension folder
5. Pin the extension to your toolbar for easy access

See [INSTALLATION.md](INSTALLATION.md) for detailed instructions.

## Usage

### Basic Usage
- **Open Panel**: Click the extension icon to open the side panel
- **Insert Prompt**: Click any prompt in the library to insert it into the chat
- **Save Active**: Click "Save Active" to capture current chat input as a new prompt
- **Schedule Prompts**: Click the clock icon to schedule prompts for automatic submission

### Managing Prompts
- Create folders to organize your prompts
- Edit prompts and folders with double-click or edit buttons
- Drag and drop to rearrange between folders
- Search through your library with real-time filtering
- Export/import your entire prompt library for backup

### Supported Platforms
- **Claude.ai**: Full integration with composer
- **ChatGPT**: Works with both GPT-3.5 and GPT-4 interfaces
- **Gemini**: Google's AI chat interface
- **Perplexity**: AI search and chat platform

## Technical Details

This extension uses:
- Chrome MV3 architecture with service worker
- Native Chrome side panel API for clean integration
- Local Chrome storage for data persistence
- Dynamic content script injection (activeTab permission model)
- Platform-specific adapters for reliable prompt insertion

## Privacy

- All prompt data is stored locally in your browser using Chrome's storage API
- No data is transmitted to external servers or third parties
- Uses minimal permission model (activeTab only) for maximum privacy
- No tracking, analytics, or user identification
- Content scripts only inject when you explicitly use the extension

## Troubleshooting

### Extension Not Working
1. Ensure you're on a supported platform (Claude, ChatGPT, Gemini, Perplexity)
2. Check that the extension is enabled in `chrome://extensions/`
3. Try refreshing the page and pressing `Alt+P`
4. Look for error messages in the browser console (F12)

### Prompt Not Inserting
1. The extension will automatically fall back to clipboard
2. Look for toast notifications in the top-right corner
3. Try clicking directly in the text area before inserting
4. Some pages may require manual paste (Ctrl+V)

### Keyboard Shortcuts Not Working
1. Check for conflicts at `chrome://extensions/shortcuts`
2. Some web pages may capture certain key combinations
3. Try using the extension icon instead
4. Restart Chrome after making changes

## Files Overview

```
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker-simple.js  # Background script
├── content/
│   ├── adapters/              # Platform-specific integrations
│   │   ├── claude.js
│   │   ├── chatgpt.js
│   │   ├── gemini.js
│   │   └── perplexity.js
│   └── panel/                 # UI components
│       ├── panel-injector.js
│       ├── panel.html
│       ├── panel.css
│       └── panel.js
├── lib/
│   └── combined.js            # Utility functions and classes
├── icons/                     # Extension icons
└── demo/                      # Demo website
```

## Contributing

This extension is designed to be simple and reliable. If you encounter issues:

1. Check the browser console for errors
2. Verify you're using Chrome 88+
3. Test on the supported platforms
4. Report issues with specific error messages

## License

This project is open source and available under the MIT License.
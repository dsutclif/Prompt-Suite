# Chrome Extension Installation Guide

This guide will walk you through installing the Prompt Library Chrome extension in developer mode.

## Prerequisites

- Google Chrome browser (version 88 or later)
- The extension files downloaded to your computer

## Installation Steps

### 1. Enable Developer Mode

1. Open Google Chrome
2. Navigate to `chrome://extensions/` (type this in the address bar)
3. In the top right corner, toggle the **Developer mode** switch to ON

![Developer Mode Toggle](https://developers.chrome.com/static/docs/extensions/get-started/tutorial/hello-world/image/extensions-page-in-develo_480.png)

### 2. Load the Extension

1. Click the **Load unpacked** button that appears after enabling Developer mode
2. Navigate to and select the folder containing the extension files
3. The extension should now appear in your extensions list

### 3. Verify Installation

1. Look for the Prompt Library icon (purple "P") in your Chrome toolbar
2. If you don't see it, click the puzzle piece icon (Extensions menu) and pin the Prompt Library extension
3. Try clicking the icon or pressing `Alt+P` to test the panel

## Post-Installation Setup

### Grant Permissions

The extension will request permissions for:
- **Storage**: To save your prompt library locally
- **Active Tab**: To detect which LLM platform you're using
- **Scripting**: To inject the panel and insert prompts
- **Tabs**: To open your preferred LLM when needed
- **Clipboard**: As a fallback for prompt insertion

### Test the Extension

1. Visit one of the supported platforms:
   - https://claude.ai
   - https://chat.openai.com
   - https://gemini.google.com
   - https://www.perplexity.ai

2. Press `Alt+P` or click the extension icon
3. The panel should slide in from the right side
4. Try creating a folder and adding your first prompt

## Keyboard Shortcuts

The extension registers these global shortcuts:

- **Alt+P**: Toggle the prompt library panel
- **Alt+Shift+P**: Use your most recent prompt
- **Ctrl+Shift+P**: Save current chat input as a new prompt

### Customizing Shortcuts

1. Go to `chrome://extensions/shortcuts`
2. Find "Prompt Library Overlay" in the list
3. Click the pencil icon to modify any shortcut
4. Choose key combinations that don't conflict with other extensions

## Troubleshooting

### Extension Not Loading

- Make sure all files are present in the folder
- Check that `manifest.json` is in the root directory
- Verify Developer mode is enabled
- Try refreshing the extensions page

### Panel Not Appearing

- Check that you're on a supported LLM platform
- Verify the extension is enabled in the extensions list
- Try refreshing the page and pressing `Alt+P` again
- Check the browser console for any error messages

### Prompt Insertion Not Working

- The extension will automatically fall back to copying to clipboard
- Look for toast notifications in the top-right corner
- Make sure the chat input area is visible and active
- Try clicking directly in the text area before using a prompt

### Keyboard Shortcuts Not Working

- Check for conflicts with other extensions at `chrome://extensions/shortcuts`
- Some web pages may capture certain key combinations
- Try using the extension icon instead of keyboard shortcuts
- Restart Chrome after making shortcut changes

## Privacy & Data

- All prompt data is stored locally in your browser
- No data is transmitted to external servers
- The extension only accesses the four supported LLM platforms
- You can export your data by backing up Chrome's extension storage

## Updating the Extension

Since this is loaded as an unpacked extension:

1. Download the updated files
2. Replace the old files with new ones
3. Go to `chrome://extensions/`
4. Click the refresh icon on the Prompt Library extension
5. Your stored prompts and settings will be preserved

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions/`
2. Find the Prompt Library extension
3. Click the **Remove** button
4. Confirm the removal

Note: This will delete all your stored prompts and settings.

## Support

If you encounter issues:

1. Check the browser console for error messages (F12 → Console)
2. Verify you're using a supported Chrome version (88+)
3. Try disabling other extensions temporarily
4. Restart Chrome and test again

The extension is designed to be resilient and will gracefully handle most error conditions by falling back to clipboard operations.
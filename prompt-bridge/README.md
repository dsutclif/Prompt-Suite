# Prompt Library Bridge

This is a GitHub Pages hosted bridge for importing prompts into the Prompt Library Chrome extension via clean, short URLs.

## How It Works

1. **JSON Files**: Prompts are stored as JSON files in the `/prompts/` directory
2. **Clean URLs**: Access prompts using clean URLs like `?id=prompt-name`
3. **Auto-Import**: Click the link to add the prompt directly to your extension

## Creating New Prompt Links

### Step 1: Create JSON File
Create a new file in `/prompts/[kebab-case-id].json`:
```json
{
    "title": "Your Prompt Title",
    "body": "Your prompt content here...",
    "tags": ["relevant", "tags"]
}
```

### Step 2: Generate URLs
Two versions are available:
- **Production**: `https://dsutclif.github.io/PromptLibrary/index.html?id=[kebab-case-id]`
- **Development**: `https://dsutclif.github.io/PromptLibrary/index-dev.html?id=[kebab-case-id]`

### Step 3: Update Link Registry
Add the new URLs to `/prompt-bridge/prompt-links.txt`:
```
## Production Links (Published Extension)
https://dsutclif.github.io/PromptLibrary/index.html?id=[your-new-id]

## Development Links (Unpacked Extension)  
https://dsutclif.github.io/PromptLibrary/index-dev.html?id=[your-new-id]
```

### Step 4: Commit and Push
Push your changes to GitHub for the links to work.

## Extension ID Configuration

- **Production** (`index.html`): Uses published extension ID `pplllbfbdkhmahpcaaajalgacmhoofai`
- **Development** (`index-dev.html`): Uses unpacked extension ID `lonoagbmfindfckmbalijmnpdjdapiod`

## Example Links

```
https://dsutclif.github.io/PromptLibrary/index.html?id=email-writer
https://dsutclif.github.io/PromptLibrary/index.html?id=code-reviewer
```

## Features

- ✅ Clean, shareable URLs
- ✅ Extension detection
- ✅ Prompt preview before importing
- ✅ Manual copy-paste fallback
- ✅ Mobile-responsive design
- ✅ Error handling
- ✅ Success feedback

## Security Notes

- All data is processed client-side
- No server-side storage or logging
- Uses Chrome's standard messaging API
- Requires user interaction to import
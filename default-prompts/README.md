# Default Prompts System

This directory contains text files that automatically become default prompts in the Chrome extension.

## How It Works

1. **Add prompts**: Drop `.txt` files into folders here
2. **Run generation**: Execute `node scripts/generate-defaults.js`
3. **Extension includes**: New installs get these prompts automatically

## File Format

```
---
title: Your Prompt Title
tags: tag1, tag2, tag3
---
Your prompt content goes here...
Use [PLACEHOLDERS] for dynamic content.
```

## Folder Structure

- `business/` - Business-related prompts
- `writing/` - Writing and content prompts
- Add more folders as needed

## Regeneration

After adding/editing files, run:
```bash
node scripts/generate-defaults.js
```

This updates `lib/default-prompts.js` which is imported by the service workers.
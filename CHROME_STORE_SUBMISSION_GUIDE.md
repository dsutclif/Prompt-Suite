# Chrome Web Store Submission Guide

## Issue: Rejected for "Including remotely hosted code"

The extension was rejected because the submitted zip included development files that Chrome Web Store considers "remotely hosted code."

## Root Cause
The submitted zip contained:
- Development folders (client/, lib/, shared/, attached_assets/)
- Build configuration files (package.json, vite.config.ts, tsconfig.json)
- Development dependencies and build tools

Chrome Web Store flags these as potential sources of remote code execution.

## Solution: Submit Only Extension Files

Create a new zip file containing ONLY these folders and files:

### Required Files:
```
manifest.json
background/
  └── service-worker-simple.js
content/
  ├── content-script-main.js
  └── adapters/
      ├── chatgpt.js
      ├── claude.js
      ├── gemini.js
      └── perplexity.js
sidepanel/
  ├── sidepanel.html
  ├── sidepanel.js
  └── sidepanel.css
icons/
  ├── icon16.png
  ├── icon32.png
  ├── icon48.png
  ├── icon128.png
  └── llm-logos/
      ├── chatgpt.png
      ├── claude.png
      ├── gemini.png
      └── perplexity.png
```

### DO NOT Include:
- attached_assets/
- client/
- lib/
- shared/
- server/
- package.json
- package-lock.json
- vite.config.ts
- tsconfig.json
- postcss.config.js
- tailwind.config.ts
- components.json
- drizzle.config.ts
- .replit
- .gitignore
- replit.md
- Any .md files except if required

### Steps to Create Clean Submission:
1. Create a new folder called "prompt-suite-extension"
2. Copy ONLY the required files listed above
3. Verify manifest.json points to correct file paths
4. Test the extension locally by loading the clean folder
5. Create zip file from the clean folder
6. Submit to Chrome Web Store

### Verification Checklist:
- [ ] No package.json or build files included
- [ ] No development folders (client/, lib/, shared/)
- [ ] All file paths in manifest.json are correct
- [ ] Extension loads and works with clean files only
- [ ] Zip file size is reasonable (should be much smaller)

This will resolve the "remotely hosted code" violation.
# Prompt Library Chrome Extension

## Overview
A Chrome MV3 extension designed to streamline prompt management and insertion into Large Language Model (LLM) platforms. It offers a native side panel for organizing a nested library of prompts locally, featuring a minimalist Apple-style interface with folder organization, drag-and-drop functionality, and smart context-aware opening logic. The project aims to enhance user interaction with AI platforms by providing an efficient, integrated tool for prompt management, thereby improving productivity and consistency in LLM interactions.

## User Preferences
Preferred communication style: Simple, everyday language.
Development workflow: Always update chrome-extension-clean.zip with every code change for Chrome Web Store submission readiness.

## Prompt Link Creation Process
**Complete Workflow for Creating New GitHub Pages Prompt Links:**

### When User Requests New Prompt Link:
1. **Create JSON File:** Write to `prompts/[kebab-case-id].json` with:
   ```json
   {
     "title": "User Provided Title",
     "body": "User provided prompt content",
     "tags": ["relevant", "tags"]
   }
   ```

2. **Generate Links:** Provide both versions:
   - **Dev:** `https://dsutclif.github.io/PromptLibrary/index-dev.html?id=[kebab-case-id]`
   - **Prod:** `https://dsutclif.github.io/PromptLibrary/index.html?id=[kebab-case-id]`

3. **Update Link Registry:** Add new URLs to `prompt-bridge/prompt-links.txt`

4. **Explain Next Step:** Tell user to use Replit Git tab to commit and push to GitHub for links to work.

### ID Naming Convention:
- Convert title to lowercase kebab-case (e.g., "Hello World" → "hello-world")
- Use as both filename and URL parameter

### GitHub Repository Integration:
- Repository: `dsutclif/PromptLibrary` 
- GitHub Pages automatically serves new prompts after push
- Files created in this Replit sync to GitHub when user pushes via Git tab

### Existing Prompt IDs:
- email-writer, code-reviewer, blog-helper, meeting-notes, hello-world

## System Architecture

### Extension Core
The extension adheres to Chrome MV3 standards, utilizing a service worker for background processes, content scripts for platform-specific interactions, and a React-based UI for prompt management. It employs Chrome's local storage for data persistence and a robust messaging system for inter-component communication. The side panel provides a native, integrated experience, maintaining an Apple-minimal aesthetic with responsive design.

### UI/UX Decisions
The interface prioritizes a minimalist, Apple-inspired design. Key UI elements include:
- A native Chrome side panel for prompt management.
- Responsive design adapting to various screen sizes.
- Consistent color schemes, including grey buttons (#D9D9D9, #6b7280) with specific hover states, and light blue (#3b82f6) for selections and confirmations.
- Standardized icons for actions like adding, saving, editing, scheduling, and deleting.
- Inline folder creation and prompt editing within the panel.
- Horizontal layout for LLM selection options with icons and text.
- Removal of redundant titles and simplified modal designs for a cleaner appearance.

### Technical Implementation
- **Data Storage**: Utilizes Chrome's local storage API for hierarchical prompt and folder data, user settings, and UI state, managed by a centralized Storage class.
- **Content Script Integration**: Dedicated adapter scripts for Claude, ChatGPT, Gemini, and Perplexity handle platform-specific DOM manipulation for prompt insertion and retrieval, using robust selectors and fallback strategies. Content scripts are dynamically injected using the `scripting` API, ensuring minimal permissions.
- **Side Panel System**: Leverages Chrome's native `sidePanel` API for an integrated, context-aware user interface.
- **Frontend Stack**: Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui components. Employs React Query for data management, React Hook Form for forms, and Wouter for client-side routing.
- **Extension Activation & Platform Detection**: Activated via the browser toolbar, with smart logic for opening the panel and, if necessary, the preferred LLM platform. Detects active LLM platforms via URL matching, with fallback behavior for unsupported sites.
- **Security & Permissions**: Focuses on minimal permissions (`storage`, `activeTab`, `scripting`, `sidePanel`) and dynamic content script injection to enhance user privacy and ensure Chrome Web Store compliance.

### Feature Specifications
- Nested folder organization for prompts with drag-and-drop.
- Search functionality with Enter key support.
- "Recently Used" prompts list.
- "Save Active Prompt" to capture current chat input.
- Prompt editing and scheduling functionalities.
- Export/Import functionality for library backup and restore in JSON format.
- Context-aware panel opening: direct on LLM sites, guided on non-LLM sites.
- Chrome-compliant permission system with dynamic tab monitoring and automatic banner triggering.

## External Dependencies

### Chrome APIs
- `storage`: For local data persistence.
- `scripting`: For dynamic content script injection.
- `tabs`: For LLM platform management and opening new tabs.
- `runtime`: For inter-component messaging.
- `sidePanel`: For the native side panel interface.
- `commands`: For keyboard shortcuts (though currently removed based on user request, the API is still a dependency for potential future use).

### UI Frameworks & Libraries
- **React**: Core library for building user interfaces.
- **Radix UI**: Primitives for building accessible UI components.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **React Query**: For data fetching, caching, and state management.
- **React Hook Form**: For form validation and management.
- **Wouter**: A minimalist React router.

### Development Tools (for project development, not runtime dependency)
- **Vite**: Build tool and development server.
- **TypeScript**: For type-safe JavaScript.
- **PostCSS**: For CSS transformations.
- **Drizzle ORM**: (Optional, configured for PostgreSQL) For database interaction, used for potential backend integration.

### LLM Platform Integration
- **Claude.ai**: Specific DOM selectors and injection logic.
- **ChatGPT**: Composer detection and manipulation.
- **Gemini**: Input area handling.
- **Perplexity**: Text insertion mechanisms.
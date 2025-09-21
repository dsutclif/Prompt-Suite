// Link Generator for Prompt Bridge
// This script helps generate import links for email prompts

const BASE_URL = "https://dsutclif.github.io/PromptLibrary"; // Your GitHub Pages URL

function generateImportLink(title, body, useDevVersion = false) {
    const promptData = {
        title: title,
        body: body
    };
    
    // Encode the data as base64
    const encodedData = btoa(JSON.stringify(promptData));
    
    // Choose the correct bridge page
    const bridgePage = useDevVersion ? "index-dev.html" : "index.html";
    
    // Generate the full URL
    const importUrl = `${BASE_URL}/${bridgePage}?prompt=${encodedData}`;
    
    return importUrl;
}

function generateIdBasedLink(promptId, useDevVersion = false) {
    // Choose the correct bridge page
    const bridgePage = useDevVersion ? "index-dev.html" : "index.html";
    
    // Generate the short URL using ID
    const importUrl = `${BASE_URL}/${bridgePage}?id=${promptId}`;
    
    return importUrl;
}

function generateEmailHtml(title, body, useDevVersion = false) {
    const importUrl = generateImportLink(title, body, useDevVersion);
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        .prompt-import {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.4;
        }
        .import-button {
            display: inline-block;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 0;
        }
        .import-button:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <h3>New Prompt: ${title}</h3>
    
    <div class="prompt-import">
        ${body.replace(/\n/g, '<br>')}
    </div>
    
    <p>
        <a href="${importUrl}" class="import-button">
            📝 Add to Prompt Library Extension
        </a>
    </p>
    
    <p><small>
        Click the button above to add this prompt to your browser extension library. 
        Make sure you have the Prompt Library extension installed and enabled.
    </small></p>
</body>
</html>`;
    
    return emailHtml;
}

// Example usage in browser console:
function example() {
    console.log("=== Link Generator Example ===");
    
    const title = "Professional Email Response";
    const body = "Help me write a professional email response that:\n- Acknowledges the sender's points\n- Provides a clear answer\n- Maintains a friendly but professional tone\n- Includes a call to action if needed";
    
    // Generate production link (base64 - long)
    const prodLink = generateImportLink(title, body, false);
    console.log("Production Link (Base64):", prodLink);
    
    // Generate development link (base64 - long)
    const devLink = generateImportLink(title, body, true);
    console.log("Development Link (Base64):", devLink);
    
    // Generate ID-based short links
    console.log("\n=== Short ID-Based Links ===");
    console.log("Email Writer:", generateIdBasedLink("email-writer"));
    console.log("Code Reviewer:", generateIdBasedLink("code-reviewer"));
    console.log("Blog Helper:", generateIdBasedLink("blog-helper"));
    console.log("Meeting Notes:", generateIdBasedLink("meeting-notes"));
    
    // Generate email HTML
    const emailHtml = generateEmailHtml(title, body);
    console.log("Email HTML:", emailHtml);
    
    return {
        productionLink: prodLink,
        developmentLink: devLink,
        shortLinks: {
            emailWriter: generateIdBasedLink("email-writer"),
            codeReviewer: generateIdBasedLink("code-reviewer"),
            blogHelper: generateIdBasedLink("blog-helper"),
            meetingNotes: generateIdBasedLink("meeting-notes")
        },
        emailHtml: emailHtml
    };
}

// Manual creation helper
function createManualLink(title, body) {
    console.log("=== Manual Link Creation ===");
    console.log("1. Take your prompt data:");
    console.log("   Title:", title);
    console.log("   Body:", body);
    
    const promptData = { title, body };
    const jsonString = JSON.stringify(promptData);
    console.log("2. JSON string:", jsonString);
    
    const base64Encoded = btoa(jsonString);
    console.log("3. Base64 encoded:", base64Encoded);
    
    const finalUrl = `${BASE_URL}/index.html?prompt=${base64Encoded}`;
    console.log("4. Final URL:", finalUrl);
    
    return finalUrl;
}

// Export functions if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateImportLink,
        generateIdBasedLink,
        generateEmailHtml,
        createManualLink,
        example
    };
}

console.log("Prompt Bridge Link Generator loaded!");
console.log("Available functions:");
console.log("- generateImportLink(title, body, useDevVersion) - Long base64 URLs");
console.log("- generateIdBasedLink(promptId, useDevVersion) - Short ID-based URLs");
console.log("- generateEmailHtml(title, body, useDevVersion)");
console.log("- createManualLink(title, body)");
console.log("- example() - for testing");
console.log("");
console.log("Available prompt IDs: email-writer, code-reviewer, blog-helper, meeting-notes");
console.log("Don't forget to update BASE_URL with your GitHub Pages URL!");
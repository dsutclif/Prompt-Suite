/**
 * Utility script for generating import links for the Prompt Library extension
 * 
 * Usage:
 * 1. Replace YOUR_GITHUB_USERNAME with your actual GitHub username
 * 2. Use generateImportLink() to create links for your prompts
 */

const BASE_URL = 'https://dsutclif.github.io/PromptLibrary/';

/**
 * Generate an import link for a prompt
 * @param {Object} promptData - The prompt data
 * @param {string} promptData.title - Prompt title
 * @param {string} promptData.body - Prompt content
 * @param {string} [promptData.folderId] - Optional folder ID
 * @param {Array} [promptData.tags] - Optional tags
 * @returns {string} The import link
 */
function generateImportLink(promptData) {
    // Validate required fields
    if (!promptData.title || !promptData.body) {
        throw new Error('Title and body are required');
    }
    
    // Create clean prompt object
    const cleanPrompt = {
        title: promptData.title.trim(),
        body: promptData.body.trim(),
        folderId: promptData.folderId || null,
        tags: promptData.tags || []
    };
    
    // Encode as URL-safe base64
    const jsonString = JSON.stringify(cleanPrompt);
    const base64 = btoa(jsonString);
    const urlSafeBase64 = base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    return `${BASE_URL}?prompt=${urlSafeBase64}`;
}

/**
 * Generate HTML for email with import link
 * @param {Object} promptData - The prompt data
 * @param {string} [buttonText] - Custom button text
 * @returns {string} HTML snippet for email
 */
function generateEmailHTML(promptData, buttonText = 'Add to My Library') {
    const link = generateImportLink(promptData);
    const truncatedBody = promptData.body.length > 100 
        ? promptData.body.substring(0, 100) + '...' 
        : promptData.body;
    
    return `
<div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0; background: #f8f9ff;">
    <h3 style="margin: 0 0 12px 0; color: #1a1a1a;">${promptData.title}</h3>
    <p style="margin: 0 0 16px 0; color: #6b7280; font-style: italic;">${truncatedBody}</p>
    <a href="${link}" 
       style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        📋 ${buttonText}
    </a>
</div>`;
}

// Example usage:
if (typeof window !== 'undefined') {
    // Browser environment - add to window for console use
    window.PromptLinkGenerator = {
        generateImportLink,
        generateEmailHTML,
        
        // Helper for quick testing
        test: () => {
            const samplePrompt = {
                title: "Sample Marketing Email",
                body: "Write a compelling marketing email for [PRODUCT] targeting [AUDIENCE]. Include a clear call-to-action and personalized subject line.",
                tags: ["marketing", "email", "copywriting"]
            };
            
            console.log('Import Link:');
            console.log(generateImportLink(samplePrompt));
            console.log('\nEmail HTML:');
            console.log(generateEmailHTML(samplePrompt));
        }
    };
    
    console.log('Prompt Link Generator loaded! Try: PromptLinkGenerator.test()');
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateImportLink,
        generateEmailHTML
    };
}
#!/bin/bash
# Continuous monitor to fix manifest.json branding

echo "Starting manifest guard - will fix any reverts to 'Prompt Library'"
echo "Press Ctrl+C to stop"

while true; do
    # Check if manifest.json contains "Prompt Library"
    if grep -q '"name": "Prompt Library"' manifest.json; then
        echo "$(date): Detected revert in manifest.json - fixing to Prompt Suite"
        sed -i 's/"name": "Prompt Library"/"name": "Prompt Suite"/' manifest.json
        sed -i 's/"default_title": "Prompt Library"/"default_title": "Prompt Suite"/' manifest.json
        echo "$(date): Fixed manifest.json"
    fi
    
    # Check chrome-extension-clean version too
    if grep -q '"name": "Prompt Library"' chrome-extension-clean/manifest.json; then
        echo "$(date): Detected revert in chrome-extension-clean/manifest.json - fixing to Prompt Suite"
        sed -i 's/"name": "Prompt Library"/"name": "Prompt Suite"/' chrome-extension-clean/manifest.json
        sed -i 's/"default_title": "Prompt Library"/"default_title": "Prompt Suite"/' chrome-extension-clean/manifest.json
        echo "$(date): Fixed chrome-extension-clean/manifest.json"
    fi
    
    sleep 1
done
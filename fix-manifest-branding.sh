#!/bin/bash
# Guard script to ensure manifest files always show "Prompt Suite"

echo "Checking and fixing manifest branding..."

# Fix root manifest.json
sed -i 's/"name": "Prompt Library"/"name": "Prompt Suite"/' manifest.json
sed -i 's/"default_title": "Prompt Library"/"default_title": "Prompt Suite"/' manifest.json

# Note: chrome-extension-clean/ folder is synced automatically, don't edit directly

echo "Manifest branding fixed to 'Prompt Suite'"

# Verify the changes
echo "Current branding in main manifest:"
grep -n '"name":\|"default_title":' manifest.json
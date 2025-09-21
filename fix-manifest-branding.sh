#!/bin/bash
# Guard script to ensure manifest files always show "Prompt Suite"

echo "Checking and fixing manifest branding..."

# Fix root manifest.json
sed -i 's/"name": "Prompt Library"/"name": "Prompt Suite"/' manifest.json
sed -i 's/"default_title": "Prompt Library"/"default_title": "Prompt Suite"/' manifest.json

# Fix chrome-extension-clean manifest.json  
sed -i 's/"name": "Prompt Library"/"name": "Prompt Suite"/' chrome-extension-clean/manifest.json
sed -i 's/"default_title": "Prompt Library"/"default_title": "Prompt Suite"/' chrome-extension-clean/manifest.json

echo "Manifest branding fixed to 'Prompt Suite'"

# Verify the changes
echo "Current branding in manifests:"
grep -n '"name":\|"default_title":' manifest.json chrome-extension-clean/manifest.json
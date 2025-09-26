#!/bin/bash

echo "Chrome Extension Clean Packager"
echo "Creating zip from chrome-extension-clean/ directory..."
echo ""

# Function to repackage the extension
repackage() {
    # Remove any existing chrome-extension-clean.zip files
    rm -f chrome-extension-clean.zip
    rm -f client/public/chrome-extension-clean.zip

    # Create new zip (zip contents directly, not the folder)
    echo "Creating chrome-extension-clean.zip..."
    (cd chrome-extension-clean && zip -r "../chrome-extension-clean.zip" . -x "*.zip")

    if [ -f "chrome-extension-clean.zip" ]; then
        echo "Package created: chrome-extension-clean.zip"
        echo "Size: $(ls -lh "chrome-extension-clean.zip" | awk '{print $5}')"

        # Move zip to client/public for web server access
        mkdir -p client/public
        mv "chrome-extension-clean.zip" client/public/
        echo "Zip file moved to client/public/ for download access"
        echo "Download URL: http://localhost:5000/chrome-extension-clean.zip"
    else
        echo "Error creating zip package"
    fi
}

# Run the packaging function
repackage
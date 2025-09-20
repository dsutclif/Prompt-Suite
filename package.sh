#!/bin/bash

echo "🔄 Creating fresh package..."

# Remove old zip files
rm -f *.zip extension-package*.zip extension_package*.zip

# Create new timestamped package
TIMESTAMP=$(date +"%m%d_%H%M%S")
FILENAME="extension-package_${TIMESTAMP}.zip"

zip -r "$FILENAME" \
  background/ \
  content/ \
  icons/ \
  sidepanel/ \
  manifest.json \
  service-worker.js

# Confirm success
if [ -f "$FILENAME" ]; then
    echo "✅ Package created: $FILENAME"
    echo "📊 Size: $(ls -lh $FILENAME | awk '{print $5}')"
else
    echo "❌ ERROR: Package creation failed!"
fi
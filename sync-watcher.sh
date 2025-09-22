#!/bin/bash

# Function to get timezone for timestamps
get_timezone() {
    # Priority order: ENV variable -> Eastern -> System timezone -> UTC fallback
    if [ -n "$SYNC_TIMEZONE" ]; then
        echo "$SYNC_TIMEZONE"
    elif timedatectl show --property=Timezone --value 2>/dev/null | grep -q "America/New_York\|US/Eastern"; then
        echo "America/New_York"
    elif [ -f /etc/timezone ] && grep -q "America/New_York\|US/Eastern" /etc/timezone; then
        echo "America/New_York"
    elif command -v timedatectl >/dev/null 2>&1; then
        # Try to get system timezone, fallback to Eastern if detection fails
        DETECTED_TZ=$(timedatectl show --property=Timezone --value 2>/dev/null)
        if [ -n "$DETECTED_TZ" ] && [ "$DETECTED_TZ" != "n/a" ]; then
            echo "$DETECTED_TZ"
        else
            echo "America/New_York"
        fi
    elif [ -f /etc/timezone ]; then
        # Try reading timezone from file
        DETECTED_TZ=$(cat /etc/timezone 2>/dev/null | head -1)
        if [ -n "$DETECTED_TZ" ]; then
            echo "$DETECTED_TZ"
        else
            echo "America/New_York"
        fi
    else
        # Final fallback to Eastern timezone
        echo "America/New_York"
    fi
}

echo "Starting Chrome Extension Clean sync watcher..."
echo "Monitoring for changes that match files in chrome-extension-clean/"

# Display timezone info
TIMEZONE=$(get_timezone)
CURRENT_TIME=$(TZ="$TIMEZONE" date +"%Y-%m-%d %H:%M:%S %Z")
echo "Using timezone: $TIMEZONE"
echo "Current time: $CURRENT_TIME"
echo "Set SYNC_TIMEZONE environment variable to override (e.g., export SYNC_TIMEZONE='America/Los_Angeles')"
echo "Press Ctrl+C to stop"
echo ""

# Check if inotify-tools is available
if ! command -v inotifywait &> /dev/null; then
    echo "Error: inotify-tools not found."
    echo "Please add 'inotify-tools' to your replit.nix file."
    echo "Or add it through the System Dependencies pane in Replit."
    exit 1
fi

# Function to check if a file has a corresponding file in chrome-extension-clean
has_clean_counterpart() {
    local changed_file="$1"
    local clean_file="chrome-extension-clean/$changed_file"

    if [ -f "$clean_file" ]; then
        return 0  # True - counterpart exists
    else
        return 1  # False - no counterpart
    fi
}

# Function to sync file and repackage
sync_and_package() {
    local changed_file="$1"
    local clean_file="chrome-extension-clean/$changed_file"

    echo "Syncing: $changed_file -> $clean_file"

    # Create directory structure if needed
    mkdir -p "$(dirname "$clean_file")"

    # Copy the updated file
    cp "$changed_file" "$clean_file"

    if [ $? -eq 0 ]; then
        echo "File synced successfully"
        repackage
    else
        echo "Error syncing file"
    fi
    echo ""
}

# Function to repackage the extension
repackage() {
    # Remove any existing chrome-extension-clean*.zip files
    rm -f chrome-extension-clean*.zip

    # Get timezone for timestamps
    TIMEZONE=$(get_timezone)
    
    # Create timestamped filename with MM-DD-YY_HH:MM format
    TIMESTAMP=$(TZ="$TIMEZONE" date +"%m-%d-%y_%H-%M")
    echo "Debug: Using timezone = $TIMEZONE"
    echo "Debug: Timestamp = $TIMESTAMP"

    NEW_FILENAME="chrome-extension-clean_${TIMESTAMP}.zip"
    echo "Debug: Creating file = $NEW_FILENAME"

    # Create new zip (zip contents directly, not the folder)
    echo "Creating ${NEW_FILENAME}..."
    (cd chrome-extension-clean && zip -r "../${NEW_FILENAME}" . -x "*.zip")

    if [ -f "$NEW_FILENAME" ]; then
        echo "Package updated: $NEW_FILENAME"
        echo "Size: $(ls -lh "$NEW_FILENAME" | awk '{print $5}')"
    else
        echo "Error creating zip package"
    fi
}

# Watch for file changes, excluding the chrome-extension-clean directory and zip files
inotifywait -m -r -e modify,create,moved_to \
    --exclude '(chrome-extension-clean/|\.zip$|\.git/|node_modules/)' \
    --format '%w%f %e' . | while read file event; do

    # Skip if file doesn't exist (might be temporary)
    if [ ! -f "$file" ]; then
        continue
    fi

    # Remove leading "./" if present
    clean_path="${file#./}"

    # Check if this file has a counterpart in chrome-extension-clean
    if has_clean_counterpart "$clean_path"; then
        echo "Detected change: $clean_path"
        sync_and_package "$clean_path"
    fi
done
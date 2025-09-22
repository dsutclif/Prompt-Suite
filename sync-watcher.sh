#!/bin/bash

# Function to get Eastern time with manual offset (since timezone data may not be available)
get_eastern_time() {
    local format="$1"
    local utc_hour=$(date -u +%H)
    local utc_date=$(date -u +%Y-%m-%d)
    local utc_minute=$(date -u +%M)
    local utc_second=$(date -u +%S)
    local utc_month=$(date -u +%m)
    local utc_day=$(date -u +%d)
    local utc_year=$(date -u +%y)
    
    # Calculate Eastern time (UTC-5 standard, UTC-4 daylight)
    # For simplicity, using UTC-4 (EDT) since it's currently daylight saving time period
    local eastern_hour=$((utc_hour - 4))
    local eastern_date="$utc_date"
    
    # Handle day rollover
    if [ $eastern_hour -lt 0 ]; then
        eastern_hour=$((eastern_hour + 24))
        # Previous day - simple calculation for demo
        eastern_date=$(date -u -d "yesterday" +%Y-%m-%d)
        utc_month=$(date -u -d "yesterday" +%m)
        utc_day=$(date -u -d "yesterday" +%d)
        utc_year=$(date -u -d "yesterday" +%y)
    elif [ $eastern_hour -ge 24 ]; then
        eastern_hour=$((eastern_hour - 24))
        # Next day
        eastern_date=$(date -u -d "tomorrow" +%Y-%m-%d)
        utc_month=$(date -u -d "tomorrow" +%m)
        utc_day=$(date -u -d "tomorrow" +%d)
        utc_year=$(date -u -d "tomorrow" +%y)
    fi
    
    # Format the time based on requested format  
    if [ "$format" = "timestamp" ]; then
        printf "%s-%s-%s_%02d-%02d" "$utc_month" "$utc_day" "$utc_year" "$eastern_hour" "$utc_minute"
    else
        printf "%s %02d:%02d:%02d EDT" "$eastern_date" "$eastern_hour" "$utc_minute" "$utc_second"
    fi
}

echo "Starting Chrome Extension Clean sync watcher..."
echo "Monitoring for changes that match files in chrome-extension-clean/"

# Display timezone info
echo "Using timezone: Eastern Time (EDT/EST)"
echo "Current time: $(get_eastern_time)"
echo "Note: Using manual Eastern timezone calculation since system timezone data is not available"
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

    # Create timestamped filename with MM-DD-YY_HH:MM format using Eastern time
    TIMESTAMP=$(get_eastern_time "timestamp")
    echo "Debug: Using Eastern Time"
    echo "Debug: Timestamp = $TIMESTAMP"

    NEW_FILENAME="chrome-extension-clean_${TIMESTAMP}.zip"
    echo "Debug: Creating file = $NEW_FILENAME"

    # Create new zip (zip contents directly, not the folder)
    echo "Creating ${NEW_FILENAME}..."
    (cd chrome-extension-clean && zip -r "../${NEW_FILENAME}" . -x "*.zip")

    if [ -f "$NEW_FILENAME" ]; then
        echo "Package updated: $NEW_FILENAME"
        echo "Size: $(ls -lh "$NEW_FILENAME" | awk '{print $5}')"
        
        # Move zip to client/public for web server access
        mkdir -p client/public
        mv "$NEW_FILENAME" client/public/
        echo "Zip file moved to client/public/ for download access"
        echo "Download URL: http://localhost:5000/${NEW_FILENAME}"
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
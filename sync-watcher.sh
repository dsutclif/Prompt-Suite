#!/bin/bash

# Function to adjust Eastern time with manual offset (since timezone data may not be available)
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

echo "Chrome Extension Clean Packager"
echo "Creating timestamped zip from chrome-extension-clean/ directory..."
echo "Using timezone: Eastern Time (EDT/EST)"
echo "Current time: $(get_eastern_time)"
echo ""

# Function to repackage the extension
repackage() {
    # Remove any existing chrome-extension-clean*.zip files from client/public
    rm -f client/public/chrome-extension-clean*.zip

    # Create timestamped filename with MM-DD-YY_HH:MM format using Eastern time
    TIMESTAMP=$(get_eastern_time "timestamp")
    NEW_FILENAME="chrome-extension-clean_${TIMESTAMP}.zip"

    # Create new zip (zip contents directly, not the folder)
    echo "Creating package..."
    (cd chrome-extension-clean && zip -r "../${NEW_FILENAME}" . -x "*.zip")

    if [ -f "$NEW_FILENAME" ]; then
        echo "Package created successfully"
        echo "Size: $(ls -lh "$NEW_FILENAME" | awk '{print $5}')"

        # Move zip to client/public for web server access
        mkdir -p client/public
        mv "$NEW_FILENAME" client/public/

        # Force filesystem sync to ensure file is fully written
        sync

        # Verify the file was moved successfully
        if [ -f "client/public/$NEW_FILENAME" ]; then
            echo ""
            echo "File moved to client/public/$NEW_FILENAME"
            echo "File size: $(ls -lh "client/public/$NEW_FILENAME" | awk '{print $5}')"

            # Check if curl is available for testing
            if command -v curl &> /dev/null; then
                echo "Testing download availability..."

                DOWNLOAD_URL="http://localhost:5000/${NEW_FILENAME}"
                MAX_ATTEMPTS=15
                ATTEMPT=1

                while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
                    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOWNLOAD_URL")
                    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - HTTP Status: $HTTP_STATUS"

                    if [ "$HTTP_STATUS" = "200" ]; then
                        echo "✅ Ready for download: $NEW_FILENAME"
                        echo "Download URL: $DOWNLOAD_URL"
                        break
                    else
                        sleep 2
                        ATTEMPT=$((ATTEMPT + 1))
                    fi
                done

                if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
                    echo "⚠️  File created but server still not responding properly"
                    echo "File exists at: client/public/$NEW_FILENAME"
                    echo "Try waiting a bit longer, then: $DOWNLOAD_URL"
                fi
            else
                echo "curl not available - cannot test download"
                echo "Waiting 5 seconds for server to recognize file..."
                sleep 5
                echo "✅ File should be ready: $NEW_FILENAME"
                echo "Download URL: http://localhost:5000/${NEW_FILENAME}"
            fi
        else
            echo "❌ Error: File was not moved to client/public/"
            echo "Looking for file..."
            find . -name "$NEW_FILENAME" -type f
        fi
    else
        echo "Error creating zip package"
    fi
}

# Run the packaging function
repackage
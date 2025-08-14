#!/bin/bash
# FFmpeg Screen Recording Script
# Requires FFmpeg to be installed

OUTPUT_FILE="expense_demo.mp4"
DURATION=300  # 5 minutes

echo "Starting FFmpeg Screen Recording..."

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg not found. Please install FFmpeg first."
    echo "Windows: Download from https://ffmpeg.org/download.html"
    echo "macOS: brew install ffmpeg"
    echo "Linux: sudo apt install ffmpeg"
    exit 1
fi

echo "FFmpeg found"

# Start Flask application in background
echo "Starting Flask application..."
python app.py &
FLASK_PID=$!

# Wait for app to start
sleep 5

# Open browser
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:5000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:5000"
else
    start "http://localhost:5000"
fi

echo "Demo Steps:"
echo "1. Login to the application"
echo "2. Navigate to Expenses section"
echo "3. Add a new expense category"
echo "4. Add a new expense"
echo "5. Show filtering and search"
echo "6. Demonstrate mobile view"
echo "7. Show export functionality"

echo "Starting screen recording in 5 seconds..."
sleep 5

# Start screen recording with FFmpeg
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    ffmpeg -f avfoundation -i "1:none" -t $DURATION -c:v libx264 -preset ultrafast -crf 18 $OUTPUT_FILE
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    ffmpeg -f x11grab -s $(xrandr | grep '*' | awk '{print $1}') -i :0.0 -t $DURATION -c:v libx264 -preset ultrafast -crf 18 $OUTPUT_FILE
else
    # Windows (requires gdigrab)
    ffmpeg -f gdigrab -i desktop -t $DURATION -c:v libx264 -preset ultrafast -crf 18 $OUTPUT_FILE
fi

# Stop Flask application
kill $FLASK_PID

echo "Recording completed: $OUTPUT_FILE"

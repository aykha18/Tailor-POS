#!/usr/bin/env python3
"""
Demo Video Generator for Tajir POS Expense Management Feature
This script creates a demonstration video showing the expense management functionality
"""

import os
import time
import subprocess
import sys
from datetime import datetime

def create_demo_script():
    """Create a demo script that can be used for screen recording"""
    script_content = '''#!/usr/bin/env python3
"""
Demo Script for Expense Management Feature
Run this script to demonstrate the expense management functionality
"""

import time
import webbrowser
import subprocess
import os

def start_demo():
    print("Starting Expense Management Demo...")
    print("=" * 50)
    
    # Step 1: Start the Flask application
    print("1. Starting Flask application...")
    try:
        # Start Flask app in background
        flask_process = subprocess.Popen([
            sys.executable, "app.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for app to start
        time.sleep(3)
        print("Flask app started")
        
    except Exception as e:
        print(f"Failed to start Flask app: {e}")
        return
    
    # Step 2: Open browser
    print("2. Opening browser...")
    try:
        webbrowser.open("http://localhost:5000")
        time.sleep(2)
        print("Browser opened")
    except Exception as e:
        print(f"Failed to open browser: {e}")
    
    # Step 3: Demo steps
    print("3. Demo steps to follow:")
    print("   - Login to the application")
    print("   - Navigate to Expenses section")
    print("   - Add a new expense category")
    print("   - Add a new expense")
    print("   - Show filtering and search")
    print("   - Demonstrate mobile view")
    print("   - Show export functionality")
    
    input("Press Enter when demo is complete...")
    
    # Step 4: Cleanup
    print("4. Cleaning up...")
    try:
        flask_process.terminate()
        print("Flask app stopped")
    except:
        pass
    
    print("Demo completed!")

if __name__ == "__main__":
    start_demo()
'''
    
    with open("demo_script.py", "w", encoding='utf-8') as f:
        f.write(script_content)
    
    print("Demo script created: demo_script.py")

def create_screen_recording_script():
    """Create a PowerShell script for screen recording on Windows"""
    script_content = '''# Screen Recording Script for Windows
# This script uses Windows Game Bar or OBS Studio for recording

param(
    [string]$OutputPath = "expense_demo.mp4",
    [int]$Duration = 300  # 5 minutes default
)

Write-Host "Starting Screen Recording..." -ForegroundColor Green

# Check if OBS Studio is installed
$obsPath = "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe"
if (Test-Path $obsPath) {
    Write-Host "OBS Studio found" -ForegroundColor Green
    Write-Host "Starting OBS Studio for recording..." -ForegroundColor Yellow
    Start-Process $obsPath
    Write-Host "Please start recording in OBS Studio manually" -ForegroundColor Yellow
} else {
    Write-Host "OBS Studio not found" -ForegroundColor Yellow
    Write-Host "Using Windows Game Bar (Win + G)" -ForegroundColor Yellow
    Write-Host "Press Win + G to open Game Bar and start recording" -ForegroundColor Cyan
}

# Start the Flask application
Write-Host "Starting Flask application..." -ForegroundColor Green
Start-Process python -ArgumentList "app.py" -WindowStyle Minimized

# Wait for app to start
Start-Sleep -Seconds 5

# Open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5000"

Write-Host "Demo Steps:" -ForegroundColor Cyan
Write-Host "1. Login to the application" -ForegroundColor White
Write-Host "2. Navigate to Expenses section" -ForegroundColor White
Write-Host "3. Add a new expense category" -ForegroundColor White
Write-Host "4. Add a new expense" -ForegroundColor White
Write-Host "5. Show filtering and search" -ForegroundColor White
Write-Host "6. Demonstrate mobile view" -ForegroundColor White
Write-Host "7. Show export functionality" -ForegroundColor White

Write-Host "Recording will continue for $Duration seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds $Duration

Write-Host "Recording completed!" -ForegroundColor Green
Write-Host "Please stop recording in your recording software" -ForegroundColor Yellow
'''
    
    with open("record_demo.ps1", "w", encoding='utf-8') as f:
        f.write(script_content)
    
    print("Screen recording script created: record_demo.ps1")

def create_ffmpeg_script():
    """Create a script using FFmpeg for screen recording"""
    script_content = '''#!/bin/bash
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
'''
    
    with open("record_demo.sh", "w", encoding='utf-8') as f:
        f.write(script_content)
    
    print("FFmpeg recording script created: record_demo.sh")

def create_automated_demo():
    """Create an automated demo using Selenium"""
    script_content = '''#!/usr/bin/env python3
"""
Automated Demo Video Generator using Selenium
This script automatically demonstrates the expense management feature
"""

import time
import subprocess
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def setup_driver():
    """Setup Chrome driver with recording capabilities"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def run_automated_demo():
    """Run automated demo of expense management"""
    print("Starting Automated Demo...")
    
    # Start Flask app
    flask_process = subprocess.Popen([sys.executable, "app.py"])
    time.sleep(3)
    
    try:
        driver = setup_driver()
        driver.get("http://localhost:5000")
        
        # Demo steps
        print("1. Navigating to expenses...")
        time.sleep(2)
        
        # Find and click expenses button
        try:
            expenses_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Expenses')]"))
            )
            expenses_btn.click()
            time.sleep(3)
        except:
            print("Could not find expenses button, navigating manually...")
            driver.get("http://localhost:5000/expenses")
            time.sleep(3)
        
        print("2. Adding expense category...")
        # Add category demo
        add_category_btn = driver.find_element(By.ID, "addCategoryBtn")
        add_category_btn.click()
        time.sleep(1)
        
        # Fill category form
        name_input = driver.find_element(By.ID, "categoryName")
        name_input.send_keys("Demo Category")
        
        desc_input = driver.find_element(By.ID, "categoryDescription")
        desc_input.send_keys("Category for demo purposes")
        
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(2)
        
        print("3. Adding expense...")
        # Add expense demo
        add_expense_btn = driver.find_element(By.ID, "addExpenseBtn")
        add_expense_btn.click()
        time.sleep(1)
        
        # Fill expense form
        driver.find_element(By.ID, "expenseDate").send_keys("2024-01-15")
        driver.find_element(By.ID, "expenseAmount").send_keys("50.00")
        driver.find_element(By.ID, "expenseDescription").send_keys("Demo expense")
        
        # Select category
        category_select = driver.find_element(By.ID, "expenseCategory")
        category_select.click()
        time.sleep(1)
        category_select.find_element(By.XPATH, "//option[contains(text(), 'Demo Category')]").click()
        
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(2)
        
        print("4. Demonstrating search...")
        search_input = driver.find_element(By.ID, "expenseSearch")
        search_input.send_keys("Demo")
        time.sleep(2)
        
        print("5. Demo completed!")
        time.sleep(3)
        
    except Exception as e:
        print(f"Demo error: {e}")
    
    finally:
        driver.quit()
        flask_process.terminate()
        print("Demo cleanup completed")

if __name__ == "__main__":
    run_automated_demo()
'''
    
    with open("automated_demo.py", "w", encoding='utf-8') as f:
        f.write(script_content)
    
    print("Automated demo script created: automated_demo.py")

def create_simple_recording_guide():
    """Create a simple recording guide"""
    guide_content = '''# Video Recording Guide for Tajir POS Expense Management

## Quick Start Options

### Option 1: Windows Built-in Recording
1. Press `Win + G` to open Game Bar
2. Click the record button (red circle)
3. Run: `python demo_script.py`
4. Follow the demo steps
5. Stop recording when done

### Option 2: OBS Studio (Recommended)
1. Download and install OBS Studio
2. Open OBS Studio
3. Add "Display Capture" as source
4. Click "Start Recording"
5. Run: `python demo_script.py`
6. Follow the demo steps
7. Stop recording

### Option 3: PowerShell Script
1. Run: `.\\record_demo.ps1`
2. Follow the prompts
3. Use your preferred recording software

### Option 4: FFmpeg (Advanced)
1. Install FFmpeg
2. Run: `./record_demo.sh`
3. Automatic screen recording

## Demo Steps to Follow

1. **Login to Application**
   - Open http://localhost:5000
   - Login with your credentials

2. **Navigate to Expenses**
   - Click on "Expenses" in the sidebar
   - Or use mobile "More" menu

3. **Add Expense Category**
   - Click "Add Category"
   - Enter category name and description
   - Click "Save"

4. **Add Expense**
   - Click "Add Expense"
   - Fill in date, amount, description
   - Select category
   - Click "Save"

5. **Demonstrate Features**
   - Show search functionality
   - Show filtering by date/category
   - Show mobile responsive design
   - Show export functionality

6. **Mobile View**
   - Resize browser to mobile width
   - Show mobile navigation
   - Show mobile "More" menu
   - Demonstrate touch interactions

## Recording Tips

- **Resolution**: Record at 1920x1080 or higher
- **Frame Rate**: 30 FPS is sufficient
- **Audio**: Include system audio if needed
- **Duration**: Keep under 5 minutes for best engagement
- **Focus**: Highlight the key features and user experience

## Output Formats

- **MP4**: Recommended for web sharing
- **MOV**: Good for editing
- **AVI**: Universal compatibility

## Editing Software

- **Free**: DaVinci Resolve, OpenShot, VSDC
- **Paid**: Adobe Premiere Pro, Final Cut Pro
- **Online**: WeVideo, Clipchamp

## Upload Platforms

- **YouTube**: For public demos
- **Vimeo**: For professional presentations
- **Google Drive**: For team sharing
- **GitHub**: For project documentation
'''
    
    with open("RECORDING_GUIDE.md", "w", encoding='utf-8') as f:
        f.write(guide_content)
    
    print("Recording guide created: RECORDING_GUIDE.md")

def main():
    """Main function to generate video scripts"""
    print("Video Generation Scripts for Tajir POS")
    print("=" * 50)
    
    # Create different types of video scripts
    create_demo_script()
    create_screen_recording_script()
    create_ffmpeg_script()
    create_automated_demo()
    create_simple_recording_guide()
    
    print("\nAvailable Video Generation Options:")
    print("1. demo_script.py - Manual demo script")
    print("2. record_demo.ps1 - PowerShell screen recording (Windows)")
    print("3. record_demo.sh - FFmpeg screen recording (Cross-platform)")
    print("4. automated_demo.py - Automated Selenium demo")
    print("5. RECORDING_GUIDE.md - Complete recording guide")
    
    print("\nUsage Instructions:")
    print("For manual recording:")
    print("  python demo_script.py")
    print("  Then use your preferred screen recording software")
    
    print("\nFor automated recording (Windows):")
    print("  .\\record_demo.ps1")
    
    print("\nFor FFmpeg recording:")
    print("  chmod +x record_demo.sh")
    print("  ./record_demo.sh")
    
    print("\nFor automated demo:")
    print("  pip install selenium")
    print("  python automated_demo.py")
    
    print("\nFor complete guide:")
    print("  Read RECORDING_GUIDE.md")

if __name__ == "__main__":
    main()

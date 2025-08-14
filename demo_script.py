#!/usr/bin/env python3
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

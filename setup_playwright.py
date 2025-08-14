#!/usr/bin/env python3
"""
Setup script for Playwright installation
This script installs Playwright and its browser dependencies
"""

import subprocess
import sys
import os

def install_playwright():
    """Install Playwright and its browser dependencies"""
    try:
        print("Installing Playwright...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        
        print("Installing Playwright browsers...")
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        
        print("✅ Playwright installation completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing Playwright: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up Playwright for PDF generation...")
    success = install_playwright()
    if success:
        print("🎉 Setup completed! PDF generation should now work.")
    else:
        print("💥 Setup failed! Please check the error messages above.")
        sys.exit(1)

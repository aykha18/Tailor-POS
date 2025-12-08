#!/usr/bin/env python3
"""
Railway Environment Variables Setup Script
This script helps set up all required environment variables for Tajir POS deployment
"""

import os
import subprocess
import secrets
import string

def run_railway_command(command):
    """Run a Railway CLI command and return the result"""
    try:
        result = subprocess.run(f"railway {command}", shell=True, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def generate_secret_key():
    """Generate a secure secret key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(50))

def setup_environment_variables():
    """Set up all required environment variables"""
    
    print("🚀 Setting up Railway Environment Variables for Tajir POS")
    print("=" * 60)
    
    # Check if we're in a Railway project
    success, stdout, stderr = run_railway_command("status")
    if not success:
        print("❌ Not in a Railway project. Please run 'railway link' first.")
        return False
    
    print("✅ Connected to Railway project")
    
    # Generate secure secret key
    secret_key = generate_secret_key()
    
    # Define all environment variables
    env_vars = {
        # Application Settings
        "SECRET_KEY": secret_key,
        "FLASK_ENV": "production",
        "DEBUG": "False",
        
        # Security Settings
        "BCRYPT_LOG_ROUNDS": "12",
        "SESSION_COOKIE_SECURE": "True",
        "SESSION_COOKIE_HTTPONLY": "True",
        "PERMANENT_SESSION_LIFETIME": "3600",
        
        # Rate Limiting
        "RATELIMIT_STORAGE_URL": "memory://",
        "RATELIMIT_DEFAULT": "200 per day;50 per hour",
        
        # Logging
        "LOG_LEVEL": "INFO",
        "LOG_FILE": "logs/tajir_pos.log"
    }
    
    print("\n📝 Setting up environment variables...")
    
    # Set each environment variable
    for key, value in env_vars.items():
        print(f"Setting {key}...")
        success, stdout, stderr = run_railway_command(f"variables set {key}={value}")
        
        if success:
            print(f"✅ {key} set successfully")
        else:
            print(f"❌ Failed to set {key}: {stderr}")
    
    print("\n🔍 Verifying environment variables...")
    
    # List all variables to verify
    success, stdout, stderr = run_railway_command("variables")
    if success:
        print("Current environment variables:")
        print(stdout)
    else:
        print(f"Failed to list variables: {stderr}")
    
    print("\n📋 PostgreSQL Variables Note:")
    print("The following PostgreSQL variables will be automatically set by Railway:")
    print("- POSTGRES_HOST")
    print("- POSTGRES_PORT") 
    print("- POSTGRES_DB")
    print("- POSTGRES_USER")
    print("- POSTGRES_PASSWORD")
    print("\nMake sure you have added a PostgreSQL plugin to your Railway project!")
    
    return True

def main():
    """Main function"""
    print("Railway Environment Setup for Tajir POS")
    print("=" * 40)
    
    # Check if Railway CLI is available
    success, stdout, stderr = run_railway_command("--version")
    if not success:
        print("❌ Railway CLI not found. Please install it first:")
        print("npm install -g @railway/cli")
        return
    
    print("✅ Railway CLI is available")
    
    # Setup environment variables
    if setup_environment_variables():
        print("\n🎉 Environment setup completed!")
        print("\nNext steps:")
        print("1. Add PostgreSQL plugin to your Railway project")
        print("2. Deploy your application: railway up")
        print("3. Check logs: railway logs")
    else:
        print("\n❌ Environment setup failed!")

if __name__ == "__main__":
    main()

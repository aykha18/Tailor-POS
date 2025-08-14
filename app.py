# Railway Deployment - Simplified Version (2025-08-15)
from flask import Flask, render_template, request, jsonify, send_file, session, send_from_directory, redirect, url_for, Response
import sqlite3
import os
from datetime import datetime, date, timedelta
import json
from decimal import Decimal
import zipfile
from io import BytesIO, StringIO
from dotenv import load_dotenv
load_dotenv()
from num2words import num2words

# Import other modules with error handling
try:
    import csv
    import bcrypt
    import random
    import string
    import base64
    import qrcode
    from PIL import Image
    import hashlib
    import hmac
    import struct
    import uuid
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders
    import re
    import logging
    import logging.handlers
    import traceback
    import sys
    from pathlib import Path
    from werkzeug.security import generate_password_hash, check_password_hash
    from werkzeug.utils import secure_filename
    import shutil
    from plan_manager import PlanManager
    print("✅ All imports successful")
except Exception as e:
    print(f"⚠️ Some imports failed: {e}")

try:
    from playwright.sync_api import sync_playwright
    PDF_AVAILABLE = True
    print("✅ PDF generation available")
except ImportError:
    PDF_AVAILABLE = False
    print("⚠️ playwright not installed. PDF generation will be disabled.")

# Create Flask app
app = Flask(__name__)

# Basic configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['DATABASE'] = os.getenv('DATABASE_PATH', 'pos_tailor.db')

# Simple logging setup
def setup_logging():
    """Simple logging setup for Railway."""
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/tajir_pos.log') if os.path.exists('logs') else logging.NullHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

# Database initialization
def init_db():
    """Initialize database with basic schema."""
    try:
        conn = sqlite3.connect(app.config['DATABASE'])
        cursor = conn.cursor()
        
        # Create basic tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivery_date TIMESTAMP,
                status TEXT DEFAULT 'pending',
                total_amount REAL DEFAULT 0,
                notes TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

# Basic routes
@app.route('/')
def index():
    """Root route - redirect to app."""
    return redirect('/app')

@app.route('/app')
def main_app():
    """Main application route."""
    return render_template('app_clean.html')

@app.route('/login')
def login():
    """Login page."""
    return render_template('login.html')

@app.route('/health')
def health_check():
    """Health check endpoint for Railway."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'message': 'Tajir POS is running!'
    })

@app.route('/test')
def test_endpoint():
    """Simple test endpoint."""
    return f"""
    <html>
    <head><title>Tajir POS - Test</title></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>🚀 Tajir POS is Working!</h1>
        <p><strong>Status:</strong> ✅ Application is running successfully</p>
        <p><strong>Timestamp:</strong> {datetime.now().isoformat()}</p>
        <p><strong>Database:</strong> {app.config['DATABASE']}</p>
        <p><strong>PDF Available:</strong> {PDF_AVAILABLE}</p>
        <hr>
        <h2>Available Endpoints:</h2>
        <ul>
            <li><a href="/">Root (redirects to /app)</a></li>
            <li><a href="/app">Main Application</a></li>
            <li><a href="/login">Login Page</a></li>
            <li><a href="/health">Health Check</a></li>
            <li><a href="/test">Test Page</a></li>
        </ul>
    </body>
    </html>
    """

@app.route('/init-db')
def initialize_database():
    """Initialize database on first use."""
    try:
        success = init_db()
        if success:
            return jsonify({
                'success': True,
                'message': 'Database initialized successfully',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Database initialization failed',
                'timestamp': datetime.now().isoformat()
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Database initialization failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

# Main application startup
if __name__ == '__main__':
    print("🚀 Starting Tajir POS Application...")
    print(f"Database path: {app.config['DATABASE']}")
    print(f"Secret key configured: {'Yes' if app.secret_key != 'your-secret-key-here-change-in-production' else 'No'}")
    
    # Create logs directory if it doesn't exist
    try:
        os.makedirs('logs', exist_ok=True)
        print("✅ Logs directory ready")
    except Exception as e:
        print(f"⚠️ Could not create logs directory: {e}")
    
    # Basic database check
    try:
        if not os.path.exists(app.config['DATABASE']):
            print("⚠️ Database file not found, will create on first use")
        else:
            print("✅ Database file exists")
    except Exception as e:
        print(f"⚠️ Database check failed: {e}")
    
    # Start server
    try:
        port = int(os.environ.get('PORT', 5000))
        print(f"🌐 Starting server on port {port}")
        print("🚀 Application is ready to serve requests!")
        app.run(debug=False, host='0.0.0.0', port=port)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)

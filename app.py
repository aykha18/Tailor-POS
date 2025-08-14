# Railway Diagnostic Version - Find the exact root cause
import sys
import os
from datetime import datetime

# Step 1: Basic imports
print("=== RAILWAY DIAGNOSTIC START ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"PORT environment variable: {os.environ.get('PORT', 'NOT SET')}")

try:
    print("Step 1: Importing Flask...")
    from flask import Flask, jsonify
    print("✅ Flask imported successfully")
except Exception as e:
    print(f"❌ Flask import failed: {e}")
    sys.exit(1)

try:
    print("Step 2: Creating Flask app...")
    app = Flask(__name__)
    print("✅ Flask app created successfully")
except Exception as e:
    print(f"❌ Flask app creation failed: {e}")
    sys.exit(1)

try:
    print("Step 3: Setting configuration...")
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'diagnostic-key')
    print("✅ Configuration set successfully")
except Exception as e:
    print(f"❌ Configuration failed: {e}")
    sys.exit(1)

@app.route('/')
def index():
    """Root route - diagnostic page."""
    return f"""
    <html>
    <head><title>Railway Diagnostic</title></head>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0f0f0;">
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2c3e50;">🔍 Railway Diagnostic Success!</h1>
            <p style="font-size: 18px; color: #27ae60;"><strong>✅ Status:</strong> Flask app is running on Railway</p>
            <p><strong>Timestamp:</strong> {datetime.now().isoformat()}</p>
            <p><strong>Python Version:</strong> {sys.version}</p>
            <p><strong>Current Directory:</strong> {os.getcwd()}</p>
            <p><strong>Port:</strong> {os.environ.get('PORT', 'Not set')}</p>
            <p><strong>Railway URL:</strong> {os.environ.get('RAILWAY_STATIC_URL', 'Not set')}</p>
            <hr style="margin: 20px 0;">
            <h2>Test Endpoints:</h2>
            <ul>
                <li><a href="/health" style="color: #3498db;">Health Check</a></li>
                <li><a href="/debug" style="color: #3498db;">Debug Info</a></li>
            </ul>
            <hr style="margin: 20px 0;">
            <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60;">
                <strong>Success!</strong> If you can see this page, the root cause has been identified and fixed.
            </p>
        </div>
    </body>
    </html>
    """

@app.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'message': 'Railway diagnostic successful',
        'python_version': sys.version,
        'port': os.environ.get('PORT', 'Not set'),
        'railway_url': os.environ.get('RAILWAY_STATIC_URL', 'Not set')
    })

@app.route('/debug')
def debug_info():
    """Debug information endpoint."""
    return jsonify({
        'python_version': sys.version,
        'current_directory': os.getcwd(),
        'port': os.environ.get('PORT', 'Not set'),
        'railway_url': os.environ.get('RAILWAY_STATIC_URL', 'Not set'),
        'environment_variables': dict(os.environ),
        'timestamp': datetime.now().isoformat()
    })

# Main application startup with detailed logging
if __name__ == '__main__':
    print("Step 4: Starting application...")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Files in current directory: {os.listdir('.')}")
    
    try:
        print("Step 5: Getting port...")
        # Railway specific port handling
        port = os.environ.get('PORT')
        if port:
            port = int(port)
            print(f"✅ Port from environment: {port}")
        else:
            port = 5000
            print(f"⚠️ No PORT environment variable, using default: {port}")
    except Exception as e:
        print(f"❌ Port configuration failed: {e}")
        port = 5000
        print(f"Using default port: {port}")
    
    try:
        print("Step 6: Starting Flask server...")
        print(f"🌐 Starting server on port {port}")
        print(f"🚀 Application ready!")
        print(f"🔗 Railway URL: {os.environ.get('RAILWAY_STATIC_URL', 'Not set')}")
        app.run(debug=False, host='0.0.0.0', port=port)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print(f"Error type: {type(e)}")
        print(f"Error details: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

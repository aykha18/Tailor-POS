# Ultra-Minimal Railway Deployment Version
from flask import Flask, render_template, jsonify
import os
from datetime import datetime

# Create Flask app
app = Flask(__name__)

# Basic configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'simple-key-for-railway')

@app.route('/')
def index():
    """Root route - simple test page."""
    return f"""
    <html>
    <head><title>Tajir POS - Railway Test</title></head>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0f0f0;">
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2c3e50;">🚀 Tajir POS is Working on Railway!</h1>
            <p style="font-size: 18px; color: #27ae60;"><strong>✅ Status:</strong> Application is running successfully</p>
            <p><strong>Timestamp:</strong> {datetime.now().isoformat()}</p>
            <p><strong>Environment:</strong> Railway Production</p>
            <hr style="margin: 20px 0;">
            <h2>Test Endpoints:</h2>
            <ul>
                <li><a href="/health" style="color: #3498db;">Health Check</a></li>
                <li><a href="/test" style="color: #3498db;">Test Page</a></li>
                <li><a href="/simple" style="color: #3498db;">Simple Test</a></li>
            </ul>
            <hr style="margin: 20px 0;">
            <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60;">
                <strong>Success!</strong> If you can see this page, the Railway deployment is working correctly.
            </p>
        </div>
    </body>
    </html>
    """

@app.route('/health')
def health_check():
    """Health check endpoint for Railway."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'message': 'Tajir POS is running on Railway!',
        'version': 'ultra-minimal'
    })

@app.route('/test')
def test_endpoint():
    """Simple test endpoint."""
    return jsonify({
        'success': True,
        'message': 'Test endpoint working',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/simple')
def simple_test():
    """Ultra simple test."""
    return "Tajir POS is working! 🎉"

# Main application startup
if __name__ == '__main__':
    print("🚀 Starting Ultra-Minimal Tajir POS...")
    print("✅ No complex imports or dependencies")
    print("✅ Simple Flask app only")
    
    try:
        port = int(os.environ.get('PORT', 5000))
        print(f"🌐 Starting server on port {port}")
        print("🚀 Application ready!")
        app.run(debug=False, host='0.0.0.0', port=port)
    except Exception as e:
        print(f"❌ Failed to start: {e}")
        import sys
        sys.exit(1)

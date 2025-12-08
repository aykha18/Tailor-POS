"""
Security wrapper for Tajir POS Flask app
"""
from flask import Flask, request, jsonify, session
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import os
from security_config import *
from security_middleware import SecurityMiddleware
from security_logger import setup_security_logging, log_security_event, log_failed_login, log_successful_login

def create_secure_app():
    """Create a Flask app with security features."""
    app = Flask(__name__)
    
    # Basic configuration
    app.config['DATABASE'] = os.getenv('DATABASE_PATH', 'pos_tailor.db')
    
    # Security configuration
    app.secret_key = SECRET_KEY
    app.config['PERMANENT_SESSION_LIFETIME'] = PERMANENT_SESSION_LIFETIME
    app.config['SESSION_COOKIE_SECURE'] = SESSION_COOKIE_SECURE
    app.config['SESSION_COOKIE_HTTPONLY'] = SESSION_COOKIE_HTTPONLY
    app.config['SESSION_COOKIE_SAMESITE'] = SESSION_COOKIE_SAMESITE
    
    # CSRF protection
    csrf = CSRFProtect(app)
    app.config['WTF_CSRF_TIME_LIMIT'] = WTF_CSRF_TIME_LIMIT
    
    # Rate limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"]
    )
    
    # Security middleware
    security_middleware = SecurityMiddleware(app)
    
    # Setup security logging
    setup_security_logging()
    
    # Security middleware functions
    @app.before_request
    def check_security():
        """Check security before each request."""
        # Check session timeout
        timeout_check = security_middleware.check_session_timeout()
        if timeout_check:
            return timeout_check
        
        # Check rate limiting for API endpoints
        if request.path.startswith('/api/'):
            rate_check = security_middleware.check_rate_limit(request.path, RATE_LIMIT_PER_MINUTE)
            if rate_check:
                return rate_check

    @app.after_request
    def add_security_headers(response):
        """Add security headers to response."""
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        
        # Add HSTS header for HTTPS
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response
    
    return app, limiter, security_middleware

def log_user_action_with_security(action, user_id=None, details=None):
    """Enhanced user action logging with security context."""
    try:
        # Import the original log_user_action function
        from app import log_user_action
        
        # Log to database
        log_user_action(action, user_id, details)
        
        # Log security event
        log_security_event(
            event_type=action,
            user_id=user_id,
            details=details,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
    except Exception as e:
        print(f"Failed to log user action with security: {e}")

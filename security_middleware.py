"""
Security middleware for Tajir POS
"""
from flask import request, jsonify, session
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    """Security middleware for request processing."""
    
    def __init__(self, app):
        self.app = app
        self.failed_attempts = {}
        self.rate_limit_data = {}
    
    def check_session_timeout(self):
        """Check if user session has timed out."""
        if 'user_id' in session:
            last_activity = session.get('last_activity')
            if last_activity:
                try:
                    last_activity = datetime.fromisoformat(last_activity)
                    timeout_hours = int(os.getenv('SESSION_TIMEOUT_HOURS', 8))
                    if datetime.now() - last_activity > timedelta(hours=timeout_hours):
                        session.clear()
                        return jsonify({'error': 'Session expired', 'code': 'SESSION_EXPIRED'}), 401
                except ValueError:
                    session.clear()
                    return jsonify({'error': 'Invalid session data'}), 401
            
            session['last_activity'] = datetime.now().isoformat()
        return None
    
    def check_rate_limit(self, endpoint, limit_per_minute=50):
        """Check rate limiting for endpoints."""
        client_ip = request.remote_addr
        current_time = datetime.now()
        
        if client_ip not in self.rate_limit_data:
            self.rate_limit_data[client_ip] = {}
        
        if endpoint not in self.rate_limit_data[client_ip]:
            self.rate_limit_data[client_ip][endpoint] = []
        
        # Remove old requests (older than 1 minute)
        self.rate_limit_data[client_ip][endpoint] = [
            req_time for req_time in self.rate_limit_data[client_ip][endpoint]
            if current_time - req_time < timedelta(minutes=1)
        ]
        
        # Check if limit exceeded
        if len(self.rate_limit_data[client_ip][endpoint]) >= limit_per_minute:
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
            return jsonify({'error': 'Rate limit exceeded', 'code': 'RATE_LIMIT'}), 429
        
        # Add current request
        self.rate_limit_data[client_ip][endpoint].append(current_time)
        return None
    
    def check_failed_attempts(self, identifier, max_attempts=5):
        """Check for too many failed attempts."""
        current_time = datetime.now()
        
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
        
        # Remove old attempts (older than 15 minutes)
        self.failed_attempts[identifier] = [
            attempt_time for attempt_time in self.failed_attempts[identifier]
            if current_time - attempt_time < timedelta(minutes=15)
        ]
        
        # Check if too many attempts
        if len(self.failed_attempts[identifier]) >= max_attempts:
            logger.warning(f"Too many failed attempts for {identifier}")
            return jsonify({'error': 'Too many failed attempts', 'code': 'TOO_MANY_ATTEMPTS'}), 429
        
        return None
    
    def record_failed_attempt(self, identifier):
        """Record a failed attempt."""
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
        
        self.failed_attempts[identifier].append(datetime.now())
    
    def add_security_headers(self, response):
        """Add security headers to response."""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Add HSTS header for HTTPS
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Add CSP header
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )
        response.headers['Content-Security-Policy'] = csp_policy
        
        return response

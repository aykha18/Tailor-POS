#!/usr/bin/env python3
"""
Tajir POS Security Fixes Script
Implements critical security improvements for the application.
"""

import os
import secrets
import sqlite3
from datetime import datetime, timedelta
import json

def generate_secure_secret_key():
    """Generate a secure 32-byte secret key."""
    return secrets.token_hex(32)

def create_env_file():
    """Create or update .env file with secure configuration."""
    env_content = """# Tajir POS Environment Configuration
# SECURITY: This file contains sensitive configuration
# DO NOT commit this file to version control

# Generate a new secret key for production
SECRET_KEY={}

# Database configuration
DATABASE_PATH=pos_tailor.db

# Email configuration (if needed)
SMTP_SERVER=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=

# WhatsApp integration
WHATSAPP_NUMBER_1=+971503904508
WHATSAPP_NUMBER_2=+971524566488

# Security settings
SESSION_TIMEOUT_HOURS=8
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_PER_MINUTE=50
""".format(generate_secure_secret_key())
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("SUCCESS: Created .env file with secure configuration")
    print("WARNING: Add .env to .gitignore if not already present")

def update_gitignore():
    """Ensure .env file is in .gitignore."""
    gitignore_content = """
# Environment variables
.env
.env.local
.env.production

# Database files
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Uploads
uploads/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
"""
    
    with open('.gitignore', 'a') as f:
        f.write(gitignore_content)
    
    print("SUCCESS: Updated .gitignore with security-related exclusions")

def create_security_middleware():
    """Create security middleware file."""
    middleware_content = '''"""
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
            "script-src 'self' 'unsafe-inline' ; "
            "style-src 'self' 'unsafe-inline' ; "
            "font-src 'self' ; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )
        response.headers['Content-Security-Policy'] = csp_policy
        
        return response
'''
    
    with open('security_middleware.py', 'w') as f:
        f.write(middleware_content)
    
    print("SUCCESS: Created security_middleware.py with security middleware")

def create_validation_schemas():
    """Create input validation schemas."""
    validation_content = '''"""
Input validation schemas for Tajir POS
"""
from marshmallow import Schema, fields, validate, ValidationError
import re

class LoginSchema(Schema):
    """Schema for login validation."""
    email = fields.Email(required=True, error_messages={'required': 'Email is required'})
    password = fields.Str(required=True, validate=validate.Length(min=6), 
                         error_messages={'required': 'Password is required'})

class MobileLoginSchema(Schema):
    """Schema for mobile login validation."""
    mobile = fields.Str(required=True, validate=validate.Regexp(r'^\+?[1-9]\\d{1,14}$'),
                       error_messages={'required': 'Mobile number is required'})
    otp = fields.Str(required=True, validate=validate.Length(equal=6),
                    error_messages={'required': 'OTP is required'})

class ShopCodeLoginSchema(Schema):
    """Schema for shop code login validation."""
    shop_code = fields.Str(required=True, validate=validate.Length(min=3, max=20),
                          error_messages={'required': 'Shop code is required'})
    password = fields.Str(required=True, validate=validate.Length(min=6),
                         error_messages={'required': 'Password is required'})

class ProductSchema(Schema):
    """Schema for product validation."""
    product_name = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                             error_messages={'required': 'Product name is required'})
    rate = fields.Decimal(required=True, validate=validate.Range(min=0),
                         error_messages={'required': 'Rate is required'})
    type_id = fields.Int(required=True, validate=validate.Range(min=1),
                        error_messages={'required': 'Product type is required'})

class CustomerSchema(Schema):
    """Schema for customer validation."""
    customer_name = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                              error_messages={'required': 'Customer name is required'})
    mobile = fields.Str(validate=validate.Regexp(r'^\+?[1-9]\\d{1,14}$'))
    email = fields.Email()

class BillSchema(Schema):
    """Schema for bill validation."""
    customer_id = fields.Int(required=True, validate=validate.Range(min=1),
                            error_messages={'required': 'Customer is required'})
    items = fields.List(fields.Dict(), required=True, validate=validate.Length(min=1),
                       error_messages={'required': 'At least one item is required'})

def validate_input(schema_class, data):
    """Validate input data using schema."""
    try:
        schema = schema_class()
        return schema.load(data), None
    except ValidationError as err:
        return None, err.messages
'''
    
    with open('validation.py', 'w') as f:
        f.write(validation_content)
    
    print("SUCCESS: Created validation.py with input validation schemas")

def create_audit_log_table():
    """Create audit log table for security events."""
    conn = sqlite3.connect('pos_tailor.db')
    cursor = conn.cursor()
    
    # Create audit log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource TEXT,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Create index for better performance
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)
    ''')
    
    conn.commit()
    conn.close()
    
    print("SUCCESS: Created audit_log table for security event tracking")

def create_security_logger():
    """Create security logging configuration."""
    logger_content = '''"""
Security logging configuration for Tajir POS
"""
import logging
import logging.handlers
from datetime import datetime
import json

def setup_security_logging():
    """Setup security-specific logging."""
    # Create security logger
    security_logger = logging.getLogger('security')
    security_logger.setLevel(logging.WARNING)
    
    # Create security log file handler
    security_handler = logging.handlers.RotatingFileHandler(
        'logs/security.log',
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    security_handler.setLevel(logging.WARNING)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    security_handler.setFormatter(formatter)
    
    # Add handler to logger
    security_logger.addHandler(security_handler)
    
    return security_logger

def log_security_event(event_type, user_id=None, details=None, ip_address=None, user_agent=None):
    """Log security events."""
    security_logger = logging.getLogger('security')
    
    log_data = {
        'event_type': event_type,
        'user_id': user_id,
        'timestamp': datetime.now().isoformat(),
        'ip_address': ip_address,
        'user_agent': user_agent,
        'details': details
    }
    
    security_logger.warning(f"SECURITY_EVENT: {json.dumps(log_data)}")

def log_failed_login(identifier, method, ip_address, user_agent):
    """Log failed login attempts."""
    log_security_event(
        'FAILED_LOGIN',
        details={
            'identifier': identifier,
            'method': method,
            'ip_address': ip_address
        },
        ip_address=ip_address,
        user_agent=user_agent
    )

def log_successful_login(user_id, method, ip_address, user_agent):
    """Log successful login attempts."""
    log_security_event(
        'SUCCESSFUL_LOGIN',
        user_id=user_id,
        details={'method': method},
        ip_address=ip_address,
        user_agent=user_agent
    )

def log_suspicious_activity(activity_type, user_id=None, details=None, ip_address=None):
    """Log suspicious activities."""
    log_security_event(
        'SUSPICIOUS_ACTIVITY',
        user_id=user_id,
        details={'activity_type': activity_type, **details} if details else {'activity_type': activity_type},
        ip_address=ip_address
    )
'''
    
    with open('security_logger.py', 'w') as f:
        f.write(logger_content)
    
    print("SUCCESS: Created security_logger.py for security event logging")

def update_requirements():
    """Update requirements.txt with security packages."""
    security_packages = '''
# Security packages
Flask-WTF==1.1.1
Flask-Limiter==3.5.0
marshmallow==3.20.1
cryptography==41.0.7
'''
    
    with open('requirements.txt', 'a') as f:
        f.write(security_packages)
    
    print("SUCCESS: Updated requirements.txt with security packages")

def create_security_checklist():
    """Create a security checklist for manual verification."""
    checklist_content = '''# Tajir POS Security Checklist

## Critical Security Measures

### Environment Configuration
- [ ] SECRET_KEY is set and is a strong 32-byte hex string
- [ ] .env file is in .gitignore
- [ ] No sensitive data in version control

### Authentication & Authorization
- [ ] Session timeout is configured (8 hours)
- [ ] Rate limiting is implemented on login endpoints
- [ ] Failed login attempts are tracked
- [ ] CSRF protection is enabled
- [ ] Password complexity requirements are enforced

### Input Validation
- [ ] All user inputs are validated using schemas
- [ ] SQL injection prevention is working
- [ ] XSS prevention measures are in place
- [ ] File upload validation is implemented

### Security Headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy is set
- [ ] HSTS header is configured for HTTPS

### Logging & Monitoring
- [ ] Security events are logged
- [ ] Audit trail is implemented
- [ ] Failed login attempts are monitored
- [ ] Unusual activity is detected

### Database Security
- [ ] Database files are not accessible via web
- [ ] Multi-tenant isolation is working
- [ ] Database backups are encrypted
- [ ] Connection pooling is implemented

## Testing Checklist

### Authentication Testing
- [ ] Test session timeout functionality
- [ ] Test rate limiting on login endpoints
- [ ] Test CSRF protection on forms
- [ ] Test password complexity requirements
- [ ] Test OTP expiration

### Authorization Testing
- [ ] Test user isolation (multi-tenant)
- [ ] Test admin privilege escalation prevention
- [ ] Test API endpoint access control
- [ ] Test file access permissions

### Input Validation Testing
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Test file upload validation
- [ ] Test JSON payload validation

### Session Management Testing
- [ ] Test session fixation prevention
- [ ] Test session hijacking prevention
- [ ] Test logout functionality
- [ ] Test session regeneration

## Deployment Checklist

### Production Environment
- [ ] HTTPS is enabled
- [ ] Environment variables are set
- [ ] Database is properly configured
- [ ] Logging is configured
- [ ] Monitoring is set up

### Security Monitoring
- [ ] Failed login monitoring is active
- [ ] Unusual activity alerts are configured
- [ ] Database access monitoring is enabled
- [ ] File upload monitoring is active

## Regular Security Tasks

### Weekly
- [ ] Review security logs
- [ ] Check for failed login attempts
- [ ] Monitor unusual activity
- [ ] Update security packages

### Monthly
- [ ] Conduct security audit
- [ ] Review access permissions
- [ ] Update security policies
- [ ] Test backup and recovery

### Quarterly
- [ ] Perform penetration testing
- [ ] Review security architecture
- [ ] Update security documentation
- [ ] Conduct security training
'''
    
    with open('SECURITY_CHECKLIST.md', 'w') as f:
        f.write(checklist_content)
    
    print("SUCCESS: Created SECURITY_CHECKLIST.md for ongoing security verification")

def main():
    """Run all security fixes."""
    print("SECURITY: Tajir POS Security Fixes")
    print("=" * 50)
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Run security fixes
    create_env_file()
    update_gitignore()
    create_security_middleware()
    create_validation_schemas()
    create_audit_log_table()
    create_security_logger()
    update_requirements()
    create_security_checklist()
    
    print("\n" + "=" * 50)
    print("SUCCESS: Security fixes completed!")
    print("\nNEXT STEPS:")
    print("1. Install new requirements: pip install -r requirements.txt")
    print("2. Update your app.py to use the new security middleware")
    print("3. Test all functionality after security changes")
    print("4. Review SECURITY_CHECKLIST.md for manual verification")
    print("5. Deploy with new environment variables")
    
    print("\nIMPORTANT:")
    print("- Generate a new SECRET_KEY for production")
    print("- Test thoroughly before deploying to production")
    print("- Monitor logs for any security issues")
    print("- Keep security packages updated")

if __name__ == "__main__":
    main()

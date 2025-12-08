"""
Security configuration for Tajir POS
"""
import os
from datetime import timedelta

# Security settings
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

# Session configuration
SESSION_TIMEOUT_HOURS = int(os.getenv('SESSION_TIMEOUT_HOURS', 8))
PERMANENT_SESSION_LIFETIME = timedelta(hours=SESSION_TIMEOUT_HOURS)
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # Prevent XSS
SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection

# Rate limiting
MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 5))
RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', 50))

# CSRF protection
WTF_CSRF_TIME_LIMIT = 3600  # 1 hour

# Security headers
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' ; style-src 'self' 'unsafe-inline' ; font-src 'self' ; img-src 'self' data:; connect-src 'self';"
}

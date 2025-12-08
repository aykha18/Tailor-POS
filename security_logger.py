"""
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

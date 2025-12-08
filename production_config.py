"""
Production configuration for Tajir POS
"""
import os

# Production settings
PRODUCTION = os.environ.get('RAILWAY_ENVIRONMENT') == 'production'

# Domain configuration
if PRODUCTION:
    BASE_URL = 'https://tajirtech.com'
    RAILWAY_URL = 'https://tajir.up.railway.app'
else:
    BASE_URL = 'http://localhost:5000'
    RAILWAY_URL = 'http://localhost:5000'

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL', 'pos_tailor.db')

# Security settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Email settings (if needed)
SMTP_SERVER = os.environ.get('SMTP_SERVER', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# WhatsApp integration
WHATSAPP_NUMBERS = [
    '+971503904508',
    '+971524566488'
]

# App settings
APP_NAME = 'Tajir POS'
APP_VERSION = '1.0.0'
APP_DESCRIPTION = 'UAE\'s Smart Point of Sale System'

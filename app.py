from flask import Flask, render_template, request, jsonify, send_file, session, send_from_directory, redirect, url_for
import os
import secrets
from datetime import datetime, date, timedelta
import json
from decimal import Decimal
import zipfile
from io import BytesIO
from dotenv import load_dotenv
load_dotenv()
from num2words import num2words
from plan_manager import plan_manager
import csv
from io import StringIO
from flask import Response
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
import pytesseract
from werkzeug.utils import secure_filename

print("DEBUG: app.py module loaded")

# Try to import PostgreSQL dependencies
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRESQL_AVAILABLE = True
except ImportError:
    POSTGRESQL_AVAILABLE = False
    psycopg2 = None
    RealDictCursor = None

# Try to import OpenCV and NumPy, with fallback for Railway deployment
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError as e:
    print(f"OpenCV/NumPy not available: {e}")
    print("OCR will use basic image processing without OpenCV")
    OPENCV_AVAILABLE = False
    cv2 = None
    np = None

# Configure comprehensive logging system
def setup_logging():
    """Setup comprehensive logging for production."""
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure file logging
    file_handler = logging.handlers.RotatingFileHandler(
        'logs/tajir_pos.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    
    # Configure error file logging
    error_handler = logging.handlers.RotatingFileHandler(
        'logs/errors.log',
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    error_handler.setLevel(logging.ERROR)
    
    # Configure console logging for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Create formatters
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    error_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    )
    
    file_handler.setFormatter(file_formatter)
    error_handler.setFormatter(error_formatter)
    console_handler.setFormatter(file_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    root_logger.addHandler(console_handler)
    
    return root_logger

# Initialize logging
logger = setup_logging()

def log_dml_error(operation, table, error, user_id=None, data=None):
    """Log DML failures to both file and database."""
    try:
        # Log to file
        error_msg = f"DML Error - Operation: {operation}, Table: {table}, Error: {str(error)}"
        if user_id:
            error_msg += f", User: {user_id}"
        if data:
            error_msg += f", Data: {str(data)[:200]}..."  # Truncate data
        
        logger.error(error_msg)
        
        # Log to database (if possible)
        try:
            conn = get_db_connection()
            placeholder = get_placeholder()
            execute_with_returning(conn, f'''
                INSERT INTO error_logs (timestamp, level, operation, table_name, error_message, user_id, data_snapshot)
                VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
            ''', (
                datetime.now().isoformat(),
                'ERROR',
                operation,
                table,
                str(error),
                user_id,
                json.dumps(data) if data else None
            ))
            conn.close()
        except Exception as db_log_error:
            # If database logging fails, log to file only
            logger.error(f"Failed to log to database: {db_log_error}")
            
    except Exception as log_error:
        # Fallback to basic logging
        print(f"Logging failed: {log_error}")

def log_user_action(action, user_id=None, details=None):
    """Log user actions for audit trail."""
    try:
        conn = get_db_connection()
        placeholder = get_placeholder()
        execute_update(conn, f'''
            INSERT INTO user_actions (timestamp, action, user_id, details)
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})
        ''', (
            datetime.now().isoformat(),
            action,
            user_id,
            json.dumps(details) if details else None
        ))
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log user action: {e}")

app = Flask(__name__)
# PostgreSQL database configuration is handled via environment variables
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(32))  # Add secret key for sessions

# Configure session settings
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # Session lasts 8 hours
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent XSS attacks
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection

# Disable caching in development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable static file caching
app.config['TEMPLATES_AUTO_RELOAD'] = True  # Auto-reload templates

# Add cache-busting headers for development
@app.after_request
def after_request(response):
    # Disable caching for all responses in development
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response



def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    pg_host = os.getenv('PGHOST') or os.getenv('POSTGRES_HOST')
    
    if database_url:
        # Use DATABASE_URL (Railway standard approach)
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    else:
        # Use individual variables
        pg_port = os.getenv('PGPORT') or os.getenv('POSTGRES_PORT', '5432')
        pg_database = os.getenv('PGDATABASE') or os.getenv('POSTGRES_DB', 'tajir_pos')
        pg_user = os.getenv('PGUSER') or os.getenv('POSTGRES_USER', 'postgres')
        pg_password = os.getenv('PGPASSWORD') or os.getenv('POSTGRES_PASSWORD', 'password')
        
        pg_config = {
            'host': pg_host,
            'port': pg_port,
            'database': pg_database,
            'user': pg_user,
            'password': pg_password,
            'cursor_factory': RealDictCursor
        }
        conn = psycopg2.connect(**pg_config)
    return conn

def get_db_integrity_error():
    """Get PostgreSQL IntegrityError class"""
    return psycopg2.IntegrityError

def is_postgresql():
    """Check if we're using PostgreSQL - always True now"""
    return True

def get_placeholder():
    """Get PostgreSQL placeholder"""
    return '%s'

def execute_with_returning(conn, sql, params=None):
    """Execute SQL and return the inserted ID for PostgreSQL"""
    # For PostgreSQL, determine the correct ID column name based on the table
    if sql.strip().upper().startswith('INSERT'):
        # Extract table name from INSERT statement
        table_match = re.search(r'INSERT INTO (\w+)', sql, re.IGNORECASE)
        if table_match:
            table_name = table_match.group(1)
            # Map table names to their ID column names
            id_columns = {
                'employees': 'employee_id',
                'customers': 'customer_id',
                'products': 'product_id',
                'product_types': 'type_id',
                'bills': 'bill_id',
                'bill_items': 'item_id',
                'expenses': 'expense_id',
                'expense_categories': 'category_id',
                'vat_rates': 'vat_id',
                'user_plans': 'plan_id',
                'shop_settings': 'setting_id',
                'users': 'user_id',
                'otp_codes': 'id',
                'error_logs': 'id',
                'user_actions': 'action_id',
                'recurring_expenses': 'recurring_id'
            }
            id_column = id_columns.get(table_name, 'id')
            
            # Add RETURNING clause if not already present
            if 'RETURNING' not in sql.upper():
                sql += f' RETURNING {id_column}'
            
            cursor = conn.cursor()
            cursor.execute(sql, params)
            result = cursor.fetchone()
            conn.commit()  # Commit the transaction
            # Handle both dict and tuple results
            if result:
                if isinstance(result, dict):
                    return result[id_column]
                else:
                    # For tuple results, return the first element
                    return result[0]
            return None
        else:
            # Fallback to generic 'id' if table name can't be determined
            if 'RETURNING' not in sql.upper():
                sql += ' RETURNING id'
            cursor = conn.cursor()
            cursor.execute(sql, params)
            result = cursor.fetchone()
            conn.commit()  # Commit the transaction
            if result:
                if isinstance(result, dict):
                    return result['id']
                else:
                    return result[0]
            return None
    else:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()  # Commit the transaction
        return None

def execute_query(conn, sql, params=None):
    """Execute a query and return results for PostgreSQL"""
    cursor = conn.cursor()
    cursor.execute(sql, params)
    return cursor

def execute_update(conn, sql, params=None):
    """Execute an UPDATE/DELETE statement for PostgreSQL"""
    cursor = conn.cursor()
    cursor.execute(sql, params)
    conn.commit()
    return cursor.rowcount

def get_current_user_id():
    """Get current user_id from session, fallback to None for proper authentication."""
    return session.get('user_id')

def get_invoice_summary_data(user_id, bill_date):
    """Get summary data for invoice printing - placeholder function."""
    try:
        # Return basic summary data structure
        return {
            'total_invoices': 0,
            'total_revenue': 0.0,
            'total_vat_collected': 0.0,
            'total_subtotal': 0.0,
            'total_discounts': 0.0,
            'avg_invoice_value': 0.0,
            'unique_customers': 0,
            'paid_invoices': 0,
            'paid_amount': 0.0,
            'pending_invoices': 0,
            'pending_amount': 0.0
        }
    except Exception as e:
        print(f"Error getting invoice summary data: {e}")
        return {
            'total_invoices': 0,
            'total_revenue': 0.0,
            'total_vat_collected': 0.0,
            'total_subtotal': 0.0,
            'total_discounts': 0.0,
            'avg_invoice_value': 0.0,
            'unique_customers': 0,
            'paid_invoices': 0,
            'paid_amount': 0.0,
            'pending_invoices': 0,
            'pending_amount': 0.0
        }

def get_user_language():
    """Get current user language preference."""
    return session.get('language', 'en')

def get_translated_text(text, language=None):
    """Get translated text based on language."""
    if language is None:
        language = get_user_language()
    # For now, return the original text (no translation implemented)
    return text

def get_user_plan_info():
    """Get current user plan information and shop settings for template rendering."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            # Return default plan info for unauthenticated users
            return {
                'plan_type': 'trial',
                'plan_name': 'Tajir Trial',
                'plan_display_name': 'Tajir Trial',
                'shop_settings': None
            }
        
        conn = get_db_connection()
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT * FROM user_plans WHERE user_id = {placeholder} AND is_active = TRUE', (user_id,))
        user_plan = cursor.fetchone()
        cursor = execute_query(conn, f'SELECT * FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
        shop_settings = cursor.fetchone()
        conn.close()
        
        if not user_plan:
            return {
                'plan_type': 'trial',
                'plan_name': 'Tajir Trial',
                'plan_display_name': 'Tajir Trial',
                'shop_settings': dict(shop_settings) if shop_settings else None
            }
        
        user_plan = dict(user_plan)
        plan_type = user_plan['plan_type']
        
        # Map plan types to display names
        plan_names = {
            'trial': 'Tajir Trial',
            'basic': 'Tajir Basic', 
            'pro': 'Tajir Pro'
        }
        
        return {
            'plan_type': plan_type,
            'plan_name': plan_names.get(plan_type, 'Tajir Trial'),
            'plan_display_name': plan_names.get(plan_type, 'Tajir Trial'),
            'shop_settings': dict(shop_settings) if shop_settings else None
        }
    except Exception as e:
        print(f"Error getting user plan: {e}")
        return {
            'plan_type': 'trial',
            'plan_name': 'Tajir Trial',
            'plan_display_name': 'Tajir Trial',
            'shop_settings': None
        }

def init_db():
    need_init = False
    # For PostgreSQL, check if tables exist
    try:
        conn = get_db_connection()
        cursor = execute_query(conn, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_types'")
        result = cursor.fetchone()
        count = result['count']
        if count == 0:
            need_init = True
        conn.close()
    except Exception as e:
        # Table doesn't exist, need to initialize
        need_init = True
    
    if need_init:
        # Use PostgreSQL schema file
        schema_file = 'database_schema_postgresql.sql'
        
        try:
            with open(schema_file, 'r') as f:
                schema = f.read()
        except FileNotFoundError:
            print(f"Schema file {schema_file} not found")
            return
        
        conn = get_db_connection()
        try:
            # For PostgreSQL, execute statements one by one
            statements = schema.split(';')
            cursor = conn.cursor()
            # print(f"Executing {len(statements)} statements from schema file...")
            executed_count = 0
            for i, statement in enumerate(statements):
                statement = statement.strip()
                # print(f"Statement {i+1} (length: {len(statement)}): {statement[:50]}...")
                
                # Skip empty statements
                if not statement:
                    # print(f"Skipping statement {i+1} (empty)")
                    continue
                
                # Skip pure comment statements (lines that are only comments)
                if statement.startswith('--') and not any(keyword in statement.upper() for keyword in ['CREATE', 'INSERT', 'ALTER', 'DROP', 'SELECT', 'UPDATE', 'DELETE']):
                    # print(f"Skipping statement {i+1} (pure comment)")
                    continue
                
                # Execute the statement
                try:
                    # print(f"Executing statement {i+1}: {statement[:100]}...")
                    cursor.execute(statement)
                    executed_count += 1
                    # print(f"✅ Statement {i+1} executed successfully")
                except Exception as stmt_error:
                    # print(f"❌ Warning: Failed to execute statement {i+1}: {stmt_error}")
                    # print(f"Statement: {statement}")
                    # Continue with other statements
                    pass
            
            # print(f"Successfully executed {executed_count} statements")
            conn.commit()  # Commit the transaction
            cursor.close()
            
            # Verify tables were created
            try:
                verify_cursor = conn.cursor()
                verify_cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                tables = verify_cursor.fetchall()
                # print(f"Tables created: {[table[0] for table in tables]}")
                verify_cursor.close()
            except Exception as verify_error:
                # print(f"Error verifying tables: {verify_error}")
                pass
            
            logger.info("PostgreSQL database initialized successfully")
        except Exception as e:
            log_dml_error("INIT", "database", e)
            print(f"Database initialization error: {e}")
            # Don't raise the error, just log it and continue
        finally:
            conn.close()
        print("Database initialization completed!")
        
        # Setup admin user after tables are created
        try:
            from setup_production_admin import setup_production_admin
            setup_production_admin()
            logger.info("Admin user setup completed")
        except Exception as e:
            logger.error(f"Failed to setup admin user: {e}")
    
    # Always clean up corrupted data, regardless of whether initialization was needed
    try:
        conn = get_db_connection()
        cleanup_corrupted_data(conn)
        conn.close()
    except Exception as e:
        print(f"Warning: Failed to clean up corrupted data: {e}")
    
    # If no initialization was needed, still ensure admin user exists
    # But only if this is the first time init_db() is called
    if not need_init and not hasattr(init_db, '_admin_setup_done'):
        try:
            from setup_production_admin import setup_production_admin
            setup_production_admin()
            logger.info("Admin user setup completed")
            init_db._admin_setup_done = True
        except Exception as e:
            logger.error(f"Failed to setup admin user: {e}")


def cleanup_corrupted_data(conn):
    """Clean up corrupted data in the database."""
    try:
        cursor = conn.cursor()
        
        # Fix corrupted dates in expenses table
        # For PostgreSQL, update invalid dates to current date
        cursor.execute("""
            UPDATE expenses 
            SET expense_date = CURRENT_DATE 
            WHERE expense_date IS NULL 
               OR expense_date < '1900-01-01' 
               OR expense_date > '2100-12-31'
        """)
        
        # Reset sequence if needed
        cursor.execute("SELECT setval('expenses_expense_id_seq', (SELECT COALESCE(MAX(expense_id), 1) FROM expenses))")
        
        conn.commit()
        print("Corrupted data cleaned up successfully")

    except Exception as e:
        print(f"Warning: Failed to clean up corrupted data: {e}")
        conn.rollback()


# Railway subdomain redirect removed - subdomain not working properly

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Add HSTS header for HTTPS
    if request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Add comprehensive CSP header
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "font-src 'self'; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "worker-src 'self' blob:; "
        "child-src 'self' blob:;"
    )
    response.headers['Content-Security-Policy'] = csp_policy
    
    return response

@app.route('/')
def index():
    try:
        # Check if user is logged in and user still exists in database
        if 'user_id' in session:
            user_id = session.get('user_id')
            # Verify user still exists in database
            try:
                conn = get_db_connection()
                cursor = execute_query(conn, 'SELECT user_id FROM users WHERE user_id = ?', (user_id,))
                user_exists = cursor.fetchone()
                conn.close()
                
                if user_exists:
                    # Redirect logged-in users to the app
                    return redirect(url_for('app'))
                else:
                    # User was deleted, clear session
                    session.clear()
            except Exception as db_error:
                print(f"Database error checking user: {db_error}")
                # If database check fails, clear session to be safe
                session.clear()
        
        # Show landing page for non-logged-in users
        return render_template('modern_landing.html')
    except Exception as e:
        print(f"Error in root route: {e}")
        # Clear session and show fallback
        session.clear()
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tajir POS - UAE's Smart Point of Sale System</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <h1>Tajir POS</h1>
            <p>UAE's Smart Point of Sale System</p>
            <p><a href="/home">Go to Home</a></p>
        </body>
        </html>
        """

@app.route('/landing')
def landing():
    user_plan_info = get_user_plan_info()
    return render_template('landing.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/home')
def home():
    return render_template('modern_landing.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication."""
    try:
        # If user is already logged in, redirect to app
        if 'user_id' in session:
            return redirect(url_for('app'))

        if request.method == 'POST':
            email = request.form.get('email', '').strip()
            password = request.form.get('password', '')

            if not email or not password:
                return render_template('login.html',
                                     error='Please provide both email and password',
                                     get_user_language=get_user_language,
                                     get_translated_text=get_translated_text)

            # Authenticate user
            conn = get_db_connection()
            try:
                cursor = execute_query(conn, 'SELECT user_id, email, password_hash FROM users WHERE email = %s AND is_active = TRUE', (email,))
                user = cursor.fetchone()
                conn.close()

                if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                    # Login successful
                    session['user_id'] = user['user_id']
                    session['email'] = user['email']
                    session.permanent = True

                    # Log user action
                    try:
                        log_user_action("LOGIN_SUCCESS", user['user_id'], {'email': email})
                    except:
                        pass

                    # Redirect to intended destination or app
                    next_url = session.get('next')
                    if next_url:
                        session.pop('next', None)
                        return redirect(next_url)
                    return redirect(url_for('app'))
                else:
                    # Login failed
                    try:
                        log_user_action("LOGIN_FAILED", None, {'email': email, 'reason': 'invalid_credentials'})
                    except:
                        pass

                    return render_template('login.html',
                                         error='Invalid email or password',
                                         get_user_language=get_user_language,
                                         get_translated_text=get_translated_text)
            except Exception as e:
                conn.close()
                print(f"Login error: {e}")
                return render_template('login.html',
                                     error='Login failed. Please try again.',
                                     get_user_language=get_user_language,
                                     get_translated_text=get_translated_text)

        # GET request - show login form
        user_plan_info = get_user_plan_info()
        return render_template('login.html',
                             user_plan_info=user_plan_info,
                             get_user_language=get_user_language,
                             get_translated_text=get_translated_text)

    except Exception as e:
        print(f"Login route error: {e}")
        return render_template('login.html',
                             error='An error occurred. Please try again.',
                             get_user_language=get_user_language,
                             get_translated_text=get_translated_text)

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API endpoint for login authentication."""
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Please provide both email and password'
            }), 400

        # Authenticate user
        conn = get_db_connection()
        try:
            cursor = execute_query(conn, 'SELECT user_id, email, password_hash FROM users WHERE email = %s AND is_active = TRUE', (email,))
            user = cursor.fetchone()
            conn.close()

            if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                # Login successful
                session['user_id'] = user['user_id']
                session['email'] = user['email']
                session.permanent = True

                # Log user action
                try:
                    log_user_action("LOGIN_SUCCESS", user['user_id'], {'email': email})
                except:
                    pass

                # Determine redirect URL
                next_url = session.get('next')
                if next_url:
                    session.pop('next', None)
                    redirect_url = next_url
                else:
                    redirect_url = '/app'

                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'redirect': redirect_url
                })
            else:
                # Login failed
                try:
                    log_user_action("LOGIN_FAILED", None, {'email': email, 'reason': 'invalid_credentials'})
                except:
                    pass

                return jsonify({
                    'success': False,
                    'message': 'Invalid email or password'
                }), 401
        except Exception as e:
            conn.close()
            print(f"API login error: {e}")
            return jsonify({
                'success': False,
                'message': 'Login failed. Please try again.'
            }), 500

    except Exception as e:
        print(f"API login route error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred. Please try again.'
        }), 500

@app.route('/api/shop-settings', methods=['GET', 'PUT'])
def shop_settings():
    """Get or update shop settings for the current user."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        if request.method == 'GET':
            print(f"DEBUG: shop_settings GET called for user_id: {user_id}")
            print(f"DEBUG: Request headers: {dict(request.headers)}")
            print(f"DEBUG: Session: {dict(session)}")

            if not user_id:
                print("DEBUG: No user_id in session, returning 401")
                return jsonify({'error': 'Authentication required'}), 401

            try:
                conn = get_db_connection()
                placeholder = get_placeholder()
                cursor = execute_query(conn, f'SELECT * FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
                settings = cursor.fetchone()

                # DIAGNOSTIC: Check for Unicode characters before printing
                if settings:
                    settings_dict = dict(settings)
                    print("DEBUG: Shop settings query executed successfully")
                    print(f"DEBUG: Settings keys: {list(settings_dict.keys())}")
                    # Check for problematic characters
                    unicode_found = False
                    for key, value in settings_dict.items():
                        if isinstance(value, str) and any(ord(c) > 127 for c in value):
                            print(f"DEBUG: Found Unicode in {key}: contains non-ASCII characters")
                            unicode_found = True
                            break
                    if not unicode_found:
                        print("DEBUG: No Unicode characters found in settings")
                else:
                    print("DEBUG: Shop settings query executed, result: None")

                conn.close()

                if settings:
                    print("DEBUG: Returning existing settings")
                    # Convert datetime and Decimal objects to JSON-serializable types
                    from decimal import Decimal
                    settings_dict = dict(settings)
                    for key, value in settings_dict.items():
                        if hasattr(value, 'isoformat'):  # datetime object
                            settings_dict[key] = value.isoformat()
                        elif isinstance(value, Decimal):
                            settings_dict[key] = float(value)  # Convert Decimal to float
                    return jsonify(settings_dict)
                else:
                    print("DEBUG: Returning default settings")
                    return jsonify({
                        'shop_name': 'Tajir POS',
                        'address': '',
                        'trn': '',
                        'logo_url': '',
                        'shop_mobile': '',
                        'working_hours': '',
                        'invoice_static_info': '',
                        'use_dynamic_invoice_template': False,
                        'payment_mode': 'advance',
                        'enable_trial_date': True,
                        'enable_delivery_date': True,
                        'enable_advance_payment': True,
                        'enable_customer_notes': True,
                        'enable_employee_assignment': True,
                        'default_delivery_days': 3,
                        'default_trial_days': 3,
                        'default_employee_id': None,
                        'city': '',
                        'area': '',
                        'include_vat_in_price': True,
                        'enable_loyalty_program': False,
                        'loyalty_program_name': 'Loyalty Program',
                        'loyalty_points_per_aed': 1.0,
                        'loyalty_aed_per_point': 0.01
                    })

            except Exception as db_error:
                print(f"DEBUG: Database error: {db_error}")
                import traceback
                print(f"DEBUG: Database traceback: {traceback.format_exc()}")
                return jsonify({'error': 'Database error'}), 500

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            conn = get_db_connection()
            placeholder = get_placeholder()

            # Check if settings exist
            cursor = execute_query(conn, f'SELECT setting_id FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
            existing = cursor.fetchone()

            if existing:
                # Update existing settings
                update_fields = []
                update_values = []
                for key, value in data.items():
                    if key not in ['user_id', 'setting_id', 'created_at', 'updated_at']:
                        update_fields.append(f'{key} = {placeholder}')
                        update_values.append(value)

                if update_fields:
                    update_values.append(user_id)
                    sql = f'UPDATE shop_settings SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP WHERE user_id = {placeholder}'
                    execute_update(conn, sql, update_values)
            else:
                # Insert new settings
                columns = ['user_id'] + [k for k in data.keys() if k not in ['user_id', 'setting_id', 'created_at', 'updated_at']]
                values = [user_id] + [data[k] for k in columns[1:]]
                placeholders = ', '.join([placeholder] * len(values))
                sql = f'INSERT INTO shop_settings ({", ".join(columns)}) VALUES ({placeholders})'
                execute_with_returning(conn, sql, values)

            conn.close()
            return jsonify({'success': True, 'message': 'Settings updated successfully'})

    except Exception as e:
        print(f"Shop settings error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to process shop settings'}), 500

    except Exception as e:
        print(f"Shop settings error: {e}")
        return jsonify({'error': 'Failed to load shop settings'}), 500

@app.route('/api/shop-settings/billing-config', methods=['GET'])
def get_billing_config():
    """Get billing configuration settings."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Check if shop_settings table exists
        try:
            cursor = execute_query(conn, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shop_settings'")
            table_exists = cursor.fetchone()
            if not table_exists:
                print("shop_settings table does not exist")
                conn.close()
                return jsonify({
                    'success': True,
                    'config': {
                        'include_vat_in_price': True,
                        'bill_template': 'default',
                        'default_payment_method': 'Cash'
                    }
                })
        except Exception as table_check_error:
            print(f"Error checking table existence: {table_check_error}")
            conn.close()
            return jsonify({
                'include_vat_in_price': True,
                'default_payment_method': 'Cash'
            })

        cursor = execute_query(conn, f'SELECT payment_mode, include_vat_in_price, bill_template FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
        config = cursor.fetchone()
        conn.close()

        if config:
            return jsonify({
                'success': True,
                'config': {
                    'include_vat_in_price': config['include_vat_in_price'] if config['include_vat_in_price'] is not None else True,
                    'bill_template': config['bill_template'] or 'default',
                    'default_payment_method': config['payment_mode'] or 'advance'
                }
            })
        else:
            return jsonify({
                'success': True,
                'config': {
                    'include_vat_in_price': True,
                    'bill_template': 'default',
                    'default_payment_method': 'advance'
                }
            })

    except Exception as e:
        print(f"Billing config error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load billing configuration'}), 500

@app.route('/api/shop-settings/payment-mode', methods=['GET'])
def get_payment_mode():
    """Get payment mode settings."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT payment_mode FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
        mode = cursor.fetchone()
        conn.close()

        return jsonify({
            'payment_mode': mode['payment_mode'] if mode and mode['payment_mode'] else 'advance'
        })

    except Exception as e:
        print(f"Payment mode error: {e}")
        return jsonify({'error': 'Failed to load payment mode'}), 500

@app.route('/api/shop-settings/vat-config', methods=['PUT'])
def update_vat_config():
    """Update VAT configuration settings."""
    print("DEBUG: vat-config PUT endpoint called!")
    try:
        user_id = get_current_user_id()
        print(f"DEBUG: update_vat_config called for user_id: {user_id}")

        if not user_id:
            print("DEBUG: No user_id found in session")
            return jsonify({'error': 'Authentication required'}), 401

        try:
            data = request.get_json()
            print(f"DEBUG: Received data: {data}")
        except Exception as json_error:
            print(f"DEBUG: JSON parsing error: {json_error}")
            return jsonify({'error': 'Invalid JSON data'}), 400

        include_vat_in_price = data.get('include_vat_in_price', True)
        bill_template = data.get('bill_template', 'default')

        print(f"DEBUG: include_vat_in_price: {include_vat_in_price}, bill_template: {bill_template}")

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Check if shop settings exist for this user
        cursor = execute_query(conn, f'SELECT setting_id FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
        existing_settings = cursor.fetchone()

        # DIAGNOSTIC: Check for Unicode characters before printing
        if existing_settings:
            print("DEBUG: Existing shop settings found")
            print(f"DEBUG: Settings ID: {existing_settings['setting_id']}")
        else:
            print("DEBUG: No existing shop settings found")

        if existing_settings:
            # Update existing shop settings
            result = execute_update(conn, f'''
                UPDATE shop_settings SET
                    include_vat_in_price = {placeholder},
                    bill_template = {placeholder},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = {placeholder}
            ''', (include_vat_in_price, bill_template, user_id))
            print(f"DEBUG: Update result (rows affected): {result}")
        else:
            # Insert new shop settings record
            sql = f'''
                INSERT INTO shop_settings (user_id, include_vat_in_price, bill_template, shop_name)
                VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})
            '''
            execute_with_returning(conn, sql, (user_id, include_vat_in_price, bill_template, 'My Shop'))
            print(f"DEBUG: Inserted new shop settings for user_id: {user_id}")

        # Verify the update/insert
        cursor = execute_query(conn, f'SELECT include_vat_in_price, bill_template FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
        updated_settings = cursor.fetchone()
        print("DEBUG: Updated shop settings verification completed")

        conn.close()

        return jsonify({
            'success': True,
            'message': 'VAT configuration updated successfully',
            'data': {
                'include_vat_in_price': updated_settings['include_vat_in_price'] if updated_settings else include_vat_in_price,
                'bill_template': updated_settings['bill_template'] if updated_settings else bill_template
            }
        })

    except Exception as e:
        print(f"DEBUG: VAT config update error: {e}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to update VAT configuration'}), 500

@app.route('/api/loyalty/config', methods=['GET'])
def get_loyalty_config():
    """Get loyalty program configuration for the current user."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Get loyalty config from shop_settings
        cursor = execute_query(conn, f'SELECT enable_loyalty_program, loyalty_program_name, loyalty_points_per_aed, loyalty_aed_per_point FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
        config = cursor.fetchone()
        conn.close()

        if config:
            return jsonify({
                'success': True,
                'config': {
                    'program_name': config['loyalty_program_name'] or 'Loyalty Program',
                    'is_active': bool(config['enable_loyalty_program']),
                    'points_per_aed': float(config['loyalty_points_per_aed'] or 1.0),
                    'aed_per_point': float(config['loyalty_aed_per_point'] or 0.01),
                    'min_points_redemption': 100,
                    'max_points_redemption_percent': 20,
                    'birthday_bonus_points': 50,
                    'anniversary_bonus_points': 100,
                    'referral_bonus_points': 200
                }
            })
        else:
            return jsonify({
                'success': True,
                'config': {
                    'program_name': 'Loyalty Program',
                    'is_active': False,
                    'points_per_aed': 1.0,
                    'aed_per_point': 0.01,
                    'min_points_redemption': 100,
                    'max_points_redemption_percent': 20,
                    'birthday_bonus_points': 50,
                    'anniversary_bonus_points': 100,
                    'referral_bonus_points': 200
                }
            })

    except Exception as e:
        print(f"Loyalty config error: {e}")
        return jsonify({'error': 'Failed to load loyalty configuration'}), 500

@app.route('/railway-redirect')
def railway_redirect():
    """Redirect Railway subdomain to custom domain"""
    return redirect('https://tajirtech.com', code=301)

@app.route('/setup-wizard')
def setup_wizard():
    user_plan_info = get_user_plan_info()
    return render_template('setup_wizard.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

# Serve demo videos
@app.route('/<filename>.mp4')
def serve_video(filename):
    """Serve demo video files"""
    try:
        return send_from_directory('.', f'{filename}.mp4', mimetype='video/mp4')
    except FileNotFoundError:
        abort(404)

# Serve QR code image
@app.route('/URL QR Code.png')
def serve_qr_code():
    """Serve QR code image"""
    try:
        return send_from_directory('.', 'URL QR Code.png', mimetype='image/png')
    except FileNotFoundError:
        abort(404)

@app.route('/favicon.ico')
def favicon():
    """Serve favicon."""
    return send_from_directory('static/icons', 'icon-144.png', mimetype='image/png')

@app.route('/app')
def app_page():
    """Main application page - requires authentication."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            # Store the intended destination in session for redirect after login
            session['next'] = request.url
            return redirect(url_for('login'))
        
        user_plan_info = get_user_plan_info()
        return render_template('app.html', 
                            user_plan_info=user_plan_info,
                            get_user_language=get_user_language,
                            get_translated_text=get_translated_text)
        
    except Exception as e:
        # Store the intended destination in session for redirect after login
        session['next'] = request.url
        return redirect(url_for('login'))









@app.route('/pricing')
def pricing():
    user_plan_info = get_user_plan_info()
    return render_template('pricing.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/sw.js')
def service_worker():
    response = send_from_directory('static/js', 'sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/app-template')
def app_template():
    return send_from_directory('templates', 'app.html')

@app.route('/debug')
def debug():
    return send_file('debug_css.html')



@app.route('/pwa-status')
def pwa_status():
    user_plan_info = get_user_plan_info()
    return render_template('pwa-status.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/expenses')
def expenses():
    user_plan_info = get_user_plan_info()
    return render_template('expenses.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/sw-debug')
def sw_debug():
    return send_file('sw_debug.html')

@app.route('/cache-clear-test')
def cache_clear_test():
    return send_file('cache-clear-test.html')



# Product Types API
@app.route('/api/product-types', methods=['GET'])
def get_product_types():
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT * FROM product_types WHERE user_id = {placeholder} ORDER BY type_name', (user_id,))
    types = cursor.fetchall()
    conn.close()
    return jsonify([dict(type) for type in types])

@app.route('/api/product-types', methods=['POST'])
def add_product_type():
    data = request.get_json()
    name = data.get('name', '').strip()
    description = data.get('description', '').strip() if data.get('description') else None
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Type name is required'}), 400
    
    conn = get_db_connection()
    try:
        placeholder = get_placeholder()
        sql = f'INSERT INTO product_types (user_id, type_name, description) VALUES ({placeholder}, {placeholder}, {placeholder})'
        type_id = execute_with_returning(conn, sql, (user_id, name, description))
        conn.close()
        return jsonify({'id': type_id, 'name': name, 'description': description, 'message': 'Product type added successfully'})
    except get_db_integrity_error():
        conn.close()
        return jsonify({'error': 'Product type already exists'}), 400

@app.route('/api/product-types/<int:type_id>', methods=['DELETE'])
def delete_product_type(type_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    # Check if products exist for this type
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT COUNT(*) FROM products WHERE type_id = {placeholder} AND user_id = {placeholder}', (type_id, user_id))
    result = cursor.fetchone()
    # Handle both PostgreSQL (dict) and SQLite (tuple) results
    products = result[0] if isinstance(result, tuple) else result['count']
    if products > 0:
        conn.close()
        return jsonify({'error': 'Cannot delete type with existing products'}), 400
    
    placeholder = get_placeholder()
    execute_update(conn, f'DELETE FROM product_types WHERE type_id = {placeholder} AND user_id = {placeholder}', (type_id, user_id))
    conn.close()
    return jsonify({'message': 'Product type deleted successfully'})

# Products API
@app.route('/api/products', methods=['GET'])
def get_products():
    user_id = get_current_user_id()
    search = request.args.get('search', '').strip()
    barcode = request.args.get('barcode', '').strip()
    conn = get_db_connection()
    if barcode:
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT p.*, pt.type_name 
            FROM products p 
            JOIN product_types pt ON p.type_id = pt.type_id 
            WHERE p.user_id = {placeholder} AND pt.user_id = {placeholder} AND p.is_active = TRUE AND p.barcode = {placeholder}
            ORDER BY pt.type_name, p.product_name
        ''', (user_id, user_id, barcode))
        products = cursor.fetchall()
    elif search:
        like_search = f"%{search}%"
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT p.*, pt.type_name 
            FROM products p 
            JOIN product_types pt ON p.type_id = pt.type_id 
            WHERE p.user_id = {placeholder} AND pt.user_id = {placeholder} AND p.is_active = TRUE AND (p.product_name LIKE {placeholder} OR pt.type_name LIKE {placeholder})
            ORDER BY pt.type_name, p.product_name
        ''', (user_id, user_id, like_search, like_search))
        products = cursor.fetchall()
    else:
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT p.*, pt.type_name 
            FROM products p 
            JOIN product_types pt ON p.type_id = pt.type_id 
            WHERE p.user_id = {placeholder} AND pt.user_id = {placeholder} AND p.is_active = TRUE 
            ORDER BY pt.type_name, p.product_name
        ''', (user_id, user_id))
        products = cursor.fetchall()
    conn.close()
    return jsonify([dict(product) for product in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json()
    type_id = data.get('type_id')
    name = data.get('name', '').strip()
    rate = data.get('rate')
    description = data.get('description', '').strip()
    barcode = (data.get('barcode') or '').strip()
    user_id = get_current_user_id()
    
    if not all([type_id, name, rate]):
        return jsonify({'error': 'Type, name, and rate are required'}), 400
    
    try:
        rate = float(rate)
        if rate <= 0:
            return jsonify({'error': 'Rate must be positive'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid rate value'}), 400
    
    conn = get_db_connection()
    try:
        # Verify the product type belongs to current user
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT type_id FROM product_types WHERE type_id = {placeholder} AND user_id = {placeholder}', (type_id, user_id))
        type_check = cursor.fetchone()
        if not type_check:
            conn.close()
            return jsonify({'error': 'Invalid product type'}), 400
            
        placeholder = get_placeholder()
        sql = f'''
            INSERT INTO products (user_id, type_id, product_name, rate, description, barcode) 
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        '''
        product_id = execute_with_returning(conn, sql, (user_id, type_id, name, rate, description, barcode or None))
        conn.close()
        return jsonify({'id': product_id, 'message': 'Product added successfully'})
    except get_db_integrity_error():
        conn.close()
        return jsonify({'error': 'Product already exists'}), 400

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'''
        SELECT p.*, pt.type_name 
        FROM products p 
        JOIN product_types pt ON p.type_id = pt.type_id 
        WHERE p.product_id = {placeholder} AND p.user_id = {placeholder} AND pt.user_id = {placeholder} AND p.is_active = TRUE
    ''', (product_id, user_id, user_id))
    product = cursor.fetchone()
    conn.close()
    
    if product:
        return jsonify(dict(product))
    else:
        return jsonify({'error': 'Product not found'}), 404

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.get_json()
    name = data.get('product_name', '').strip()
    rate = data.get('rate')
    type_id = data.get('type_id')
    description = data.get('description', '').strip()
    barcode = (data.get('barcode') or '').strip()
    user_id = get_current_user_id()
    
    if not all([name, rate, type_id]):
        return jsonify({'error': 'Name, rate, and type are required'}), 400
    
    try:
        rate = float(rate)
        if rate <= 0:
            return jsonify({'error': 'Rate must be positive'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid rate value'}), 400
    
    conn = get_db_connection()
    # Verify the product and type belong to current user
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT product_id FROM products WHERE product_id = {placeholder} AND user_id = {placeholder}', (product_id, user_id))
    product_check = cursor.fetchone()
    cursor = execute_query(conn, f'SELECT type_id FROM product_types WHERE type_id = {placeholder} AND user_id = {placeholder}', (type_id, user_id))
    type_check = cursor.fetchone()
    
    if not product_check:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404
    if not type_check:
        conn.close()
        return jsonify({'error': 'Invalid product type'}), 400
        
    placeholder = get_placeholder()
    execute_update(conn, f'''
        UPDATE products 
        SET product_name = {placeholder}, rate = {placeholder}, type_id = {placeholder}, description = {placeholder}, barcode = {placeholder} 
        WHERE product_id = {placeholder} AND user_id = {placeholder}
    ''', (name, rate, type_id, description, barcode or None, product_id, user_id))
    conn.close()
    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    # Use TRUE/FALSE for PostgreSQL
    is_active_value = 'FALSE'
    execute_update(conn, f'UPDATE products SET is_active = {is_active_value} WHERE product_id = {placeholder} AND user_id = {placeholder}', (product_id, user_id))
    conn.close()
    return jsonify({'message': 'Product deleted successfully'})

# Customers API
@app.route('/api/customers', methods=['GET'])
def get_customers():
    user_id = get_current_user_id()
    phone = request.args.get('phone')
    search = request.args.get('search', '').strip()
    conn = get_db_connection()
    if phone:
        # Normalize phone by removing common non-digit characters for comparison
        import re as _re
        phone_digits = _re.sub(r'\D', '', phone)
        placeholder = get_placeholder()
        cursor = execute_query(conn, f"""
            SELECT * FROM customers 
            WHERE user_id = {placeholder} AND 
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = {placeholder} AND
                  is_active = TRUE
            """,
            (user_id, phone_digits)
        )
        customers = cursor.fetchall()
    elif search:
        like_search = f"%{search}%"
        placeholder = get_placeholder()
        # Use ILIKE for case-insensitive search in PostgreSQL
        cursor = execute_query(conn, f'SELECT * FROM customers WHERE user_id = {placeholder} AND (name ILIKE {placeholder} OR phone ILIKE {placeholder} OR business_name ILIKE {placeholder}) AND is_active = TRUE ORDER BY name', (user_id, like_search, like_search, like_search))
        customers = cursor.fetchall()
    else:
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT * FROM customers WHERE user_id = {placeholder} AND is_active = TRUE ORDER BY name', (user_id,))
        customers = cursor.fetchall()
    conn.close()
    return jsonify([dict(customer) for customer in customers])

@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    trn = data.get('trn', '').strip()
    city = data.get('city', '').strip()
    area = data.get('area', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()
    customer_type = data.get('customer_type', 'Individual').strip()
    business_name = data.get('business_name', '').strip()
    business_address = data.get('business_address', '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Customer name is required'}), 400
    if not phone:
        return jsonify({'error': 'Customer mobile is required'}), 400
    # Enforce 9-10 digits for mobile
    phone_digits = re.sub(r'\D', '', phone)
    if len(phone_digits) < 9 or len(phone_digits) > 10:
        return jsonify({'error': 'Customer mobile must be 9-10 digits'}), 400
    
    # Validate customer type
    if customer_type not in ['Individual', 'Business']:
        return jsonify({'error': 'Customer type must be Individual or Business'}), 400
    
    # For Business customers, require business name
    if customer_type == 'Business' and not business_name:
        return jsonify({'error': 'Business name is required for Business customers'}), 400
    
    conn = get_db_connection()
    
    # Check for duplicate phone number (normalize stored values)
    if phone_digits:
        placeholder = get_placeholder()
        cursor = execute_query(conn,
            f"""
            SELECT name FROM customers 
            WHERE user_id = {placeholder} AND 
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = {placeholder}
            """,
            (user_id, phone_digits)
        )
        existing_customer = cursor.fetchone()
        if existing_customer:
            conn.close()
            return jsonify({'error': f'Phone number {phone} is already assigned to customer "{existing_customer["name"]}"'}), 400
    
    try:
        placeholder = get_placeholder()
        sql = f'''
            INSERT INTO customers (user_id, name, phone, trn, city, area, email, address, customer_type, business_name, business_address) 
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
            ON CONFLICT (user_id, phone) DO UPDATE SET
                name = EXCLUDED.name,
                trn = EXCLUDED.trn,
                city = EXCLUDED.city,
                area = EXCLUDED.area,
                email = EXCLUDED.email,
                address = EXCLUDED.address,
                customer_type = EXCLUDED.customer_type,
                business_name = EXCLUDED.business_name,
                business_address = EXCLUDED.business_address
            RETURNING customer_id
        '''
        customer_id = execute_with_returning(conn, sql, (user_id, name, phone_digits, trn, city, area, email, address, customer_type, business_name, business_address))
        conn.close()
        return jsonify({'id': customer_id, 'message': 'Customer added successfully'})
    except get_db_integrity_error():
        conn.close()
        return jsonify({'error': 'Customer already exists'}), 400

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT * FROM customers WHERE customer_id = {placeholder} AND user_id = {placeholder}', (customer_id, user_id))
    customer = cursor.fetchone()
    conn.close()
    
    if customer:
        return jsonify(dict(customer))
    else:
        return jsonify({'error': 'Customer not found'}), 404

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    trn = data.get('trn', '').strip()
    city = data.get('city', '').strip()
    area = data.get('area', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()
    customer_type = data.get('customer_type', 'Individual').strip()
    business_name = data.get('business_name', '').strip()
    business_address = data.get('business_address', '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Customer name is required'}), 400
    
    # Validate customer type
    if customer_type not in ['Individual', 'Business']:
        return jsonify({'error': 'Customer type must be Individual or Business'}), 400
    
    # For Business customers, require business name
    if customer_type == 'Business' and not business_name:
        return jsonify({'error': 'Business name is required for Business customers'}), 400
    
    conn = get_db_connection()
    
    # Enforce 9-10 digits for mobile
    phone_digits = re.sub(r'\D', '', phone)
    if phone and (len(phone_digits) < 9 or len(phone_digits) > 10):
        conn.close()
        return jsonify({'error': 'Customer mobile must be 9-10 digits'}), 400

    # Check for duplicate phone number (excluding current customer, normalized)
    if phone_digits:
        placeholder = get_placeholder()
        cursor = execute_query(conn,
            f"""
            SELECT name FROM customers 
            WHERE user_id = {placeholder} AND customer_id != {placeholder} AND 
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = {placeholder}
            """,
            (user_id, customer_id, phone_digits)
        )
        existing_customer = cursor.fetchone()
        if existing_customer:
            conn.close()
            return jsonify({'error': f'Phone number {phone} is already assigned to customer "{existing_customer["name"]}"'}), 400
    
    placeholder = get_placeholder()
    sql = f'''
        UPDATE customers 
        SET name = {placeholder}, phone = {placeholder}, trn = {placeholder}, city = {placeholder}, area = {placeholder}, email = {placeholder}, address = {placeholder}, 
            customer_type = {placeholder}, business_name = {placeholder}, business_address = {placeholder}
        WHERE customer_id = {placeholder} AND user_id = {placeholder}
    '''
    execute_update(conn, sql, (name, phone_digits, trn, city, area, email, address, customer_type, business_name, business_address, customer_id, user_id))
    conn.close()
    return jsonify({'message': 'Customer updated successfully'})

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    # Use TRUE/FALSE for PostgreSQL
    is_active_value = 'FALSE'
    execute_update(conn, f'UPDATE customers SET is_active = {is_active_value} WHERE customer_id = {placeholder} AND user_id = {placeholder}', (customer_id, user_id))
    conn.close()
    return jsonify({'message': 'Customer deleted successfully'})

@app.route('/api/customers/recent', methods=['GET'])
def get_recent_customers():
    """Get the last 3 customers used in bills for quick selection."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        
        # Get the last 3 unique customers from bills, ordered by most recent
        placeholder = get_placeholder()
        query = f"""
            SELECT c.customer_id, c.name, c.phone, c.city, c.area, c.trn, 
                   c.customer_type, c.business_name, c.business_address, 
                   MAX(b.bill_date) as latest_bill_date, MAX(b.bill_id) as latest_bill_id
            FROM customers c
            INNER JOIN bills b ON c.customer_id = b.customer_id
            WHERE c.user_id = {placeholder} AND b.user_id = {placeholder}
            GROUP BY c.customer_id, c.name, c.phone, c.city, c.area, c.trn, 
                     c.customer_type, c.business_name, c.business_address
            ORDER BY latest_bill_date DESC, latest_bill_id DESC
            LIMIT 3
        """
        
        cursor = execute_query(conn, query, (user_id, user_id))
        recent_customers = cursor.fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        customers_list = []
        for customer in recent_customers:
            customers_list.append({
                'customer_id': customer['customer_id'],
                'name': customer['name'],
                'phone': customer['phone'],
                'city': customer['city'],
                'area': customer['area'],
                'trn': customer['trn'],
                'customer_type': customer['customer_type'],
                'business_name': customer['business_name'],
                'business_address': customer['business_address']
            })
        
        return jsonify(customers_list)
    except Exception as e:
        print(f"Error getting recent customers: {e}")
        return jsonify({'error': str(e)}), 500

# VAT Rates API
@app.route('/api/vat-rates', methods=['GET'])
def get_vat_rates():
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT * FROM vat_rates WHERE user_id = {placeholder} AND is_active = TRUE ORDER BY effective_from DESC', (user_id,))
    rates = cursor.fetchall()
    conn.close()
    return jsonify([dict(rate) for rate in rates])

@app.route('/api/vat-rates', methods=['POST'])
def add_vat_rate():
    data = request.get_json()
    rate_percentage = data.get('rate_percentage')
    effective_from = data.get('effective_from')
    effective_to = data.get('effective_to')
    user_id = get_current_user_id()
    
    if not all([rate_percentage, effective_from, effective_to]):
        return jsonify({'error': 'Rate percentage and dates are required'}), 400
    
    try:
        rate_percentage = float(rate_percentage)
        if rate_percentage < 0:
            return jsonify({'error': 'Rate percentage must be non-negative'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid rate percentage'}), 400
    
    conn = get_db_connection()
    # Check for duplicate effective_from and effective_to
    placeholder = get_placeholder()
    cursor = execute_query(conn,
        f'SELECT 1 FROM vat_rates WHERE user_id = {placeholder} AND effective_from = {placeholder} AND effective_to = {placeholder} AND is_active = TRUE',
        (user_id, effective_from, effective_to)
    )
    exists = cursor.fetchone()
    if exists:
        conn.close()
        return jsonify({'error': 'A VAT rate with the same effective dates already exists.'}), 400
    # Update previous active row's effective_to if needed
    cursor = execute_query(conn, f'SELECT vat_id, effective_to FROM vat_rates WHERE user_id = {placeholder} AND is_active = TRUE ORDER BY effective_from DESC LIMIT 1', (user_id,))
    prev = cursor.fetchone()
    if prev and prev['effective_to'] == '2099-12-31':
        from datetime import datetime, timedelta
        prev_to = (datetime.strptime(effective_from, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')
        placeholder = get_placeholder()
        execute_update(conn, f'UPDATE vat_rates SET effective_to = {placeholder} WHERE vat_id = {placeholder} AND user_id = {placeholder}', (prev_to, prev['vat_id'], user_id))
    placeholder = get_placeholder()
    sql = f'''
        INSERT INTO vat_rates (user_id, rate_percentage, effective_from, effective_to) 
        VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})
    '''
    vat_id = execute_with_returning(conn, sql, (user_id, rate_percentage, effective_from, effective_to))
    conn.close()
    return jsonify({'id': vat_id, 'message': 'VAT rate added successfully'})

@app.route('/api/vat-rates/<int:vat_id>', methods=['DELETE'])
def delete_vat_rate(vat_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    # Use TRUE/FALSE for PostgreSQL
    is_active_value = 'FALSE'
    execute_update(conn, f'UPDATE vat_rates SET is_active = {is_active_value} WHERE vat_id = {placeholder} AND user_id = {placeholder}', (vat_id, user_id))
    conn.close()
    return jsonify({'message': 'VAT rate deleted successfully'})

# Bills API
@app.route('/api/bills', methods=['GET'])
def get_bills():
    user_id = get_current_user_id()
    bill_number = request.args.get('bill_number')
    conn = get_db_connection()
    placeholder = get_placeholder()
    if bill_number:
        cursor = execute_query(conn,
            f'SELECT * FROM bills WHERE bill_number = {placeholder} AND user_id = {placeholder}',
            (bill_number, user_id)
        )
        bills = cursor.fetchall()
    else:
        cursor = execute_query(conn, f'''
            SELECT b.*, c.name as customer_name 
            FROM bills b 
            LEFT JOIN customers c ON b.customer_id = c.customer_id AND c.user_id = b.user_id
            WHERE b.user_id = {placeholder}
            ORDER BY b.bill_date DESC, b.bill_id DESC
        ''', (user_id,))
        bills = cursor.fetchall()
    conn.close()
    return jsonify([dict(bill) for bill in bills])

@app.route('/api/bills', methods=['POST'])
def create_bill():
    print("DEBUG: create_bill endpoint called")
    user_id = get_current_user_id()
    
    # Log user action for bill creation
    try:
        log_user_action("CREATE_BILL_ATTEMPT", user_id, {
            'timestamp': datetime.now().isoformat(),
            'endpoint': '/api/bills'
        })
    except Exception as log_error:
        print(f"Failed to log user action: {log_error}")
    
    conn = None
    
    # Pre-fix sequences to prevent 500 errors
    if is_postgresql():
        try:
            temp_conn = get_db_connection()
            # Fix bills sequence
            execute_query(temp_conn, "SELECT setval(pg_get_serial_sequence('bills','bill_id'), COALESCE((SELECT MAX(bill_id) FROM bills),0)+1, false)")
            # Fix bill_items sequence
            execute_query(temp_conn, "SELECT setval(pg_get_serial_sequence('bill_items','item_id'), COALESCE((SELECT MAX(item_id) FROM bill_items),0)+1, false)")
            temp_conn.close()
            print("DEBUG: Pre-fixed sequences for bills and bill_items")
        except Exception as seq_error:
            print(f"DEBUG: Failed to pre-fix sequences: {seq_error}")
    
        # Handle both JSON and form data
        try:
            if request.is_json:
                data = request.get_json()
            else:
                data = None
        except Exception as json_err:
            print(f"DEBUG: Failed to parse JSON from request: {json_err}")
            data = None

        try:
            print(f"DEBUG: JSON data received: {data}")

            # Extract bill data from JSON
            bill_data = data.get('bill', {})
            items_data = data.get('items', [])
            notes = bill_data.get('notes', '').strip()
            
            if not items_data:
                return jsonify({'error': 'At least one item is required'}), 400
            
            # Validate required customer mobile
            customer_phone = (bill_data.get('customer_phone') or '').strip()
            if not customer_phone:
                return jsonify({'error': 'Customer mobile is required'}), 400

            # Check for master_id (Master Name) - make it optional for now
            print(f"DEBUG: master_id received: {bill_data.get('master_id')} (type: {type(bill_data.get('master_id'))})")
            master_id = bill_data.get('master_id')
            
            # If no master is selected, try to get the first available employee as default
            if not master_id:
                try:
                    conn = get_db_connection()
                    placeholder = get_placeholder()
                    cursor = execute_query(conn, f'SELECT employee_id FROM employees WHERE user_id = {placeholder} AND is_active = TRUE ORDER BY name LIMIT 1', (user_id,))
                    default_employee = cursor.fetchone()
                    conn.close()
                    
                    if default_employee:
                        master_id = default_employee['employee_id']
                        print(f"DEBUG: Using default master_id: {master_id}")
                    else:
                        print("DEBUG: No employees found, master_id will be None")
                except Exception as e:
                    print(f"DEBUG: Error getting default master: {e}")
                    master_id = None
            
            # Get shop settings to check VAT configuration
            conn = get_db_connection()
            placeholder = get_placeholder()
            cursor = execute_query(conn, f'SELECT include_vat_in_price FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
            shop_settings = cursor.fetchone()
            include_vat_in_price = bool(shop_settings['include_vat_in_price']) if shop_settings and 'include_vat_in_price' in shop_settings else True  # Default to True since user says prices include VAT
            conn.close()

            # Use totals calculated by frontend but recalculate VAT if needed
            subtotal = float(bill_data.get('subtotal', 0))
            vat_amount = float(bill_data.get('vat_amount', 0))
            total_amount = float(bill_data.get('total_amount', 0))
            advance_paid = float(bill_data.get('advance_paid', 0))
            balance_amount = float(bill_data.get('balance_amount', 0))
            vat_percent = 5.0  # Keep this for bill item calculations

            # Recalculate VAT correctly based on include_vat_in_price setting
            if include_vat_in_price:
                # If prices include VAT, the subtotal passed from frontend is actually the total including VAT
                # We need to calculate the actual subtotal (excluding VAT) and VAT amount
                total_including_vat = subtotal
                vat_rate = vat_percent / 100

                # Calculate actual subtotal (price excluding VAT)
                correct_subtotal = total_including_vat / (1 + vat_rate)
                # Calculate VAT amount
                correct_vat_amount = total_including_vat - correct_subtotal
                # Total remains the same
                correct_total_amount = total_including_vat
                correct_balance_amount = correct_total_amount - advance_paid

                # Update subtotal as well
                subtotal = round(correct_subtotal, 2)
            else:
                # If prices don't include VAT, VAT amount = subtotal * vat_rate
                vat_rate = vat_percent / 100
                correct_vat_amount = subtotal * vat_rate
                correct_total_amount = subtotal + correct_vat_amount
                correct_balance_amount = correct_total_amount - advance_paid

            # Use corrected values
            vat_amount = round(correct_vat_amount, 2)
            total_amount = round(correct_total_amount, 2)
            balance_amount = round(correct_balance_amount, 2)

            # Get or create customer
            conn = get_db_connection()
            
            # Check if customer exists
            placeholder = get_placeholder()
            cursor = execute_query(conn,
                f'SELECT customer_id FROM customers WHERE phone = {placeholder} AND user_id = {placeholder}', 
                (re.sub(r'\D', '', customer_phone), user_id)
            )
            existing_customer = cursor.fetchone()
            
            if existing_customer:
                customer_id = existing_customer['customer_id']
            else:
                # Create new customer with duplicate handling
                placeholder = get_placeholder()
                sql = f'''
                    INSERT INTO customers (user_id, name, phone, trn, city, area, customer_type, business_name, business_address) 
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    ON CONFLICT (user_id, phone) DO UPDATE SET
                        name = EXCLUDED.name,
                        trn = EXCLUDED.trn,
                        city = EXCLUDED.city,
                        area = EXCLUDED.area,
                        customer_type = EXCLUDED.customer_type,
                        business_name = EXCLUDED.business_name,
                        business_address = EXCLUDED.business_address
                    RETURNING customer_id
                '''
                customer_id = execute_with_returning(conn, sql, (
                    user_id, bill_data.get('customer_name', ''),
                    re.sub(r'\D', '', customer_phone),
                    bill_data.get('customer_trn', ''),
                    bill_data.get('customer_city', ''),
                    bill_data.get('customer_area', ''),
                    bill_data.get('customer_type', 'Individual'),
                    bill_data.get('business_name', ''),
                    bill_data.get('business_address', '')
                ))
                
                # Automatically enroll new customer in loyalty program
                try:
                    import random
                    import string
                    referral_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                    
                    placeholder = get_placeholder()
                    execute_update(conn, f'''
                        INSERT INTO customer_loyalty (
                            user_id, customer_id, tier_level, referral_code, 
                            total_points, available_points, lifetime_points, join_date, is_active
                        ) VALUES ({placeholder}, {placeholder}, 'Bronze', {placeholder}, 
                                 0, 0, 0, CURRENT_DATE, true)
                    ''', (user_id, customer_id, referral_code))
                    print(f"DEBUG: Auto-enrolled new customer {customer_id} in loyalty program")
                except Exception as enroll_error:
                    print(f"DEBUG: Failed to auto-enroll customer: {enroll_error}")
                    # Continue with bill creation even if enrollment fails
            
            # Create bill with retry logic for duplicate bill numbers
            bill_uuid = str(uuid.uuid4())
            max_retries = 3
            bill_created = False
            
            for attempt in range(max_retries):
                try:
                    # Generate a unique bill number if needed
                    bill_number = bill_data.get('bill_number', '').strip()
                    if not bill_number or attempt > 0:
                        # If no bill number provided or retrying, generate a new bill number
                        today = datetime.now().strftime('%Y%m%d')
                        import time
                        timestamp = int(time.time() * 1000) % 10000
                        bill_number = f'BILL-{today}-{timestamp:04d}'
                    
                    placeholder = get_placeholder()
                    sql = f'''
                        INSERT INTO bills (
                            user_id, bill_number, customer_id, customer_name, customer_phone, 
                            customer_city, customer_area, customer_trn, customer_type, business_name, business_address,
                            uuid, bill_date, delivery_date, payment_method, subtotal, vat_amount, total_amount, 
                            advance_paid, balance_amount, status, master_id, trial_date, notes
                        ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    '''
                    # Handle date fields with validation and defaults
                    bill_date = bill_data.get('bill_date', '').strip()
                    delivery_date = bill_data.get('delivery_date', '').strip()
                    trial_date = bill_data.get('trial_date', '').strip()
                    
                    # Set default dates if empty
                    if not bill_date:
                        bill_date = datetime.now().strftime('%Y-%m-%d')
                    if not delivery_date:
                        delivery_date = datetime.now().strftime('%Y-%m-%d')
                    if not trial_date:
                        trial_date = datetime.now().strftime('%Y-%m-%d')
                    
                    bill_id = execute_with_returning(conn, sql, (
                        user_id, bill_number, customer_id, bill_data.get('customer_name'),
                        re.sub(r'\D', '', customer_phone), bill_data.get('customer_city'),
                        bill_data.get('customer_area'), bill_data.get('customer_trn', ''),
                        bill_data.get('customer_type', 'Individual'), bill_data.get('business_name', ''),
                        bill_data.get('business_address', ''), bill_uuid, bill_date, 
                        delivery_date, bill_data.get('payment_method', 'Cash'),
                        subtotal, vat_amount, total_amount, advance_paid, balance_amount,
                        'Pending', master_id, trial_date, notes
                    ))
                    bill_created = True
                    break
                    
                except get_db_integrity_error() as e:
                    # Always rollback on integrity error to reset transaction state
                    conn.rollback()
                    
                    if "UNIQUE constraint failed: bills.user_id, bills.bill_number" in str(e):
                        if attempt == max_retries - 1:
                            # Last attempt failed
                            conn.close()
                            return jsonify({'error': 'Failed to create bill due to duplicate bill number. Please try again.'}), 500
                        # Continue to next attempt
                        continue
                    elif "bills_pkey" in str(e) or "duplicate key value violates unique constraint \"bills_pkey\"" in str(e):
                        # Sequence mismatch: auto-heal by syncing sequence to MAX(bill_id)+1 and retry
                        try:
                            # Fix sequence outside of transaction
                            execute_query(conn, "SELECT setval(pg_get_serial_sequence('bills','bill_id'), COALESCE((SELECT MAX(bill_id) FROM bills),0)+1, false)")
                            # bill_items primary key is item_id in Postgres
                            execute_query(conn, "SELECT setval(pg_get_serial_sequence('bill_items','item_id'), COALESCE((SELECT MAX(item_id) FROM bill_items),0)+1, false)")
                            print(f"DEBUG: Fixed sequence, retrying attempt {attempt + 1}")
                        except Exception as seq_err:
                            print(f"DEBUG: Failed to auto-fix sequence: {seq_err}")
                        # retry next loop attempt
                        continue
                    else:
                        # Other integrity error
                        conn.close()
                        return jsonify({'error': f'Database error: {str(e)}'})
                except Exception as e:
                    conn.rollback()
                    conn.close()
                    # Log detailed error for production debugging
                    error_msg = f'Error creating bill: {str(e)}'
                    print(f"DEBUG: {error_msg}")
                    try:
                        log_user_action("CREATE_BILL_ERROR", user_id, {
                            'error': str(e),
                            'timestamp': datetime.now().isoformat(),
                            'bill_data': str(bill_data)[:500]  # Truncate for logging
                        })
                    except Exception as log_error:
                        print(f"DEBUG: Failed to log error: {log_error}")
                    return jsonify({'error': error_msg})
            
            if not bill_created:
                conn.rollback()
                conn.close()
                return jsonify({'error': 'Failed to create bill after multiple attempts'})
            
            # print(f"DEBUG: Created bill_id: {bill_id}")
            # print(f"DEBUG: Notes saved to database: '{notes}'")
            
            # Best-effort: sync bill_items sequence before inserting items (Postgres only)
            try:
                execute_query(conn, "SELECT setval(pg_get_serial_sequence('bill_items','item_id'), COALESCE((SELECT MAX(item_id) FROM bill_items),0)+1, false)")
            except Exception:
                pass

            # Insert bill items
            for item in items_data:
                # Calculate VAT for each item
                item_rate = float(item.get('rate', 0))
                item_quantity = float(item.get('quantity', 1))
                item_discount_percent = float(item.get('discount', 0))
                item_subtotal_before_discount = item_rate * item_quantity
                item_discount_amount = item_subtotal_before_discount * (item_discount_percent / 100)
                item_subtotal = item_subtotal_before_discount - item_discount_amount

                if include_vat_in_price:
                    # If VAT is included in price, item total is just the discounted subtotal
                    item_vat_amount = 0  # VAT is already included in the rate
                    item_total_amount = item_subtotal
                else:
                    # If VAT is not included, add it on top
                    item_vat_amount = item_subtotal * (vat_percent / 100)
                    item_total_amount = item_subtotal + item_vat_amount
                
                placeholder = get_placeholder()
                sql = f'''
                INSERT INTO bill_items (
                    user_id, bill_id, product_id, product_name, notes, quantity,
                    rate, discount, vat_amount, advance_paid, total_amount
                ) SELECT {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}
                WHERE NOT EXISTS (
                    SELECT 1 FROM bill_items
                    WHERE bill_id = {placeholder} AND product_id = {placeholder} AND product_name = {placeholder} AND rate = {placeholder} AND quantity = {placeholder}
                )
            '''
                try:
                    execute_with_returning(conn, sql, (
                user_id, bill_id,
                item.get('product_id'),
                item.get('product_name'),
                item.get('notes', ''),  # Add notes field
                item.get('quantity', 1),
                item.get('rate', 0),
                item_discount_percent,  # Store discount percentage
                item_vat_amount,
                item.get('advance_paid', 0),
                item_total_amount,
                bill_id, item.get('product_id'), item.get('product_name'), item.get('rate', 0), item.get('quantity', 1)
            ))
                except get_db_integrity_error() as e:
                    # Heal bill_items sequence and retry once if PK collision
                    conn.rollback()
                    try:
                        execute_query(conn, "SELECT setval(pg_get_serial_sequence('bill_items','item_id'), COALESCE((SELECT MAX(item_id) FROM bill_items),0)+1, false)")
                    except Exception:
                        pass
                    execute_with_returning(conn, sql, (
                        user_id, bill_id,
                        item.get('product_id'),
                        item.get('product_name'),
                        item.get('quantity', 1),
                        item.get('rate', 0),
                        item_discount_percent,
                        item_vat_amount,
                        item.get('advance_paid', 0),
                        item_total_amount
                    ))
            
            # Process loyalty points if customer is enrolled
            loyalty_points_earned = 0
            if customer_id:
                try:
                    # Check if customer is enrolled in loyalty program
                    cursor = execute_query(conn, f'''
                        SELECT cl.customer_id, cl.tier_level, cl.available_points,
                               lc.points_per_aed
                        FROM customer_loyalty cl
                        LEFT JOIN loyalty_config lc ON cl.user_id = lc.user_id
                        WHERE cl.user_id = {placeholder} AND cl.customer_id = {placeholder}
                    ''', (user_id, customer_id))
                    
                    loyalty_info = cursor.fetchone()
                    
                    if loyalty_info and loyalty_info['customer_id']:
                        # Calculate points earned
                        points_per_aed = float(loyalty_info['points_per_aed'] or 1.0)
                        loyalty_points_earned = int(total_amount * points_per_aed)
                        
                        # Get tier multiplier
                        cursor = execute_query(conn, f'''
                            SELECT bonus_points_multiplier FROM loyalty_tiers 
                            WHERE user_id = {placeholder} AND tier_level = {placeholder}
                        ''', (user_id, loyalty_info['tier_level']))
                        
                        tier_info = cursor.fetchone()
                        if tier_info:
                            multiplier = float(tier_info['bonus_points_multiplier'] or 1.0)
                            loyalty_points_earned = int(loyalty_points_earned * multiplier)
                        
                        # Add points transaction
                        execute_update(conn, f'''
                            INSERT INTO loyalty_transactions (
                                user_id, customer_id, bill_id, points_earned, 
                                transaction_type, description
                            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, 'earned', {placeholder})
                        ''', (
                            user_id, 
                            customer_id, 
                            bill_id, 
                            loyalty_points_earned,
                            f'Points earned from bill #{bill_number}'
                        ))
                        
                        # Update customer loyalty profile
                        new_available_points = loyalty_info['available_points'] + loyalty_points_earned
                        execute_update(conn, f'''
                            UPDATE customer_loyalty SET 
                                available_points = {placeholder},
                                total_points = total_points + {placeholder},
                                last_purchase_date = CURRENT_DATE,
                                total_purchases = total_purchases + 1,
                                total_spent = total_spent + {placeholder}
                            WHERE customer_id = {placeholder}
                        ''', (
                            new_available_points,
                            loyalty_points_earned,
                            total_amount,
                            loyalty_info['customer_id']
                        ))
                        
                        # Check for tier upgrade
                        cursor = execute_query(conn, f'''
                            SELECT tier_level, points_threshold FROM loyalty_tiers 
                            WHERE user_id = {placeholder} AND points_threshold <= {placeholder}
                            ORDER BY points_threshold DESC LIMIT 1
                        ''', (user_id, new_available_points))
                        
                        new_tier = cursor.fetchone()
                        if new_tier and new_tier['tier_level'] != loyalty_info['tier_level']:
                            execute_update(conn, f'''
                                UPDATE customer_loyalty SET tier_level = {placeholder} 
                                WHERE customer_id = {placeholder}
                            ''', (new_tier['tier_level'], loyalty_info['customer_id']))
                            
                            # Add tier upgrade bonus
                            execute_update(conn, f'''
                                INSERT INTO loyalty_transactions (
                                    user_id, customer_id, transaction_type, 
                                    points_earned, description
                                ) VALUES ({placeholder}, {placeholder}, 'bonus', 100, {placeholder})
                            ''', (
                                user_id, 
                                customer_id,
                                f'Tier upgrade bonus to tier {new_tier["tier_id"]}'
                            ))
                            
                            # Update current points with bonus
                            execute_update(conn, f'''
                                UPDATE customer_loyalty SET 
                                    current_points = current_points + 100
                                WHERE loyalty_id = {placeholder}
                            ''', (loyalty_info['loyalty_id']))
                            
                            loyalty_points_earned += 100
                            
                except Exception as loyalty_error:
                    print(f"Loyalty processing error: {loyalty_error}")
                    # Continue with bill creation even if loyalty processing fails
            
            print(f"DEBUG: Bill creation completed successfully")
            return jsonify({
                'success': True, 
                'bill_id': bill_id,
                'bill_number': bill_number,
                'loyalty_points_earned': loyalty_points_earned
            })

            # Handle form data (legacy support)
            print(f"DEBUG: Form data received: {dict(request.form)}")

            # Extract form data
            customer_name = request.form.get('customer_name', '').strip()
            customer_phone = request.form.get('customer_phone', '').strip()
            customer_city = request.form.get('customer_city', '').strip()
            customer_area = request.form.get('customer_area', '').strip()
            bill_date = request.form.get('bill_date', '')
            delivery_date = request.form.get('delivery_date', '')
            trial_date = request.form.get('trial_date', '')
            payment_method = request.form.get('payment_method', 'Cash')
            master_id = request.form.get('master_id', '')
            notes = request.form.get('notes', '').strip()
            
            print(f"DEBUG: Extracted notes: '{notes}'")
            print(f"DEBUG: Notes type: {type(notes)}")
            print(f"DEBUG: Notes length: {len(notes) if notes else 0}")
            
            # Get items from request
            items_data = request.form.get('items', '[]')
            items = json.loads(items_data) if items_data else []
            
            print(f"DEBUG: Items count: {len(items)}")
            
            if not items:
                return jsonify({'error': 'At least one item is required'}), 400

            # Validate required customer mobile for form submission
            if not customer_phone:
                return jsonify({'error': 'Customer mobile is required'}), 400
            
            # Calculate totals with discount
            subtotal_before_discount = sum(float(item.get('rate', 0)) * float(item.get('quantity', 1)) for item in items)
            total_discount_amount = 0
            for item in items:
                item_rate = float(item.get('rate', 0))
                item_quantity = float(item.get('quantity', 1))
                item_discount_percent = float(item.get('discount', 0))
                item_discount_amount = (item_rate * item_quantity) * (item_discount_percent / 100)
                total_discount_amount += item_discount_amount
            
            subtotal = subtotal_before_discount - total_discount_amount
            vat_percent = 5.0
            vat_amount = subtotal * (vat_percent / 100)
            total_amount = subtotal + vat_amount
            advance_paid = float(request.form.get('advance_paid', 0))
            balance_amount = total_amount - advance_paid
            
            print(f"DEBUG: Calculated totals - subtotal: {subtotal}, total: {total_amount}, balance: {balance_amount}")
            
            # Get or create customer
            conn = get_db_connection()
            
            # Check if customer exists
            placeholder = get_placeholder()
            cursor = execute_query(conn,
                f"""
                SELECT customer_id FROM customers 
                WHERE user_id = {placeholder} AND 
                      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = {placeholder}
                """,
                (user_id, re.sub(r'\D', '', customer_phone))
            )
            existing_customer = cursor.fetchone()
            
            if existing_customer:
                customer_id = existing_customer['customer_id']
                print(f"DEBUG: Using existing customer_id: {customer_id}")
            else:
                # Create new customer with duplicate handling
                placeholder = get_placeholder()
                sql = f'''
                    INSERT INTO customers (user_id, name, phone, city, area) 
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    ON CONFLICT (user_id, phone) DO UPDATE SET
                        name = EXCLUDED.name,
                        city = EXCLUDED.city,
                        area = EXCLUDED.area
                    RETURNING customer_id
                '''
                customer_id = execute_with_returning(conn, sql, (user_id, customer_name, customer_phone, customer_city, customer_area))
                print(f"DEBUG: Created new customer_id: {customer_id}")
            
            # Create bill with retry logic for duplicate bill numbers
            bill_uuid = str(uuid.uuid4())
            max_retries = 3
            bill_created = False
            
            for attempt in range(max_retries):
                try:
                    # Generate a unique bill number if needed
                    bill_number = request.form.get('bill_number', '').strip()
                    if not bill_number or attempt > 0:
                        # If no bill number provided or retrying, generate a new bill number
                        today = datetime.now().strftime('%Y%m%d')
                        import time
                        timestamp = int(time.time() * 1000) % 10000
                        bill_number = f'BILL-{today}-{timestamp:04d}'
                    
                    placeholder = get_placeholder()

                    # Ensure a unique index exists so ON CONFLICT works
                    if is_postgresql():
                        try:
                            execute_update(conn, "CREATE UNIQUE INDEX IF NOT EXISTS uniq_bills_user_billno ON bills(user_id, bill_number)")
                        except Exception:
                            pass

                    # Idempotent insert: one of concurrent requests will insert, others fetch existing
                    if is_postgresql():
                        sql = f'''
                            INSERT INTO bills (
                                user_id, bill_number, customer_id, customer_name, customer_phone, 
                                customer_city, customer_area, uuid, bill_date, delivery_date, 
                                payment_method, subtotal, vat_amount, total_amount, 
                                advance_paid, balance_amount, status, master_id, trial_date, notes
                            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                            ON CONFLICT (user_id, bill_number) DO NOTHING
                            RETURNING bill_id
                        '''
                        cur = execute_query(conn, sql, (
                            user_id, bill_number, customer_id, customer_name, customer_phone,
                            customer_city, customer_area, bill_uuid, bill_date, delivery_date,
                            payment_method, subtotal, vat_amount, total_amount,
                            advance_paid, balance_amount, 'Pending', master_id, trial_date, notes
                        ))
                        row = cur.fetchone()
                        if row:
                            bill_id = row['bill_id'] if isinstance(row, dict) else row[0]
                            bill_created = True
                        else:
                            # Someone else inserted; fetch existing
                            cur = execute_query(conn, f"SELECT bill_id FROM bills WHERE user_id = {placeholder} AND bill_number = {placeholder}", (user_id, bill_number))
                            exist = cur.fetchone()
                            bill_id = exist['bill_id'] if isinstance(exist, dict) else exist[0]
                            bill_created = False
                    else:
                        # SQLite fallback
                        sql = f'''
                            INSERT OR IGNORE INTO bills (
                                user_id, bill_number, customer_id, customer_name, customer_phone, 
                                customer_city, customer_area, uuid, bill_date, delivery_date, 
                                payment_method, subtotal, vat_amount, total_amount, 
                                advance_paid, balance_amount, status, master_id, trial_date, notes
                            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                        '''
                        execute_update(conn, sql, (
                            user_id, bill_number, customer_id, customer_name, customer_phone,
                            customer_city, customer_area, bill_uuid, bill_date, delivery_date,
                            payment_method, subtotal, vat_amount, total_amount,
                            advance_paid, balance_amount, 'Pending', master_id, trial_date, notes
                        ))
                        cur = execute_query(conn, f"SELECT bill_id FROM bills WHERE user_id = {placeholder} AND bill_number = {placeholder}", (user_id, bill_number))
                        exist = cur.fetchone()
                        bill_id = exist['bill_id'] if isinstance(exist, dict) else exist[0]
                        bill_created = True
                    bill_created = True
                    break
                    
                except get_db_integrity_error() as e:
                    # Always rollback on integrity error to reset transaction state
                    conn.rollback()
                    
                    if "UNIQUE constraint failed: bills.user_id, bills.bill_number" in str(e):
                        if attempt == max_retries - 1:
                            # Last attempt failed
                            conn.close()
                            return jsonify({'error': 'Failed to create bill due to duplicate bill number. Please try again.'}), 500
                        # Continue to next attempt
                        continue
                    elif "bills_pkey" in str(e) or "duplicate key value violates unique constraint \"bills_pkey\"" in str(e):
                        # Sequence mismatch: auto-heal by syncing sequence to MAX(bill_id)+1 and retry
                        try:
                            # Fix sequence outside of transaction
                            execute_query(conn, "SELECT setval(pg_get_serial_sequence('bills','bill_id'), COALESCE((SELECT MAX(bill_id) FROM bills),0)+1, false)")
                            execute_query(conn, "SELECT setval(pg_get_serial_sequence('bill_items','id'), COALESCE((SELECT MAX(id) FROM bill_items),0)+1, false)")
                            print(f"DEBUG: Fixed sequence, retrying attempt {attempt + 1}")
                        except Exception as seq_err:
                            print(f"DEBUG: Failed to auto-fix sequence: {seq_err}")
                        # retry next loop attempt
                        continue
                    else:
                        # Other integrity error
                        conn.close()
                        return jsonify({'error': f'Database error: {str(e)}'})
                except Exception as e:
                    conn.rollback()
                    conn.close()
                    return jsonify({'error': f'Error creating bill: {str(e)}'})
            else:
                if not bill_created:
                    conn.rollback()
                    conn.close()
                    return jsonify({'error': 'Failed to create bill after multiple attempts'})
            
            print(f"DEBUG: Created bill_id: {bill_id}")
            print(f"DEBUG: Notes saved to database: '{notes}'")
            
            # Insert bill items
            for item in items:
                # Calculate discount amount from percentage
                item_rate = float(item.get('rate', 0))
                item_quantity = float(item.get('quantity', 1))
                item_discount_percent = float(item.get('discount', 0))
                item_subtotal_before_discount = item_rate * item_quantity
                item_discount_amount = item_subtotal_before_discount * (item_discount_percent / 100)
                item_subtotal = item_subtotal_before_discount - item_discount_amount
                item_vat_amount = item_subtotal * (vat_percent / 100)
                item_total_amount = item_subtotal + item_vat_amount
                
                placeholder = get_placeholder()
                sql = f'''
                    INSERT INTO bill_items (bill_id, product_name, quantity, rate, discount, vat_amount, advance_paid, total_amount)
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                '''
                execute_with_returning(conn, sql, (
                    bill_id, item.get('product_name', ''),
                    item.get('quantity', 1), item.get('rate', 0),
                    item_discount_percent, item_vat_amount, item.get('advance_paid', 0), item_total_amount
                ))
            

            
            print(f"DEBUG: Bill creation completed successfully")
            return jsonify({
                'success': True, 
                'bill_id': bill_id,
                'bill_number': bill_number,
                'loyalty_points_earned': loyalty_points_earned
            })

        except Exception as e:
            print(f"DEBUG: Error in create_bill: {e}")
            import traceback
            traceback.print_exc()

            # Log DML error
            log_dml_error("CREATE", "bills", e, user_id, {
                'customer_name': customer_name if 'customer_name' in locals() else None,
                'total_amount': total_amount if 'total_amount' in locals() else None,
                'item_count': len(items) if 'items' in locals() else 0
            })

            # Rollback transaction if connection exists
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            return jsonify({'error': str(e)})
        finally:
            # Always close the connection
            if conn:
                try:
                    conn.close()
                except:
                    pass

@app.route('/api/bills/<int:bill_id>', methods=['GET'])
def get_bill(bill_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    
    # Get bill details
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'''
        SELECT b.*, c.name as customer_name, e.name as master_name
        FROM bills b 
        LEFT JOIN customers c ON b.customer_id = c.customer_id AND c.user_id = b.user_id
        LEFT JOIN employees e ON b.master_id = e.employee_id AND e.user_id = b.user_id
        WHERE b.bill_id = {placeholder} AND b.user_id = {placeholder}
    ''', (bill_id, user_id))
    bill = cursor.fetchone()
    
    if not bill:
        conn.close()
        return jsonify({'error': 'Bill not found'}), 404
    
    bill = dict(bill)
    
    # Get bill items
    cursor = execute_query(conn, f'''
        SELECT * FROM bill_items WHERE bill_id = {placeholder} AND user_id = {placeholder}
    ''', (bill_id, user_id))
    items = cursor.fetchall()
    
    conn.close()
    
    return jsonify({
        'bill': bill,
        'items': [dict(item) for item in items]
    })

@app.route('/api/bills/<int:bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    execute_update(conn, f'DELETE FROM bill_items WHERE bill_id = {placeholder} AND user_id = {placeholder}', (bill_id, user_id))
    execute_update(conn, f'DELETE FROM bills WHERE bill_id = {placeholder} AND user_id = {placeholder}', (bill_id, user_id))
    conn.close()
    return jsonify({'message': 'Bill deleted successfully'})

@app.route('/api/bills/<int:bill_id>/payment', methods=['PUT'])
def update_bill_payment(bill_id):
    user_id = get_current_user_id()
    data = request.get_json()
    amount_paid = data.get('amount_paid')
    if amount_paid is None:
        return jsonify({'error': 'Amount paid is required.'}), 400
    try:
        amount_paid = float(amount_paid)
        if amount_paid <= 0:
            return jsonify({'error': 'Amount must be positive.'}), 400
    except Exception:
        return jsonify({'error': 'Invalid amount.'}), 400
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT advance_paid, balance_amount, total_amount FROM bills WHERE bill_id = {placeholder} AND user_id = {placeholder}', (bill_id, user_id))
    bill = cursor.fetchone()
    if not bill:
        conn.close()
        return jsonify({'error': 'Bill not found.'}), 404
    new_advance = float(bill['advance_paid']) + amount_paid
    new_balance = float(bill['total_amount']) - new_advance
    new_status = 'Paid' if abs(new_balance) < 0.01 else 'Partial'
    if new_balance < 0:
        conn.close()
        return jsonify({'error': 'Payment exceeds total amount.'}), 400
    placeholder = get_placeholder()
    sql = f'UPDATE bills SET advance_paid = {placeholder}, balance_amount = {placeholder}, status = {placeholder} WHERE bill_id = {placeholder} AND user_id = {placeholder}'
    execute_update(conn, sql, (new_advance, new_balance, new_status, bill_id, user_id))
    cursor = execute_query(conn, f'SELECT * FROM bills WHERE bill_id = {placeholder} AND user_id = {placeholder}', (bill_id, user_id))
    updated = cursor.fetchone()
    conn.close()
    return jsonify({'bill': dict(updated)})

# Dashboard API
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    user_id = get_current_user_id()
    conn = get_db_connection()
    
    # Get total revenue
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'''
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM bills 
        WHERE DATE(bill_date) = DATE('now') AND user_id = {placeholder}
    ''', (user_id,))
    result = cursor.fetchone()
    total_revenue = result[0] if isinstance(result, tuple) else result['total']
    
    # Get total bills today
    cursor = execute_query(conn, f'''
        SELECT COUNT(*) as count 
        FROM bills 
        WHERE DATE(bill_date) = DATE('now') AND user_id = {placeholder}
    ''', (user_id,))
    result = cursor.fetchone()
    total_bills_today = result[0] if isinstance(result, tuple) else result['count']
    
    # Get pending bills
    cursor = execute_query(conn, f'''
        SELECT COUNT(*) as count 
        FROM bills 
        WHERE status = 'Pending' AND user_id = {placeholder}
    ''', (user_id,))
    result = cursor.fetchone()
    pending_bills = result[0] if isinstance(result, tuple) else result['count']
    
    # Get total customers
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT COUNT(*) as count FROM customers WHERE user_id = {placeholder}', (user_id,))
    result = cursor.fetchone()
    total_customers = result[0] if isinstance(result, tuple) else result['count']
    
    # Get total expenses today
    cursor = execute_query(conn, f'''
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE DATE(expense_date) = DATE('now') AND user_id = {placeholder}
    ''', (user_id,))
    result = cursor.fetchone()
    total_expenses_today = result[0] if isinstance(result, tuple) else result['total']
    
    # Get total expenses this month
    if is_postgresql():
        cursor = execute_query(conn, f'''
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
            WHERE TO_CHAR(expense_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') AND user_id = {placeholder}
        ''', (user_id,))
    else:
        cursor = execute_query(conn, f'''
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now') AND user_id = {placeholder}
        ''', (user_id,))
    result = cursor.fetchone()
    total_expenses_month = result[0] if isinstance(result, tuple) else result['total']
    
    # Get monthly revenue data
    if is_postgresql():
        cursor = execute_query(conn, f'''
            SELECT TO_CHAR(bill_date, 'YYYY-MM') as month, 
                   SUM(total_amount) as revenue
            FROM bills 
            WHERE bill_date >= CURRENT_DATE - INTERVAL '6 months' AND user_id = {placeholder}
            GROUP BY TO_CHAR(bill_date, 'YYYY-MM')
            ORDER BY month
        ''', (user_id,))
    else:
        cursor = execute_query(conn, f'''
        SELECT strftime('%Y-%m', bill_date) as month, 
               SUM(total_amount) as revenue
        FROM bills 
            WHERE bill_date >= date('now', '-6 months') AND user_id = {placeholder}
        GROUP BY strftime('%Y-%m', bill_date)
        ORDER BY month
        ''', (user_id,))
    monthly_revenue = cursor.fetchall()
    
    # Get monthly expenses data
    if is_postgresql():
        cursor = execute_query(conn, f'''
            SELECT TO_CHAR(expense_date, 'YYYY-MM') as month, 
                   SUM(amount) as expenses
            FROM expenses 
            WHERE expense_date >= CURRENT_DATE - INTERVAL '6 months' AND user_id = {placeholder}
            GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
            ORDER BY month
        ''', (user_id,))
    else:
        cursor = execute_query(conn, f'''
        SELECT strftime('%Y-%m', expense_date) as month, 
               SUM(amount) as expenses
        FROM expenses 
            WHERE expense_date >= date('now', '-6 months') AND user_id = {placeholder}
        GROUP BY strftime('%Y-%m', expense_date)
        ORDER BY month
        ''', (user_id,))
    monthly_expenses = cursor.fetchall()

    # Top 10 regions by sales (for pie chart)
    cursor = execute_query(conn, f'''
        SELECT COALESCE(customer_area, 'Unknown') as area, SUM(total_amount) as sales
        FROM bills
        WHERE customer_area IS NOT NULL AND customer_area != '' AND user_id = {placeholder}
        GROUP BY customer_area
        ORDER BY sales DESC
        LIMIT 10
    ''', (user_id,))
    top_regions = cursor.fetchall()

    # Top 10 trending products (by quantity sold)
    cursor = execute_query(conn, f'''
        SELECT COALESCE(product_name, 'Unknown') as product_name, 
               SUM(quantity) as qty_sold,
               SUM(total_amount) as total_revenue
        FROM bill_items
        WHERE product_name IS NOT NULL AND product_name != '' AND user_id = {placeholder}
        GROUP BY product_name
        ORDER BY qty_sold DESC
        LIMIT 10
    ''', (user_id,))
    trending_products = cursor.fetchall()

    # Top 10 most repeated customers (by invoice count)
    cursor = execute_query(conn, f'''
        SELECT COALESCE(customer_name, 'Unknown') as customer_name, 
               COALESCE(customer_phone, '') as customer_phone, 
               COUNT(*) as invoice_count,
               SUM(total_amount) as total_revenue
        FROM bills
        WHERE customer_name IS NOT NULL AND customer_name != '' AND user_id = {placeholder}
        GROUP BY customer_name, customer_phone
        ORDER BY invoice_count DESC
        LIMIT 10
    ''', (user_id,))
    repeated_customers = cursor.fetchall()

    conn.close()
    
    return jsonify({
        'total_revenue': float(total_revenue),
        'total_bills_today': total_bills_today,
        'pending_bills': pending_bills,
        'total_customers': total_customers,
        'total_expenses_today': float(total_expenses_today),
        'total_expenses_month': float(total_expenses_month),
        'monthly_revenue': [dict(item) for item in monthly_revenue],
        'monthly_expenses': [dict(item) for item in monthly_expenses],
        'top_regions': [dict(item) for item in top_regions],
        'trending_products': [dict(item) for item in trending_products],
        'repeated_customers': [dict(item) for item in repeated_customers]
    })

# Print bill
@app.route('/api/bills/<int:bill_id>/print', methods=['GET'])
def print_bill(bill_id):
    user_id = get_current_user_id()
    logger.info(f"DEBUG: print_bill called for bill_id: {bill_id}")
    
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'''
        SELECT b.*, c.name as customer_name, c.phone as customer_phone, 
               c.city as customer_city, c.area as customer_area,
               c.customer_type, c.business_name, c.business_address,
               e.name as master_name
        FROM bills b
        LEFT JOIN customers c ON b.customer_id = c.customer_id AND c.user_id = b.user_id
        LEFT JOIN employees e ON b.master_id = e.employee_id AND e.user_id = b.user_id
        WHERE b.bill_id = {placeholder} AND b.user_id = {placeholder}
    ''', (bill_id, user_id))
    bill = cursor.fetchone()
    
    if not bill:
        conn.close()
        return jsonify({'error': 'Bill not found'}), 404
    
    # Get shop settings first
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT * FROM shop_settings WHERE user_id = {placeholder}', (user_id,))
    shop_settings = cursor.fetchone()

    # Check if VAT should be recalculated for display
    include_vat_in_price = shop_settings.get('include_vat_in_price', True) if shop_settings else True  # Default to True since user says prices include VAT

    # Get bill items
    cursor = execute_query(conn, f'''
        SELECT * FROM bill_items WHERE bill_id = {placeholder} AND user_id = {placeholder}
    ''', (bill_id, user_id))
    items = cursor.fetchall()
    conn.close()

    # Calculate discount amount for each item and recalculate totals if needed
    items_with_discount = []
    for item in items:
        item_dict = dict(item)
        # Calculate discount amount: (rate * quantity * discount_percentage) / 100
        discount_amount = (float(item_dict['rate']) * float(item_dict['quantity']) * float(item_dict['discount'])) / 100
        item_dict['discount_amount'] = round(discount_amount, 2)

        # Recalculate item total based on include_vat_in_price setting
        if include_vat_in_price:
            # If VAT is included in price, item total is just discounted amount
            item_total = (float(item_dict['rate']) * float(item_dict['quantity'])) - discount_amount
            item_dict['total_amount'] = round(item_total, 2)
            item_dict['vat_amount'] = 0  # VAT already included

        items_with_discount.append(item_dict)
    
    bill = dict(bill)
    shop_settings = dict(shop_settings) if shop_settings else {}

    # Check if VAT should be recalculated for display
    if include_vat_in_price:
        # If prices include VAT, the stored subtotal is actually the total including VAT
        # We need to calculate the actual subtotal (excluding VAT) and VAT amount
        total_including_vat = float(bill.get('subtotal', 0))  # This is actually the total
        vat_rate = 0.05  # 5%

        # Calculate actual subtotal (price excluding VAT)
        actual_subtotal = total_including_vat / (1 + vat_rate)
        # Calculate VAT amount
        correct_vat_amount = total_including_vat - actual_subtotal

        # Update bill data for display
        bill['subtotal'] = round(actual_subtotal, 2)
        bill['vat_amount'] = round(correct_vat_amount, 2)
        bill['total_amount'] = round(total_including_vat, 2)  # This should remain the same

    logger.info(f"DEBUG: Retrieved bill data: {bill}")
    logger.info(f"DEBUG: Bill notes from database: '{bill.get('notes')}'")
    logger.info(f"DEBUG: Notes type: {type(bill.get('notes'))}")
    logger.info(f"DEBUG: include_vat_in_price: {include_vat_in_price}")
    
    # Generate amount_in_words for the balance_amount
    try:
        amount = float(bill.get('balance_amount', 0))
        dirhams = int(amount)
        fils = int(round((amount - dirhams) * 100))
        if fils > 0:
            amount_in_words = f"{num2words(dirhams, lang='en').capitalize()} Dirhams and {num2words(fils, lang='en')} Fils Only"
        else:
            amount_in_words = f"{num2words(dirhams, lang='en').capitalize()} Dirhams Only"
        
        # Generate Arabic amount in words
        arabic_amount_in_words = number_to_arabic_words(amount)
    except Exception as e:
        logger.info(f"DEBUG: Error calculating amount in words: {e}")
        amount_in_words = ''
        arabic_amount_in_words = ''

    logger.info(f"DEBUG: Final amount_in_words: {amount_in_words}")
    logger.info(f"DEBUG: Final arabic_amount_in_words: {arabic_amount_in_words}")
    logger.info(f"DEBUG: Template variables - bill.notes: '{bill.get('notes')}', amount_in_words: '{amount_in_words}'")
    
    # Generate QR code for FTA compliance
    try:
        seller_name = shop_settings.get('shop_name', 'Tajir')
        seller_trn = shop_settings.get('trn', 'N/A')
        invoice_number = bill.get('bill_number', 'N/A')
        timestamp = bill.get('bill_date', datetime.now().strftime('%Y-%m-%d'))
        total_with_vat = float(bill.get('total_amount', 0))
        vat_amount = float(bill.get('vat_amount', 0))
        
        qr_code_base64 = generate_zatca_qr_code(
            seller_name, seller_trn, invoice_number, timestamp, 
            total_with_vat, vat_amount
        )
    except Exception as e:
        logger.info(f"DEBUG: Error generating QR code: {e}")
        qr_code_base64 = None
    
    # Get summary data
    bill_date = bill.get('bill_date', datetime.now().date())
    if isinstance(bill_date, str):
        bill_date = datetime.strptime(bill_date, '%Y-%m-%d').date()
    summary_data = get_invoice_summary_data(user_id, bill_date)
    
    # Check if VAT should be displayed based on VAT amount
    # If VAT amount is 0, don't show VAT sections
    should_show_vat = bill.get('should_show_vat', bill.get('vat_amount', 0) > 0)
    
    # Get VAT include setting from shop settings
    include_vat_in_price = shop_settings.get('include_vat_in_price', False)
    
    # Get bill template setting from shop settings
    bill_template = shop_settings.get('bill_template', 'default')
    
    # Get currency information from shop settings
    currency_code = shop_settings.get('currency_code', 'AED')
    currency_symbol = shop_settings.get('currency_symbol', 'د.إ')
    
    # Choose template based on setting
    if bill_template == 'receipt':
        # For receipt template, redirect to the receipt route
        return redirect(f'/bills/{bill_id}/receipt')
    else:
        # Use default template
        return render_template('print_bill.html', 
                             bill=bill, 
                             items=items_with_discount,
                             amount_in_words=amount_in_words,
                             arabic_amount_in_words=arabic_amount_in_words,
                             qr_code_base64=qr_code_base64,
                             shop_settings=shop_settings,
                             summary_data=summary_data,
                             should_show_vat=should_show_vat,
                             include_vat_in_price=include_vat_in_price,
                             currency_code=currency_code,
                             currency_symbol=currency_symbol,
                             get_user_language=get_user_language,
                             get_translated_text=get_translated_text)

@app.route('/api/customer-invoice-heatmap', methods=['GET'])
def customer_invoice_heatmap():
    user_id = get_current_user_id()
    conn = get_db_connection()
    # Get last 6 months (including current)
    placeholder = get_placeholder()
    months = [row['month'] for row in execute_update(conn, f"""
        SELECT DISTINCT strftime('%Y-%m', bill_date) as month
        FROM bills
        WHERE bill_date >= date('now', '-5 months', 'start of month') AND user_id = {placeholder}
        ORDER BY month ASC
    """, (user_id,)).fetchall()]

    # Get customers with at least one invoice in the last 6 months
    customers = execute_update(conn, f"""
        SELECT c.customer_id, c.name, COUNT(b.bill_id) as total_invoices
        FROM customers c
        JOIN bills b ON c.customer_id = b.customer_id AND c.user_id = b.user_id
        WHERE b.bill_date >= date('now', '-5 months', 'start of month') AND b.user_id = {placeholder}
        GROUP BY c.customer_id, c.name
        ORDER BY total_invoices DESC
    """, (user_id,)).fetchall()
    customer_ids = [row['customer_id'] for row in customers]
    customer_names = [row['name'] for row in customers]

    # Build matrix: rows=customers, cols=months
    matrix = []
    for cid in customer_ids:
        row = []
        for m in months:
            cursor = execute_query(conn, f"""
                SELECT COUNT(*) FROM bills
                WHERE customer_id = {placeholder} AND to_char(bill_date, 'YYYY-MM') = {placeholder} AND user_id = {placeholder}
            """, (cid, m, user_id))
            result = cursor.fetchone()
            # Handle PostgreSQL (dict) results
            count = result['count']
            row.append(count)
        matrix.append(row)
    conn.close()
    return jsonify({
        'customers': customer_names,
        'months': months,
        'matrix': matrix
    })

@app.route('/api/areas', methods=['GET'])
def get_areas():
    city = request.args.get('city', '').strip()
    conn = get_db_connection()
    
    if city:
        # Get areas for specific city
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT ca.area_name 
            FROM city_area ca 
            JOIN cities c ON ca.city_id = c.city_id 
            WHERE c.city_name = {placeholder} 
            ORDER BY ca.area_name
        ''', (city,))
        areas = cursor.fetchall()
    else:
        # Get all areas
        cursor = execute_query(conn, 'SELECT area_name FROM city_area ORDER BY area_name')
        areas = cursor.fetchall()
    
    conn.close()
    return jsonify([row['area_name'] for row in areas])

@app.route('/api/cities', methods=['GET'])
def get_cities():
    area = request.args.get('area', '').strip()
    conn = get_db_connection()
    
    if area:
        # Get cities for specific area
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT DISTINCT c.city_name 
            FROM cities c 
            JOIN city_area ca ON c.city_id = ca.city_id 
            WHERE ca.area_name = {placeholder} 
            ORDER BY c.city_name
        ''', (area,))
        cities = cursor.fetchall()
    else:
        # Get all cities
        cursor = execute_query(conn, 'SELECT city_name FROM cities ORDER BY city_name')
        cities = cursor.fetchall()
    
    conn.close()
    return jsonify([row['city_name'] for row in cities])

# Employees API
@app.route('/api/employees', methods=['GET'])
def get_employees():
    user_id = get_current_user_id()
    search = request.args.get('search', '').strip()
    conn = get_db_connection()
    
    placeholder = get_placeholder()
    if search:
        like_search = f"%{search}%"
        cursor = execute_query(conn, f'SELECT * FROM employees WHERE user_id = {placeholder} AND (name LIKE {placeholder} OR phone LIKE {placeholder} OR address LIKE {placeholder}) AND is_active = TRUE ORDER BY name', (user_id, like_search, like_search, like_search))
        employees = cursor.fetchall()
    else:
        cursor = execute_query(conn, f'SELECT * FROM employees WHERE user_id = {placeholder} AND is_active = TRUE ORDER BY name', (user_id,))
        employees = cursor.fetchall()
    
    conn.close()
    return jsonify([dict(emp) for emp in employees])

@app.route('/api/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'SELECT * FROM employees WHERE employee_id = {placeholder} AND user_id = {placeholder} AND is_active = TRUE', (employee_id, user_id))
    employee = cursor.fetchone()
    conn.close()
    
    if employee:
        return jsonify(dict(employee))
    else:
        return jsonify({'error': 'Employee not found'}), 404

@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.get_json()
    name = data.get('name', '').strip()
    mobile = data.get('mobile', '').strip()
    address = data.get('address', '').strip()
    # Accept optional role/position
    position = (data.get('position') or data.get('role') or '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Employee name is required'}), 400
    
    conn = get_db_connection()
    
    # Check for duplicate mobile number
    if mobile:
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT name FROM employees WHERE phone = {placeholder} AND user_id = {placeholder} AND is_active = TRUE', (mobile, user_id))
        existing_employee = cursor.fetchone()
        if existing_employee:
            conn.close()
            return jsonify({'error': f'Mobile number {mobile} is already assigned to employee "{existing_employee["name"]}"'}), 400
    
    # Insert with optional position; fallback if legacy DB lacks column
    placeholder = get_placeholder()
    try:
        sql = f'INSERT INTO employees (user_id, name, phone, address, position) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})'
        emp_id = execute_with_returning(conn, sql, (user_id, name, mobile, address, position))
    except Exception as e:
        if 'no such column' in str(e).lower() and 'position' in str(e).lower():
            # Legacy DB without position column
            sql = f'INSERT INTO employees (user_id, name, phone, address) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})'
            emp_id = execute_with_returning(conn, sql, (user_id, name, mobile, address))
        else:
            log_dml_error('INSERT', 'employees', e, user_id=user_id, data=data)
            conn.close()
            return jsonify({'error': 'Failed to add employee'})
    conn.close()
    return jsonify({'id': emp_id, 'message': 'Employee added successfully'})

@app.route('/api/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    data = request.get_json()
    name = data.get('name', '').strip()
    mobile = data.get('mobile', '').strip()
    address = data.get('address', '').strip()
    # Accept optional role/position
    position = (data.get('position') or data.get('role') or '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Employee name is required'}), 400
    
    conn = get_db_connection()
    
    # Check for duplicate mobile number (excluding current employee)
    if mobile:
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT name FROM employees WHERE phone = {placeholder} AND user_id = {placeholder} AND employee_id != {placeholder} AND is_active = TRUE', (mobile, user_id, employee_id))
        existing_employee = cursor.fetchone()
        if existing_employee:
            conn.close()
            return jsonify({'error': f'Mobile number {mobile} is already assigned to employee "{existing_employee["name"]}"'}), 400
    
    try:
        placeholder = get_placeholder()
        sql = f'UPDATE employees SET name = {placeholder}, phone = {placeholder}, address = {placeholder}, position = {placeholder} WHERE employee_id = {placeholder} AND user_id = {placeholder}'
        execute_update(conn, sql, (name, mobile, address, position, employee_id, user_id))
    except Exception as e:
        if 'no such column' in str(e).lower() and 'position' in str(e).lower():
            # Legacy DB without position column
            conn.rollback()
            placeholder = get_placeholder()
            sql = f'UPDATE employees SET name = {placeholder}, phone = {placeholder}, address = {placeholder} WHERE employee_id = {placeholder} AND user_id = {placeholder}'
            execute_update(conn, sql, (name, mobile, address, employee_id, user_id))
        else:
            conn.rollback()
            log_dml_error('UPDATE', 'employees', e, user_id=user_id, data=data)
            conn.close()
            return jsonify({'error': 'Failed to update employee'})
    conn.close()
    return jsonify({'message': 'Employee updated successfully'})

@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    placeholder = get_placeholder()
    # Use TRUE/FALSE for PostgreSQL
    is_active_value = 'FALSE'
    execute_update(conn, f'UPDATE employees SET is_active = {is_active_value} WHERE employee_id = {placeholder} AND user_id = {placeholder}', (employee_id, user_id))
    conn.close()
    return jsonify({'message': 'Employee deleted successfully'})

@app.route('/api/next-bill-number', methods=['GET'])
def get_next_bill_number():
    user_id = get_current_user_id()
    today = datetime.now().strftime('%Y%m%d')
    
    # Use a more robust approach with retry logic
    max_retries = 5
    for attempt in range(max_retries):
        try:
            conn = get_db_connection()
            # Use a transaction to prevent race conditions
            # Note: PostgreSQL doesn't need explicit BEGIN TRANSACTION
            # The transaction is automatically started
            
            # Find all bills for today with the new format
            placeholder = get_placeholder()
            cursor = execute_query(conn, f"""
                SELECT bill_number FROM bills WHERE bill_number LIKE {placeholder} AND user_id = {placeholder}
                ORDER BY bill_number DESC
            """, (f'BILL-{today}-%', user_id))
            bills = cursor.fetchall()
            
            max_seq = 0
            for b in bills:
                parts = b['bill_number'].split('-')
                if len(parts) == 3 and parts[1] == today and parts[2].isdigit():
                    seq = int(parts[2])
                    if seq > max_seq:
                        max_seq = seq
            
            next_seq = max_seq + 1
            bill_number = f'BILL-{today}-{next_seq:03d}'
            
            # Verify this bill number doesn't exist (double-check)
            cursor = execute_query(conn, f"""
                SELECT COUNT(*) as count FROM bills WHERE bill_number = {placeholder} AND user_id = {placeholder}
            """, (bill_number, user_id))
            existing = cursor.fetchone()
            
            if existing['count'] == 0:
                conn.close()
                return jsonify({'next_number': bill_number})
            else:
                # If bill number exists, increment and try again
                max_seq += 1
                next_seq = max_seq + 1
                bill_number = f'BILL-{today}-{next_seq:03d}'
                conn.close()
                return jsonify({'next_number': bill_number})
                
        except Exception as e:
            conn.rollback()
            conn.close()
            if attempt == max_retries - 1:
                # Last attempt failed, generate a unique bill number with timestamp
                import time
                timestamp = int(time.time() * 1000) % 10000  # Last 4 digits of timestamp
                bill_number = f'BILL-{today}-{timestamp:04d}'
                return jsonify({'next_number': bill_number})
            time.sleep(0.1)  # Small delay before retry

@app.route('/api/employee-analytics', methods=['GET'])
def employee_analytics():
    user_id = get_current_user_id()
    conn = get_db_connection()
    # Top 5 employees by revenue
    placeholder = get_placeholder()
    cursor = execute_query(conn, f'''
        SELECT e.name, COALESCE(SUM(b.total_amount), 0) as total_revenue
        FROM employees e
        LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
        WHERE e.user_id = {placeholder} AND e.is_active = TRUE
        GROUP BY e.employee_id
        ORDER BY total_revenue DESC
        LIMIT 5
    ''', (user_id,))
    top5 = cursor.fetchall()
    # Revenue share for all employees
    cursor = execute_query(conn, f'''
        SELECT e.name, COALESCE(SUM(b.total_amount), 0) as total_revenue
        FROM employees e
        LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
        WHERE e.user_id = {placeholder} AND e.is_active = TRUE
        GROUP BY e.employee_id
        ORDER BY total_revenue DESC
    ''', (user_id,))
    shares = cursor.fetchall()
    conn.close()
    return jsonify({
        'top5': [dict(row) for row in top5],
        'shares': [dict(row) for row in shares]
    })

# Database backup functionality removed - using PostgreSQL only



@app.route('/api/backup/upload', methods=['POST'])
def backup_upload():
    return jsonify({'error': 'Dropbox backup functionality has been removed.'}), 501

@app.route('/api/backups', methods=['GET'])
def list_backups():
    return jsonify([])

@app.route('/api/backup/download/<filename>', methods=['GET'])
def download_backup(filename):
    return jsonify({'error': 'Dropbox backup functionality has been removed.'}), 501

@app.route('/api/backup/restore/<filename>', methods=['POST'])
def restore_backup(filename):
    return jsonify({'error': 'Dropbox backup functionality has been removed.'}), 501

# Plan Management API
@app.route('/api/plan/status', methods=['GET'])
def get_plan_status():
    """Get current user plan status and enabled features."""
    try:
        conn = get_db_connection()
        # Get the most recent active plan for user_id = 1
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT * FROM user_plans 
            WHERE user_id = 1 AND is_active = TRUE 
            ORDER BY created_at DESC 
            LIMIT 1
        ''')
        user_plan = cursor.fetchone()
        conn.close()
        
        if not user_plan:
            # Create default trial plan if none exists
            conn = get_db_connection()
            placeholder = get_placeholder()
            sql = f'INSERT INTO user_plans (user_id, plan_type, plan_start_date) VALUES (1, {placeholder}, {placeholder})'
            execute_with_returning(conn, sql, ('trial', datetime.now().strftime('%Y-%m-%d')))
            conn.close()
            
            user_plan = {
                'plan_type': 'trial',
                'plan_start_date': datetime.now().strftime('%Y-%m-%d')
            }
        else:
            user_plan = dict(user_plan)
        
        # Convert plan_start_date to string if it's a datetime.date object
        plan_start_date = user_plan['plan_start_date']
        if hasattr(plan_start_date, 'strftime'):
            plan_start_date = plan_start_date.strftime('%Y-%m-%d')
        
        plan_status = plan_manager.get_user_plan_status(
            user_plan['plan_type'], 
            plan_start_date
        )
        
        # Add upgrade options
        upgrade_options = plan_manager.get_upgrade_options(user_plan['plan_type'])
        plan_status['upgrade_options'] = upgrade_options
        
        # Add expiry warnings
        warnings = plan_manager.get_expiry_warnings(
            user_plan['plan_type'], 
            plan_start_date
        )
        plan_status['warnings'] = warnings
        
        return jsonify(plan_status)
        
    except Exception as e:
        print(f"Error in get_plan_status: {e}")  # Add logging
        return jsonify({'error': str(e)})

@app.route('/api/plan/upgrade', methods=['POST'])
def upgrade_plan():
    """Upgrade user plan."""
    try:
        data = request.get_json()
        new_plan = data.get('plan_type')
        
        if new_plan not in ['trial', 'basic', 'pro']:
            return jsonify({'error': 'Invalid plan type'}), 400
        
        conn = get_db_connection()
        
        # Instead of inserting a new plan, update the existing plan for user_id=1
        placeholder = get_placeholder()
        sql = f'''
            UPDATE user_plans
            SET plan_type = {placeholder}, plan_start_date = {placeholder}, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = 1
        '''
        execute_update(conn, sql, (new_plan, datetime.now().strftime('%Y-%m-%d')))
        conn.close()
        
        return jsonify({
            'message': f'Successfully upgraded to {new_plan} plan',
            'plan_type': new_plan,
            'start_date': datetime.now().strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/plan/features', methods=['GET'])
def get_enabled_features():
    """Get list of enabled features for current user."""
    try:
        conn = get_db_connection()
        # Get the most recent active plan for user_id = 1
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'''
            SELECT * FROM user_plans 
            WHERE user_id = 1 AND is_active = TRUE 
            ORDER BY created_at DESC 
            LIMIT 1
        ''')
        user_plan = cursor.fetchone()
        conn.close()
        
        if not user_plan:
            return jsonify({'enabled_features': [], 'locked_features': []})
        
        user_plan = dict(user_plan)
        
        # Convert plan_start_date to string if it's a datetime.date object
        plan_start_date = user_plan['plan_start_date']
        if hasattr(plan_start_date, 'strftime'):
            plan_start_date = plan_start_date.strftime('%Y-%m-%d')
        
        plan_status = plan_manager.get_user_plan_status(
            user_plan['plan_type'], 
            plan_start_date
        )
        
        return jsonify({
            'enabled_features': plan_status.get('enabled_features', []),
            'locked_features': plan_status.get('locked_features', []),
            'plan_type': user_plan['plan_type'],
            'expired': plan_status.get('expired', False)
        })
        
    except Exception as e:
        print(f"Error in get_enabled_features: {e}")  # Add logging
        return jsonify({'error': str(e)})

@app.route('/api/plan/check-feature/<feature>', methods=['GET'])
def check_feature_access(feature):
    """Check if a specific feature is enabled for current user."""
    try:
        conn = get_db_connection()
        cursor = execute_query(conn, 'SELECT * FROM user_plans WHERE user_id = 1 AND is_active = TRUE')

        user_plan = cursor.fetchone()
        conn.close()
        
        if not user_plan:
            return jsonify({'enabled': False, 'reason': 'No active plan'})
        
        user_plan = dict(user_plan)
        
        # Convert plan_start_date to string if it's a datetime.date object
        plan_start_date = user_plan['plan_start_date']
        if hasattr(plan_start_date, 'strftime'):
            plan_start_date = plan_start_date.strftime('%Y-%m-%d')
        
        is_enabled = plan_manager.is_feature_enabled(
            user_plan['plan_type'], 
            plan_start_date, 
            feature
        )
        
        return jsonify({
            'enabled': is_enabled,
            'feature': feature,
            'plan_type': user_plan['plan_type']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/plan/config', methods=['GET'])
def get_plan_config():
    """Get plan configuration for frontend."""
    try:
        return jsonify({
            'pricing_plans': plan_manager.config.get('pricing_plans', {}),
            'feature_definitions': plan_manager.config.get('feature_definitions', {}),
            'ui_settings': plan_manager.config.get('ui_settings', {}),
            'upgrade_options': plan_manager.config.get('upgrade_options', {})
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/plan/expire-trial', methods=['POST'])
def expire_trial():
    """Expire trial for testing purposes."""
    try:
        data = request.get_json()
        days_ago = data.get('days_ago', 16)
        
        conn = get_db_connection()
        execute_update(conn, '''
            UPDATE user_plans 
            SET plan_start_date = date('now', '-{} days')
            WHERE user_id = 1 AND plan_type = 'trial' AND is_active = TRUE
        '''.format(days_ago))
        conn.close()
        
        return jsonify({
            'message': f'Trial expired (set to {days_ago} days ago)',
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/plan/reset-trial', methods=['POST'])
def reset_trial():
    """Reset trial to today for testing purposes."""
    try:
        conn = get_db_connection()
        execute_update(conn, '''
            UPDATE user_plans 
            SET plan_start_date = date('now')
            WHERE user_id = 1 AND plan_type = 'trial' AND is_active = TRUE
        ''')
        conn.close()
        
        return jsonify({
            'message': 'Trial reset to today',
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})


def update_loyalty_config():
    """Update loyalty program configuration."""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        conn = get_db_connection()
        
        # Update shop settings
        placeholder = get_placeholder()
        execute_update(conn, f'''
            UPDATE shop_settings SET 
                enable_loyalty_program = {placeholder},
                loyalty_program_name = {placeholder},
                loyalty_points_per_aed = {placeholder},
                loyalty_aed_per_point = {placeholder}
            WHERE user_id = {placeholder}
        ''', (
            data.get('enable_loyalty_program', False),
            data.get('loyalty_program_name', 'Loyalty Program'),
            data.get('loyalty_points_per_aed', 1.00),
            data.get('loyalty_aed_per_point', 0.01),
            user_id
        ))
        
        # Update or create loyalty config
        cursor = execute_query(conn, f'''
            SELECT config_id FROM loyalty_config WHERE user_id = {placeholder}
        ''', (user_id,))
        existing_config = cursor.fetchone()
        
        if existing_config:
            execute_update(conn, f'''
                UPDATE loyalty_config SET 
                    program_name = {placeholder},
                    is_active = {placeholder},
                    points_per_aed = {placeholder},
                    aed_per_point = {placeholder},
                    min_points_redemption = {placeholder},
                    max_points_redemption_percent = {placeholder},
                    birthday_bonus_points = {placeholder},
                    anniversary_bonus_points = {placeholder},
                    referral_bonus_points = {placeholder},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = {placeholder}
            ''', (
                data.get('loyalty_program_name', 'Loyalty Program'),
                data.get('enable_loyalty_program', False),
                data.get('loyalty_points_per_aed', 1.00),
                data.get('loyalty_aed_per_point', 0.01),
                data.get('min_points_redemption', 100),
                data.get('max_points_redemption_percent', 20),
                data.get('birthday_bonus_points', 50),
                data.get('anniversary_bonus_points', 100),
                data.get('referral_bonus_points', 200),
                user_id
            ))
        else:
            execute_update(conn, f'''
                INSERT INTO loyalty_config (
                    user_id, program_name, is_active, points_per_aed, aed_per_point,
                    min_points_redemption, max_points_redemption_percent,
                    birthday_bonus_points, anniversary_bonus_points, referral_bonus_points
                ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder},
                         {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
            ''', (
                user_id,
                data.get('loyalty_program_name', 'Loyalty Program'),
                data.get('enable_loyalty_program', False),
                data.get('loyalty_points_per_aed', 1.00),
                data.get('loyalty_aed_per_point', 0.01),
                data.get('min_points_redemption', 100),
                data.get('max_points_redemption_percent', 20),
                data.get('birthday_bonus_points', 50),
                data.get('anniversary_bonus_points', 100),
                data.get('referral_bonus_points', 200)
            ))
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Loyalty program configuration updated successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/tiers', methods=['GET'])
def get_loyalty_tiers():
    """Get loyalty tiers for the current user."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        cursor = execute_query(conn, f'''
            SELECT * FROM loyalty_tiers 
            WHERE user_id = {placeholder} AND is_active = TRUE
            ORDER BY points_threshold ASC
        ''', (user_id,))
        tiers = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'tiers': [dict(tier) for tier in tiers]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/tiers', methods=['POST'])
def create_loyalty_tier():
    """Create a new loyalty tier."""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        execute_update(conn, f'''
            INSERT INTO loyalty_tiers (
                user_id, tier_name, tier_level, points_threshold, discount_percent, 
                bonus_points_multiplier, free_delivery, priority_service, exclusive_offers, color_code, is_active
            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder},
                     {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        ''', (
            user_id,
            data['tier_name'],
            data.get('tier_level', data['tier_name']),
            data.get('points_threshold', 0),
            data.get('discount_percent', 0.0),
            data.get('bonus_points_multiplier', 1.0),
            data.get('free_delivery', False),
            data.get('priority_service', False),
            data.get('exclusive_offers', False),
            data.get('color_code', '#CD7F32'),
            True
        ))
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Loyalty tier created successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/customers', methods=['GET'])
def get_loyalty_customers():
    """Get all customers with their loyalty information."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        cursor = execute_query(conn, f'''
            SELECT 
                c.customer_id,
                c.name,
                c.phone,
                c.email,
                cl.loyalty_id,
                cl.total_points,
                cl.available_points,
                cl.tier_level,
                cl.join_date,
                cl.last_purchase_date,
                cl.total_purchases,
                cl.total_spent,
                cl.referral_code,
                cl.birthday,
                cl.anniversary_date
            FROM customers c
            LEFT JOIN customer_loyalty cl ON c.customer_id = cl.customer_id AND cl.user_id = {placeholder}
            WHERE c.user_id = {placeholder} AND c.is_active = TRUE
            ORDER BY cl.total_points DESC NULLS LAST, c.name ASC
        ''', (user_id, user_id))
        
        customers = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'customers': [dict(customer) for customer in customers]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/customers/<int:customer_id>', methods=['GET'])
def get_customer_loyalty(customer_id):
    """Get detailed loyalty information for a specific customer."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        # Get customer loyalty profile
        cursor = execute_query(conn, f'''
            SELECT 
                cl.*,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email
            FROM customer_loyalty cl
            JOIN customers c ON cl.customer_id = c.customer_id
            WHERE cl.user_id = {placeholder} AND cl.customer_id = {placeholder}
        ''', (user_id, customer_id))
        
        loyalty_profile = cursor.fetchone()
        
        if not loyalty_profile:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Customer loyalty profile not found'
            }), 404
        
        # Get recent transactions
        cursor = execute_query(conn, f'''
            SELECT * FROM loyalty_transactions 
            WHERE user_id = {placeholder} AND loyalty_id = {placeholder}
            ORDER BY created_at DESC LIMIT 10
        ''', (user_id, loyalty_profile['loyalty_id']))
        
        transactions = cursor.fetchall()
        
        # Get available rewards
        cursor = execute_query(conn, f'''
            SELECT * FROM loyalty_rewards 
            WHERE user_id = {placeholder} AND is_active = TRUE
        ''', (user_id,))
        
        rewards = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'loyalty_profile': dict(loyalty_profile),
            'transactions': [dict(txn) for txn in transactions],
            'rewards': [dict(reward) for reward in rewards]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/customers/<int:customer_id>/enroll', methods=['POST'])
def enroll_customer_loyalty(customer_id):
    """Enroll a customer in the loyalty program."""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        # Check if customer exists
        cursor = execute_query(conn, f'''
            SELECT customer_id FROM customers 
            WHERE user_id = {placeholder} AND customer_id = {placeholder}
        ''', (user_id, customer_id))
        
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Customer not found'
            }), 404
        
        # Check if already enrolled
        cursor = execute_query(conn, f'''
            SELECT loyalty_id FROM customer_loyalty 
            WHERE user_id = {placeholder} AND customer_id = {placeholder}
        ''', (user_id, customer_id))
        
        if cursor.fetchone():
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Customer is already enrolled in loyalty program'
            }), 400
        
        # Generate unique referral code
        import random
        import string
        referral_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Enroll customer
        execute_update(conn, f'''
            INSERT INTO customer_loyalty (
                user_id, customer_id, tier_level, birthday, anniversary_date, referral_code, 
                total_points, available_points, lifetime_points, join_date, is_active
            ) VALUES ({placeholder}, {placeholder}, 'Bronze', {placeholder}, {placeholder}, {placeholder}, 
                     0, 0, 0, CURRENT_DATE, true)
        ''', (
            user_id, 
            customer_id, 
            data.get('birthday'),
            data.get('anniversary_date'),
            referral_code
        ))
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Customer enrolled in loyalty program successfully',
            'referral_code': referral_code
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/transactions', methods=['GET'])
def get_loyalty_transactions():
    """Get loyalty transactions for the current user."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        cursor = execute_query(conn, f'''
            SELECT 
                lt.*,
                c.name as customer_name,
                c.phone as customer_phone
            FROM loyalty_transactions lt
            JOIN customer_loyalty cl ON lt.loyalty_id = cl.loyalty_id
            JOIN customers c ON cl.customer_id = c.customer_id
            WHERE lt.user_id = {placeholder}
            ORDER BY lt.created_at DESC
            LIMIT 100
        ''', (user_id,))
        
        transactions = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'transactions': [dict(txn) for txn in transactions]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/rewards', methods=['GET'])
def get_loyalty_rewards():
    """Get available loyalty rewards."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        cursor = execute_query(conn, f'''
            SELECT * FROM loyalty_rewards 
            WHERE user_id = {placeholder} AND is_active = TRUE
            ORDER BY points_cost ASC
        ''', (user_id,))
        
        rewards = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'rewards': [dict(reward) for reward in rewards]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/rewards', methods=['POST'])
def create_loyalty_reward():
    """Create a new loyalty reward."""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        execute_update(conn, f'''
            INSERT INTO loyalty_rewards (
                user_id, reward_name, reward_type, points_cost, discount_percent, 
                discount_amount, description
            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        ''', (
            user_id,
            data['reward_name'],
            data['reward_type'],
            data.get('points_cost', 0),
            data.get('discount_percent', 0.0),
            data.get('discount_amount', 0.0),
            data.get('description', '')
        ))
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Loyalty reward created successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/offers', methods=['GET'])
def get_personalized_offers():
    """Get personalized offers for customers."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        cursor = execute_query(conn, f'''
            SELECT 
                po.*,
                c.name as customer_name,
                c.phone as customer_phone
            FROM personalized_offers po
            JOIN customer_loyalty cl ON po.loyalty_id = cl.loyalty_id
            JOIN customers c ON cl.customer_id = c.customer_id
            WHERE po.user_id = {placeholder} AND po.is_active = TRUE
            AND po.valid_from <= CURRENT_DATE AND po.valid_until >= CURRENT_DATE
            ORDER BY po.created_at DESC
        ''', (user_id,))
        
        offers = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'offers': [dict(offer) for offer in offers]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/loyalty/analytics', methods=['GET'])
def get_loyalty_analytics():
    """Get loyalty program analytics."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        # Total enrolled customers
        cursor = execute_query(conn, f'''
            SELECT COUNT(*) as total_customers FROM customer_loyalty 
            WHERE user_id = {placeholder} AND is_active = TRUE
        ''', (user_id,))
        total_customers = cursor.fetchone()['total_customers']
        
        # Total points issued
        cursor = execute_query(conn, f'''
            SELECT SUM(points_amount) as total_points FROM loyalty_transactions 
            WHERE user_id = {placeholder} AND transaction_type = 'earned'
        ''', (user_id,))
        total_points = cursor.fetchone()['total_points'] or 0
        
        # Total points redeemed
        cursor = execute_query(conn, f'''
            SELECT SUM(points_amount) as redeemed_points FROM loyalty_transactions 
            WHERE user_id = {placeholder} AND transaction_type = 'redeemed'
        ''', (user_id,))
        redeemed_points = cursor.fetchone()['redeemed_points'] or 0
        
        # Tier distribution
        cursor = execute_query(conn, f'''
            SELECT tier_level, COUNT(*) as count FROM customer_loyalty 
            WHERE user_id = {placeholder} AND is_active = TRUE
            GROUP BY tier_level
        ''', (user_id,))
        tier_distribution = {row['tier_level']: row['count'] for row in cursor.fetchall()}
        
        # Recent activity
        cursor = execute_query(conn, f'''
            SELECT COUNT(*) as recent_activity FROM loyalty_transactions 
            WHERE user_id = {placeholder} AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        ''', (user_id,))
        recent_activity = cursor.fetchone()['recent_activity']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'analytics': {
                'total_customers': total_customers,
                'total_points_issued': total_points,
                'total_points_redeemed': redeemed_points,
                'active_points': total_points - redeemed_points,
                'tier_distribution': tier_distribution,
                'recent_activity': recent_activity
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


# AI API Endpoints
@app.route('/api/ai/customer-segmentation')
def get_customer_segmentation():
    """Get customer segmentation analysis using AI/ML."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        placeholder = get_placeholder()
        
        # Extract customer features for segmentation
        cursor = execute_query(conn, f'''
            SELECT 
                c.customer_id,
                c.name as customer_name,
                c.phone as customer_mobile,
                c.customer_type,
                c.city as customer_city,
                c.area as customer_area,
                COUNT(b.bill_id) as total_orders,
                COALESCE(SUM(b.total_amount), 0) as total_spent,
                COALESCE(AVG(b.total_amount), 0) as avg_order_value,
                MAX(b.bill_date) as last_order_date,
                                            CASE 
                                WHEN MAX(b.bill_date) IS NOT NULL 
                                THEN (NOW()::date - MAX(b.bill_date)::date)
                                ELSE 999 
                            END as days_since_last_order,
                            COUNT(DISTINCT b.bill_date::date) as unique_visit_days,
                            MIN(b.bill_date) as first_order_date,
                            CASE 
                                WHEN MAX(b.bill_date) IS NOT NULL AND MIN(b.bill_date) IS NOT NULL 
                                THEN (MAX(b.bill_date)::date - MIN(b.bill_date)::date)
                                ELSE 0 
                            END as customer_lifetime_days
            FROM customers c
            LEFT JOIN bills b ON c.customer_id = b.customer_id
            WHERE c.user_id = {placeholder}
            GROUP BY c.customer_id, c.name, c.phone, c.customer_type, c.city, c.area
            HAVING COUNT(b.bill_id) > 0
            ORDER BY total_spent DESC
        ''', (user_id,))
        
        customers = cursor.fetchall()
        
        if not customers:
            return jsonify({
                'success': False,
                'error': 'No customer data available for segmentation'
            })
        
        # Simple segmentation logic (can be enhanced with ML models later)
        segmented_customers = []
        for customer in customers:
            customer_dict = dict(customer)
            
            # Convert Decimal types to float for calculations
            total_spent = float(customer_dict['total_spent'] or 0)
            total_orders = int(customer_dict['total_orders'] or 0)
            days_since_last_order = int(customer_dict['days_since_last_order'] or 0)
            customer_lifetime_days = int(customer_dict['customer_lifetime_days'] or 0)
            avg_order_value = float(customer_dict['avg_order_value'] or 0)
            
            # Calculate customer value score (RFM analysis)
            recency_score = max(0, 100 - days_since_last_order)
            frequency_score = min(100, total_orders * 10)
            monetary_score = min(100, total_spent / 10)
            
            customer_value_score = (recency_score * 0.2 + frequency_score * 0.4 + monetary_score * 0.4)
            
            # Determine segment based on value score and behavior
            if customer_value_score >= 80 and total_orders >= 10:
                segment = 'Loyal VIPs'
            elif customer_value_score >= 60 and total_orders >= 5:
                segment = 'Regular Customers'
            elif days_since_last_order > 90:
                segment = 'At-Risk Customers'
            elif customer_lifetime_days < 30:
                segment = 'New Customers'
            else:
                segment = 'Occasional Buyers'
            
            customer_dict['segment'] = segment
            customer_dict['segment_label'] = segment
            customer_dict['customer_value_score'] = round(customer_value_score, 2)
            
            # Update the converted values in the dict
            customer_dict['total_spent'] = total_spent
            customer_dict['total_orders'] = total_orders
            customer_dict['days_since_last_order'] = days_since_last_order
            customer_dict['customer_lifetime_days'] = customer_lifetime_days
            customer_dict['avg_order_value'] = avg_order_value
            
            segmented_customers.append(customer_dict)
        
        # Group by segments for summary
        segments_summary = {}
        for customer in segmented_customers:
            segment = customer['segment_label']
            if segment not in segments_summary:
                segments_summary[segment] = {
                    'label': segment,
                    'count': 0,
                    'total_spent': 0.0,
                    'avg_order_value': 0.0
                }
            
            segments_summary[segment]['count'] += 1
            segments_summary[segment]['total_spent'] += float(customer['total_spent'])
            segments_summary[segment]['avg_order_value'] += float(customer['avg_order_value'])
        
        # Calculate averages
        for segment in segments_summary.values():
            if segment['count'] > 0:
                segment['avg_order_value'] = round(segment['avg_order_value'] / segment['count'], 2)
                segment['total_spent'] = round(segment['total_spent'], 2)
        
        segments_list = list(segments_summary.values())
        
        conn.close()
        
        return jsonify({
            'success': True,
            'segments': segments_list,
            'customers': segmented_customers
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/ai/export-segmentation', methods=['POST'])
def export_segmentation_data():
    """Export customer segmentation data in various formats."""
    try:
        data = request.get_json()
        format_type = data.get('format', 'csv')
        customer_data = data.get('data', [])
        
        if not customer_data:
            return jsonify({
                'success': False,
                'error': 'No data provided for export'
            }), 400
        
        if format_type == 'csv':
            # Create CSV data
            output = StringIO()
            writer = csv.writer(output)
            
            # Write header
            headers = ['Customer ID', 'Name', 'Mobile', 'Segment', 'Total Orders', 'Total Spent', 'Avg Order Value', 'Last Visit', 'Customer Value Score']
            writer.writerow(headers)
            
            # Write data
            for customer in customer_data:
                writer.writerow([
                    customer.get('customer_id', ''),
                    customer.get('customer_name', ''),
                    customer.get('customer_mobile', ''),
                    customer.get('segment_label', ''),
                    customer.get('total_orders', 0),
                    customer.get('total_spent', 0),
                    customer.get('avg_order_value', 0),
                    customer.get('last_order_date', ''),
                    customer.get('customer_value_score', 0)
                ])
            
            output.seek(0)
            
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename=customer-segmentation-{datetime.now().strftime("%Y%m%d")}.csv'}
            )
        
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported export format: {format_type}'
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/api/analytics/financial-overview', methods=['GET'])
def get_financial_overview():
    """Get comprehensive financial overview with key metrics"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()

        # Get date range from query params
        from_date = request.args.get('from_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', datetime.now().strftime('%Y-%m-%d'))

        placeholder = get_placeholder()

        # Revenue calculations
        revenue_data = execute_query(conn, f'''
            SELECT
                COUNT(*) as total_invoices,
                SUM(total_amount) as total_revenue,
                SUM(subtotal) as gross_revenue,
                SUM(vat_amount) as total_vat,
                AVG(total_amount) as avg_invoice_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM bills
            WHERE user_id = {placeholder}
            AND DATE(bill_date) BETWEEN {placeholder} AND {placeholder}
        ''', (user_id, from_date, to_date)).fetchone()

        # Expense calculations
        expense_data = execute_query(conn, f'''
            SELECT
                COUNT(*) as total_expenses,
                SUM(amount) as total_expenses_amount,
                AVG(amount) as avg_expense_amount
            FROM expenses
            WHERE user_id = {placeholder}
            AND DATE(expense_date) BETWEEN {placeholder} AND {placeholder}
        ''', (user_id, from_date, to_date)).fetchone()

        # Calculate profit metrics
        total_revenue = float(revenue_data['total_revenue'] or 0)
        total_expenses = float(expense_data['total_expenses_amount'] or 0)
        net_profit = total_revenue - total_expenses
        gross_profit = float(revenue_data['gross_revenue'] or 0) - total_expenses

        # Calculate margins
        gross_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
        net_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

        # Get top revenue sources
        top_products = execute_query(conn, f'''
            SELECT
                bi.product_name,
                SUM(bi.total_amount) as revenue,
                SUM(bi.quantity) as quantity_sold
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.bill_id
            WHERE b.user_id = {placeholder}
            AND DATE(b.bill_date) BETWEEN {placeholder} AND {placeholder}
            GROUP BY bi.product_name
            ORDER BY revenue DESC
            LIMIT 5
        ''', (user_id, from_date, to_date)).fetchall()

        # Get top expense categories
        top_expense_categories = execute_query(conn, f'''
            SELECT
                ec.category_name,
                SUM(e.amount) as total_amount,
                COUNT(*) as expense_count
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.category_id
            WHERE e.user_id = {placeholder}
            AND DATE(e.expense_date) BETWEEN {placeholder} AND {placeholder}
            GROUP BY ec.category_id, ec.category_name
            ORDER BY total_amount DESC
            LIMIT 5
        ''', (user_id, from_date, to_date)).fetchall()

        conn.close()

        return jsonify({
            'period': {
                'from_date': from_date,
                'to_date': to_date
            },
            'revenue': {
                'total_revenue': total_revenue,
                'gross_revenue': float(revenue_data['gross_revenue'] or 0),
                'total_vat': float(revenue_data['total_vat'] or 0),
                'total_invoices': revenue_data['total_invoices'],
                'avg_invoice_value': float(revenue_data['avg_invoice_value'] or 0),
                'unique_customers': revenue_data['unique_customers']
            },
            'expenses': {
                'total_expenses': total_expenses,
                'total_expense_count': expense_data['total_expenses'],
                'avg_expense_amount': float(expense_data['avg_expense_amount'] or 0)
            },
            'profitability': {
                'gross_profit': gross_profit,
                'net_profit': net_profit,
                'gross_margin': round(gross_margin, 2),
                'net_margin': round(net_margin, 2)
            },
            'top_products': [dict(product) for product in top_products],
            'top_expense_categories': [dict(category) for category in top_expense_categories]
        })

    except Exception as e:
        print(f"Financial overview error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load financial overview'}), 500

@app.route('/api/analytics/expense-breakdown', methods=['GET'])
def get_expense_breakdown():
    """Get detailed expense breakdown by category"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()

        from_date = request.args.get('from_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', datetime.now().strftime('%Y-%m-%d'))

        placeholder = get_placeholder()

        # Expense breakdown by category
        category_breakdown = execute_query(conn, f'''
            SELECT
                ec.category_name,
                ec.description,
                SUM(e.amount) as total_amount,
                COUNT(*) as expense_count,
                AVG(e.amount) as avg_amount,
                MIN(e.amount) as min_amount,
                MAX(e.amount) as max_amount
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.category_id
            WHERE e.user_id = {placeholder}
            AND DATE(e.expense_date) BETWEEN {placeholder} AND {placeholder}
            GROUP BY ec.category_id, ec.category_name, ec.description
            ORDER BY total_amount DESC
        ''', (user_id, from_date, to_date)).fetchall()

        # Monthly expense trends by category
        if is_postgresql():
            monthly_trends = execute_query(conn, f'''
                SELECT
                    ec.category_name,
                    TO_CHAR(e.expense_date, 'YYYY-MM') as month,
                    SUM(e.amount) as amount
                FROM expenses e
                JOIN expense_categories ec ON e.category_id = ec.category_id
                WHERE e.user_id = {placeholder}
                AND e.expense_date >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY ec.category_id, ec.category_name, TO_CHAR(e.expense_date, 'YYYY-MM')
                ORDER BY month, amount DESC
            ''', (user_id,)).fetchall()
        else:
            monthly_trends = execute_query(conn, f'''
            SELECT
                ec.category_name,
                strftime('%Y-%m', e.expense_date) as month,
                SUM(e.amount) as amount
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.category_id
                WHERE e.user_id = {placeholder}
            AND e.expense_date >= date('now', '-6 months')
            GROUP BY ec.category_id, ec.category_name, strftime('%Y-%m', e.expense_date)
            ORDER BY month, amount DESC
        ''', (user_id,)).fetchall()

        conn.close()

        return jsonify({
            'period': {
                'from_date': from_date,
                'to_date': to_date
            },
            'category_breakdown': [dict(cat) for cat in category_breakdown],
            'monthly_trends': [dict(trend) for trend in monthly_trends]
        })

    except Exception as e:
        print(f"Expense breakdown error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load expense breakdown'}), 500

@app.route('/api/analytics/business-metrics', methods=['GET'])
def get_business_metrics():
    """Get key business performance metrics"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()

        from_date = request.args.get('from_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', datetime.now().strftime('%Y-%m-%d'))

        placeholder = get_placeholder()

        # Customer metrics
        if is_postgresql():
            customer_metrics = execute_query(conn, f'''
                SELECT
                    COUNT(DISTINCT customer_id) as total_customers,
                    COUNT(DISTINCT CASE WHEN bill_date >= CURRENT_DATE - INTERVAL '7 days' THEN customer_id END) as new_customers_7d,
                    COUNT(DISTINCT CASE WHEN bill_date >= CURRENT_DATE - INTERVAL '30 days' THEN customer_id END) as new_customers_30d,
                    AVG(total_amount) as avg_order_value,
                    SUM(total_amount) / COUNT(DISTINCT customer_id) as revenue_per_customer
                FROM bills
                WHERE user_id = {placeholder}
                AND DATE(bill_date) BETWEEN {placeholder} AND {placeholder}
            ''', (user_id, from_date, to_date)).fetchone()
        else:
            customer_metrics = execute_query(conn, f'''
            SELECT
                COUNT(DISTINCT customer_id) as total_customers,
                COUNT(DISTINCT CASE WHEN bill_date >= date('now', '-7 days') THEN customer_id END) as new_customers_7d,
                COUNT(DISTINCT CASE WHEN bill_date >= date('now', '-30 days') THEN customer_id END) as new_customers_30d,
                AVG(total_amount) as avg_order_value,
                SUM(total_amount) / COUNT(DISTINCT customer_id) as revenue_per_customer
            FROM bills
                WHERE user_id = {placeholder}
                AND DATE(bill_date) BETWEEN {placeholder} AND {placeholder}
        ''', (user_id, from_date, to_date)).fetchone()

        # Employee performance
        employee_performance = execute_query(conn, f'''
            SELECT
                e.name as employee_name,
                COUNT(b.bill_id) as bills_handled,
                SUM(b.total_amount) as total_revenue,
                AVG(b.total_amount) as avg_bill_value
            FROM employees e
            LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
            WHERE e.user_id = {placeholder} AND e.is_active = TRUE
            AND (b.bill_date IS NULL OR DATE(b.bill_date) BETWEEN {placeholder} AND {placeholder})
            GROUP BY e.employee_id, e.name
            ORDER BY total_revenue DESC
        ''', (user_id, from_date, to_date)).fetchall()

        # Product performance
        product_performance = execute_query(conn, f'''
            SELECT
                bi.product_name,
                SUM(bi.quantity) as total_quantity,
                SUM(bi.total_amount) as total_revenue,
                COUNT(DISTINCT b.bill_id) as invoices_count
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.bill_id
            WHERE b.user_id = {placeholder}
            AND DATE(b.bill_date) BETWEEN {placeholder} AND {placeholder}
            GROUP BY bi.product_name
            ORDER BY total_revenue DESC
            LIMIT 10
        ''', (user_id, from_date, to_date)).fetchall()

        conn.close()

        return jsonify({
            'period': {
                'from_date': from_date,
                'to_date': to_date
            },
            'customer_metrics': {
                'total_customers': customer_metrics['total_customers'],
                'new_customers_7d': customer_metrics['new_customers_7d'],
                'new_customers_30d': customer_metrics['new_customers_30d'],
                'avg_order_value': float(customer_metrics['avg_order_value'] or 0),
                'revenue_per_customer': float(customer_metrics['revenue_per_customer'] or 0)
            },
            'employee_performance': [dict(emp) for emp in employee_performance],
            'product_performance': [dict(prod) for prod in product_performance]
        })

    except Exception as e:
        print(f"Business metrics error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load business metrics'}), 500

@app.route('/api/analytics/revenue-trends', methods=['GET'])
def get_revenue_trends():
    """Get revenue trends over time"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()

        # Get period from query params (daily, weekly, monthly)
        period = request.args.get('period', 'monthly')
        months = int(request.args.get('months', 6))

        placeholder = get_placeholder()

        if period == 'daily':
            # Daily trends for last 30 days
            if is_postgresql():
                trends = execute_query(conn, '''
                    SELECT
                        DATE(bill_date) as date,
                        SUM(total_amount) as revenue,
                        COUNT(*) as invoices,
                        COUNT(DISTINCT customer_id) as customers
                    FROM bills
                    WHERE user_id = %s
                    AND bill_date >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY DATE(bill_date)
                    ORDER BY date
                ''', (user_id,)).fetchall()
            else:
                trends = execute_query(conn, '''
                SELECT
                    DATE(bill_date) as date,
                    SUM(total_amount) as revenue,
                    COUNT(*) as invoices,
                    COUNT(DISTINCT customer_id) as customers
                FROM bills
                WHERE user_id = ?
                AND bill_date >= date('now', '-30 days')
                GROUP BY DATE(bill_date)
                ORDER BY date
            ''', (user_id,)).fetchall()
        elif period == 'weekly':
            # Weekly trends for last 12 weeks
            if is_postgresql():
                trends = execute_query(conn, '''
                    SELECT
                        TO_CHAR(bill_date, 'IYYY-IW') as week,
                        SUM(total_amount) as revenue,
                        COUNT(*) as invoices,
                        COUNT(DISTINCT customer_id) as customers
                    FROM bills
                    WHERE user_id = %s
                    AND bill_date >= CURRENT_DATE - INTERVAL '84 days'
                    GROUP BY TO_CHAR(bill_date, 'IYYY-IW')
                    ORDER BY week
                ''', (user_id,)).fetchall()
            else:
                trends = execute_query(conn, '''
                SELECT
                    strftime('%Y-W%W', bill_date) as week,
                    SUM(total_amount) as revenue,
                    COUNT(*) as invoices,
                    COUNT(DISTINCT customer_id) as customers
                FROM bills
                WHERE user_id = ?
                AND bill_date >= date('now', '-84 days')
                GROUP BY strftime('%Y-W%W', bill_date)
                ORDER BY week
            ''', (user_id,)).fetchall()
        else:  # monthly
            # Monthly trends for specified months
            if is_postgresql():
                trends = execute_query(conn, '''
                    SELECT
                        TO_CHAR(bill_date, 'YYYY-MM') as month,
                        SUM(total_amount) as revenue,
                        COUNT(*) as invoices,
                        COUNT(DISTINCT customer_id) as customers
                    FROM bills
                    WHERE user_id = %s
                    AND bill_date >= CURRENT_DATE - INTERVAL '%s months'
                    GROUP BY TO_CHAR(bill_date, 'YYYY-MM')
                    ORDER BY month
                ''', (user_id, months)).fetchall()
            else:
                trends = execute_query(conn, '''
                SELECT
                    strftime('%Y-%m', bill_date) as month,
                    SUM(total_amount) as revenue,
                    COUNT(*) as invoices,
                    COUNT(DISTINCT customer_id) as customers
                FROM bills
                WHERE user_id = ?
                AND bill_date >= date('now', '-' || ? || ' months')
                GROUP BY strftime('%Y-%m', bill_date)
                ORDER BY month
            ''', (user_id, months)).fetchall()

        conn.close()

        return jsonify({
            'period': period,
            'trends': [dict(trend) for trend in trends]
        })

    except Exception as e:
        print(f"Revenue trends error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load revenue trends'}), 500

@app.route('/api/analytics/cash-flow', methods=['GET'])
def get_cash_flow():
    """Get cash flow analysis"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()

        from_date = request.args.get('from_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', datetime.now().strftime('%Y-%m-%d'))

        placeholder = get_placeholder()

        # Cash inflows (revenue)
        cash_inflows = execute_query(conn, f'''
            SELECT
                SUM(total_amount) as total_inflow,
                SUM(advance_paid) as advance_payments,
                SUM(balance_amount) as pending_payments
            FROM bills
            WHERE user_id = {placeholder}
            AND DATE(bill_date) BETWEEN {placeholder} AND {placeholder}
        ''', (user_id, from_date, to_date)).fetchone()

        # Cash outflows (expenses)
        cash_outflows = execute_query(conn, f'''
            SELECT
                SUM(amount) as total_outflow,
                COUNT(*) as expense_count
            FROM expenses
            WHERE user_id = {placeholder}
            AND DATE(expense_date) BETWEEN {placeholder} AND {placeholder}
        ''', (user_id, from_date, to_date)).fetchone()

        # Payment method analysis
        payment_methods = execute_query(conn, f'''
            SELECT
                payment_method,
                COUNT(*) as count,
                SUM(total_amount) as amount
            FROM bills
            WHERE user_id = {placeholder}
            AND DATE(bill_date) BETWEEN {placeholder} AND {placeholder}
            GROUP BY payment_method
            ORDER BY amount DESC
        ''', (user_id, from_date, to_date)).fetchall()

        conn.close()

        total_inflow = float(cash_inflows['total_inflow'] or 0)
        total_outflow = float(cash_outflows['total_outflow'] or 0)
        net_cash_flow = total_inflow - total_outflow

        return jsonify({
            'period': {
                'from_date': from_date,
                'to_date': to_date
            },
            'cash_flow': {
                'total_inflow': total_inflow,
                'total_outflow': total_outflow,
                'net_cash_flow': net_cash_flow,
                'advance_payments': float(cash_inflows['advance_payments'] or 0),
                'pending_payments': float(cash_inflows['pending_payments'] or 0)
            },
            'payment_methods': [dict(method) for method in payment_methods]
        })

    except Exception as e:
        print(f"Cash flow error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load cash flow data'}), 500

@app.route('/api/analytics/top-products', methods=['GET'])
def get_top_products():
    """Get top performing products by revenue"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()

        from_date = request.args.get('from_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', datetime.now().strftime('%Y-%m-%d'))

        placeholder = get_placeholder()

        # Top products by revenue
        top_products = execute_query(conn, f'''
            SELECT
                bi.product_name,
                SUM(bi.quantity) as quantity_sold,
                SUM(bi.total_amount) as total_revenue,
                COUNT(DISTINCT b.bill_id) as invoices_count
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.bill_id
            WHERE b.user_id = {placeholder}
            AND DATE(b.bill_date) BETWEEN {placeholder} AND {placeholder}
            GROUP BY bi.product_name
            ORDER BY total_revenue DESC
            LIMIT 10
        ''', (user_id, from_date, to_date)).fetchall()

        conn.close()

        return jsonify({
            'period': {
                'from_date': from_date,
                'to_date': to_date
            },
            'top_products': [dict(product) for product in top_products]
        })

    except Exception as e:
        print(f"Top products error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load top products data'}), 500

# Reports API Endpoints
@app.route('/api/reports/invoices', methods=['GET'])
def get_invoices_report():
    """Get invoices report with filtering"""
    try:
        print("DEBUG: get_invoices_report called")
        user_id = get_current_user_id()
        print(f"DEBUG: user_id = {user_id}")
        if not user_id:
            print("DEBUG: No user_id, returning 401")
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Build WHERE conditions
        where_conditions = [f'b.user_id = {placeholder}']
        params = [user_id]

        # Date filters
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        if from_date:
            where_conditions.append(f"DATE(b.bill_date) >= {placeholder}")
            params.append(from_date)
        if to_date:
            where_conditions.append(f"DATE(b.bill_date) <= {placeholder}")
            params.append(to_date)

        # City/Area filters
        city = request.args.get('city')
        area = request.args.get('area')
        if city and city != 'All':
            where_conditions.append(f"c.city = {placeholder}")
            params.append(city)
        if area and area != 'All':
            where_conditions.append(f"c.area = {placeholder}")
            params.append(area)

        # Status filter
        status = request.args.get('status')
        if status and status != 'All':
            where_conditions.append(f"b.status = {placeholder}")
            params.append(status)

        # Product filters (array)
        products = request.args.getlist('products[]')
        if products and len(products) > 0 and products[0] != 'All':
            product_placeholders = ', '.join([placeholder] * len(products))
            where_conditions.append(f"bi.product_id IN ({product_placeholders})")
            params.extend(products)

        # Employee filters (array)
        employees = request.args.getlist('employees[]')
        if employees and len(employees) > 0 and employees[0] != 'All':
            employee_placeholders = ', '.join([placeholder] * len(employees))
            where_conditions.append(f"b.master_id IN ({employee_placeholders})")
            params.extend(employees)

        where_clause = ' AND '.join(where_conditions)

        # Main query to get invoices with customer and product info
        if is_postgresql():
            # PostgreSQL version with STRING_AGG
            query = f'''
                SELECT
                    b.bill_id,
                    b.bill_number,
                    b.bill_date,
                    b.delivery_date,
                    b.total_amount,
                    'pending' as status,
                    c.name as customer_name,
                    c.city,
                    c.area,
                    e.name as employee_name,
                    STRING_AGG(DISTINCT bi.product_name, ', ') as products,
                    COALESCE(SUM(bi.vat_amount), 0) as vat_amount,
                    COALESCE(SUM(bi.total_amount), 0) as subtotal
                FROM bills b
                LEFT JOIN customers c ON b.customer_id = c.customer_id
                LEFT JOIN employees e ON b.master_id = e.employee_id
                LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
                WHERE {where_clause}
                GROUP BY b.bill_id, b.bill_number, b.bill_date, b.delivery_date, b.total_amount,
                         c.name, c.city, c.area, e.name
                ORDER BY b.bill_date DESC, b.bill_number DESC
            '''
        else:
            # SQLite version with GROUP_CONCAT
            query = f'''
                SELECT
                    b.bill_id,
                    b.bill_number,
                    b.bill_date,
                    b.delivery_date,
                    b.total_amount,
                    b.payment_status as status,
                    c.name as customer_name,
                    c.city,
                    c.area,
                    e.name as employee_name,
                    GROUP_CONCAT(DISTINCT bi.product_name) as products,
                    COALESCE(SUM(bi.vat_amount), 0) as vat_amount,
                    COALESCE(SUM(bi.total_amount), 0) as subtotal
                FROM bills b
                LEFT JOIN customers c ON b.customer_id = c.customer_id
                LEFT JOIN employees e ON b.master_id = e.employee_id
                LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
                WHERE {where_clause}
                GROUP BY b.bill_id, b.bill_number, b.bill_date, b.delivery_date, b.total_amount,
                         b.payment_status, c.name, c.city, c.area, e.name
                ORDER BY b.bill_date DESC, b.bill_number DESC
            '''

        invoices = execute_query(conn, query, params).fetchall()
        conn.close()

        # Format the results
        formatted_invoices = []
        for invoice in invoices:
            invoice_dict = dict(invoice)

            # Convert dates to string format
            if hasattr(invoice_dict['bill_date'], 'isoformat'):
                invoice_dict['bill_date'] = invoice_dict['bill_date'].strftime('%Y-%m-%d')
            if invoice_dict['delivery_date'] and hasattr(invoice_dict['delivery_date'], 'isoformat'):
                invoice_dict['delivery_date'] = invoice_dict['delivery_date'].strftime('%Y-%m-%d')

            # Ensure numeric fields are floats
            for field in ['subtotal', 'vat_amount', 'total_amount']:
                if invoice_dict[field] is not None:
                    invoice_dict[field] = float(invoice_dict[field])

            # Add missing fields for compatibility
            invoice_dict['advance_amount'] = 0.0
            invoice_dict['balance_amount'] = 0.0
            invoice_dict['discount_amounts'] = []
            invoice_dict['discount_amount'] = 0.0
            invoice_dict['discount_percentage'] = 0.0

            formatted_invoices.append(invoice_dict)

        return jsonify({
            'success': True,
            'invoices': formatted_invoices
        })

    except Exception as e:
        print(f"Invoices report error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to load invoices report: {str(e)}'}), 500

@app.route('/api/reports/employees', methods=['GET'])
def get_employees_report():
    """Get employees performance report"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Build WHERE conditions
        where_conditions = [f'b.user_id = {placeholder}']
        params = [user_id]

        # Date filters
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        if from_date:
            where_conditions.append(f"DATE(b.bill_date) >= {placeholder}")
            params.append(from_date)
        if to_date:
            where_conditions.append(f"DATE(b.bill_date) <= {placeholder}")
            params.append(to_date)

        # City/Area filters
        city = request.args.get('city')
        area = request.args.get('area')
        if city and city != 'All':
            where_conditions.append(f"c.city = {placeholder}")
            params.append(city)
        if area and area != 'All':
            where_conditions.append(f"c.area = {placeholder}")
            params.append(area)

        # Status filter
        status = request.args.get('status')
        if status and status != 'All':
            where_conditions.append(f"b.status = {placeholder}")
            params.append(status)

        # Product filters (array)
        products = request.args.getlist('products[]')
        if products and len(products) > 0 and products[0] != 'All':
            product_placeholders = ', '.join([placeholder] * len(products))
            where_conditions.append(f"bi.product_id IN ({product_placeholders})")
            params.extend(products)

        where_clause = ' AND '.join(where_conditions)

        # Query employee performance
        if is_postgresql():
            # PostgreSQL version with STRING_AGG
            query = f'''
                SELECT
                    e.employee_id,
                    e.name,
                    COUNT(DISTINCT b.bill_id) as bills_handled,
                    COALESCE(SUM(b.total_amount), 0) as total_billed,
                    COALESCE(AVG(b.total_amount), 0) as avg_bill_value,
                    STRING_AGG(DISTINCT bi.product_name, ', ') as products_handled
                FROM employees e
                LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
                LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
                LEFT JOIN customers c ON b.customer_id = c.customer_id
                WHERE e.user_id = {placeholder} AND e.is_active = TRUE
            '''

            if where_clause:
                query += f' AND ({where_clause})'

            query += f'''
                GROUP BY e.employee_id, e.name
                ORDER BY total_billed DESC
            '''
        else:
            # SQLite version with GROUP_CONCAT
            query = f'''
                SELECT
                    e.employee_id,
                    e.name,
                    COUNT(DISTINCT b.bill_id) as bills_handled,
                    COALESCE(SUM(b.total_amount), 0) as total_billed,
                    COALESCE(AVG(b.total_amount), 0) as avg_bill_value,
                    GROUP_CONCAT(DISTINCT bi.product_name) as products_handled
                FROM employees e
                LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
                LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
                LEFT JOIN customers c ON b.customer_id = c.customer_id
                WHERE e.user_id = {placeholder} AND e.is_active = TRUE
            '''

            if where_clause:
                query += f' AND ({where_clause})'

            query += f'''
                GROUP BY e.employee_id, e.name
                ORDER BY total_billed DESC
            '''

        employees = execute_query(conn, query, params).fetchall()
        conn.close()

        # Format the results
        formatted_employees = []
        for employee in employees:
            employee_dict = dict(employee)

            # Convert numeric fields to floats
            employee_dict['total_billed'] = float(employee_dict['total_billed'] or 0)
            employee_dict['avg_bill_value'] = float(employee_dict['avg_bill_value'] or 0)
            employee_dict['bills_handled'] = int(employee_dict['bills_handled'] or 0)

            # Split products into array
            if employee_dict['products_handled']:
                employee_dict['products_handled'] = [p.strip() for p in employee_dict['products_handled'].split(', ') if p.strip()]
            else:
                employee_dict['products_handled'] = []

            formatted_employees.append(employee_dict)

        return jsonify({
            'success': True,
            'employees': formatted_employees
        })

    except Exception as e:
        print(f"Employees report error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load employees report'}), 500

@app.route('/api/reports/products', methods=['GET'])
def get_products_report():
    """Get products performance report"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Build WHERE conditions
        where_conditions = [f'b.user_id = {placeholder}']
        params = [user_id]

        # Date filters
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        if from_date:
            where_conditions.append(f"DATE(b.bill_date) >= {placeholder}")
            params.append(from_date)
        if to_date:
            where_conditions.append(f"DATE(b.bill_date) <= {placeholder}")
            params.append(to_date)

        # City/Area filters
        city = request.args.get('city')
        area = request.args.get('area')
        if city and city != 'All':
            where_conditions.append(f"c.city = {placeholder}")
            params.append(city)
        if area and area != 'All':
            where_conditions.append(f"c.area = {placeholder}")
            params.append(area)

        # Status filter
        status = request.args.get('status')
        if status and status != 'All':
            where_conditions.append(f"b.status = {placeholder}")
            params.append(status)

        where_clause = ' AND '.join(where_conditions)

        # Query product performance
        query = f'''
            SELECT
                bi.product_name,
                pt.type_name,
                SUM(bi.quantity) as total_quantity,
                SUM(bi.total_amount) as total_revenue,
                COUNT(DISTINCT b.bill_id) as invoices_count,
                AVG(bi.rate) as avg_rate
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.bill_id
            LEFT JOIN products p ON bi.product_id = p.product_id
            LEFT JOIN product_types pt ON p.type_id = pt.type_id
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            WHERE {where_clause}
            GROUP BY bi.product_name, pt.type_name
            ORDER BY total_revenue DESC
        '''

        products = execute_query(conn, query, params).fetchall()
        conn.close()

        # Format the results
        formatted_products = []
        for product in products:
            product_dict = dict(product)

            # Convert numeric fields to floats
            for field in ['total_quantity', 'total_revenue', 'avg_rate']:
                if product_dict[field] is not None:
                    product_dict[field] = float(product_dict[field])

            product_dict['invoices_count'] = int(product_dict['invoices_count'] or 0)

            formatted_products.append(product_dict)

        return jsonify({
            'success': True,
            'products': formatted_products
        })

    except Exception as e:
        print(f"Products report error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to load products report'}), 500

@app.route('/api/invoice-summary', methods=['POST'])
def get_invoice_summary():
    """Get invoice summary data with filtering"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        # For now, return a simple success response
        return jsonify({
            'success': True,
            'summary': {
                'total_invoices': 0,
                'total_revenue': 0,
                'total_vat_collected': 0,
                'avg_invoice_value': 0,
                'unique_customers': 0,
                'paid_invoices': 0,
                'paid_amount': 0,
                'pending_invoices': 0,
                'pending_amount': 0
            },
            'top_products': [],
            'top_customers': []
        })

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Build WHERE conditions based on filters
        where_conditions = [f'b.user_id = {placeholder}']
        params = [user_id]

        # Date filters
        from_date = filters.get('from_date')
        to_date = filters.get('to_date')
        if from_date:
            where_conditions.append(f"DATE(b.bill_date) >= {placeholder}")
            params.append(from_date)
        if to_date:
            where_conditions.append(f"DATE(b.bill_date) <= {placeholder}")
            params.append(to_date)

        # City/Area filters
        city = filters.get('city')
        area = filters.get('area')
        if city and city != 'All':
            where_conditions.append(f"c.city = {placeholder}")
            params.append(city)
        if area and area != 'All':
            where_conditions.append(f"c.area = {placeholder}")
            params.append(area)

        # Status filter
        status = filters.get('status')
        if status and status != 'All':
            where_conditions.append(f"b.payment_status = {placeholder}")
            params.append(status)

        # Product filters
        products = filters.get('products', [])
        if products and len(products) > 0:
            product_placeholders = ', '.join([placeholder] * len(products))
            where_conditions.append(f"bi.product_id IN ({product_placeholders})")
            params.extend(products)

        # Employee filters
        employees = filters.get('employees', [])
        if employees and len(employees) > 0:
            employee_placeholders = ', '.join([placeholder] * len(employees))
            where_conditions.append(f"b.master_id IN ({employee_placeholders})")
            params.extend(employees)

        where_clause = ' AND '.join(where_conditions)

        # Revenue calculations
        revenue_query = f'''
            SELECT
                COUNT(*) as total_invoices,
                SUM(b.total_amount) as total_revenue,
                SUM(bi.total_amount) as gross_revenue,
                SUM(bi.vat_amount) as total_vat,
                AVG(b.total_amount) as avg_invoice_value,
                COUNT(DISTINCT b.customer_id) as unique_customers
            FROM bills b
            LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            WHERE {where_clause}
        '''

        revenue_data = execute_query(conn, revenue_query, params).fetchone()

        # Status breakdown
        status_query = f'''
            SELECT
                CASE
                    WHEN b.payment_status = 'paid' THEN 'paid'
                    WHEN b.payment_status = 'partial' THEN 'partial'
                    ELSE 'pending'
                END as status_group,
                COUNT(*) as count,
                SUM(b.total_amount) as amount
            FROM bills b
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            WHERE {where_clause}
            GROUP BY
                CASE
                    WHEN b.payment_status = 'paid' THEN 'paid'
                    WHEN b.payment_status = 'partial' THEN 'partial'
                    ELSE 'pending'
                END
        '''

        status_data = execute_query(conn, status_query, params).fetchall()

        # Top products
        top_products_query = f'''
            SELECT
                bi.product_name,
                SUM(bi.quantity) as total_quantity,
                SUM(bi.total_amount) as total_revenue,
                COUNT(DISTINCT b.bill_id) as invoice_count
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.bill_id
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            WHERE {where_clause.replace('bi.product_id', 'bi.product_id').replace('b.master_id', 'b.master_id')}
            GROUP BY bi.product_name
            ORDER BY total_revenue DESC
            LIMIT 5
        '''

        top_products = execute_query(conn, top_products_query, params).fetchall()

        # Top customers
        top_customers_query = f'''
            SELECT
                c.name as customer_name,
                COUNT(b.bill_id) as invoice_count,
                SUM(b.total_amount) as total_spent,
                AVG(b.total_amount) as avg_invoice_value
            FROM bills b
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            WHERE {where_clause}
            GROUP BY c.customer_id, c.name
            ORDER BY total_spent DESC
            LIMIT 5
        '''

        top_customers = execute_query(conn, top_customers_query, params).fetchall()

        conn.close()

        # Process status breakdown
        paid_invoices = 0
        paid_amount = 0
        pending_invoices = 0
        pending_amount = 0

        for status_row in status_data:
            if status_row['status_group'] == 'paid':
                paid_invoices = status_row['count']
                paid_amount = float(status_row['amount'] or 0)
            elif status_row['status_group'] == 'pending':
                pending_invoices = status_row['count']
                pending_amount = float(status_row['amount'] or 0)

        # Format response
        summary = {
            'total_invoices': revenue_data['total_invoices'] or 0,
            'total_revenue': float(revenue_data['total_revenue'] or 0),
            'total_vat_collected': float(revenue_data['total_vat'] or 0),
            'avg_invoice_value': float(revenue_data['avg_invoice_value'] or 0),
            'unique_customers': revenue_data['unique_customers'] or 0,
            'paid_invoices': paid_invoices,
            'paid_amount': paid_amount,
            'pending_invoices': pending_invoices,
            'pending_amount': pending_amount
        }

        top_products_list = []
        for product in top_products:
            top_products_list.append({
                'product_name': product['product_name'],
                'total_quantity': int(product['total_quantity'] or 0),
                'total_revenue': float(product['total_revenue'] or 0),
                'invoice_count': int(product['invoice_count'] or 0)
            })

        top_customers_list = []
        for customer in top_customers:
            top_customers_list.append({
                'customer_name': customer['customer_name'] or 'Unknown',
                'invoice_count': int(customer['invoice_count'] or 0),
                'total_spent': float(customer['total_spent'] or 0),
                'avg_invoice_value': float(customer['avg_invoice_value'] or 0)
            })

        return jsonify({
            'success': True,
            'summary': summary,
            'top_products': top_products_list,
            'top_customers': top_customers_list
        })

    except Exception as e:
        print(f"Invoice summary error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to load invoice summary: {str(e)}'}), 500

@app.route('/financial-insights')
def financial_insights():
    """Serve the financial insights page"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            # Store the intended destination in session for redirect after login
            session['next'] = request.url
            return redirect(url_for('login'))

        # Get user plan info for the template
        user_plan_info = get_user_plan_info()

        return render_template('financial_insights.html',
                            user_plan_info=user_plan_info,
                            get_user_language=get_user_language,
                            get_translated_text=get_translated_text)

    except Exception as e:
        # Store the intended destination in session for redirect after login
        session['next'] = request.url
        return redirect(url_for('login'))

@app.route('/ai-dashboard')
def ai_dashboard():
    """AI Dashboard page."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            # Store the intended destination in session for redirect after login
            session['next'] = request.url
            return redirect(url_for('login'))

        # Get user plan info for the template
        user_plan_info = get_user_plan_info()

        return render_template('ai-dashboard.html',
                            user_plan_info=user_plan_info,
                            get_user_language=get_user_language,
                            get_translated_text=get_translated_text)

    except Exception as e:
        # Store the intended destination in session for redirect after login
        session['next'] = request.url
        return redirect(url_for('login'))

# Expense Categories API
@app.route('/api/expense-categories', methods=['GET'])
def get_expense_categories():
    """Get all expense categories for the current user."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()
        cursor = execute_query(conn, f'SELECT * FROM expense_categories WHERE user_id = {placeholder} AND is_active = TRUE ORDER BY category_name', (user_id,))
        categories = cursor.fetchall()
        conn.close()

        return jsonify([dict(cat) for cat in categories])

    except Exception as e:
        print(f"Expense categories error: {e}")
        return jsonify({'error': 'Failed to load expense categories'}), 500

@app.route('/api/expense-categories', methods=['POST'])
def add_expense_category():
    """Add a new expense category."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        data = request.get_json()
        category_name = data.get('category_name', '').strip()
        description = data.get('description', '').strip()

        if not category_name:
            return jsonify({'error': 'Category name is required'}), 400

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Check for duplicate category name
        cursor = execute_query(conn, f'SELECT category_id FROM expense_categories WHERE user_id = {placeholder} AND category_name = {placeholder} AND is_active = TRUE', (user_id, category_name))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return jsonify({'error': 'Category name already exists'}), 400

        category_id = execute_with_returning(conn, f'INSERT INTO expense_categories (user_id, category_name, description) VALUES ({placeholder}, {placeholder}, {placeholder})', (user_id, category_name, description))
        conn.close()

        return jsonify({'id': category_id, 'message': 'Expense category added successfully'})

    except Exception as e:
        print(f"Add expense category error: {e}")
        return jsonify({'error': 'Failed to add expense category'}), 500

@app.route('/api/expense-categories/<int:category_id>', methods=['DELETE'])
def delete_expense_category(category_id):
    """Delete an expense category."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Check if category is used by expenses
        cursor = execute_query(conn, f'SELECT COUNT(*) FROM expenses WHERE category_id = {placeholder} AND user_id = {placeholder}', (category_id, user_id))
        result = cursor.fetchone()
        count = result[0] if isinstance(result, tuple) else result['count']
        if count > 0:
            conn.close()
            return jsonify({'error': 'Cannot delete category with existing expenses'}), 400

        # Soft delete the category
        execute_update(conn, f'UPDATE expense_categories SET is_active = FALSE WHERE category_id = {placeholder} AND user_id = {placeholder}', (category_id, user_id))
        conn.close()

        return jsonify({'message': 'Expense category deleted successfully'})

    except Exception as e:
        print(f"Delete expense category error: {e}")
        return jsonify({'error': 'Failed to delete expense category'}), 500

# Expenses API
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Get all expenses for the current user."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Build query with optional filters
        where_conditions = [f'e.user_id = {placeholder}']
        params = [user_id]

        # Date filters
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        if from_date:
            where_conditions.append(f"DATE(e.expense_date) >= {placeholder}")
            params.append(from_date)
        if to_date:
            where_conditions.append(f"DATE(e.expense_date) <= {placeholder}")
            params.append(to_date)

        # Category filter
        category_id = request.args.get('category_id')
        if category_id:
            where_conditions.append(f"e.category_id = {placeholder}")
            params.append(category_id)

        where_clause = ' AND '.join(where_conditions)

        query = f'''
            SELECT e.*, ec.category_name
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.category_id
            WHERE {where_clause}
            ORDER BY e.expense_date DESC, e.expense_id DESC
        '''

        cursor = execute_query(conn, query, params)
        expenses = cursor.fetchall()
        conn.close()

        # Format expenses
        formatted_expenses = []
        for expense in expenses:
            expense_dict = dict(expense)
            # Convert Decimal to float
            if 'amount' in expense_dict and expense_dict['amount'] is not None:
                expense_dict['amount'] = float(expense_dict['amount'])
            # Convert date to string
            if hasattr(expense_dict['expense_date'], 'isoformat'):
                expense_dict['expense_date'] = expense_dict['expense_date'].strftime('%Y-%m-%d')
            formatted_expenses.append(expense_dict)

        return jsonify(formatted_expenses)

    except Exception as e:
        print(f"Get expenses error: {e}")
        return jsonify({'error': 'Failed to load expenses'}), 500

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """Add a new expense."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        data = request.get_json()
        category_id = data.get('category_id')
        amount = data.get('amount')
        description = data.get('description', '').strip()
        expense_date = data.get('expense_date')

        if not all([category_id, amount, expense_date]):
            return jsonify({'error': 'Category, amount, and date are required'}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid amount'}), 400

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Verify category belongs to user
        cursor = execute_query(conn, f'SELECT category_id FROM expense_categories WHERE category_id = {placeholder} AND user_id = {placeholder} AND is_active = TRUE', (category_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Invalid expense category'}), 400

        expense_id = execute_with_returning(conn, f'''
            INSERT INTO expenses (user_id, category_id, amount, description, expense_date)
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        ''', (user_id, category_id, amount, description, expense_date))
        conn.close()

        return jsonify({'id': expense_id, 'message': 'Expense added successfully'})

    except Exception as e:
        print(f"Add expense error: {e}")
        return jsonify({'error': 'Failed to add expense'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    """Update an expense."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        data = request.get_json()
        category_id = data.get('category_id')
        amount = data.get('amount')
        description = data.get('description', '').strip()
        expense_date = data.get('expense_date')

        if not all([category_id, amount, expense_date]):
            return jsonify({'error': 'Category, amount, and date are required'}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid amount'}), 400

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Verify expense belongs to user
        cursor = execute_query(conn, f'SELECT expense_id FROM expenses WHERE expense_id = {placeholder} AND user_id = {placeholder}', (expense_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Expense not found'}), 404

        # Verify category belongs to user
        cursor = execute_query(conn, f'SELECT category_id FROM expense_categories WHERE category_id = {placeholder} AND user_id = {placeholder} AND is_active = TRUE', (category_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Invalid expense category'}), 400

        execute_update(conn, f'''
            UPDATE expenses
            SET category_id = {placeholder}, amount = {placeholder}, description = {placeholder},
                expense_date = {placeholder}
            WHERE expense_id = {placeholder} AND user_id = {placeholder}
        ''', (category_id, amount, description, expense_date, expense_id, user_id))
        conn.close()

        return jsonify({'message': 'Expense updated successfully'})

    except Exception as e:
        print(f"Update expense error: {e}")
        return jsonify({'error': 'Failed to update expense'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Delete an expense."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401

        conn = get_db_connection()
        placeholder = get_placeholder()

        # Hard delete the expense (since there's no is_active field)
        execute_update(conn, f'DELETE FROM expenses WHERE expense_id = {placeholder} AND user_id = {placeholder}', (expense_id, user_id))
        conn.close()

        return jsonify({'message': 'Expense deleted successfully'})

    except Exception as e:
        print(f"Delete expense error: {e}")
        return jsonify({'error': 'Failed to delete expense'}), 500


# Recurring Expenses API (placeholder - table doesn't exist yet)
@app.route('/api/recurring-expenses', methods=['GET'])
def get_recurring_expenses():
    """Get all recurring expenses for the current user."""
    # Since recurring_expenses table doesn't exist in schema, return empty array for now
    return jsonify([])

@app.route('/api/recurring-expenses', methods=['POST'])
def add_recurring_expense():
    """Add a new recurring expense."""
    # Since recurring_expenses table doesn't exist in schema, return error for now
    return jsonify({'error': 'Recurring expenses feature not implemented yet'}), 501

@app.route('/api/recurring-expenses/<int:recurring_id>', methods=['PUT'])
def update_recurring_expense(recurring_id):
    """Update a recurring expense."""
    # Since recurring_expenses table doesn't exist in schema, return error for now
    return jsonify({'error': 'Recurring expenses feature not implemented yet'}), 501

@app.route('/api/recurring-expenses/<int:recurring_id>', methods=['DELETE'])
def delete_recurring_expense(recurring_id):
    """Delete a recurring expense."""
    # Since recurring_expenses table doesn't exist in schema, return error for now
    return jsonify({'error': 'Recurring expenses feature not implemented yet'}), 501

if __name__ == '__main__':
    # OCR setup is handled in the import section
    init_db()  # Initialize database and create tables

    # Get port from environment variable (Railway sets this)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
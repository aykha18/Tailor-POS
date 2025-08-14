from flask import Flask, render_template, request, jsonify, send_file, session, send_from_directory, redirect, url_for, make_response
import sqlite3
import os
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
from io import BytesIO
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
import os
import sqlite3
import json
import csv
import io
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import zipfile
import shutil
from plan_manager import PlanManager
try:
    from playwright.sync_api import sync_playwright
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("Warning: playwright not installed. PDF generation will be disabled.")

# Configure simple logging system for Railway
def setup_logging():
    """Setup simple logging for Railway deployment."""
    # Configure console logging only (no file logging on Railway)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
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
            conn.execute('''
                INSERT INTO error_logs (timestamp, level, operation, table_name, error_message, user_id, data_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                'ERROR',
                operation,
                table,
                str(error),
                user_id,
                json.dumps(data) if data else None
            ))
            conn.commit()
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
        conn.execute('''
            INSERT INTO user_actions (timestamp, action, user_id, details)
            VALUES (?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            action,
            user_id,
            json.dumps(details) if details else None
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log user action: {e}")

app = Flask(__name__)
app.config['DATABASE'] = os.getenv('DATABASE_PATH', 'pos_tailor.db')
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')  # Add secret key for sessions



def get_db_connection():
    conn = sqlite3.connect(app.config['DATABASE'], timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn

def get_current_user_id():
    """Get current user_id from session, fallback to 1 for backward compatibility."""
    # For testing purposes, return user_id 2 since that's where the bills are
    return session.get('user_id', 2)

def get_user_plan_info():
    """Get current user plan information and shop settings for template rendering."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        user_plan = conn.execute('SELECT * FROM user_plans WHERE user_id = ? AND is_active = 1', (user_id,)).fetchone()
        shop_settings = conn.execute('SELECT * FROM shop_settings WHERE user_id = ?', (user_id,)).fetchone()
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
    """Initialize database with error handling for Railway deployment."""
    print("Starting database initialization...")
    
    try:
        need_init = False
        if not os.path.exists(app.config['DATABASE']):
            print("Database file not found, will initialize...")
            need_init = True
        else:
            # Check if main tables are empty
            try:
                conn = get_db_connection()
                cur = conn.execute("SELECT COUNT(*) FROM product_types")
                if cur.fetchone()[0] == 0:
                    print("Product types table is empty, will initialize...")
                    need_init = True
                conn.close()
            except Exception as e:
                print(f"Database check failed, will initialize: {e}")
                need_init = True
        
        if need_init:
            print("Initializing database schema...")
            try:
                with open('database_schema.sql', 'r') as f:
                    schema = f.read()
                conn = get_db_connection()
                conn.executescript(schema)
                conn.commit()
                conn.close()
                print("Database schema initialized successfully!")
            except Exception as e:
                print(f"Database schema initialization failed: {e}")
                # Don't raise, continue with admin setup
        
        # Always ensure admin user exists
        print("Setting up admin user...")
        try:
            from setup_production_admin import setup_production_admin
            success = setup_production_admin()
            if success:
                print("Admin user setup completed successfully!")
            else:
                print("Admin user setup failed, but continuing...")
        except Exception as e:
            print(f"Admin user setup failed: {e}")
            # Don't raise, continue with app startup
        
        print("Database initialization completed!")
        
    except Exception as e:
        print(f"Database initialization error: {e}")
        # Don't raise, let the app continue

@app.route('/')
def index():
    user_plan_info = get_user_plan_info()
    return render_template('index.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/landing')
def landing():
    user_plan_info = get_user_plan_info()
    return render_template('landing.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/app')
def app_page():
    user_plan_info = get_user_plan_info()
    return render_template('app.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)









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
    response = send_from_directory('.', 'sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

@app.route('/app-template')
def app_template():
    return send_from_directory('templates', 'app.html')

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

@app.route('/test-dropdown')
def test_dropdown():
    return send_file('test_employee_dropdown.html')

# Product Types API
@app.route('/api/product-types', methods=['GET'])
def get_product_types():
    user_id = get_current_user_id()
    conn = get_db_connection()
    types = conn.execute('SELECT * FROM product_types WHERE user_id = ? ORDER BY type_name', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(type) for type in types])

@app.route('/api/product-types', methods=['POST'])
def add_product_type():
    data = request.get_json()
    name = data.get('name', '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Type name is required'}), 400
    
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO product_types (user_id, type_name) VALUES (?, ?)', (user_id, name))
        conn.commit()
        type_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.close()
        return jsonify({'id': type_id, 'name': name, 'message': 'Product type added successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Product type already exists'}), 400

@app.route('/api/product-types/<int:type_id>', methods=['DELETE'])
def delete_product_type(type_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    # Check if products exist for this type
    products = conn.execute('SELECT COUNT(*) FROM products WHERE type_id = ? AND user_id = ?', (type_id, user_id)).fetchone()[0]
    if products > 0:
        conn.close()
        return jsonify({'error': 'Cannot delete type with existing products'}), 400
    
    conn.execute('DELETE FROM product_types WHERE type_id = ? AND user_id = ?', (type_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product type deleted successfully'})

# Products API
@app.route('/api/products', methods=['GET'])
def get_products():
    user_id = get_current_user_id()
    search = request.args.get('search', '').strip()
    conn = get_db_connection()
    if search:
        like_search = f"%{search}%"
        products = conn.execute('''
            SELECT p.*, pt.type_name 
            FROM products p 
            JOIN product_types pt ON p.type_id = pt.type_id 
            WHERE p.user_id = ? AND pt.user_id = ? AND p.is_active = 1 AND (p.product_name LIKE ? OR pt.type_name LIKE ?)
            ORDER BY pt.type_name, p.product_name
        ''', (user_id, user_id, like_search, like_search)).fetchall()
    else:
        products = conn.execute('''
            SELECT p.*, pt.type_name 
            FROM products p 
            JOIN product_types pt ON p.type_id = pt.type_id 
            WHERE p.user_id = ? AND pt.user_id = ? AND p.is_active = 1 
            ORDER BY pt.type_name, p.product_name
        ''', (user_id, user_id)).fetchall()
    conn.close()
    return jsonify([dict(product) for product in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json()
    type_id = data.get('type_id')
    name = data.get('name', '').strip()
    rate = data.get('rate')
    description = data.get('description', '').strip()
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
        type_check = conn.execute('SELECT type_id FROM product_types WHERE type_id = ? AND user_id = ?', (type_id, user_id)).fetchone()
        if not type_check:
            conn.close()
            return jsonify({'error': 'Invalid product type'}), 400
            
        conn.execute('''
            INSERT INTO products (user_id, type_id, product_name, rate, description) 
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, type_id, name, rate, description))
        conn.commit()
        product_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.close()
        return jsonify({'id': product_id, 'message': 'Product added successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Product already exists'}), 400

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    product = conn.execute('''
        SELECT p.*, pt.type_name 
        FROM products p 
        JOIN product_types pt ON p.type_id = pt.type_id 
        WHERE p.product_id = ? AND p.user_id = ? AND pt.user_id = ? AND p.is_active = 1
    ''', (product_id, user_id, user_id)).fetchone()
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
    product_check = conn.execute('SELECT product_id FROM products WHERE product_id = ? AND user_id = ?', (product_id, user_id)).fetchone()
    type_check = conn.execute('SELECT type_id FROM product_types WHERE type_id = ? AND user_id = ?', (type_id, user_id)).fetchone()
    
    if not product_check:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404
    if not type_check:
        conn.close()
        return jsonify({'error': 'Invalid product type'}), 400
        
    conn.execute('''
        UPDATE products 
        SET product_name = ?, rate = ?, type_id = ?, description = ? 
        WHERE product_id = ? AND user_id = ?
    ''', (name, rate, type_id, description, product_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    conn.execute('UPDATE products SET is_active = 0 WHERE product_id = ? AND user_id = ?', (product_id, user_id))
    conn.commit()
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
        customers = conn.execute(
            """
            SELECT * FROM customers 
            WHERE user_id = ? AND 
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
            """,
            (user_id, phone_digits)
        ).fetchall()
    elif search:
        like_search = f"%{search}%"
        customers = conn.execute('SELECT * FROM customers WHERE user_id = ? AND (name LIKE ? OR phone LIKE ? OR business_name LIKE ?) ORDER BY name', (user_id, like_search, like_search, like_search)).fetchall()
    else:
        customers = conn.execute('SELECT * FROM customers WHERE user_id = ? ORDER BY name', (user_id,)).fetchall()
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
        existing_customer = conn.execute(
            """
            SELECT name FROM customers 
            WHERE user_id = ? AND 
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
            """,
            (user_id, phone_digits)
        ).fetchone()
        if existing_customer:
            conn.close()
            return jsonify({'error': f'Phone number {phone} is already assigned to customer "{existing_customer["name"]}"'}), 400
    
    try:
        conn.execute('''
            INSERT INTO customers (user_id, name, phone, trn, city, area, email, address, customer_type, business_name, business_address) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, name, phone_digits, trn, city, area, email, address, customer_type, business_name, business_address))
        conn.commit()
        customer_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.close()
        return jsonify({'id': customer_id, 'message': 'Customer added successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Customer already exists'}), 400

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    customer = conn.execute('SELECT * FROM customers WHERE customer_id = ? AND user_id = ?', (customer_id, user_id)).fetchone()
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
        existing_customer = conn.execute(
            """
            SELECT name FROM customers 
            WHERE user_id = ? AND customer_id != ? AND 
                  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
            """,
            (user_id, customer_id, phone_digits)
        ).fetchone()
        if existing_customer:
            conn.close()
            return jsonify({'error': f'Phone number {phone} is already assigned to customer "{existing_customer["name"]}"'}), 400
    
    conn.execute('''
        UPDATE customers 
        SET name = ?, phone = ?, trn = ?, city = ?, area = ?, email = ?, address = ?, 
            customer_type = ?, business_name = ?, business_address = ?
        WHERE customer_id = ? AND user_id = ?
    ''', (name, phone_digits, trn, city, area, email, address, customer_type, business_name, business_address, customer_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Customer updated successfully'})

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    conn.execute('DELETE FROM customers WHERE customer_id = ? AND user_id = ?', (customer_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Customer deleted successfully'})

@app.route('/api/customers/recent', methods=['GET'])
def get_recent_customers():
    """Get the last 5 customers used in bills for quick selection."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        
        # Get the last 5 unique customers from bills, ordered by most recent
        query = """
            SELECT DISTINCT c.customer_id, c.name, c.phone, c.city, c.area, c.trn, 
                   c.customer_type, c.business_name, c.business_address
            FROM customers c
            INNER JOIN bills b ON c.customer_id = b.customer_id
            WHERE c.user_id = ? AND b.user_id = ?
            ORDER BY b.bill_date DESC, b.bill_id DESC
            LIMIT 5
        """
        
        recent_customers = conn.execute(query, (user_id, user_id)).fetchall()
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
    rates = conn.execute('SELECT * FROM vat_rates WHERE user_id = ? AND is_active = 1 ORDER BY effective_from DESC', (user_id,)).fetchall()
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
    exists = conn.execute(
        'SELECT 1 FROM vat_rates WHERE user_id = ? AND effective_from = ? AND effective_to = ? AND is_active = 1',
        (user_id, effective_from, effective_to)
    ).fetchone()
    if exists:
        conn.close()
        return jsonify({'error': 'A VAT rate with the same effective dates already exists.'}), 400
    # Update previous active row's effective_to if needed
    prev = conn.execute('SELECT vat_id, effective_to FROM vat_rates WHERE user_id = ? AND is_active = 1 ORDER BY effective_from DESC LIMIT 1', (user_id,)).fetchone()
    if prev and prev['effective_to'] == '2099-12-31':
        from datetime import datetime, timedelta
        prev_to = (datetime.strptime(effective_from, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')
        conn.execute('UPDATE vat_rates SET effective_to = ? WHERE vat_id = ? AND user_id = ?', (prev_to, prev['vat_id'], user_id))
    conn.execute('''
        INSERT INTO vat_rates (user_id, rate_percentage, effective_from, effective_to) 
        VALUES (?, ?, ?, ?)
    ''', (user_id, rate_percentage, effective_from, effective_to))
    conn.commit()
    vat_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    return jsonify({'id': vat_id, 'message': 'VAT rate added successfully'})

@app.route('/api/vat-rates/<int:vat_id>', methods=['DELETE'])
def delete_vat_rate(vat_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    conn.execute('UPDATE vat_rates SET is_active = 0 WHERE vat_id = ? AND user_id = ?', (vat_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'VAT rate deleted successfully'})

# Bills API
@app.route('/api/bills', methods=['GET'])
def get_bills():
    user_id = get_current_user_id()
    bill_number = request.args.get('bill_number')
    conn = get_db_connection()
    if bill_number:
        bills = conn.execute(
            'SELECT * FROM bills WHERE bill_number = ? AND user_id = ?',
            (bill_number, user_id)
        ).fetchall()
    else:
        bills = conn.execute('''
            SELECT b.*, c.name as customer_name 
            FROM bills b 
            LEFT JOIN customers c ON b.customer_id = c.customer_id AND c.user_id = b.user_id
            WHERE b.user_id = ?
            ORDER BY b.bill_date DESC, b.bill_id DESC
        ''', (user_id,)).fetchall()
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
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
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
                    default_employee = conn.execute('SELECT employee_id FROM employees WHERE user_id = ? ORDER BY name LIMIT 1', (user_id,)).fetchone()
                    conn.close()
                    
                    if default_employee:
                        master_id = default_employee['employee_id']
                        print(f"DEBUG: Using default master_id: {master_id}")
                    else:
                        print("DEBUG: No employees found, master_id will be None")
                except Exception as e:
                    print(f"DEBUG: Error getting default master: {e}")
                    master_id = None
            
            # Use totals calculated by frontend instead of recalculating
            subtotal = float(bill_data.get('subtotal', 0))
            vat_amount = float(bill_data.get('vat_amount', 0))
            total_amount = float(bill_data.get('total_amount', 0))
            advance_paid = float(bill_data.get('advance_paid', 0))
            balance_amount = float(bill_data.get('balance_amount', 0))
            vat_percent = 5.0  # Keep this for bill item calculations
            
            # Get or create customer
            conn = get_db_connection()
            
            # Check if customer exists
            existing_customer = conn.execute(
                'SELECT customer_id FROM customers WHERE phone = ? AND user_id = ?', 
                (re.sub(r'\D', '', customer_phone), user_id)
            ).fetchone()
            
            if existing_customer:
                customer_id = existing_customer['customer_id']
            else:
                # Create new customer
                cursor = conn.execute('''
                    INSERT INTO customers (user_id, name, phone, trn, city, area, customer_type, business_name, business_address) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id, bill_data.get('customer_name', ''),
                    re.sub(r'\D', '', customer_phone),
                    bill_data.get('customer_trn', ''),
                    bill_data.get('customer_city', ''),
                    bill_data.get('customer_area', ''),
                    bill_data.get('customer_type', 'Individual'),
                    bill_data.get('business_name', ''),
                    bill_data.get('business_address', '')
                ))
                customer_id = cursor.lastrowid
            
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
                    
                    cursor = conn.execute('''
                        INSERT INTO bills (
                            user_id, bill_number, customer_id, customer_name, customer_phone, 
                            customer_city, customer_area, customer_trn, customer_type, business_name, business_address,
                            uuid, bill_date, delivery_date, payment_method, subtotal, vat_amount, total_amount, 
                            advance_paid, balance_amount, status, master_id, trial_date, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        user_id, bill_number, customer_id, bill_data.get('customer_name'),
                        re.sub(r'\D', '', customer_phone), bill_data.get('customer_city'),
                        bill_data.get('customer_area'), bill_data.get('customer_trn', ''),
                        bill_data.get('customer_type', 'Individual'), bill_data.get('business_name', ''),
                        bill_data.get('business_address', ''), bill_uuid, bill_data.get('bill_date'), 
                        bill_data.get('delivery_date'), bill_data.get('payment_method', 'Cash'),
                        subtotal, vat_amount, total_amount, advance_paid, balance_amount,
                        'Pending', master_id, bill_data.get('trial_date'), notes
                    ))
                    bill_created = True
                    break
                    
                except sqlite3.IntegrityError as e:
                    if "UNIQUE constraint failed: bills.user_id, bills.bill_number" in str(e):
                        if attempt == max_retries - 1:
                            # Last attempt failed
                            conn.rollback()
                            conn.close()
                            return jsonify({'error': 'Failed to create bill due to duplicate bill number. Please try again.'}), 500
                        # Continue to next attempt
                        continue
                    else:
                        # Other integrity error
                        conn.rollback()
                        conn.close()
                        return jsonify({'error': f'Database error: {str(e)}'}), 500
                except Exception as e:
                    conn.rollback()
                    conn.close()
                    return jsonify({'error': f'Error creating bill: {str(e)}'}), 500
            
            if not bill_created:
                conn.rollback()
                conn.close()
                return jsonify({'error': 'Failed to create bill after multiple attempts'}), 500
            
            bill_id = cursor.lastrowid
            # print(f"DEBUG: Created bill_id: {bill_id}")
            # print(f"DEBUG: Notes saved to database: '{notes}'")
            
            # Insert bill items
            for item in items_data:
                # Calculate VAT for each item
                item_rate = float(item.get('rate', 0))
                item_quantity = float(item.get('quantity', 1))
                item_discount = float(item.get('discount', 0))
                item_subtotal = (item_rate * item_quantity) - item_discount
                item_vat_amount = item_subtotal * (vat_percent / 100)
                item_total_amount = item_subtotal + item_vat_amount
                
                conn.execute('''
                INSERT INTO bill_items (
                    user_id, bill_id, product_id, product_name, quantity, 
                    rate, discount, vat_amount, advance_paid, total_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, bill_id,
                item.get('product_id'),
                item.get('product_name'),
                item.get('quantity', 1),
                item.get('rate', 0),
                item.get('discount', 0),
                item_vat_amount,
                item.get('advance_paid', 0),
                item_total_amount
            ))
            
            conn.commit()
            print(f"DEBUG: Bill creation completed successfully")
            return jsonify({'success': True, 'bill_id': bill_id})
            
        else:
            # Handle form data
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
            
            # Calculate totals
            subtotal = sum(float(item.get('rate', 0)) * float(item.get('quantity', 1)) for item in items)
            vat_percent = 5.0
            vat_amount = subtotal * (vat_percent / 100)
            total_amount = subtotal + vat_amount
            advance_paid = float(request.form.get('advance_paid', 0))
            balance_amount = total_amount - advance_paid
            
            print(f"DEBUG: Calculated totals - subtotal: {subtotal}, total: {total_amount}, balance: {balance_amount}")
            
            # Get or create customer
            conn = get_db_connection()
            
            # Check if customer exists
            existing_customer = conn.execute(
                """
                SELECT customer_id FROM customers 
                WHERE user_id = ? AND 
                      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
                """,
                (user_id, re.sub(r'\D', '', customer_phone))
            ).fetchone()
            
            if existing_customer:
                customer_id = existing_customer['customer_id']
                print(f"DEBUG: Using existing customer_id: {customer_id}")
            else:
                # Create new customer
                cursor = conn.execute('''
                    INSERT INTO customers (user_id, name, phone, city, area) 
                    VALUES (?, ?, ?, ?, ?)
                ''', (user_id, customer_name, customer_phone, customer_city, customer_area))
                customer_id = cursor.lastrowid
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
                    
                    cursor = conn.execute('''
                        INSERT INTO bills (
                            user_id, bill_number, customer_id, customer_name, customer_phone, 
                            customer_city, customer_area, uuid, bill_date, delivery_date, 
                            payment_method, subtotal, vat_amount, total_amount, 
                            advance_paid, balance_amount, status, master_id, trial_date, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        user_id, bill_number, customer_id, customer_name, customer_phone,
                        customer_city, customer_area, bill_uuid, bill_date, delivery_date,
                        payment_method, subtotal, vat_amount, total_amount,
                        advance_paid, balance_amount, 'Pending', master_id, trial_date, notes
                    ))
                    bill_created = True
                    break
                    
                except sqlite3.IntegrityError as e:
                    if "UNIQUE constraint failed: bills.user_id, bills.bill_number" in str(e):
                        if attempt == max_retries - 1:
                            # Last attempt failed
                            conn.rollback()
                            conn.close()
                            return jsonify({'error': 'Failed to create bill due to duplicate bill number. Please try again.'}), 500
                        # Continue to next attempt
                        continue
                    else:
                        # Other integrity error
                        conn.rollback()
                        conn.close()
                        return jsonify({'error': f'Database error: {str(e)}'}), 500
                except Exception as e:
                    conn.rollback()
                    conn.close()
                    return jsonify({'error': f'Error creating bill: {str(e)}'}), 500
            
            if not bill_created:
                conn.rollback()
                conn.close()
                return jsonify({'error': 'Failed to create bill after multiple attempts'}), 500
            
            bill_id = cursor.lastrowid
            print(f"DEBUG: Created bill_id: {bill_id}")
            print(f"DEBUG: Notes saved to database: '{notes}'")
            
            # Insert bill items
            for item in items:
                conn.execute('''
                    INSERT INTO bill_items (bill_id, product_name, quantity, rate)
                    VALUES (?, ?, ?, ?)
                ''', (
                    bill_id, item.get('product_name', ''), 
                    item.get('quantity', 1), item.get('rate', 0)
                ))
            
            conn.commit()
            print(f"DEBUG: Bill creation completed successfully")
            return jsonify({'success': True, 'bill_id': bill_id})
        
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
        return jsonify({'error': str(e)}), 500
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
    bill = conn.execute('''
        SELECT b.*, c.name as customer_name, e.name as master_name
        FROM bills b 
        LEFT JOIN customers c ON b.customer_id = c.customer_id AND c.user_id = b.user_id
        LEFT JOIN employees e ON b.master_id = e.employee_id AND e.user_id = b.user_id
        WHERE b.bill_id = ? AND b.user_id = ?
    ''', (bill_id, user_id)).fetchone()
    
    if not bill:
        conn.close()
        return jsonify({'error': 'Bill not found'}), 404
    
    bill = dict(bill)
    
    # Get bill items
    items = conn.execute('''
        SELECT * FROM bill_items WHERE bill_id = ? AND user_id = ?
    ''', (bill_id, user_id)).fetchall()
    
    conn.close()
    
    return jsonify({
        'bill': bill,
        'items': [dict(item) for item in items]
    })

@app.route('/api/bills/<int:bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    conn.execute('DELETE FROM bill_items WHERE bill_id = ? AND user_id = ?', (bill_id, user_id))
    conn.execute('DELETE FROM bills WHERE bill_id = ? AND user_id = ?', (bill_id, user_id))
    conn.commit()
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
    bill = conn.execute('SELECT advance_paid, balance_amount, total_amount FROM bills WHERE bill_id = ? AND user_id = ?', (bill_id, user_id)).fetchone()
    if not bill:
        conn.close()
        return jsonify({'error': 'Bill not found.'}), 404
    new_advance = float(bill['advance_paid']) + amount_paid
    new_balance = float(bill['total_amount']) - new_advance
    new_status = 'Paid' if abs(new_balance) < 0.01 else 'Partial'
    if new_balance < 0:
        conn.close()
        return jsonify({'error': 'Payment exceeds total amount.'}), 400
    conn.execute('UPDATE bills SET advance_paid = ?, balance_amount = ?, status = ? WHERE bill_id = ? AND user_id = ?', (new_advance, new_balance, new_status, bill_id, user_id))
    conn.commit()
    updated = conn.execute('SELECT * FROM bills WHERE bill_id = ? AND user_id = ?', (bill_id, user_id)).fetchone()
    conn.close()
    return jsonify({'bill': dict(updated)})

# Dashboard API
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    user_id = get_current_user_id()
    conn = get_db_connection()
    
    # Get total revenue
    total_revenue = conn.execute('''
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM bills 
        WHERE DATE(bill_date) = DATE('now') AND user_id = ?
    ''', (user_id,)).fetchone()['total']
    
    # Get total bills today
    total_bills_today = conn.execute('''
        SELECT COUNT(*) as count 
        FROM bills 
        WHERE DATE(bill_date) = DATE('now') AND user_id = ?
    ''', (user_id,)).fetchone()['count']
    
    # Get pending bills
    pending_bills = conn.execute('''
        SELECT COUNT(*) as count 
        FROM bills 
        WHERE status = 'Pending' AND user_id = ?
    ''', (user_id,)).fetchone()['count']
    
    # Get total customers
    total_customers = conn.execute('SELECT COUNT(*) as count FROM customers WHERE user_id = ?', (user_id,)).fetchone()['count']
    
    # Get total expenses today
    total_expenses_today = conn.execute('''
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE DATE(expense_date) = DATE('now') AND user_id = ?
    ''', (user_id,)).fetchone()['total']
    
    # Get total expenses this month
    total_expenses_month = conn.execute('''
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now') AND user_id = ?
    ''', (user_id,)).fetchone()['total']
    
    # Get monthly revenue data
    monthly_revenue = conn.execute('''
        SELECT strftime('%Y-%m', bill_date) as month, 
               SUM(total_amount) as revenue
        FROM bills 
        WHERE bill_date >= date('now', '-6 months') AND user_id = ?
        GROUP BY strftime('%Y-%m', bill_date)
        ORDER BY month
    ''', (user_id,)).fetchall()
    
    # Get monthly expenses data
    monthly_expenses = conn.execute('''
        SELECT strftime('%Y-%m', expense_date) as month, 
               SUM(amount) as expenses
        FROM expenses 
        WHERE expense_date >= date('now', '-6 months') AND user_id = ?
        GROUP BY strftime('%Y-%m', expense_date)
        ORDER BY month
    ''', (user_id,)).fetchall()

    # Top 10 regions by sales (for pie chart)
    top_regions = conn.execute('''
        SELECT COALESCE(customer_area, 'Unknown') as area, SUM(total_amount) as sales
        FROM bills
        WHERE customer_area IS NOT NULL AND customer_area != '' AND user_id = ?
        GROUP BY customer_area
        ORDER BY sales DESC
        LIMIT 10
    ''', (user_id,)).fetchall()

    # Top 10 trending products (by quantity sold)
    trending_products = conn.execute('''
        SELECT COALESCE(product_name, 'Unknown') as product_name, 
               SUM(quantity) as qty_sold,
               SUM(total_amount) as total_revenue
        FROM bill_items
        WHERE product_name IS NOT NULL AND product_name != '' AND user_id = ?
        GROUP BY product_name
        ORDER BY qty_sold DESC
        LIMIT 10
    ''', (user_id,)).fetchall()

    # Top 10 most repeated customers (by invoice count)
    repeated_customers = conn.execute('''
        SELECT COALESCE(customer_name, 'Unknown') as customer_name, 
               COALESCE(customer_phone, '') as customer_phone, 
               COUNT(*) as invoice_count,
               SUM(total_amount) as total_revenue
        FROM bills
        WHERE customer_name IS NOT NULL AND customer_name != '' AND user_id = ?
        GROUP BY customer_name, customer_phone
        ORDER BY invoice_count DESC
        LIMIT 10
    ''', (user_id,)).fetchall()

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
    print(f"DEBUG: print_bill called for bill_id: {bill_id}")
    
    conn = get_db_connection()
    bill = conn.execute('''
        SELECT b.*, c.name as customer_name, c.phone as customer_phone, 
               c.city as customer_city, c.area as customer_area,
               c.customer_type, c.business_name, c.business_address,
               e.name as master_name
        FROM bills b
        LEFT JOIN customers c ON b.customer_id = c.customer_id AND c.user_id = b.user_id
        LEFT JOIN employees e ON b.master_id = e.employee_id AND e.user_id = b.user_id
        WHERE b.bill_id = ? AND b.user_id = ?
    ''', (bill_id, user_id)).fetchone()
    
    if not bill:
        conn.close()
        return jsonify({'error': 'Bill not found'}), 404
    
    # Get bill items
    items = conn.execute('''
        SELECT * FROM bill_items WHERE bill_id = ? AND user_id = ?
    ''', (bill_id, user_id)).fetchall()
    
    # Get shop settings
    shop_settings = conn.execute('SELECT * FROM shop_settings WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    
    bill = dict(bill)
    shop_settings = dict(shop_settings) if shop_settings else {}
    print(f"DEBUG: Retrieved bill data: {bill}")
    print(f"DEBUG: Bill notes from database: '{bill.get('notes')}'")
    print(f"DEBUG: Notes type: {type(bill.get('notes'))}")
    
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
        print(f"DEBUG: Error calculating amount in words: {e}")
        amount_in_words = ''
        arabic_amount_in_words = ''
    
    print(f"DEBUG: Final amount_in_words: {amount_in_words}")
    print(f"DEBUG: Final arabic_amount_in_words: {arabic_amount_in_words}")
    print(f"DEBUG: Template variables - bill.notes: '{bill.get('notes')}', amount_in_words: '{amount_in_words}'")
    
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
        print(f"DEBUG: Error generating QR code: {e}")
        qr_code_base64 = None
    
    return render_template('print_bill.html', 
                         bill=bill, 
                         items=[dict(item) for item in items],
                         amount_in_words=amount_in_words,
                         arabic_amount_in_words=arabic_amount_in_words,
                         qr_code_base64=qr_code_base64,
                         shop_settings=shop_settings,
                         get_user_language=get_user_language,
                         get_translated_text=get_translated_text)

@app.route('/api/customer-invoice-heatmap', methods=['GET'])
def customer_invoice_heatmap():
    user_id = get_current_user_id()
    conn = get_db_connection()
    # Get last 6 months (including current)
    months = [row['month'] for row in conn.execute("""
        SELECT DISTINCT strftime('%Y-%m', bill_date) as month
        FROM bills
        WHERE bill_date >= date('now', '-5 months', 'start of month') AND user_id = ?
        ORDER BY month ASC
    """, (user_id,)).fetchall()]

    # Get customers with at least one invoice in the last 6 months
    customers = conn.execute("""
        SELECT c.customer_id, c.name, COUNT(b.bill_id) as total_invoices
        FROM customers c
        JOIN bills b ON c.customer_id = b.customer_id AND c.user_id = b.user_id
        WHERE b.bill_date >= date('now', '-5 months', 'start of month') AND b.user_id = ?
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
            count = conn.execute("""
                SELECT COUNT(*) FROM bills
                WHERE customer_id = ? AND strftime('%Y-%m', bill_date) = ? AND user_id = ?
            """, (cid, m, user_id)).fetchone()[0]
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
        areas = conn.execute('''
            SELECT ca.area_name 
            FROM city_area ca 
            JOIN cities c ON ca.city_id = c.city_id 
            WHERE c.city_name = ? 
            ORDER BY ca.area_name
        ''', (city,)).fetchall()
    else:
        # Get all areas
        areas = conn.execute('SELECT area_name FROM city_area ORDER BY area_name').fetchall()
    
    conn.close()
    return jsonify([row['area_name'] for row in areas])

@app.route('/api/cities', methods=['GET'])
def get_cities():
    area = request.args.get('area', '').strip()
    conn = get_db_connection()
    
    if area:
        # Get cities for specific area
        cities = conn.execute('''
            SELECT DISTINCT c.city_name 
            FROM cities c 
            JOIN city_area ca ON c.city_id = ca.city_id 
            WHERE ca.area_name = ? 
            ORDER BY c.city_name
        ''', (area,)).fetchall()
    else:
        # Get all cities
        cities = conn.execute('SELECT city_name FROM cities ORDER BY city_name').fetchall()
    
    conn.close()
    return jsonify([row['city_name'] for row in cities])

# Employees API
@app.route('/api/employees', methods=['GET'])
def get_employees():
    user_id = get_current_user_id()
    search = request.args.get('search', '').strip()
    conn = get_db_connection()
    
    if search:
        like_search = f"%{search}%"
        employees = conn.execute('SELECT * FROM employees WHERE user_id = ? AND (name LIKE ? OR phone LIKE ? OR address LIKE ?) ORDER BY name', (user_id, like_search, like_search, like_search)).fetchall()
    else:
        employees = conn.execute('SELECT * FROM employees WHERE user_id = ? ORDER BY name', (user_id,)).fetchall()
    
    conn.close()
    return jsonify([dict(emp) for emp in employees])

@app.route('/api/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    employee = conn.execute('SELECT * FROM employees WHERE employee_id = ? AND user_id = ?', (employee_id, user_id)).fetchone()
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
        existing_employee = conn.execute('SELECT name FROM employees WHERE phone = ? AND user_id = ?', (mobile, user_id)).fetchone()
        if existing_employee:
            conn.close()
            return jsonify({'error': f'Mobile number {mobile} is already assigned to employee "{existing_employee["name"]}"'}), 400
    
    # Insert with optional position; fallback if legacy DB lacks column
    try:
        conn.execute('INSERT INTO employees (user_id, name, phone, address, position) VALUES (?, ?, ?, ?, ?)', (user_id, name, mobile, address, position))
        conn.commit()
    except Exception as e:
        if 'no such column' in str(e).lower() and 'position' in str(e).lower():
            # Legacy DB without position column
            conn.rollback()
            conn.execute('INSERT INTO employees (user_id, name, phone, address) VALUES (?, ?, ?, ?)', (user_id, name, mobile, address))
            conn.commit()
        else:
            conn.rollback()
            log_dml_error('INSERT', 'employees', e, user_id=user_id, data=data)
            conn.close()
            return jsonify({'error': 'Failed to add employee'}), 500
    emp_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
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
        existing_employee = conn.execute('SELECT name FROM employees WHERE phone = ? AND user_id = ? AND employee_id != ?', (mobile, user_id, employee_id)).fetchone()
        if existing_employee:
            conn.close()
            return jsonify({'error': f'Mobile number {mobile} is already assigned to employee "{existing_employee["name"]}"'}), 400
    
    try:
        conn.execute('UPDATE employees SET name = ?, phone = ?, address = ?, position = ? WHERE employee_id = ? AND user_id = ?', (name, mobile, address, position, employee_id, user_id))
        conn.commit()
    except Exception as e:
        if 'no such column' in str(e).lower() and 'position' in str(e).lower():
            # Legacy DB without position column
            conn.rollback()
            conn.execute('UPDATE employees SET name = ?, phone = ?, address = ? WHERE employee_id = ? AND user_id = ?', (name, mobile, address, employee_id, user_id))
            conn.commit()
        else:
            conn.rollback()
            log_dml_error('UPDATE', 'employees', e, user_id=user_id, data=data)
            conn.close()
            return jsonify({'error': 'Failed to update employee'}), 500
    conn.close()
    return jsonify({'message': 'Employee updated successfully'})

@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    user_id = get_current_user_id()
    conn = get_db_connection()
    conn.execute('DELETE FROM employees WHERE employee_id = ? AND user_id = ?', (employee_id, user_id))
    conn.commit()
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
            conn.execute('BEGIN TRANSACTION')
            
            # Find all bills for today with the new format
            bills = conn.execute("""
                SELECT bill_number FROM bills WHERE bill_number LIKE ? AND user_id = ?
                ORDER BY bill_number DESC
            """, (f'BILL-{today}-%', user_id)).fetchall()
            
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
            existing = conn.execute("""
                SELECT COUNT(*) as count FROM bills WHERE bill_number = ? AND user_id = ?
            """, (bill_number, user_id)).fetchone()
            
            if existing['count'] == 0:
                conn.commit()
                conn.close()
                return jsonify({'bill_number': bill_number})
            else:
                # If bill number exists, increment and try again
                max_seq += 1
                next_seq = max_seq + 1
                bill_number = f'BILL-{today}-{next_seq:03d}'
                conn.commit()
                conn.close()
                return jsonify({'bill_number': bill_number})
                
        except Exception as e:
            conn.rollback()
            conn.close()
            if attempt == max_retries - 1:
                # Last attempt failed, generate a unique bill number with timestamp
                import time
                timestamp = int(time.time() * 1000) % 10000  # Last 4 digits of timestamp
                bill_number = f'BILL-{today}-{timestamp:04d}'
                return jsonify({'bill_number': bill_number})
            time.sleep(0.1)  # Small delay before retry

@app.route('/api/employee-analytics', methods=['GET'])
def employee_analytics():
    user_id = get_current_user_id()
    conn = get_db_connection()
    # Top 5 employees by revenue
    top5 = conn.execute('''
        SELECT e.name, COALESCE(SUM(b.total_amount), 0) as total_revenue
        FROM employees e
        LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
        WHERE e.user_id = ?
        GROUP BY e.employee_id
        ORDER BY total_revenue DESC
        LIMIT 5
    ''', (user_id,)).fetchall()
    # Revenue share for all employees
    shares = conn.execute('''
        SELECT e.name, COALESCE(SUM(b.total_amount), 0) as total_revenue
        FROM employees e
        LEFT JOIN bills b ON e.employee_id = b.master_id AND b.user_id = e.user_id
        WHERE e.user_id = ?
        GROUP BY e.employee_id
        ORDER BY total_revenue DESC
    ''', (user_id,)).fetchall()
    conn.close()
    return jsonify({
        'top5': [dict(row) for row in top5],
        'shares': [dict(row) for row in shares]
    })

# Helper: zip the database file in memory
def zip_db():
    mem_zip = BytesIO()
    with zipfile.ZipFile(mem_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write('pos_tailor.db', arcname='pos_tailor.db')
    mem_zip.seek(0)
    return mem_zip



# Plan Management API
@app.route('/api/plan/status', methods=['GET'])
def get_plan_status():
    """Get current user plan status and enabled features."""
    try:
        conn = get_db_connection()
        # Get the most recent active plan for user_id = 1
        user_plan = conn.execute('''
            SELECT * FROM user_plans 
            WHERE user_id = 1 AND is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        ''').fetchone()
        conn.close()
        
        if not user_plan:
            # Create default trial plan if none exists
            conn = get_db_connection()
            conn.execute('INSERT INTO user_plans (user_id, plan_type, plan_start_date) VALUES (1, ?, ?)', 
                        ('trial', datetime.now().strftime('%Y-%m-%d')))
            conn.commit()
            conn.close()
            
            user_plan = {
                'plan_type': 'trial',
                'plan_start_date': datetime.now().strftime('%Y-%m-%d')
            }
        else:
            user_plan = dict(user_plan)
        
        plan_status = plan_manager.get_user_plan_status(
            user_plan['plan_type'], 
            user_plan['plan_start_date']
        )
        
        # Add upgrade options
        upgrade_options = plan_manager.get_upgrade_options(user_plan['plan_type'])
        plan_status['upgrade_options'] = upgrade_options
        
        # Add expiry warnings
        warnings = plan_manager.get_expiry_warnings(
            user_plan['plan_type'], 
            user_plan['plan_start_date']
        )
        plan_status['warnings'] = warnings
        
        return jsonify(plan_status)
        
    except Exception as e:
        print(f"Error in get_plan_status: {e}")  # Add logging
        return jsonify({'error': str(e)}), 500

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
        conn.execute('''
            UPDATE user_plans
            SET plan_type = ?, plan_start_date = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = 1
        ''', (new_plan, datetime.now().strftime('%Y-%m-%d')))
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'Successfully upgraded to {new_plan} plan',
            'plan_type': new_plan,
            'start_date': datetime.now().strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plan/features', methods=['GET'])
def get_enabled_features():
    """Get list of enabled features for current user."""
    try:
        conn = get_db_connection()
        # Get the most recent active plan for user_id = 1
        user_plan = conn.execute('''
            SELECT * FROM user_plans 
            WHERE user_id = 1 AND is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        ''').fetchone()
        conn.close()
        
        if not user_plan:
            return jsonify({'enabled_features': [], 'locked_features': []})
        
        user_plan = dict(user_plan)
        plan_status = plan_manager.get_user_plan_status(
            user_plan['plan_type'], 
            user_plan['plan_start_date']
        )
        
        return jsonify({
            'enabled_features': plan_status.get('enabled_features', []),
            'locked_features': plan_status.get('locked_features', []),
            'plan_type': user_plan['plan_type'],
            'expired': plan_status.get('expired', False)
        })
        
    except Exception as e:
        print(f"Error in get_enabled_features: {e}")  # Add logging
        return jsonify({'error': str(e)}), 500

@app.route('/api/plan/check-feature/<feature>', methods=['GET'])
def check_feature_access(feature):
    """Check if a specific feature is enabled for current user."""
    try:
        conn = get_db_connection()
        user_plan = conn.execute('SELECT * FROM user_plans WHERE user_id = 1 AND is_active = 1').fetchone()
        conn.close()
        
        if not user_plan:
            return jsonify({'enabled': False, 'reason': 'No active plan'})
        
        user_plan = dict(user_plan)
        is_enabled = plan_manager.is_feature_enabled(
            user_plan['plan_type'], 
            user_plan['plan_start_date'], 
            feature
        )
        
        return jsonify({
            'enabled': is_enabled,
            'feature': feature,
            'plan_type': user_plan['plan_type']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        return jsonify({'error': str(e)}), 500

@app.route('/api/plan/expire-trial', methods=['POST'])
def expire_trial():
    """Expire trial for testing purposes."""
    try:
        data = request.get_json()
        days_ago = data.get('days_ago', 16)
        
        conn = get_db_connection()
        conn.execute('''
            UPDATE user_plans 
            SET plan_start_date = date('now', '-{} days')
            WHERE user_id = 1 AND plan_type = 'trial' AND is_active = 1
        '''.format(days_ago))
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'Trial expired (set to {days_ago} days ago)',
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plan/reset-trial', methods=['POST'])
def reset_trial():
    """Reset trial to today for testing purposes."""
    try:
        conn = get_db_connection()
        conn.execute('''
            UPDATE user_plans 
            SET plan_start_date = date('now')
            WHERE user_id = 1 AND plan_type = 'trial' AND is_active = 1
        ''')
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Trial reset to today',
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug-plan')
def debug_plan():
    """Debug page for plan management."""
    user_plan_info = get_user_plan_info()
    return render_template('debug_plan.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/login')
def login():
    """Login page for multi-tenant system."""
    return render_template('login.html',
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/setup-wizard')
def setup_wizard():
    """Setup wizard for new clients."""
    user_plan_info = get_user_plan_info()
    return render_template('setup_wizard.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/setup')
def setup():
    """Alternative setup route."""
    user_plan_info = get_user_plan_info()
    return render_template('setup_wizard.html', 
                        user_plan_info=user_plan_info,
                        get_user_language=get_user_language,
                        get_translated_text=get_translated_text)

@app.route('/api/setup-wizard', methods=['POST'])
def handle_setup_wizard():
    """Handle setup wizard data submission."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['shopType', 'shopName', 'shopOwner', 'contactNumber', 'selectedPlan']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'Missing required field: {field}'})
        
        # Calculate expiry date based on plan
        from datetime import datetime, timedelta
        
        if data['selectedPlan'] == 'trial':
            expiry_date = datetime.now() + timedelta(days=15)
            plan_type = 'trial'
        elif data['selectedPlan'] == 'basic':
            expiry_date = datetime.now() + timedelta(days=365)
            plan_type = 'basic'
        elif data['selectedPlan'] == 'pro':
            expiry_date = datetime.now() + timedelta(days=365)
            plan_type = 'pro'
        else:
            return jsonify({'success': False, 'message': 'Invalid plan selected'})
        
        conn = get_db_connection()
        
        # Generate unique shop code (retry to avoid rare collisions)
        import random
        import string
        def generate_shop_code():
            return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Prepare inputs
        contact_number_raw = (data.get('contactNumber') or '').strip()
        contact_number_digits = re.sub(r'\D', '', contact_number_raw)
        if not contact_number_digits:
            conn.close()
            return jsonify({'success': False, 'message': 'Contact number must contain digits'}), 400
        
        default_password = "kyuaykha123"  # Default password
        password_hash = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt())
        
        # Normalize email: if empty, use fallback
        provided_email = (data.get('emailAddress') or '').strip()
        # Shop code may be needed for fallback email; generate with collision check
        attempts = 0
        while True:
            attempts += 1
            shop_code = generate_shop_code()
            # Check uniqueness of shop_code
            existing = conn.execute('SELECT 1 FROM users WHERE shop_code = ?', (shop_code,)).fetchone()
            if not existing:
                break
            if attempts > 5:
                conn.close()
                return jsonify({'success': False, 'message': 'Failed to generate unique shop code. Please try again.'}), 500
        
        user_email = provided_email if provided_email else f"shop_{shop_code}@tailorpos.com"
        
        # Insert new user
        try:
            cursor = conn.execute('''
                INSERT INTO users (email, mobile, shop_code, password_hash, shop_name, shop_type, contact_number, email_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_email,
                contact_number_digits,
                shop_code,
                password_hash.decode('utf-8'),
                data['shopName'],
                data['shopType'],
                contact_number_digits,
                user_email
            ))
        except sqlite3.IntegrityError as ie:
            # Determine which unique constraint failed
            message = str(ie)
            friendly = 'Setup failed due to duplicate data.'
            if 'users.email' in message:
                friendly = 'This email is already registered. Please use a different email.'
            elif 'users.mobile' in message:
                friendly = 'This contact number is already registered. Please use a different number.'
            elif 'users.shop_code' in message:
                friendly = 'Generated shop code collided. Please try again.'
            conn.close()
            return jsonify({'success': False, 'message': friendly}), 400
        
        new_user_id = cursor.lastrowid
        
        # Create shop settings for new user with TRN, address, and dynamic template enabled
        conn.execute('''
            INSERT INTO shop_settings (user_id, shop_name, shop_mobile, trn, address, invoice_static_info, use_dynamic_invoice_template)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            new_user_id, 
            data['shopName'], 
            contact_number_digits, 
            data.get('trn', ''),
            data.get('address', ''),
            f"Shop Type: {data['shopType']}",
            1  # Enable dynamic invoice template by default
        ))
        
        # Create shop owner as employee with "Owner" position
        conn.execute('''
            INSERT INTO employees (user_id, name, phone, address, position, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            new_user_id,
            data['shopOwner'],
            contact_number_digits,
            data.get('address', ''),
            'Owner',
            1
        ))
        
        # Create user plan for new user
        conn.execute('''
            INSERT INTO user_plans (user_id, plan_type, plan_start_date, plan_end_date)
            VALUES (?, ?, CURRENT_DATE, ?)
        ''', (new_user_id, plan_type, expiry_date.strftime('%Y-%m-%d')))
        
        # Create default VAT rate (5% from 2018-01-01)
        conn.execute('''
            INSERT INTO vat_rates (user_id, rate_percentage, effective_from, effective_to, is_active)
            VALUES (?, ?, ?, ?, ?)
        ''', (new_user_id, 5.00, '2018-01-01', '2099-12-31', 1))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Setup completed successfully',
            'plan_type': plan_type,
            'expiry_date': expiry_date.strftime('%Y-%m-%d'),
            'shop_code': shop_code,
            'password': default_password,
            'emailAddress': user_email
        })
        
    except Exception as e:
        print(f"Setup wizard error: {e}")
        try:
            conn.close()
        except:
            pass
        return jsonify({'success': False, 'message': 'Setup failed. Please try again.'})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Handle user login with multiple methods."""
    try:
        data = request.get_json()
        method = data.get('method')
        
        # Log login attempt
        log_user_action("LOGIN_ATTEMPT", None, {
            'method': method,
            'timestamp': datetime.now().isoformat()
        })
        
        conn = get_db_connection()
        
        if method == 'email':
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return jsonify({'success': False, 'message': 'Email and password required'})
            
            user = conn.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', (email,)).fetchone()
            
            if not user:
                return jsonify({'success': False, 'message': 'Invalid email or password'})
            
            import bcrypt
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'success': False, 'message': 'Invalid email or password'})
                
        elif method == 'mobile':
            mobile = data.get('mobile')
            otp = data.get('otp')
            
            if not mobile or not otp:
                return jsonify({'success': False, 'message': 'Mobile and OTP required'})
            
            # Verify OTP
            otp_record = conn.execute('''
                SELECT * FROM otp_codes 
                WHERE mobile = ? AND otp_code = ? AND is_used = 0 AND expires_at > CURRENT_TIMESTAMP
                ORDER BY created_at DESC LIMIT 1
            ''', (mobile, otp)).fetchone()
            
            if not otp_record:
                return jsonify({'success': False, 'message': 'Invalid or expired OTP'})
            
            # Mark OTP as used
            conn.execute('UPDATE otp_codes SET is_used = 1 WHERE id = ?', (otp_record['id'],))
            
            user = conn.execute('SELECT * FROM users WHERE mobile = ? AND is_active = 1', (mobile,)).fetchone()
            
            if not user:
                return jsonify({'success': False, 'message': 'No account found with this mobile number'})
                
        elif method == 'shop_code':
            shop_code = data.get('shop_code')
            password = data.get('password')
            
            if not shop_code or not password:
                return jsonify({'success': False, 'message': 'Shop code and password required'})
            
            user = conn.execute('SELECT * FROM users WHERE shop_code = ? AND is_active = 1', (shop_code,)).fetchone()
            
            if not user:
                return jsonify({'success': False, 'message': 'Invalid shop code or password'})
            
            import bcrypt
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'success': False, 'message': 'Invalid shop code or password'})
        else:
            return jsonify({'success': False, 'message': 'Invalid login method'})
        
        # Set session data (you might want to use Flask-Session or JWT tokens)
        # For now, we'll store user info in session
        from flask import session
        session['user_id'] = user['user_id']
        session['shop_name'] = user['shop_name']
        session['shop_code'] = user['shop_code']
        
        # Log successful login
        log_user_action("LOGIN_SUCCESS", user['user_id'], {
            'shop_name': user['shop_name'],
            'shop_code': user['shop_code'],
            'method': method,
            'timestamp': datetime.now().isoformat()
        })
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'user_id': user['user_id'],
                'shop_name': user['shop_name'],
                'shop_code': user['shop_code']
            }
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'Login failed. Please try again.'})

@app.route('/api/account/password', methods=['PUT'])
def change_password():
    """Change current user's password (requires current password)."""
    try:
        data = request.get_json() or {}
        current_password = (data.get('current_password') or '').strip()
        new_password = (data.get('new_password') or '').strip()

        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401

        if not current_password or not new_password:
            return jsonify({'success': False, 'message': 'Current and new password are required'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'New password must be at least 6 characters'}), 400

        conn = get_db_connection()
        user = conn.execute('SELECT user_id, password_hash FROM users WHERE user_id = ? AND is_active = 1', (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': 'User not found'}), 404

        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            conn.close()
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        conn.execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', (new_hash, user_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Password updated successfully'})
    except Exception as e:
        print(f"Change password error: {e}")
        return jsonify({'success': False, 'message': 'Failed to change password'}), 500

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to mobile number."""
    try:
        data = request.get_json()
        mobile = data.get('mobile')
        
        if not mobile:
            return jsonify({'success': False, 'message': 'Mobile number required'})
        
        # Generate 6-digit OTP
        import random
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Store OTP in database (expires in 10 minutes)
        from datetime import datetime, timedelta
        expires_at = datetime.now() + timedelta(minutes=10)
        
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO otp_codes (mobile, otp_code, expires_at)
            VALUES (?, ?, ?)
        ''', (mobile, otp, expires_at))
        conn.commit()
        conn.close()
        
        # In production, you would integrate with SMS service here
        # For demo purposes, we'll just return the OTP
        print(f"OTP for {mobile}: {otp}")
        
        return jsonify({
            'success': True,
            'message': 'OTP sent successfully',
            'otp': otp  # Remove this in production
        })
        
    except Exception as e:
        print(f"Send OTP error: {e}")
        return jsonify({'success': False, 'message': 'Failed to send OTP'})

@app.route('/api/language/switch', methods=['POST'])
def switch_language():
    """Switch user language preference"""
    try:
        data = request.get_json()
        language = data.get('language', 'en')
        
        if language not in ['en', 'ar']:
            return jsonify({'error': 'Invalid language'}), 400
        
        set_user_language(language)
        
        return jsonify({
            'success': True, 
            'language': language,
            'message': get_translated_text('language_switched', language)
        })
        
    except Exception as e:
        print(f"DEBUG: Error in switch_language: {e}")
        return jsonify({'error': 'Failed to switch language'}), 500

@app.route('/api/language/current', methods=['GET'])
def get_current_language():
    """Get current user language preference"""
    try:
        language = get_user_language()
        return jsonify({
            'success': True,
            'language': language,
            'is_rtl': language == 'ar'
        })
        
    except Exception as e:
        print(f"DEBUG: Error in get_current_language: {e}")
        return jsonify({'error': 'Failed to get language preference'}), 500

@app.route('/api/reports/invoices', methods=['GET'])
def report_invoices():
    """
    Returns filtered invoice data for the Advanced Reports section.
    Accepts query parameters: from_date, to_date, products, employees, city, area, status, client_id
    """
    try:
        # Parse query parameters with defaults
        from_date = request.args.get('from_date', '')
        to_date = request.args.get('to_date', '')
        products = request.args.getlist('products[]')  # Multiple products
        employees = request.args.getlist('employees[]')  # Multiple employees
        city = request.args.get('city', '')
        area = request.args.get('area', '')
        status = request.args.get('status', '')
        client_id = request.args.get('client_id', '')
        
        # Build SQL query with filters
        base_query = """
            SELECT 
                b.bill_number,
                b.bill_date,
                b.customer_name,
                b.customer_phone,
                b.customer_city,
                b.customer_area,
                b.delivery_date,
                round(b.subtotal,0) as subtotal,
                round(b.vat_amount, 2) as vat_amount,
                round(b.total_amount, 2) as total_amount,
                b.status,
                b.master_id,
                e.name as employee_name,
                GROUP_CONCAT(bi.product_name) as products,
                GROUP_CONCAT(bi.quantity) as quantities,
                GROUP_CONCAT(bi.rate) as prices
            FROM bills b
            LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
            LEFT JOIN employees e ON b.master_id = e.employee_id
        """
        
        conditions = []
        params = []
        
        # Client ID filter (most important)
        if client_id:
            conditions.append("b.user_id = ?")
            params.append(client_id)
        
        # Date range filter
        if from_date:
            conditions.append("b.bill_date >= ?")
            params.append(from_date)
        if to_date:
            conditions.append("b.bill_date <= ?")
            params.append(to_date)
        
        # Products filter
        if products and "All" not in products:
            placeholders = ','.join(['?' for _ in products])
            conditions.append(f"bi.product_name IN ({placeholders})")
            params.extend(products)
        
        # Employees filter
        if employees and "All" not in employees:
            placeholders = ','.join(['?' for _ in employees])
            conditions.append(f"e.name IN ({placeholders})")
            params.extend(employees)
        
        # City filter
        if city and city != "All":
            conditions.append("b.customer_city = ?")
            params.append(city)
        
        # Area filter
        if area and area != "All":
            conditions.append("b.customer_area = ?")
            params.append(area)
        
        # Status filter
        if status and status != "All":
            conditions.append("b.status = ?")
            params.append(status)
            
        # Build final query
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
            
        base_query += " GROUP BY b.bill_id ORDER BY b.bill_date DESC LIMIT 50"
        
        # Execute query and fetch results
        cursor = get_db_connection().cursor()
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        # Format results for JSON response
        invoices_data = []
        for row in rows:
            invoice = {
                'bill_number': row[0],
                'bill_date': row[1],
                'customer_name': row[2],
                'customer_phone': row[3],
                'customer_city': row[4],
                'customer_area': row[5],
                'delivery_date': row[6],
                'subtotal': round(float(row[7]), 2) if row[7] is not None else 0.0,
                'vat_amount': round(float(row[8]), 2) if row[8] is not None else 0.0,
                'total_amount': round(float(row[9]), 2) if row[9] is not None else 0.0,
                'status': row[10],
                'master_id': row[11],
                'employee_name': row[12],
                'products': row[13].split(',') if row[13] else [],
                'quantities': [int(q) for q in row[14].split(',')] if row[14] else [],
                'prices': [float(p) for p in row[15].split(',')] if row[15] else []
            }
            invoices_data.append(invoice)
        
        # Calculate summary statistics
        total_invoices = len(invoices_data)
        total_amount = sum(inv['total_amount'] for inv in invoices_data)
        paid_invoices = len([inv for inv in invoices_data if inv['status'] == 'Paid'])
        
        return jsonify({
            'success': True,
            'invoices': invoices_data,  # Changed from 'data' to 'invoices'
            'summary': {
                'total_invoices': total_invoices,
                'total_amount': total_amount,
                'paid_invoices': paid_invoices,
                'pending_invoices': total_invoices - paid_invoices
            },
            'filters_applied': {
                'from_date': from_date,
                'to_date': to_date,
                'products': products,
                'employees': employees,
                'city': city,
                'area': area,
                'status': status,
                'client_id': client_id
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/invoices/download', methods=['GET'])
def download_invoices():
    """
    Returns all filtered invoice data as a CSV file for download.
    Accepts the same query parameters as /api/reports/invoices.
    """
    try:
        from_date = request.args.get('from_date', '')
        to_date = request.args.get('to_date', '')
        products = request.args.getlist('products[]')
        employees = request.args.getlist('employees[]')
        city = request.args.get('city', '')
        area = request.args.get('area', '')
        status = request.args.get('status', '')
        client_id = request.args.get('client_id', '2')  # Default to client_id 2 for testing
        base_query = """
            SELECT 
                b.bill_number as bill_id,
                b.bill_date,
                b.customer_name,
                b.customer_phone,
                b.customer_city,
                b.customer_area,
                b.delivery_date,
                b.subtotal,
                b.vat_amount,
                b.total_amount,
                b.status,
                b.master_id,
                e.name as employee_name,
                GROUP_CONCAT(bi.product_name) as products,
                GROUP_CONCAT(bi.quantity) as quantities,
                GROUP_CONCAT(bi.rate) as prices
            FROM bills b
            LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
            LEFT JOIN employees e ON b.master_id = e.employee_id
            WHERE b.user_id = ?
        """
        conditions = []
        params = [client_id]
        if from_date:
            conditions.append("b.bill_date >= ?")
            params.append(from_date)
        if to_date:
            conditions.append("b.bill_date <= ?")
            params.append(to_date)
        if products and "All" not in products:
            placeholders = ','.join(['?' for _ in products])
            conditions.append(f"bi.product_name IN ({placeholders})")
            params.extend(products)
        if employees and "All" not in employees:
            placeholders = ','.join(['?' for _ in employees])
            conditions.append(f"e.name IN ({placeholders})")
            params.extend(employees)
        if city and city != "All":
            conditions.append("b.customer_city = ?")
            params.append(city)
        if area and area != "All":
            conditions.append("b.customer_area = ?")
            params.append(area)
        if status and status != "All":
            conditions.append("b.status = ?")
            params.append(status)
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        base_query += " GROUP BY b.bill_id ORDER BY b.bill_date DESC"
        cursor = get_db_connection().cursor()
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow([
            'Bill#', 'Bill Date', 'Customer Name', 'Delivery Date',
            'Total Before VAT', 'VAT', 'Total After VAT', 'Status', 'Products'
        ])
        for row in rows:
            products = row[13].split(',') if row[13] else []
            writer.writerow([
                row[0], row[1], row[2], row[6],
                round(float(row[7]), 2) if row[7] is not None else 0.0,
                round(float(row[8]), 2) if row[8] is not None else 0.0,
                round(float(row[9]), 2) if row[9] is not None else 0.0,
                row[10],
                ', '.join(products)
            ])
        output = si.getvalue()
        si.close()
        return Response(
            output,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=invoices_report.csv"}
        )
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/invoices/print')
def print_invoices():
    from_date = request.args.get('from_date', '')
    to_date = request.args.get('to_date', '')
    products = request.args.getlist('products[]')
    employees = request.args.getlist('employees[]')
    city = request.args.get('city', '')
    area = request.args.get('area', '')
    status = request.args.get('status', '')

    base_query = """
        SELECT 
            b.bill_number as bill_id,
            b.bill_date,
            b.customer_name,
            b.customer_phone,
            b.customer_city,
            b.customer_area,
            b.delivery_date,
            b.subtotal,
            b.vat_amount,
            b.total_amount,
            b.status,
            b.master_id,
            e.name as employee_name,
            GROUP_CONCAT(bi.product_name) as products,
            GROUP_CONCAT(bi.quantity) as quantities,
            GROUP_CONCAT(bi.rate) as prices
        FROM bills b
        LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
        LEFT JOIN employees e ON b.master_id = e.employee_id
    """
    conditions = []
    params = []
    if from_date:
        conditions.append("b.bill_date >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("b.bill_date <= ?")
        params.append(to_date)
    if products and "All" not in products:
        placeholders = ','.join(['?' for _ in products])
        conditions.append(f"bi.product_name IN ({placeholders})")
        params.extend(products)
    if employees and "All" not in employees:
        placeholders = ','.join(['?' for _ in employees])
        conditions.append(f"e.name IN ({placeholders})")
        params.extend(employees)
    if city and city != "All":
        conditions.append("b.customer_city = ?")
        params.append(city)
    if area and area != "All":
        conditions.append("b.customer_area = ?")
        params.append(area)
    if status and status != "All":
        conditions.append("b.status = ?")
        params.append(status)
    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)
    base_query += " GROUP BY b.bill_id ORDER BY b.bill_date DESC"
    cursor = get_db_connection().cursor()
    cursor.execute(base_query, params)
    rows = cursor.fetchall()
    invoices_data = []
    for row in rows:
        invoices_data.append({
            'bill_id': row[0],
            'bill_date': row[1],
            'customer_name': row[2],
            'customer_phone': row[3],
            'customer_city': row[4],
            'customer_area': row[5],
            'delivery_date': row[6],
            'total_before_vat': round(float(row[7]), 2) if row[7] is not None else 0.0,
            'vat': round(float(row[8]), 2) if row[8] is not None else 0.0,
            'total_after_vat': round(float(row[9]), 2) if row[9] is not None else 0.0,
            'status': row[10],
            'products': row[13].split(',') if row[13] else []
        })
    return render_template('print_invoices.html', invoices=invoices_data)

@app.route('/api/reports/employees', methods=['GET'])
def report_employees():
    """
    Returns filtered employee report data for the Advanced Reports section.
    Accepts query parameters: from_date, to_date, products, city, area, status, client_id
    """
    try:
        from_date = request.args.get('from_date', '')
        to_date = request.args.get('to_date', '')
        products = request.args.getlist('products[]')
        city = request.args.get('city', '')
        area = request.args.get('area', '')
        status = request.args.get('status', '')
        client_id = request.args.get('client_id', '')

        base_query = """
            SELECT 
                e.employee_id,
                e.name as employee_name,
                COUNT(DISTINCT b.bill_id) as bills_handled,
                SUM(b.total_amount) as total_billed,
                GROUP_CONCAT(DISTINCT bi.product_name) as products
            FROM employees e
            LEFT JOIN bills b ON e.employee_id = b.master_id
            LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
        """

        conditions = []
        params = []

        # Client ID filter (most important)
        if client_id:
            conditions.append("e.user_id = ?")
            params.append(client_id)

        if from_date:
            conditions.append("b.bill_date >= ?")
            params.append(from_date)
        if to_date:
            conditions.append("b.bill_date <= ?")
            params.append(to_date)
        if products and "All" not in products:
            placeholders = ','.join(['?' for _ in products])
            conditions.append(f"bi.product_name IN ({placeholders})")
            params.extend(products)
        if city and city != "All":
            conditions.append("b.customer_city = ?")
            params.append(city)
        if area and area != "All":
            conditions.append("b.customer_area = ?")
            params.append(area)
        if status and status != "All":
            conditions.append("b.status = ?")
            params.append(status)

        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        base_query += " GROUP BY e.employee_id, e.name ORDER BY total_billed DESC"

        cursor = get_db_connection().cursor()
        cursor.execute(base_query, params)
        rows = cursor.fetchall()

        employees_data = []
        for row in rows:
            employees_data.append({
                'employee_id': row[0],
                'name': row[1],  # Changed to match frontend expectation
                'bills_handled': row[2] or 0,
                'total_billed': round(float(row[3]), 2) if row[3] is not None else 0.0,
                'products_handled': row[4].split(',') if row[4] else []  # Changed to match frontend
            })

        return jsonify({
            'success': True,
            'employees': employees_data,  # Changed from 'data' to 'employees'
            'filters_applied': {
                'from_date': from_date,
                'to_date': to_date,
                'products': products,
                'city': city,
                'area': area,
                'status': status,
                'client_id': client_id
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/products', methods=['GET'])
def report_products():
    try:
        # Get filter parameters
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        product_type = request.args.get('product_type')
        city = request.args.get('city')
        area = request.args.get('area')
        status = request.args.get('status')
        client_id = request.args.get('client_id', '')
        
        # Build base query
        base_query = """
            SELECT 
                p.product_name,
                pt.type_name as product_type,
                SUM(bi.quantity) as total_quantity,
                SUM(bi.total_amount) as total_revenue
            FROM bill_items bi
            JOIN products p ON bi.product_id = p.product_id
            JOIN product_types pt ON p.type_id = pt.type_id
            JOIN bills b ON bi.bill_id = b.bill_id
            WHERE 1=1
        """
        
        params = []
        
        # Client ID filter (most important)
        if client_id:
            base_query += " AND b.user_id = ?"
            params.append(client_id)
        
        # Add filters
        if from_date:
            base_query += " AND b.bill_date >= ?"
            params.append(from_date)
        
        if to_date:
            base_query += " AND b.bill_date <= ?"
            params.append(to_date)
        
        if product_type and product_type != "All":
            base_query += " AND pt.type_name = ?"
            params.append(product_type)
        
        if city and city != "All":
            base_query += " AND b.customer_city = ?"
            params.append(city)
        
        if area and area != "All":
            base_query += " AND b.customer_area = ?"
            params.append(area)
        
        if status and status != "All":
            base_query += " AND b.status = ?"
            params.append(status)
        
        base_query += " GROUP BY p.product_id, p.product_name, pt.type_name ORDER BY total_revenue DESC"
        
        cursor = get_db_connection().cursor()
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        products = []
        for row in rows:
            products.append({
                'product_name': row[0],
                'type_name': row[1],  # Changed to match frontend expectation
                'total_quantity': row[2],
                'total_revenue': round(float(row[3]), 2)
            })
        
        return jsonify({
            'success': True,
            'products': products
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/shop-settings', methods=['GET'])
def get_shop_settings():
    """Get current shop settings."""
    try:
        user_id = get_current_user_id()
        conn = get_db_connection()
        settings = conn.execute('SELECT * FROM shop_settings WHERE user_id = ?', (user_id,)).fetchone()
        conn.close()
        
        if settings:
            return jsonify({
                'success': True,
                'settings': dict(settings)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Shop settings not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/shop-settings', methods=['PUT'])
def update_shop_settings():
    """Update shop settings."""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        shop_name = data.get('shop_name', '')
        address = data.get('address', '')
        trn = data.get('trn', '')
        city = data.get('city', '')
        area = data.get('area', '')
        logo_url = data.get('logo_url', '')
        shop_mobile = data.get('shop_mobile', '')
        working_hours = data.get('working_hours', '')
        invoice_static_info = data.get('invoice_static_info', '')
        use_dynamic_invoice_template = data.get('use_dynamic_invoice_template', False)
        
        conn = get_db_connection()
        
        # Check if shop settings exist for this user
        existing_settings = conn.execute('SELECT setting_id FROM shop_settings WHERE user_id = ?', (user_id,)).fetchone()
        
        if existing_settings:
            # Update existing shop settings
            conn.execute('''
                UPDATE shop_settings 
                SET shop_name = ?, address = ?, trn = ?, city = ?, area = ?, logo_url = ?, 
                    shop_mobile = ?, working_hours = ?, invoice_static_info = ?,
                    use_dynamic_invoice_template = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (shop_name, address, trn, city, area, logo_url, shop_mobile, working_hours, 
                  invoice_static_info, use_dynamic_invoice_template, user_id))
        else:
            # Create new shop settings for this user
            conn.execute('''
                INSERT INTO shop_settings (user_id, shop_name, address, trn, city, area, logo_url, 
                    shop_mobile, working_hours, invoice_static_info, use_dynamic_invoice_template)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, shop_name, address, trn, city, area, logo_url, shop_mobile, working_hours, 
                  invoice_static_info, use_dynamic_invoice_template))
        
        conn.commit()
        conn.close()
        
        # Log shop settings update
        log_user_action("UPDATE_SHOP_SETTINGS", user_id, {
            'shop_name': shop_name,
            'trn': trn,
            'city': city,
            'area': area,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': 'Shop settings updated successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Arabic Language Support
def number_to_arabic_words(number):
    """Convert number to Arabic words"""
    if number == 0:
        return "╪╡┘ü╪▒"
    
    # Arabic number words
    ones = {
        0: "", 1: "┘ê╪º╪¡╪»", 2: "╪º╪½┘å╪º┘å", 3: "╪½┘ä╪º╪½╪⌐", 4: "╪ú╪▒╪¿╪╣╪⌐", 5: "╪«┘à╪│╪⌐",
        6: "╪│╪¬╪⌐", 7: "╪│╪¿╪╣╪⌐", 8: "╪½┘à╪º┘å┘è╪⌐", 9: "╪¬╪│╪╣╪⌐", 10: "╪╣╪┤╪▒╪⌐",
        11: "╪ú╪¡╪» ╪╣╪┤╪▒", 12: "╪º╪½┘å╪º ╪╣╪┤╪▒", 13: "╪½┘ä╪º╪½╪⌐ ╪╣╪┤╪▒", 14: "╪ú╪▒╪¿╪╣╪⌐ ╪╣╪┤╪▒", 15: "╪«┘à╪│╪⌐ ╪╣╪┤╪▒",
        16: "╪│╪¬╪⌐ ╪╣╪┤╪▒", 17: "╪│╪¿╪╣╪⌐ ╪╣╪┤╪▒", 18: "╪½┘à╪º┘å┘è╪⌐ ╪╣╪┤╪▒", 19: "╪¬╪│╪╣╪⌐ ╪╣╪┤╪▒"
    }
    
    tens = {
        2: "╪╣╪┤╪▒┘ê┘å", 3: "╪½┘ä╪º╪½┘ê┘å", 4: "╪ú╪▒╪¿╪╣┘ê┘å", 5: "╪«┘à╪│┘ê┘å",
        6: "╪│╪¬┘ê┘å", 7: "╪│╪¿╪╣┘ê┘å", 8: "╪½┘à╪º┘å┘ê┘å", 9: "╪¬╪│╪╣┘ê┘å"
    }
    
    hundreds = {
        1: "┘à╪º╪ª╪⌐", 2: "┘à╪ª╪¬╪º┘å", 3: "╪½┘ä╪º╪½┘à╪º╪ª╪⌐", 4: "╪ú╪▒╪¿╪╣┘à╪º╪ª╪⌐", 5: "╪«┘à╪│┘à╪º╪ª╪⌐",
        6: "╪│╪¬┘à╪º╪ª╪⌐", 7: "╪│╪¿╪╣┘à╪º╪ª╪⌐", 8: "╪½┘à╪º┘å┘à╪º╪ª╪⌐", 9: "╪¬╪│╪╣┘à╪º╪ª╪⌐"
    }
    
    def convert_less_than_one_thousand(n):
        if n == 0:
            return ""
        
        if n < 20:
            return ones[n]
        
        if n < 100:
            if n % 10 == 0:
                return tens[n // 10]
            else:
                return ones[n % 10] + " ┘ê " + tens[n // 10]
        
        if n < 1000:
            if n % 100 == 0:
                return hundreds[n // 100]
            else:
                return hundreds[n // 100] + " ┘ê " + convert_less_than_one_thousand(n % 100)
    
    # Split into integer and decimal parts
    integer_part = int(number)
    decimal_part = round((number - integer_part) * 100)
    
    # Convert integer part
    if integer_part == 0:
        result = "╪╡┘ü╪▒"
    elif integer_part < 1000:
        result = convert_less_than_one_thousand(integer_part)
    else:
        # Handle thousands
        thousands_count = integer_part // 1000
        remainder = integer_part % 1000
        
        if thousands_count == 1:
            result = "╪ú┘ä┘ü"
        elif thousands_count == 2:
            result = "╪ú┘ä┘ü╪º┘å"
        elif thousands_count < 11:
            result = ones[thousands_count] + " ╪ó┘ä╪º┘ü"
        else:
            result = convert_less_than_one_thousand(thousands_count) + " ╪ú┘ä┘ü"
        
        if remainder > 0:
            result += " ┘ê " + convert_less_than_one_thousand(remainder)
    
    # Add currency
    result += " ╪»╪▒┘ç┘à"
    
    # Add decimal part if exists
    if decimal_part > 0:
        if decimal_part == 1:
            result += " ┘ê ┘ü┘ä╪│ ┘ê╪º╪¡╪»"
        else:
            result += " ┘ê " + convert_less_than_one_thousand(decimal_part) + " ┘ü┘ä╪│"
    
    result += " ┘ü┘é╪╖"
    return result

def get_user_language():
    """Get user's preferred language from session or default to English"""
    return session.get('language', 'en')

def set_user_language(language):
    """Set user's preferred language in session"""
    session['language'] = language

def translate_text(text, language='en'):
    """Translate text based on language"""
    translations = {
        'en': {
            # Navigation
            'app': 'App',
            'pricing': 'Pricing',
            'professional_business_management': 'Professional Business Management',
            'sign_in': 'Sign In',
            'sign_up': 'Sign Up',
            'logout': 'Logout',
            
            # Dashboard
            'dashboard': 'Dashboard',
            'total_revenue': 'Total Revenue',
            'total_bills': 'Total Bills',
            'total_customers': 'Total Customers',
            'total_products': 'Total Products',
            'recent_bills': 'Recent Bills',
            'top_products': 'Top Products',
            'employee_performance': 'Employee Performance',
            
            # Operations
            'operations': 'Operations',
            'billing': 'Billing',
            'products': 'Products',
            'customers': 'Customers',
            'employees': 'Employees',
            'vat_rates': 'VAT Rates',
            'advanced_reports': 'Advanced Reports',
            'shop_settings': 'Shop Settings',
            
            # Common Actions
            'add': 'Add',
            'edit': 'Edit',
            'delete': 'Delete',
            'save': 'Save',
            'cancel': 'Cancel',
            'close': 'Close',
            'search': 'Search',
            'filter': 'Filter',
            'download': 'Download',
            'print': 'Print',
            'preview': 'Preview',
            
            # Status
            'pending': 'Pending',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'paid': 'Paid',
            'unpaid': 'Unpaid',
            
            # Messages
            'success': 'Success',
            'error': 'Error',
            'warning': 'Warning',
            'info': 'Information',
            'loading': 'Loading...',
            'no_data_found': 'No data found',
            'are_you_sure': 'Are you sure?',
            'this_action_cannot_be_undone': 'This action cannot be undone',
            
            # Forms
            'name': 'Name',
            'phone': 'Phone',
            'email': 'Email',
            'address': 'Address',
            'city': 'City',
            'area': 'Area',
            'position': 'Position',
            'rate': 'Rate',
            'quantity': 'Quantity',
            'total': 'Total',
            'subtotal': 'Subtotal',
            'vat': 'VAT',
            'discount': 'Discount',
            'advance_paid': 'Advance Paid',
            'balance': 'Balance',
            'payment_method': 'Payment Method',
            'cash': 'Cash',
            'card': 'Card',
            'bank_transfer': 'Bank Transfer',
            
            # Reports
            'invoices': 'Invoices',
            'employees': 'Employees',
            'products': 'Products',
            'from_date': 'From Date',
            'to_date': 'To Date',
            'bill_number': 'Bill #',
            'bill_date': 'Bill Date',
            'delivery_date': 'Delivery Date',
            'customer_name': 'Customer Name',
            'status': 'Status',
            'amount': 'Amount',
            'revenue': 'Revenue',
            'performance': 'Performance',
            
            # Setup Wizard
            'shop_type': 'Shop Type',
            'shop_name': 'Shop Name',
            'contact_number': 'Contact Number',
            'choose_plan': 'Choose Plan',
            'trial': 'Trial',
            'basic': 'Basic',
            'pro': 'Pro',
            'days': 'Days',
            'year': 'Year',
            'next': 'Next',
            'previous': 'Previous',
            'finish': 'Finish',
            
            # Plans
            'trial_plan': 'Trial Plan',
            'basic_plan': 'Basic Plan',
            'pro_plan': 'Pro Plan',
            'enterprise_plan': 'Enterprise Plan',
            'features': 'Features',
            'upgrade': 'Upgrade',
            'current_plan': 'Current Plan',
            'plan_expires': 'Plan Expires',
            'unlimited': 'Unlimited',
            'limited': 'Limited',
            
            # Settings
            'settings': 'Settings',
            'logo_url': 'Logo URL',
            'working_hours': 'Working Hours',
            'static_info': 'Static Information',
            'invoice_template': 'Invoice Template',
            'dynamic_template': 'Dynamic Template',
            'static_template': 'Static Template',
            
            # Authentication
            'login': 'Login',
            'password': 'Password',
            'confirm_password': 'Confirm Password',
            'forgot_password': 'Forgot Password?',
            'remember_me': 'Remember Me',
            'dont_have_account': "Don't have an account?",
            'already_have_account': 'Already have an account?',
            'sign_up_here': 'Sign up here',
            'sign_in_here': 'Sign in here',
            'mobile_login': 'Mobile Login',
            'otp': 'OTP',
            'send_otp': 'Send OTP',
            'verify_otp': 'Verify OTP',
            'shop_code': 'Shop Code',
            'enter_shop_code': 'Enter Shop Code',
            
            # Currency
            'aed': 'AED',
            'dirhams': 'Dirhams',
            'fils': 'Fils',
            'only': 'Only',
            
            # Time
            'today': 'Today',
            'yesterday': 'Yesterday',
            'this_week': 'This Week',
            'this_month': 'This Month',
            'this_year': 'This Year',
            'last_week': 'Last Week',
            'last_month': 'Last Month',
            'last_year': 'Last Year',
            
            # Charts
            'sales': 'Sales',
            'revenue_chart': 'Revenue Chart',
            'sales_chart': 'Sales Chart',
            'performance_chart': 'Performance Chart',
            'heatmap': 'Heatmap',
            
            # Notifications
            'notification': 'Notification',
            'notifications': 'Notifications',
            'new_bill': 'New Bill',
            'payment_received': 'Payment Received',
            'low_stock': 'Low Stock',
            'expiring_plan': 'Expiring Plan',
            
            # Help
            'help': 'Help',
            'support': 'Support',
            'documentation': 'Documentation',
            'contact_us': 'Contact Us',
            'feedback': 'Feedback',
            'bug_report': 'Bug Report',
            'feature_request': 'Feature Request',
            
            # Language
            'language': 'Language',
            'english': 'English',
            'arabic': 'Arabic',
            'switch_language': 'Switch Language',
            
            # Default text
            'default': text
        },
        'ar': {
            # Navigation
            'app': '╪º┘ä╪¬╪╖╪¿┘è┘é',
            'pricing': '╪º┘ä╪ú╪│╪╣╪º╪▒',
            'professional_business_management': '╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪ú╪╣┘à╪º┘ä ╪º┘ä╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐',
            'sign_in': '╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä',
            'sign_up': '╪Ñ┘å╪┤╪º╪í ╪¡╪│╪º╪¿',
            'logout': '╪¬╪│╪¼┘è┘ä ╪º┘ä╪«╪▒┘ê╪¼',
            
            # Dashboard
            'dashboard': '┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à',
            'total_revenue': '╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬',
            'total_bills': '╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒',
            'total_customers': '╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╣┘à┘ä╪º╪í',
            'total_products': '╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à┘å╪¬╪¼╪º╪¬',
            'recent_bills': '╪º┘ä┘ü┘ê╪º╪¬┘è╪▒ ╪º┘ä╪¡╪»┘è╪½╪⌐',
            'top_products': '╪ú┘ü╪╢┘ä ╪º┘ä┘à┘å╪¬╪¼╪º╪¬',
            'employee_performance': '╪ú╪»╪º╪í ╪º┘ä┘à┘ê╪╕┘ü┘è┘å',
            
            # Operations
            'operations': '╪º┘ä╪╣┘à┘ä┘è╪º╪¬',
            'billing': '╪º┘ä┘ü┘ê╪º╪¬┘è╪▒',
            'products': '╪º┘ä┘à┘å╪¬╪¼╪º╪¬',
            'customers': '╪º┘ä╪╣┘à┘ä╪º╪í',
            'employees': '╪º┘ä┘à┘ê╪╕┘ü┘ê┘å',
            'vat_rates': '┘à╪╣╪»┘ä╪º╪¬ ╪º┘ä╪╢╪▒┘è╪¿╪⌐',
            'advanced_reports': '╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐',
            'shop_settings': '╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘à╪¬╪¼╪▒',
            
            # Common Actions
            'add': '╪Ñ╪╢╪º┘ü╪⌐',
            'edit': '╪¬╪╣╪»┘è┘ä',
            'delete': '╪¡╪░┘ü',
            'save': '╪¡┘ü╪╕',
            'cancel': '╪Ñ┘ä╪║╪º╪í',
            'close': '╪Ñ╪║┘ä╪º┘é',
            'search': '╪¿╪¡╪½',
            'filter': '╪¬╪╡┘ü┘è╪⌐',
            'download': '╪¬╪¡┘à┘è┘ä',
            'print': '╪╖╪¿╪º╪╣╪⌐',
            'preview': '┘à╪╣╪º┘è┘å╪⌐',
            
            # Status
            'pending': '┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒',
            'completed': '┘à┘â╪¬┘à┘ä',
            'cancelled': '┘à┘ä╪║┘è',
            'paid': '┘à╪»┘ü┘ê╪╣',
            'unpaid': '╪║┘è╪▒ ┘à╪»┘ü┘ê╪╣',
            
            # Messages
            'success': '┘å╪¼╪¡',
            'error': '╪«╪╖╪ú',
            'warning': '╪¬╪¡╪░┘è╪▒',
            'info': '┘à╪╣┘ä┘ê┘à╪º╪¬',
            'loading': '╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...',
            'no_data_found': '┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪¿┘è╪º┘å╪º╪¬',
            'are_you_sure': '┘ç┘ä ╪ú┘å╪¬ ┘à╪¬╪ú┘â╪»╪ƒ',
            'this_action_cannot_be_undone': '┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪¬╪▒╪º╪¼╪╣ ╪╣┘å ┘ç╪░╪º ╪º┘ä╪Ñ╪¼╪▒╪º╪í',
            
            # Forms
            'name': '╪º┘ä╪º╪│┘à',
            'phone': '╪º┘ä┘ç╪º╪¬┘ü',
            'email': '╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è',
            'address': '╪º┘ä╪╣┘å┘ê╪º┘å',
            'city': '╪º┘ä┘à╪»┘è┘å╪⌐',
            'area': '╪º┘ä┘à┘å╪╖┘é╪⌐',
            'position': '╪º┘ä┘à┘å╪╡╪¿',
            'rate': '╪º┘ä╪│╪╣╪▒',
            'quantity': '╪º┘ä┘â┘à┘è╪⌐',
            'total': '╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è',
            'subtotal': '╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘ü╪▒╪╣┘è',
            'vat': '╪º┘ä╪╢╪▒┘è╪¿╪⌐',
            'discount': '╪º┘ä╪«╪╡┘à',
            'advance_paid': '╪º┘ä┘à╪»┘ü┘ê╪╣ ┘à╪│╪¿┘é╪º┘ï',
            'balance': '╪º┘ä╪▒╪╡┘è╪»',
            'payment_method': '╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪»┘ü╪╣',
            'cash': '┘å┘é╪»╪º┘ï',
            'card': '╪¿╪╖╪º┘é╪⌐',
            'bank_transfer': '╪¬╪¡┘ê┘è┘ä ╪¿┘å┘â┘è',
            
            # Reports
            'invoices': '╪º┘ä┘ü┘ê╪º╪¬┘è╪▒',
            'employees': '╪º┘ä┘à┘ê╪╕┘ü┘ê┘å',
            'products': '╪º┘ä┘à┘å╪¬╪¼╪º╪¬',
            'from_date': '┘à┘å ╪¬╪º╪▒┘è╪«',
            'to_date': '╪Ñ┘ä┘ë ╪¬╪º╪▒┘è╪«',
            'bill_number': '╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐',
            'bill_date': '╪¬╪º╪▒┘è╪« ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐',
            'delivery_date': '╪¬╪º╪▒┘è╪« ╪º┘ä╪¬╪│┘ä┘è┘à',
            'customer_name': '╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä',
            'status': '╪º┘ä╪¡╪º┘ä╪⌐',
            'amount': '╪º┘ä┘à╪¿┘ä╪║',
            'revenue': '╪º┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬',
            'performance': '╪º┘ä╪ú╪»╪º╪í',
            
            # Setup Wizard
            'shop_type': '┘å┘ê╪╣ ╪º┘ä┘à╪¬╪¼╪▒',
            'shop_name': '╪º╪│┘à ╪º┘ä┘à╪¬╪¼╪▒',
            'contact_number': '╪▒┘é┘à ╪º┘ä╪º╪¬╪╡╪º┘ä',
            'choose_plan': '╪º╪«╪¬╪▒ ╪º┘ä╪«╪╖╪⌐',
            'trial': '╪¬╪¼╪▒┘è╪¿┘è',
            'basic': '╪ú╪│╪º╪│┘è',
            'pro': '╪º╪¡╪¬╪▒╪º┘ü┘è',
            'days': '╪ú┘è╪º┘à',
            'year': '╪│┘å╪⌐',
            'next': '╪º┘ä╪¬╪º┘ä┘è',
            'previous': '╪º┘ä╪│╪º╪¿┘é',
            'finish': '╪Ñ┘å┘ç╪º╪í',
            
            # Plans
            'trial_plan': '╪º┘ä╪«╪╖╪⌐ ╪º┘ä╪¬╪¼╪▒┘è╪¿┘è╪⌐',
            'basic_plan': '╪º┘ä╪«╪╖╪⌐ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐',
            'pro_plan': '╪º┘ä╪«╪╖╪⌐ ╪º┘ä╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐',
            'enterprise_plan': '╪«╪╖╪⌐ ╪º┘ä┘à╪ñ╪│╪│╪⌐',
            'features': '╪º┘ä┘à┘è╪▓╪º╪¬',
            'upgrade': '╪¬╪▒┘é┘è╪⌐',
            'current_plan': '╪º┘ä╪«╪╖╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐',
            'plan_expires': '╪¬┘å╪¬┘ç┘è ╪º┘ä╪«╪╖╪⌐',
            'unlimited': '╪║┘è╪▒ ┘à╪¡╪»┘ê╪»',
            'limited': '┘à╪¡╪»┘ê╪»',
            
            # Settings
            'settings': '╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬',
            'logo_url': '╪▒╪º╪¿╪╖ ╪º┘ä╪┤╪╣╪º╪▒',
            'working_hours': '╪│╪º╪╣╪º╪¬ ╪º┘ä╪╣┘à┘ä',
            'static_info': '┘à╪╣┘ä┘ê┘à╪º╪¬ ╪½╪º╪¿╪¬╪⌐',
            'invoice_template': '┘é╪º┘ä╪¿ ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐',
            'dynamic_template': '┘é╪º┘ä╪¿ ╪»┘è┘å╪º┘à┘è┘â┘è',
            'static_template': '┘é╪º┘ä╪¿ ╪½╪º╪¿╪¬',
            
            # Authentication
            'login': '╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä',
            'password': '┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒',
            'confirm_password': '╪¬╪ú┘â┘è╪» ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒',
            'forgot_password': '┘å╪│┘è╪¬ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒╪ƒ',
            'remember_me': '╪¬╪░┘â╪▒┘å┘è',
            'dont_have_account': '┘ä┘è╪│ ┘ä╪»┘è┘â ╪¡╪│╪º╪¿╪ƒ',
            'already_have_account': '┘ä╪»┘è┘â ╪¡╪│╪º╪¿ ╪¿╪º┘ä┘ü╪╣┘ä╪ƒ',
            'sign_up_here': '╪Ñ┘å╪┤╪º╪í ╪¡╪│╪º╪¿ ┘ç┘å╪º',
            'sign_in_here': '╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä ┘ç┘å╪º',
            'mobile_login': '╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä ╪¿╪º┘ä╪¼┘ê╪º┘ä',
            'otp': '╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é',
            'send_otp': '╪Ñ╪▒╪│╪º┘ä ╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é',
            'verify_otp': '╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä╪▒┘à╪▓',
            'shop_code': '╪▒┘à╪▓ ╪º┘ä┘à╪¬╪¼╪▒',
            'enter_shop_code': '╪ú╪»╪«┘ä ╪▒┘à╪▓ ╪º┘ä┘à╪¬╪¼╪▒',
            
            # Currency
            'aed': '╪»╪▒┘ç┘à',
            'dirhams': '╪»╪▒╪º┘ç┘à',
            'fils': '┘ü┘ä╪│',
            'only': '┘ü┘é╪╖',
            
            # Time
            'today': '╪º┘ä┘è┘ê┘à',
            'yesterday': '╪ú┘à╪│',
            'this_week': '┘ç╪░╪º ╪º┘ä╪ú╪│╪¿┘ê╪╣',
            'this_month': '┘ç╪░╪º ╪º┘ä╪┤┘ç╪▒',
            'this_year': '┘ç╪░╪º ╪º┘ä╪╣╪º┘à',
            'last_week': '╪º┘ä╪ú╪│╪¿┘ê╪╣ ╪º┘ä┘à╪º╪╢┘è',
            'last_month': '╪º┘ä╪┤┘ç╪▒ ╪º┘ä┘à╪º╪╢┘è',
            'last_year': '╪º┘ä╪╣╪º┘à ╪º┘ä┘à╪º╪╢┘è',
            
            # Charts
            'sales': '╪º┘ä┘à╪¿┘è╪╣╪º╪¬',
            'revenue_chart': '╪▒╪│┘à ╪¿┘è╪º┘å┘è ┘ä┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬',
            'sales_chart': '╪▒╪│┘à ╪¿┘è╪º┘å┘è ┘ä┘ä┘à╪¿┘è╪╣╪º╪¬',
            'performance_chart': '╪▒╪│┘à ╪¿┘è╪º┘å┘è ┘ä┘ä╪ú╪»╪º╪í',
            'heatmap': '╪«╪▒┘è╪╖╪⌐ ╪¡╪▒╪º╪▒┘è╪⌐',
            
            # Notifications
            'notification': '╪Ñ╪┤╪╣╪º╪▒',
            'notifications': '╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬',
            'new_bill': '┘ü╪º╪¬┘ê╪▒╪⌐ ╪¼╪»┘è╪»╪⌐',
            'payment_received': '╪¬┘à ╪º╪│╪¬┘ä╪º┘à ╪º┘ä╪»┘ü╪╣',
            'low_stock': '╪º┘ä┘à╪«╪▓┘ê┘å ┘à┘å╪«┘ü╪╢',
            'expiring_plan': '╪º┘ä╪«╪╖╪⌐ ╪¬┘å╪¬┘ç┘è ┘é╪▒┘è╪¿╪º┘ï',
            
            # Help
            'help': '╪º┘ä┘à╪│╪º╪╣╪»╪⌐',
            'support': '╪º┘ä╪»╪╣┘à',
            'documentation': '╪º┘ä┘ê╪½╪º╪ª┘é',
            'contact_us': '╪º╪¬╪╡┘ä ╪¿┘å╪º',
            'feedback': '╪º┘ä╪¬╪╣┘ä┘è┘é╪º╪¬',
            'bug_report': '╪¬┘é╪▒┘è╪▒ ╪«╪╖╪ú',
            'feature_request': '╪╖┘ä╪¿ ┘à┘è╪▓╪⌐',
            
            # Language
            'language': '╪º┘ä┘ä╪║╪⌐',
            'english': '╪º┘ä╪Ñ┘å╪¼┘ä┘è╪▓┘è╪⌐',
            'arabic': '╪º┘ä╪╣╪▒╪¿┘è╪⌐',
            'switch_language': '╪¬╪║┘è┘è╪▒ ╪º┘ä┘ä╪║╪⌐',
            
            # Default text
            'default': text
        }
    }
    
    return translations.get(language, {}).get(text, text)

def get_translated_text(text, language=None):
    """Get translated text for current user language"""
    if language is None:
        language = get_user_language()
    return translate_text(text, language)

def generate_zatca_qr_code(seller_name, seller_trn, invoice_number, timestamp, total_with_vat, vat_amount):
    """
    Generate QR code data in ZATCA format for FTA compliance
    Format: Seller Name, TRN, Timestamp, Total with VAT, VAT Amount
    """
    # Create QR data in ZATCA format
    qr_data = f"{seller_name}\n{seller_trn}\n{timestamp}\n{total_with_vat}\n{vat_amount}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create QR code image
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 for embedding in HTML
    buffer = BytesIO()
    qr_image.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return qr_base64

@app.route('/api/setup/default-products', methods=['GET'])
def get_default_products():
    """Get default product types and products for laundry shop setup"""
    try:
        default_data = {
            'product_types': [
                {'type_name': 'Wash & Iron', 'description': 'Standard wash and iron service'},
                {'type_name': 'Dry Clean', 'description': 'Professional dry cleaning service'},
                {'type_name': 'Press Only', 'description': 'Ironing and pressing service'},
                {'type_name': 'Starch', 'description': 'Starch and iron service'},
                {'type_name': 'Express', 'description': 'Same day service'},
                {'type_name': 'Bulk', 'description': 'Large quantity orders'}
            ],
            'products': [
                # Wash & Iron Products
                {'product_name': 'Shirt Wash & Iron', 'product_type': 'Wash & Iron', 'rate': 8.00, 'description': 'Standard shirt wash and iron'},
                {'product_name': 'Pants Wash & Iron', 'product_type': 'Wash & Iron', 'rate': 10.00, 'description': 'Trousers wash and iron'},
                {'product_name': 'T-Shirt Wash & Iron', 'product_type': 'Wash & Iron', 'rate': 6.00, 'description': 'T-shirt wash and iron'},
                {'product_name': 'Dress Wash & Iron', 'product_type': 'Wash & Iron', 'rate': 12.00, 'description': 'Dress wash and iron'},
                {'product_name': 'Suit Wash & Iron', 'product_type': 'Wash & Iron', 'rate': 25.00, 'description': 'Complete suit wash and iron'},
                
                # Dry Clean Products
                {'product_name': 'Shirt Dry Clean', 'product_type': 'Dry Clean', 'rate': 15.00, 'description': 'Professional shirt dry cleaning'},
                {'product_name': 'Pants Dry Clean', 'product_type': 'Dry Clean', 'rate': 18.00, 'description': 'Trousers dry cleaning'},
                {'product_name': 'Suit Dry Clean', 'product_type': 'Dry Clean', 'rate': 35.00, 'description': 'Complete suit dry cleaning'},
                {'product_name': 'Coat Dry Clean', 'product_type': 'Dry Clean', 'rate': 30.00, 'description': 'Coat dry cleaning'},
                {'product_name': 'Dress Dry Clean', 'product_type': 'Dry Clean', 'rate': 20.00, 'description': 'Dress dry cleaning'},
                
                # Press Only Products
                {'product_name': 'Shirt Press Only', 'product_type': 'Press Only', 'rate': 5.00, 'description': 'Shirt ironing only'},
                {'product_name': 'Pants Press Only', 'product_type': 'Press Only', 'rate': 6.00, 'description': 'Trousers ironing only'},
                {'product_name': 'Dress Press Only', 'product_type': 'Press Only', 'rate': 8.00, 'description': 'Dress ironing only'},
                
                # Starch Products
                {'product_name': 'Shirt with Starch', 'product_type': 'Starch', 'rate': 10.00, 'description': 'Shirt with starch finish'},
                {'product_name': 'Pants with Starch', 'product_type': 'Starch', 'rate': 12.00, 'description': 'Trousers with starch finish'},
                
                # Express Products
                {'product_name': 'Express Shirt', 'product_type': 'Express', 'rate': 12.00, 'description': 'Same day shirt service'},
                {'product_name': 'Express Pants', 'product_type': 'Express', 'rate': 15.00, 'description': 'Same day pants service'},
                {'product_name': 'Express Suit', 'product_type': 'Express', 'rate': 40.00, 'description': 'Same day suit service'},
                
                # Bulk Products
                {'product_name': 'Bulk Shirts (10+)', 'product_type': 'Bulk', 'rate': 6.00, 'description': 'Bulk shirt discount'},
                {'product_name': 'Bulk Pants (10+)', 'product_type': 'Bulk', 'rate': 8.00, 'description': 'Bulk pants discount'},
                {'product_name': 'Bulk Mixed (20+)', 'product_type': 'Bulk', 'rate': 7.00, 'description': 'Mixed bulk discount'}
            ]
        }
        
        return jsonify({
            'success': True,
            'data': default_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/setup/populate-products', methods=['POST'])
def populate_default_products():
    """Populate default products and product types for laundry shop"""
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'User not authenticated'}), 401
        
        # Get default data
        resp = get_default_products()
        default_data = resp.get_json()['data']
        
        # Insert product types first
        product_type_ids = {}
        for pt in default_data['product_types']:
            cursor = get_db().cursor()
            cursor.execute('''
                INSERT INTO product_types (type_name, description, user_id) 
                VALUES (?, ?, ?)
            ''', (pt['type_name'], pt['description'], user_id))
            product_type_ids[pt['type_name']] = cursor.lastrowid
            get_db().commit()
        
        # Insert products
        for product in default_data['products']:
            cursor = get_db().cursor()
            cursor.execute('''
                INSERT INTO products (product_name, product_type_id, rate, description, user_id) 
                VALUES (?, ?, ?, ?, ?)
            ''', (
                product['product_name'], 
                product_type_ids[product['product_type']], 
                product['rate'], 
                product['description'], 
                user_id
            ))
            get_db().commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully populated {len(default_data["product_types"])} product types and {len(default_data["products"])} products'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Email Configuration
def get_email_config():
    """Get email configuration from environment or shop settings"""
    user_id = get_current_user_id()
    conn = get_db_connection()
    shop_settings_row = conn.execute('SELECT * FROM shop_settings WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    
    # Convert Row object to dictionary if it exists
    shop_settings = dict(shop_settings_row) if shop_settings_row else {}
    
    # Default email config for Outlook
    email_config = {
        'smtp_server': os.getenv('SMTP_SERVER', 'smtp-mail.outlook.com'),
        'smtp_port': int(os.getenv('SMTP_PORT', '587')),
        'smtp_username': os.getenv('SMTP_USERNAME', 'khanayub25@outlook.com'),
        'smtp_password': os.getenv('SMTP_PASSWORD', ''),
        'from_email': os.getenv('FROM_EMAIL', 'khanayub25@outlook.com'),
        'from_name': os.getenv('FROM_NAME', 'Tajir POS')
    }
    
    # Override with shop settings if available
    if shop_settings:
        # Note: shop_settings table doesn't have an email column, so we skip that
        if shop_settings.get('shop_name'):
            email_config['from_name'] = shop_settings['shop_name']
    
    return email_config

def validate_email(email):
    """Validate email address format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def generate_email_template(bill_data, shop_settings, language='en'):
    """Generate professional email template for invoice"""
    if language == 'ar':
        # Arabic template
        template = f"""
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6f42c1; margin: 0; font-size: 28px;">┘ü╪º╪¬┘ê╪▒╪⌐ - {shop_settings.get('shop_name', 'Tajir')}</h1>
                    <p style="color: #6c757d; margin: 10px 0;">╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐: {bill_data['bill_number']}</p>
                    <p style="color: #6c757d; margin: 5px 0;">╪º┘ä╪¬╪º╪▒┘è╪«: {bill_data['bill_date']}</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #495057; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪╣┘à┘è┘ä</h3>
                    <p><strong>╪º┘ä╪º╪│┘à:</strong> {bill_data['customer_name']}</p>
                    <p><strong>╪º┘ä┘ç╪º╪¬┘ü:</strong> {bill_data['customer_phone']}</p>
                    {f"<p><strong>╪º┘ä┘à╪»┘è┘å╪⌐:</strong> {bill_data['customer_city']}</p>" if bill_data.get('customer_city') else ""}
                    {f"<p><strong>╪º┘ä┘à┘å╪╖┘é╪⌐:</strong> {bill_data['customer_area']}</p>" if bill_data.get('customer_area') else ""}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #495057; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #6f42c1; color: white;">
                                <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">╪º┘ä┘à┘å╪¬╪¼</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">╪º┘ä╪│╪╣╪▒</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">╪º┘ä┘â┘à┘è╪⌐</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">╪º┘ä┘à╪¼┘à┘ê╪╣</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        # Add bill items
        for item in bill_data['items']:
            template += f"""
                            <tr>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">{item['product_name']}</td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">{item['rate']:.2f} ╪»╪▒┘ç┘à</td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">{item['qty']}</td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">{item['total']:.2f} ╪»╪▒┘ç┘à</td>
                            </tr>
            """
        
        template += f"""
                        </tbody>
                    </table>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘ü╪▒╪╣┘è:</strong></span>
                        <span>{bill_data['subtotal']:.2f} ╪»╪▒┘ç┘à</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>╪º┘ä╪╢╪▒┘è╪¿╪⌐ ({bill_data.get('vat_percent', 5)}%):</strong></span>
                        <span>{bill_data['vat_amount']:.2f} ╪»╪▒┘ç┘à</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>╪º┘ä┘à╪»┘ü┘ê╪╣ ┘à╪│╪¿┘é╪º┘ï:</strong></span>
                        <span>{bill_data.get('advance_paid', 0):.2f} ╪»╪▒┘ç┘à</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #6f42c1;">
                        <span><strong>╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘å┘ç╪º╪ª┘è:</strong></span>
                        <span>{bill_data['total_amount']:.2f} ╪»╪▒┘ç┘à</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; margin: 5px 0;">╪┤┘â╪▒╪º┘ï ┘ä╪¬╪╣╪º┘à┘ä┘â┘à ┘à╪╣┘å╪º</p>
                    <p style="color: #6c757d; margin: 5px 0;">{shop_settings.get('shop_name', 'Tajir')}</p>
                    {f"<p style='color: #6c757d; margin: 5px 0;'>{shop_settings.get('address', '')}</p>" if shop_settings.get('address') else ""}
                    {f"<p style='color: #6c757d; margin: 5px 0;'>{shop_settings.get('phone', '')}</p>" if shop_settings.get('phone') else ""}
                </div>
            </div>
        </div>
        """
    else:
        # English template
        template = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6f42c1; margin: 0; font-size: 28px;">Invoice - {shop_settings.get('shop_name', 'Tajir')}</h1>
                    <p style="color: #6c757d; margin: 10px 0;">Invoice #: {bill_data['bill_number']}</p>
                    <p style="color: #6c757d; margin: 5px 0;">Date: {bill_data['bill_date']}</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #495057; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">Customer Details</h3>
                    <p><strong>Name:</strong> {bill_data['customer_name']}</p>
                    <p><strong>Phone:</strong> {bill_data['customer_phone']}</p>
                    {f"<p><strong>City:</strong> {bill_data['customer_city']}</p>" if bill_data.get('customer_city') else ""}
                    {f"<p><strong>Area:</strong> {bill_data['customer_area']}</p>" if bill_data.get('customer_area') else ""}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #495057; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">Invoice Details</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #6f42c1; color: white;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Rate</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Qty</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        # Add bill items
        for item in bill_data['items']:
            template += f"""
                            <tr>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">{item['product_name']}</td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">AED {item['rate']:.2f}</td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">{item['qty']}</td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">AED {item['total']:.2f}</td>
                            </tr>
            """
        
        template += f"""
                        </tbody>
                    </table>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Subtotal:</strong></span>
                        <span>AED {bill_data['subtotal']:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>VAT ({bill_data.get('vat_percent', 5)}%):</strong></span>
                        <span>AED {bill_data['vat_amount']:.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Advance Paid:</strong></span>
                        <span>AED {bill_data.get('advance_paid', 0):.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #6f42c1;">
                        <span><strong>Total Amount:</strong></span>
                        <span>AED {bill_data['total_amount']:.2f}</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; margin: 5px 0;">Thank you for your business!</p>
                    <p style="color: #6c757d; margin: 5px 0;">{shop_settings.get('shop_name', 'Tajir')}</p>
                    {f"<p style='color: #6c757d; margin: 5px 0;'>{shop_settings.get('address', '')}</p>" if shop_settings.get('address') else ""}
                    {f"<p style='color: #6c757d; margin: 5px 0;'>{shop_settings.get('phone', '')}</p>" if shop_settings.get('phone') else ""}
                </div>
            </div>
        </div>
        """
    
    return template

def send_email_invoice(bill_id, recipient_email, language='en'):
    """Send invoice via email"""
    try:
        # Get bill data
        conn = get_db_connection()
        bill_row = conn.execute('''
            SELECT b.*, c.name as customer_name, c.phone as customer_phone, 
                   c.city as customer_city, c.area as customer_area,
                   s.shop_name, s.address, s.shop_mobile as phone, '' as email
            FROM bills b
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            LEFT JOIN shop_settings s ON b.user_id = s.user_id
            WHERE b.bill_id = ? AND b.user_id = ?
        ''', (bill_id, get_current_user_id())).fetchone()
        
        if not bill_row:
            return {'success': False, 'error': 'Bill not found'}
        
        # Convert Row object to dictionary
        bill = dict(bill_row)
        
        # Get bill items
        items = conn.execute('''
            SELECT bi.*, p.product_name
            FROM bill_items bi
            JOIN products p ON bi.product_id = p.product_id
            WHERE bi.bill_id = ?
        ''', (bill_id,)).fetchall()
        
        conn.close()
        
        # Prepare bill data
        bill_data = {
            'bill_number': bill.get('bill_number', ''),
            'bill_date': bill.get('bill_date', ''),
            'customer_name': bill.get('customer_name', ''),
            'customer_phone': bill.get('customer_phone', ''),
            'customer_city': bill.get('customer_city', ''),
            'customer_area': bill.get('customer_area', ''),
            'subtotal': float(bill.get('subtotal', 0)),
            'vat_amount': float(bill.get('vat_amount', 0)),
            'vat_percent': float(bill.get('vat_percent', 0)),
            'total_amount': float(bill.get('total_amount', 0)),
            'advance_paid': float(bill.get('advance_paid', 0)),
            'items': []
        }
        
        for item in items:
            item_dict = dict(item) if not isinstance(item, dict) else item
            bill_data['items'].append({
                'product_name': item_dict.get('product_name', ''),
                'rate': float(item_dict.get('rate', 0)),
                'qty': item_dict.get('quantity', 0),
                'total': float(item_dict.get('rate', 0)) * item_dict.get('quantity', 0)
            })
        
        # Get shop settings
        shop_settings = {
            'shop_name': bill.get('shop_name', ''),
            'address': bill.get('address', ''),
            'phone': bill.get('phone', ''),
            'email': bill.get('email', '')
        }
        
        # Generate email template
        email_html = generate_email_template(bill_data, shop_settings, language)
        
        # Get email configuration
        email_config = get_email_config()
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Invoice #{bill_data['bill_number']} - {shop_settings.get('shop_name', 'Tajir')}"
        msg['From'] = f"{email_config['from_name']} <{email_config['from_email']}>"
        msg['To'] = recipient_email
        
        # Add HTML content
        html_part = MIMEText(email_html, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port']) as server:
            server.starttls()
            server.login(email_config['smtp_username'], email_config['smtp_password'])
            server.send_message(msg)
        
        return {'success': True, 'message': 'Invoice sent successfully'}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

# Email API Routes
@app.route('/api/bills/<int:bill_id>/send-email', methods=['POST'])
def send_bill_email(bill_id):
    """Send bill via email"""
    try:
        data = request.get_json()
        recipient_email = data.get('email', '').strip()
        language = data.get('language', 'en')
        
        if not recipient_email:
            return jsonify({'success': False, 'error': 'Email address is required'}), 400
        
        if not validate_email(recipient_email):
            return jsonify({'success': False, 'error': 'Invalid email address format'}), 400
        
        # Check if user has email feature access
        if not plan_manager.check_feature_access(get_current_user_id(), 'email_integration'):
            return jsonify({'success': False, 'error': 'Email integration not available in your plan'}), 403
        
        result = send_email_invoice(bill_id, recipient_email, language)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/email/test', methods=['POST'])
def test_email_config():
    """Test email configuration"""
    try:
        data = request.get_json()
        test_email = data.get('email', '').strip()
        
        if not test_email:
            return jsonify({'success': False, 'error': 'Email address is required'}), 400
        
        if not validate_email(test_email):
            return jsonify({'success': False, 'error': 'Invalid email address format'}), 400
        
        # Get email configuration
        email_config = get_email_config()
        
        # Create test message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Tajir POS - Email Configuration Test'
        msg['From'] = f"{email_config['from_name']} <{email_config['from_email']}>"
        msg['To'] = test_email
        
        test_html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6f42c1; margin: 0; font-size: 28px;">Email Configuration Test</h1>
                    <p style="color: #6c757d; margin: 10px 0;">Tajir POS Email Integration</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #495057; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">Test Results</h3>
                    <p><strong>Status:</strong> Γ£à Email configuration is working correctly!</p>
                    <p><strong>From:</strong> {email_config['from_name']} &lt;{email_config['from_email']}&gt;</p>
                    <p><strong>SMTP Server:</strong> {email_config['smtp_server']}:{email_config['smtp_port']}</p>
                    <p><strong>Test Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; margin: 5px 0;">Your email integration is ready to use!</p>
                    <p style="color: #6c757d; margin: 5px 0;">You can now send invoices to your customers via email.</p>
                </div>
            </div>
        </div>
        """
        
        html_part = MIMEText(test_html, 'html')
        msg.attach(html_part)
        
        # Send test email
        with smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port']) as server:
            server.starttls()
            server.login(email_config['smtp_username'], email_config['smtp_password'])
            server.send_message(msg)
        
        return jsonify({'success': True, 'message': 'Test email sent successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/email/config', methods=['GET'])
def get_email_config_api():
    """Get current email configuration (without sensitive data)"""
    try:
        email_config = get_email_config()
        
        # Return only non-sensitive configuration
        safe_config = {
            'smtp_server': email_config['smtp_server'],
            'smtp_port': email_config['smtp_port'],
            'from_name': email_config['from_name'],
            'from_email': email_config['from_email'],
            'configured': bool(email_config['smtp_username'] and email_config['smtp_password'])
        }
        
        return jsonify({'success': True, 'config': safe_config})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/email/config', methods=['PUT'])
def update_email_config():
    """Update email configuration"""
    try:
        data = request.get_json()
        password = data.get('password', '').strip()
        
        if not password:
            return jsonify({'success': False, 'error': 'Password is required'}), 400
        
        # Set environment variable for the password
        os.environ['SMTP_PASSWORD'] = password
        
        return jsonify({'success': True, 'message': 'Email configuration updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500



# WhatsApp Integration Functions
def generate_whatsapp_message(bill_data, shop_settings, language='en'):
    """Generate WhatsApp message for invoice"""
    if language == 'ar':
        # Arabic message
        message = f"""┘ü╪º╪¬┘ê╪▒╪⌐ - {shop_settings.get('shop_name', 'Tajir')}

╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐: {bill_data['bill_number']}
╪º┘ä╪¬╪º╪▒┘è╪«: {bill_data['bill_date']}

╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪╣┘à┘è┘ä:
╪º┘ä╪º╪│┘à: {bill_data['customer_name']}
╪º┘ä┘ç╪º╪¬┘ü: {bill_data['customer_phone']}
{f"╪º┘ä┘à╪»┘è┘å╪⌐: {bill_data['customer_city']}" if bill_data.get('customer_city') else ""}
{f"╪º┘ä┘à┘å╪╖┘é╪⌐: {bill_data['customer_area']}" if bill_data.get('customer_area') else ""}

╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐:
"""
        
        # Add items
        for item in bill_data['items']:
            message += f"ΓÇó {item['product_name']} - {item['qty']} ├ù {item['rate']:.2f} ╪»╪▒┘ç┘à = {item['total']:.2f} ╪»╪▒┘ç┘à\n"
        
        message += f"""
╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘ü╪▒╪╣┘è: {bill_data['subtotal']:.2f} ╪»╪▒┘ç┘à
╪º┘ä╪╢╪▒┘è╪¿╪⌐ ({bill_data.get('vat_percent', 5)}%): {bill_data['vat_amount']:.2f} ╪»╪▒┘ç┘à
╪º┘ä┘à╪»┘ü┘ê╪╣ ┘à╪│╪¿┘é╪º┘ï: {bill_data.get('advance_paid', 0):.2f} ╪»╪▒┘ç┘à
╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘å┘ç╪º╪ª┘è: {bill_data['total_amount']:.2f} ╪»╪▒┘ç┘à

╪┤┘â╪▒╪º┘ï ┘ä╪¬╪╣╪º┘à┘ä┘â┘à ┘à╪╣┘å╪º!
{shop_settings.get('shop_name', 'Tajir')}
{f"╪º┘ä╪╣┘å┘ê╪º┘å: {shop_settings.get('address', '')}" if shop_settings.get('address') else ""}
{f"╪º┘ä┘ç╪º╪¬┘ü: {shop_settings.get('phone', '')}" if shop_settings.get('phone') else ""}"""
    else:
        # English message
        message = f"""Invoice - {shop_settings.get('shop_name', 'Tajir')}

Invoice #: {bill_data['bill_number']}
Date: {bill_data['bill_date']}

Customer Details:
Name: {bill_data['customer_name']}
Phone: {bill_data['customer_phone']}
{f"City: {bill_data['customer_city']}" if bill_data.get('customer_city') else ""}
{f"Area: {bill_data['customer_area']}" if bill_data.get('customer_area') else ""}

Invoice Details:
"""
        
        # Add items
        for item in bill_data['items']:
            message += f"ΓÇó {item['product_name']} - {item['qty']} ├ù AED {item['rate']:.2f} = AED {item['total']:.2f}\n"
        
        message += f"""
Subtotal: AED {bill_data['subtotal']:.2f}
VAT ({bill_data.get('vat_percent', 5)}%): AED {bill_data['vat_amount']:.2f}
Advance Paid: AED {bill_data.get('advance_paid', 0):.2f}
Total Amount: AED {bill_data['total_amount']:.2f}

Thank you for your business!
{shop_settings.get('shop_name', 'Tajir')}
{f"Address: {shop_settings.get('address', '')}" if shop_settings.get('address') else ""}
{f"Phone: {shop_settings.get('phone', '')}" if shop_settings.get('phone') else ""}"""
    
    return message

def generate_whatsapp_share_link(phone_number, message):
    """Generate WhatsApp share link"""
    # Remove any non-digit characters from phone number
    clean_phone = ''.join(filter(str.isdigit, phone_number))
    
    # Add country code if not present (assuming UAE +971)
    if not clean_phone.startswith('971'):
        if clean_phone.startswith('0'):
            clean_phone = '971' + clean_phone[1:]
        else:
            clean_phone = '971' + clean_phone
    
    # URL encode the message
    import urllib.parse
    encoded_message = urllib.parse.quote(message)
    
    # Generate WhatsApp share link
    whatsapp_url = f"https://wa.me/{clean_phone}?text={encoded_message}"
    
    return whatsapp_url

@app.route('/api/bills/<int:bill_id>/whatsapp', methods=['POST'])
def send_bill_whatsapp(bill_id):
    """Generate WhatsApp share link for bill"""
    try:
        print(f"DEBUG: Starting WhatsApp function for bill_id: {bill_id}")
        data = request.get_json()
        print(f"DEBUG: Request data: {data}")
        phone_number = data.get('phone', '').strip()
        language = data.get('language', 'en')
        
        print(f"DEBUG: WhatsApp request - bill_id: {bill_id}, phone: {phone_number}, language: {language}")
        
        if not phone_number:
            return jsonify({'success': False, 'error': 'Phone number is required'}), 400
        
        # Check if user has WhatsApp feature access
        try:
            user_id = get_current_user_id()
            print(f"DEBUG: User ID: {user_id}")
            
            if not plan_manager.check_feature_access(user_id, 'whatsapp_integration'):
                return jsonify({'success': False, 'error': 'WhatsApp integration not available in your plan'}), 403
        except Exception as e:
            print(f"DEBUG: Plan manager error: {e}")
            return jsonify({'success': False, 'error': f'Plan manager error: {str(e)}'}), 500
        
        # Get bill data (similar to email function)
        try:
            conn = get_db_connection()
            print(f"DEBUG: Querying bill with ID: {bill_id} for user: {get_current_user_id()}")
            
            bill_row = conn.execute('''
                SELECT b.*, c.name as customer_name, c.phone as customer_phone, 
                       c.city as customer_city, c.area as customer_area,
                       s.shop_name, s.address, s.shop_mobile as phone, '' as email
                FROM bills b
                LEFT JOIN customers c ON b.customer_id = c.customer_id
                LEFT JOIN shop_settings s ON b.user_id = s.user_id
                WHERE b.bill_id = ? AND b.user_id = ?
            ''', (bill_id, get_current_user_id())).fetchone()
            
            # Convert Row object to dictionary
            if bill_row:
                bill = dict(bill_row)
            else:
                bill = None
            
            print(f"DEBUG: Bill found: {bill is not None}")
            if bill:
                print(f"DEBUG: Bill type: {type(bill)}")
                print(f"DEBUG: Bill keys: {list(bill.keys()) if hasattr(bill, 'keys') else 'No keys method'}")
            
            if not bill:
                return jsonify({'success': False, 'error': 'Bill not found'}), 404
        except Exception as e:
            print(f"DEBUG: Database error: {e}")
            return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
        
        # Get bill items
        items = conn.execute('''
            SELECT bi.*, p.product_name
            FROM bill_items bi
            JOIN products p ON bi.product_id = p.product_id
            WHERE bi.bill_id = ?
        ''', (bill_id,)).fetchall()
        
        conn.close()
        
        # Prepare bill data
        print(f"DEBUG: Preparing bill data from bill keys: {list(bill.keys())}")
        bill_data = {
            'bill_number': bill.get('bill_number', ''),
            'bill_date': bill.get('bill_date', ''),
            'customer_name': bill.get('customer_name', ''),
            'customer_phone': bill.get('customer_phone', ''),
            'customer_city': bill.get('customer_city', ''),
            'customer_area': bill.get('customer_area', ''),
            'subtotal': float(bill.get('subtotal', 0)),
            'vat_amount': float(bill.get('vat_amount', 0)),
            'vat_percent': float(bill.get('vat_percent', 0)),
            'total_amount': float(bill.get('total_amount', 0)),
            'advance_paid': float(bill.get('advance_paid', 0)),
            'items': []
        }
        
        for item in items:
            item_dict = dict(item) if not isinstance(item, dict) else item
            bill_data['items'].append({
                'product_name': item_dict.get('product_name', ''),
                'rate': float(item_dict.get('rate', 0)),
                'qty': item_dict.get('quantity', 0),
                'total': float(item_dict.get('rate', 0)) * item_dict.get('quantity', 0)
            })
        
        # Get shop settings
        shop_settings = {
            'shop_name': bill.get('shop_name', ''),
            'address': bill.get('address', ''),
            'phone': bill.get('phone', ''),
            'email': bill.get('email', '')
        }
        
        # Generate WhatsApp message
        whatsapp_message = generate_whatsapp_message(bill_data, shop_settings, language)
        
        # Generate WhatsApp share link
        whatsapp_url = generate_whatsapp_share_link(phone_number, whatsapp_message)
        
        return jsonify({
            'success': True,
            'whatsapp_url': whatsapp_url,
            'message': whatsapp_message,
            'phone_number': phone_number
        })
        
    except Exception as e:
        print(f"DEBUG: Exception in WhatsApp function: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/whatsapp/test', methods=['POST'])
def test_whatsapp_config():
    """Test WhatsApp configuration"""
    try:
        data = request.get_json()
        test_phone = data.get('phone', '').strip()
        test_message = data.get('message', 'Test message from Tajir POS')
        
        if not test_phone:
            return jsonify({'success': False, 'error': 'Phone number is required'}), 400
        
        # Generate test WhatsApp link
        whatsapp_url = generate_whatsapp_share_link(test_phone, test_message)
        
        return jsonify({
            'success': True,
            'whatsapp_url': whatsapp_url,
            'message': 'WhatsApp link generated successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/bills/<int:bill_id>/pdf', methods=['GET'])
def generate_bill_pdf(bill_id):
    """Generate PDF invoice for bill using exact HTML template"""
    try:
        # Check if playwright is available
        if not PDF_AVAILABLE:
            return jsonify({'error': 'PDF generation is not available. Please install playwright: pip install playwright && playwright install chromium'}), 500

        # Get bill data using the same logic as print_bill
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get bill details with all necessary information
        cursor.execute("""
            SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
                   c.city as customer_city, c.area as customer_area, c.trn as customer_trn,
                   c.customer_type, c.business_name, c.business_address,
                   e.name as master_name
            FROM bills b
            LEFT JOIN customers c ON b.customer_id = c.customer_id
            LEFT JOIN employees e ON b.master_id = e.employee_id
            WHERE b.bill_id = ? AND b.user_id = ?
        """, (bill_id, get_current_user_id()))
        
        bill_row = cursor.fetchone()
        if not bill_row:
            return jsonify({'error': 'Bill not found'}), 404
        
        bill = dict(bill_row)
        
        # Get bill items with all details
        cursor.execute("""
            SELECT bi.*, p.product_name
            FROM bill_items bi
            LEFT JOIN products p ON bi.product_id = p.product_id
            WHERE bi.bill_id = ?
        """, (bill_id,))
        
        items_rows = cursor.fetchall()
        items = [dict(item_row) for item_row in items_rows]
        
        # Get shop settings
        cursor.execute("""
            SELECT * FROM shop_settings WHERE user_id = ?
        """, (get_current_user_id(),))
        
        shop_settings_row = cursor.fetchone()
        shop_settings = dict(shop_settings_row) if shop_settings_row else {}
        
        conn.close()

        # Generate amount in words (same logic as print_bill)
        try:
            amount_in_words = num2words(bill['total_amount'])
            arabic_amount_in_words = "╪º┘ä┘à╪¿┘ä╪║ ╪¿╪º┘ä┘â┘ä┘à╪º╪¬ ╪║┘è╪▒ ┘à╪¬┘ê┘ü╪▒"
        except Exception:
            amount_in_words = "Amount in words not available"
            arabic_amount_in_words = "╪º┘ä┘à╪¿┘ä╪║ ╪¿╪º┘ä┘â┘ä┘à╪º╪¬ ╪║┘è╪▒ ┘à╪¬┘ê┘ü╪▒"
        
        # Generate QR code for FTA compliance (same as print_bill)
        qr_code_base64 = None
        try:
            # Generate QR code data for FTA compliance
            qr_data = {
                'seller_name': shop_settings.get('shop_name', ''),
                'seller_trn': shop_settings.get('trn', ''),
                'timestamp': bill['bill_date'],
                'total_amount': str(bill['total_amount']),
                'vat_amount': str(bill['vat_amount'])
            }
            
            import qrcode
            import base64
            from io import BytesIO
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(str(qr_data))
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        except Exception as e:
            app.logger.warning(f"QR code generation failed: {str(e)}")
        
        # Prepare template variables (exactly same as print_bill)
        template_vars = {
            'bill': bill,
            'items': items,
            'shop_settings': shop_settings,
            'amount_in_words': amount_in_words,
            'arabic_amount_in_words': arabic_amount_in_words,
            'qr_code_base64': qr_code_base64
        }
        
        # Render the HTML template (exactly same as print_bill)
        html_content = render_template('print_bill.html', **template_vars)
        
        # Use Playwright to render HTML to PDF
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Set content and wait for it to load
            page.set_content(html_content, wait_until='networkidle')
            
            # Generate PDF with proper settings
            pdf_buffer = page.pdf(
                format='A4',
                print_background=True,
                margin={
                    'top': '20px',
                    'right': '20px',
                    'bottom': '20px',
                    'left': '20px'
                }
            )
            
            browser.close()
        
        # Return PDF as response
        response = make_response(pdf_buffer)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=bill_{bill_id}.pdf'
        
        return response
        
    except Exception as e:
        app.logger.error(f"Error generating PDF: {str(e)}")
        return jsonify({'error': f'Error generating PDF: {str(e)}'}), 500



# Admin authentication decorator
def admin_required(f):
    """Decorator to require admin authentication."""
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect('/admin/login')
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@app.route('/admin/login')
def admin_login():
    """Admin login page."""
    if 'admin_logged_in' in session:
        return redirect('/admin')
    return render_template('admin_login.html')

@app.route('/api/admin/login', methods=['POST'])
def admin_auth_login():
    """Handle admin login."""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        logger.info(f"Admin login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password required'})
        
        conn = get_db_connection()
        
        # Check if user exists and is admin (user_id = 1 is the admin user)
        user = conn.execute('SELECT * FROM users WHERE email = ? AND user_id = 1 AND is_active = 1', (email,)).fetchone()
        
        if not user:
            logger.warning(f"Admin user not found for email: {email}")
            return jsonify({'success': False, 'message': 'Invalid credentials'})
        
        logger.info(f"Admin user found: {user['email']}, checking password...")
        
        import bcrypt
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            logger.warning(f"Password check failed for admin user: {email}")
            return jsonify({'success': False, 'message': 'Invalid credentials'})
        
        logger.info(f"Admin login successful for: {email}")
        
        # Set admin session
        session['admin_logged_in'] = True
        session['admin_user_id'] = user['user_id']
        session['admin_email'] = user['email']
        
        # Log admin login
        log_user_action("ADMIN_LOGIN", user['user_id'], {
            'email': user['email'],
            'timestamp': datetime.now().isoformat()
        })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Admin login successful'
        })
        
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return jsonify({'success': False, 'message': 'Login failed. Please try again.'}), 500

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    """Handle admin logout."""
    try:
        # Log admin logout
        if 'admin_user_id' in session:
            log_user_action("ADMIN_LOGOUT", session['admin_user_id'], {
                'email': session.get('admin_email'),
                'timestamp': datetime.now().isoformat()
            })
        
        # Clear admin session
        session.pop('admin_logged_in', None)
        session.pop('admin_user_id', None)
        session.pop('admin_email', None)
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
        
    except Exception as e:
        logger.error(f"Admin logout error: {e}")
        return jsonify({'success': False, 'message': 'Logout failed'}), 500

@app.route('/admin')
@admin_required
def admin_dashboard():
    """Admin dashboard for plan management."""
    return render_template('admin.html')

# Admin API Endpoints
@app.route('/api/admin/stats')
@admin_required
def admin_stats():
    """Get admin dashboard statistics."""
    try:
        conn = get_db_connection()
        
        # Total shops
        total_shops = conn.execute('SELECT COUNT(*) FROM users WHERE is_active = 1').fetchone()[0]
        
        # Active plans (not expired)
        active_plans = conn.execute('''
            SELECT COUNT(*) FROM user_plans up
            JOIN users u ON up.user_id = u.user_id
            WHERE up.is_active = 1 AND u.is_active = 1
            AND (up.plan_type = 'pro' OR up.plan_end_date > DATE('now'))
        ''').fetchone()[0]
        
        # Expiring soon (within 7 days)
        expiring_soon = conn.execute('''
            SELECT COUNT(*) FROM user_plans up
            JOIN users u ON up.user_id = u.user_id
            WHERE up.is_active = 1 AND u.is_active = 1
            AND up.plan_type != 'pro'
            AND up.plan_end_date BETWEEN DATE('now') AND DATE('now', '+7 days')
        ''').fetchone()[0]
        
        # Expired plans
        expired_plans = conn.execute('''
            SELECT COUNT(*) FROM user_plans up
            JOIN users u ON up.user_id = u.user_id
            WHERE up.is_active = 1 AND u.is_active = 1
            AND up.plan_type != 'pro'
            AND up.plan_end_date < DATE('now')
        ''').fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'total_shops': total_shops,
            'active_plans': active_plans,
            'expiring_soon': expiring_soon,
            'expired_plans': expired_plans
        })
    except Exception as e:
        logger.error(f"Failed to load admin stats: {e}")
        return jsonify({'error': 'Failed to load stats'}), 500

@app.route('/api/admin/shops')
@admin_required
def admin_shops():
    """Get all shops with their plan information."""
    try:
        conn = get_db_connection()
        
        shops = conn.execute('''
            SELECT u.user_id, u.shop_name, u.email, u.mobile, u.created_at,
                   up.plan_type, up.plan_start_date, up.plan_end_date,
                   CASE 
                       WHEN up.plan_type = 'pro' AND up.plan_end_date IS NULL THEN 'Unlimited'
                       WHEN up.plan_end_date IS NULL THEN 0
                       ELSE CAST(JULIANDAY(up.plan_end_date) - JULIANDAY('now') AS INTEGER)
                   END as days_remaining,
                   CASE 
                       WHEN up.plan_type = 'pro' AND up.plan_end_date IS NULL THEN 0
                       WHEN up.plan_end_date IS NULL THEN 1
                       ELSE CASE WHEN up.plan_end_date < DATE('now') THEN 1 ELSE 0 END
                   END as expired
            FROM users u
            LEFT JOIN user_plans up ON u.user_id = up.user_id AND up.is_active = 1
            WHERE u.is_active = 1
            ORDER BY u.created_at DESC
        ''').fetchall()
        
        conn.close()
        
        return jsonify([dict(shop) for shop in shops])
    except Exception as e:
        logger.error(f"Failed to load shops: {e}")
        return jsonify({'error': 'Failed to load shops'}), 500

@app.route('/api/admin/shops/<int:user_id>/plan')
@admin_required
def admin_shop_plan(user_id):
    """Get plan details for a specific shop."""
    try:
        conn = get_db_connection()
        
        plan = conn.execute('''
            SELECT up.plan_type as plan, up.plan_start_date as start_date, 
                   up.plan_end_date as expiry_date,
                   CASE 
                       WHEN up.plan_type = 'pro' AND up.plan_end_date IS NULL THEN 'Unlimited'
                       WHEN up.plan_end_date IS NULL THEN 0
                       ELSE CAST(JULIANDAY(up.plan_end_date) - JULIANDAY('now') AS INTEGER)
                   END as days_remaining,
                   CASE 
                       WHEN up.plan_type = 'pro' AND up.plan_end_date IS NULL THEN 0
                       WHEN up.plan_end_date IS NULL THEN 1
                       ELSE CASE WHEN up.plan_end_date < DATE('now') THEN 1 ELSE 0 END
                   END as expired
            FROM user_plans up
            WHERE up.user_id = ? AND up.is_active = 1
        ''', (user_id,)).fetchone()
        
        conn.close()
        
        if plan:
            return jsonify(dict(plan))
        else:
            return jsonify({'error': 'Plan not found'}), 404
    except Exception as e:
        logger.error(f"Failed to load shop plan: {e}")
        return jsonify({'error': 'Failed to load plan'}), 500

@app.route('/api/admin/plans/upgrade', methods=['POST'])
@admin_required
def admin_upgrade_plan():
    """Upgrade or change plan for a shop."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        plan_type = data.get('plan_type')
        duration_months = data.get('duration_months')
        
        if not all([user_id, plan_type]):
            return jsonify({'error': 'User ID and plan type are required'}), 400
        
        if plan_type not in ['trial', 'basic', 'pro']:
            return jsonify({'error': 'Invalid plan type'}), 400
        
        conn = get_db_connection()
        
        # Check if user exists
        user = conn.execute('SELECT user_id, shop_name FROM users WHERE user_id = ? AND is_active = 1', (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Deactivate current plan
        conn.execute('UPDATE user_plans SET is_active = 0 WHERE user_id = ?', (user_id,))
        
        # Calculate new plan dates
        start_date = datetime.now().date()
        end_date = None
        
        if plan_type == 'trial':
            end_date = start_date + timedelta(days=15)
        elif plan_type == 'basic':
            if duration_months:
                end_date = start_date + timedelta(days=30 * duration_months)
            else:
                end_date = start_date + timedelta(days=365)  # Default 1 year
        elif plan_type == 'pro':
            if duration_months:
                end_date = start_date + timedelta(days=30 * duration_months)
            else:
                end_date = None  # Lifetime (default for PRO)
        
        # Insert new plan
        conn.execute('''
            INSERT INTO user_plans (user_id, plan_type, plan_start_date, plan_end_date, is_active)
            VALUES (?, ?, ?, ?, 1)
        ''', (user_id, plan_type, start_date, end_date))
        
        # Log the action
        log_user_action('plan_upgrade', user_id, {
            'plan_type': plan_type,
            'duration_months': duration_months,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat() if end_date else None
        })
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Plan upgraded to {plan_type.upper()} successfully',
            'shop_name': user['shop_name']
        })
    except Exception as e:
        logger.error(f"Failed to upgrade plan: {e}")
        return jsonify({'error': 'Failed to upgrade plan'}), 500

@app.route('/api/admin/plans/expire', methods=['POST'])
@admin_required
def admin_expire_plan():
    """Expire a shop's plan immediately."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        conn = get_db_connection()
        
        # Check if user exists
        user = conn.execute('SELECT user_id, shop_name FROM users WHERE user_id = ? AND is_active = 1', (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Get current plan
        current_plan = conn.execute('SELECT plan_type FROM user_plans WHERE user_id = ? AND is_active = 1', (user_id,)).fetchone()
        if not current_plan:
            conn.close()
            return jsonify({'error': 'No active plan found'}), 404
        
        # Expire the plan by setting end date to yesterday
        expire_date = datetime.now().date() - timedelta(days=1)
        conn.execute('''
            UPDATE user_plans 
            SET plan_end_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND is_active = 1
        ''', (expire_date, user_id))
        
        # Log the action
        log_user_action('plan_expire', user_id, {
            'plan_type': current_plan['plan_type'],
            'expire_date': expire_date.isoformat()
        })
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Plan expired successfully',
            'shop_name': user['shop_name']
        })
    except Exception as e:
        logger.error(f"Failed to expire plan: {e}")
        return jsonify({'error': 'Failed to expire plan'}), 500

@app.route('/api/admin/activity')
@admin_required
def admin_activity():
    """Get recent admin activity."""
    try:
        conn = get_db_connection()
        
        activities = conn.execute('''
            SELECT ua.action, ua.details, ua.timestamp, u.shop_name
            FROM user_actions ua
            LEFT JOIN users u ON ua.user_id = u.user_id
            WHERE ua.action IN ('plan_upgrade', 'plan_expire', 'plan_renew')
            ORDER BY ua.timestamp DESC
            LIMIT 20
        ''').fetchall()
        
        conn.close()
        
        # Format activities
        formatted_activities = []
        for activity in activities:
            details = json.loads(activity['details']) if activity['details'] else {}
            
            if activity['action'] == 'plan_upgrade':
                description = f"Upgraded to {details.get('plan_type', 'Unknown').upper()}"
                if details.get('duration_months'):
                    description += f" for {details['duration_months']} months"
            elif activity['action'] == 'plan_expire':
                description = f"Expired {details.get('plan_type', 'Unknown').upper()} plan"
            else:
                description = "Plan action performed"
            
            formatted_activities.append({
                'action': activity['action'],
                'description': description,
                'shop_name': activity['shop_name'] or 'Unknown Shop',
                'timestamp': activity['timestamp']
            })
        
        return jsonify(formatted_activities)
    except Exception as e:
        logger.error(f"Failed to load activity: {e}")
        return jsonify({'error': 'Failed to load activity'}), 500

@app.route('/admin/logs')
@admin_required
def admin_logs():
    """Admin interface to view error logs."""
    try:
        conn = get_db_connection()
        
        # Get recent error logs
        error_logs = conn.execute('''
            SELECT el.*, u.shop_name 
            FROM error_logs el 
            LEFT JOIN users u ON el.user_id = u.user_id 
            ORDER BY el.timestamp DESC 
            LIMIT 100
        ''').fetchall()
        
        # Get recent user actions
        user_actions = conn.execute('''
            SELECT ua.*, u.shop_name 
            FROM user_actions ua 
            LEFT JOIN users u ON ua.user_id = u.user_id 
            ORDER BY ua.timestamp DESC 
            LIMIT 50
        ''').fetchall()
        
        conn.close()
        
        return render_template('admin_logs.html', 
                            error_logs=error_logs, 
                            user_actions=user_actions)
    except Exception as e:
        logger.error(f"Failed to load admin logs: {e}")
        return jsonify({'error': 'Failed to load logs'}), 500

# Expense Categories API
@app.route('/api/expense-categories', methods=['GET'])
def get_expense_categories():
    """Get all expense categories for current user."""
    user_id = get_current_user_id()
    conn = get_db_connection()
    categories = conn.execute('''
        SELECT * FROM expense_categories 
        WHERE user_id = ? AND is_active = 1 
        ORDER BY category_name
    ''', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(category) for category in categories])

@app.route('/api/expense-categories', methods=['POST'])
def add_expense_category():
    """Add new expense category."""
    data = request.get_json()
    name = data.get('category_name', '').strip()
    description = data.get('description', '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO expense_categories (user_id, category_name, description) 
            VALUES (?, ?, ?)
        ''', (user_id, name, description))
        conn.commit()
        category_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.close()
        
        log_user_action('expense_category_added', user_id, {'category_name': name})
        return jsonify({'id': category_id, 'message': 'Category added successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Category already exists'}), 400
    except Exception as e:
        conn.close()
        log_dml_error('INSERT', 'expense_categories', e, user_id, data)
        return jsonify({'error': 'Failed to add category'}), 500

@app.route('/api/expense-categories/<int:category_id>', methods=['PUT'])
def update_expense_category(category_id):
    """Update expense category."""
    data = request.get_json()
    name = data.get('category_name', '').strip()
    description = data.get('description', '').strip()
    user_id = get_current_user_id()
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    conn = get_db_connection()
    try:
        # Check if category exists and belongs to user
        category = conn.execute('''
            SELECT category_id FROM expense_categories 
            WHERE category_id = ? AND user_id = ?
        ''', (category_id, user_id)).fetchone()
        
        if not category:
            conn.close()
            return jsonify({'error': 'Category not found'}), 404
        
        conn.execute('''
            UPDATE expense_categories 
            SET category_name = ?, description = ? 
            WHERE category_id = ? AND user_id = ?
        ''', (name, description, category_id, user_id))
        conn.commit()
        conn.close()
        
        log_user_action('expense_category_updated', user_id, {'category_id': category_id, 'category_name': name})
        return jsonify({'message': 'Category updated successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Category name already exists'}), 400
    except Exception as e:
        conn.close()
        log_dml_error('UPDATE', 'expense_categories', e, user_id, data)
        return jsonify({'error': 'Failed to update category'}), 500

@app.route('/api/expense-categories/<int:category_id>', methods=['DELETE'])
def delete_expense_category(category_id):
    """Delete expense category (soft delete)."""
    user_id = get_current_user_id()
    conn = get_db_connection()
    
    try:
        # Check if category has expenses
        expense_count = conn.execute('''
            SELECT COUNT(*) FROM expenses 
            WHERE category_id = ? AND user_id = ?
        ''', (category_id, user_id)).fetchone()[0]
        
        if expense_count > 0:
            conn.close()
            return jsonify({'error': 'Cannot delete category with existing expenses'}), 400
        
        # Soft delete by setting is_active = 0
        conn.execute('''
            UPDATE expense_categories 
            SET is_active = 0 
            WHERE category_id = ? AND user_id = ?
        ''', (category_id, user_id))
        conn.commit()
        conn.close()
        
        log_user_action('expense_category_deleted', user_id, {'category_id': category_id})
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        conn.close()
        log_dml_error('DELETE', 'expense_categories', e, user_id, {'category_id': category_id})
        return jsonify({'error': 'Failed to delete category'}), 500

# Expenses API
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Get expenses with optional filtering."""
    user_id = get_current_user_id()
    
    # Get query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category_id = request.args.get('category_id')
    search = request.args.get('search', '').strip()
    
    conn = get_db_connection()
    
    # Build query with filters
    query = '''
        SELECT e.*, ec.category_name 
        FROM expenses e 
        JOIN expense_categories ec ON e.category_id = ec.category_id 
        WHERE e.user_id = ? AND ec.user_id = ?
    '''
    params = [user_id, user_id]
    
    if start_date:
        query += ' AND e.expense_date >= ?'
        params.append(start_date)
    
    if end_date:
        query += ' AND e.expense_date <= ?'
        params.append(end_date)
    
    if category_id:
        query += ' AND e.category_id = ?'
        params.append(category_id)
    
    if search:
        query += ' AND (e.description LIKE ? OR ec.category_name LIKE ?)'
        search_param = f'%{search}%'
        params.extend([search_param, search_param])
    
    query += ' ORDER BY e.expense_date DESC, e.created_at DESC'
    
    expenses = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(expense) for expense in expenses])

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """Add new expense."""
    data = request.get_json()
    category_id = data.get('category_id')
    expense_date = data.get('expense_date')
    amount = data.get('amount')
    description = data.get('description', '').strip()
    payment_method = data.get('payment_method', 'Cash')
    receipt_url = data.get('receipt_url', '').strip()
    user_id = get_current_user_id()
    
    # Validation
    if not all([category_id, expense_date, amount]):
        return jsonify({'error': 'Category, date, and amount are required'}), 400
    
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid amount value'}), 400
    
    conn = get_db_connection()
    try:
        # Verify category belongs to user
        category = conn.execute('''
            SELECT category_id FROM expense_categories 
            WHERE category_id = ? AND user_id = ? AND is_active = 1
        ''', (category_id, user_id)).fetchone()
        
        if not category:
            conn.close()
            return jsonify({'error': 'Invalid category'}), 400
        
        conn.execute('''
            INSERT INTO expenses (user_id, category_id, expense_date, amount, description, payment_method, receipt_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, category_id, expense_date, amount, description, payment_method, receipt_url))
        conn.commit()
        expense_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.close()
        
        log_user_action('expense_added', user_id, {'expense_id': expense_id, 'amount': amount, 'category_id': category_id})
        return jsonify({'id': expense_id, 'message': 'Expense added successfully'})
    except Exception as e:
        conn.close()
        log_dml_error('INSERT', 'expenses', e, user_id, data)
        return jsonify({'error': 'Failed to add expense'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['GET'])
def get_expense(expense_id):
    """Get specific expense."""
    user_id = get_current_user_id()
    conn = get_db_connection()
    expense = conn.execute('''
        SELECT e.*, ec.category_name 
        FROM expenses e 
        JOIN expense_categories ec ON e.category_id = ec.category_id 
        WHERE e.expense_id = ? AND e.user_id = ? AND ec.user_id = ?
    ''', (expense_id, user_id, user_id)).fetchone()
    conn.close()
    
    if expense:
        return jsonify(dict(expense))
    else:
        return jsonify({'error': 'Expense not found'}), 404

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    """Update expense."""
    data = request.get_json()
    category_id = data.get('category_id')
    expense_date = data.get('expense_date')
    amount = data.get('amount')
    description = data.get('description', '').strip()
    payment_method = data.get('payment_method', 'Cash')
    receipt_url = data.get('receipt_url', '').strip()
    user_id = get_current_user_id()
    
    # Validation
    if not all([category_id, expense_date, amount]):
        return jsonify({'error': 'Category, date, and amount are required'}), 400
    
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid amount value'}), 400
    
    conn = get_db_connection()
    try:
        # Verify expense and category belong to user
        expense = conn.execute('''
            SELECT expense_id FROM expenses 
            WHERE expense_id = ? AND user_id = ?
        ''', (expense_id, user_id)).fetchone()
        
        category = conn.execute('''
            SELECT category_id FROM expense_categories 
            WHERE category_id = ? AND user_id = ? AND is_active = 1
        ''', (category_id, user_id)).fetchone()
        
        if not expense:
            conn.close()
            return jsonify({'error': 'Expense not found'}), 404
        
        if not category:
            conn.close()
            return jsonify({'error': 'Invalid category'}), 400
        
        conn.execute('''
            UPDATE expenses 
            SET category_id = ?, expense_date = ?, amount = ?, description = ?, payment_method = ?, receipt_url = ? 
            WHERE expense_id = ? AND user_id = ?
        ''', (category_id, expense_date, amount, description, payment_method, receipt_url, expense_id, user_id))
        conn.commit()
        conn.close()
        
        log_user_action('expense_updated', user_id, {'expense_id': expense_id, 'amount': amount, 'category_id': category_id})
        return jsonify({'message': 'Expense updated successfully'})
    except Exception as e:
        conn.close()
        log_dml_error('UPDATE', 'expenses', e, user_id, data)
        return jsonify({'error': 'Failed to update expense'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Delete expense."""
    user_id = get_current_user_id()
    conn = get_db_connection()
    
    try:
        # Get expense details for logging
        expense = conn.execute('''
            SELECT amount, category_id FROM expenses 
            WHERE expense_id = ? AND user_id = ?
        ''', (expense_id, user_id)).fetchone()
        
        if not expense:
            conn.close()
            return jsonify({'error': 'Expense not found'}), 404
        
        conn.execute('DELETE FROM expenses WHERE expense_id = ? AND user_id = ?', (expense_id, user_id))
        conn.commit()
        conn.close()
        
        log_user_action('expense_deleted', user_id, {
            'expense_id': expense_id, 
            'amount': expense['amount'], 
            'category_id': expense['category_id']
        })
        return jsonify({'message': 'Expense deleted successfully'})
    except Exception as e:
        conn.close()
        log_dml_error('DELETE', 'expenses', e, user_id, {'expense_id': expense_id})
        return jsonify({'error': 'Failed to delete expense'}), 500

@app.route('/api/expenses/report', methods=['GET'])
def expense_report():
    """Get expense report with summary data."""
    user_id = get_current_user_id()
    
    # Get query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category_id = request.args.get('category_id')
    
    conn = get_db_connection()
    
    # Build base query
    base_where = 'WHERE e.user_id = ? AND ec.user_id = ?'
    params = [user_id, user_id]
    
    if start_date:
        base_where += ' AND e.expense_date >= ?'
        params.append(start_date)
    
    if end_date:
        base_where += ' AND e.expense_date <= ?'
        params.append(end_date)
    
    if category_id:
        base_where += ' AND e.category_id = ?'
        params.append(category_id)
    
    # Get total expenses
    total_query = f'''
        SELECT SUM(e.amount) as total_amount, COUNT(*) as total_count
        FROM expenses e 
        JOIN expense_categories ec ON e.category_id = ec.category_id 
        {base_where}
    '''
    total_result = conn.execute(total_query, params).fetchone()
    
    # Get expenses by category
    category_query = f'''
        SELECT ec.category_name, SUM(e.amount) as total_amount, COUNT(*) as count
        FROM expenses e 
        JOIN expense_categories ec ON e.category_id = ec.category_id 
        {base_where}
        GROUP BY ec.category_id, ec.category_name
        ORDER BY total_amount DESC
    '''
    category_results = conn.execute(category_query, params).fetchall()
    
    # Get monthly breakdown
    monthly_query = f'''
        SELECT strftime('%Y-%m', e.expense_date) as month, 
               SUM(e.amount) as total_amount, COUNT(*) as count
        FROM expenses e 
        JOIN expense_categories ec ON e.category_id = ec.category_id 
        {base_where}
        GROUP BY strftime('%Y-%m', e.expense_date)
        ORDER BY month DESC
        LIMIT 12
    '''
    monthly_results = conn.execute(monthly_query, params).fetchall()
    
    conn.close()
    
    return jsonify({
        'summary': {
            'total_amount': float(total_result['total_amount'] or 0),
            'total_count': total_result['total_count'] or 0
        },
        'by_category': [dict(result) for result in category_results],
        'by_month': [dict(result) for result in monthly_results]
    })

@app.route('/api/expenses/download', methods=['GET'])
def download_expenses():
    """Download expenses as CSV."""
    user_id = get_current_user_id()
    
    # Get query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category_id = request.args.get('category_id')
    
    conn = get_db_connection()
    
    # Build query
    query = '''
        SELECT e.expense_date, ec.category_name, e.amount, e.description, e.payment_method, e.receipt_url
        FROM expenses e 
        JOIN expense_categories ec ON e.category_id = ec.category_id 
        WHERE e.user_id = ? AND ec.user_id = ?
    '''
    params = [user_id, user_id]
    
    if start_date:
        query += ' AND e.expense_date >= ?'
        params.append(start_date)
    
    if end_date:
        query += ' AND e.expense_date <= ?'
        params.append(end_date)
    
    if category_id:
        query += ' AND e.category_id = ?'
        params.append(category_id)
    
    query += ' ORDER BY e.expense_date DESC'
    
    expenses = conn.execute(query, params).fetchall()
    conn.close()
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Category', 'Amount', 'Description', 'Payment Method', 'Receipt URL'])
    
    for expense in expenses:
        writer.writerow([
            expense['expense_date'],
            expense['category_name'],
            expense['amount'],
            expense['description'] or '',
            expense['payment_method'],
            expense['receipt_url'] or ''
        ])
    
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=expenses.csv'}
    )

@app.route('/api/admin/setup', methods=['POST'])
def admin_setup():
    """Setup admin user for production environment."""
    try:
        # Import the setup function
        from setup_production_admin import setup_production_admin
        
        success = setup_production_admin()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Admin setup completed successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Admin setup failed'
            }), 500
            
    except Exception as e:
        logger.error(f"Admin setup error: {e}")
        return jsonify({
            'success': False,
            'message': f'Admin setup failed: {str(e)}'
        }), 500

@app.route('/health')
def health_check():
    """Simple health check endpoint for Railway deployment."""
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
        <hr>
        <h2>Available Endpoints:</h2>
        <ul>
            <li><a href="/">Root (redirects to /app)</a></li>
            <li><a href="/app">Main Application</a></li>
            <li><a href="/health">Health Check</a></li>
            <li><a href="/test">Test Page</a></li>
        </ul>
        <hr>
        <p><strong>Login Credentials:</strong></p>
        <p>Email: admin@tailorpos.com<br>Password: admin123</p>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("🚀 Starting Tajir POS Application...")
    print(f"Database path: {app.config['DATABASE']}")
    print(f"Secret key configured: {'Yes' if app.secret_key != 'your-secret-key-here-change-in-production' else 'No'}")
    
    try:
        init_db()
        print("✅ Database initialization completed")
    except Exception as e:
        print(f"⚠️ Database initialization failed: {e}")
        print("Continuing with app startup...")
    
    try:
        port = int(os.environ.get('PORT', 5000))
        print(f"🌐 Starting server on port {port}")
        app.run(debug=False, host='0.0.0.0', port=port)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1) 

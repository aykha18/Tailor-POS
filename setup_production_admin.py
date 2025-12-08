#!/usr/bin/env python3
"""
Production Admin Setup Script
This script ensures the admin user exists with the correct password in production.
"""

import os
import sqlite3
import bcrypt
import sys

# Import the database connection logic from the main app
try:
    from app import get_db_connection, is_postgresql, execute_query
except ImportError:
    # Fallback if app module is not available
    def get_db_connection():
        database_path = os.getenv('DATABASE_PATH', 'pos_tailor.db')
        conn = sqlite3.connect(database_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def is_postgresql():
        return False
    
    def execute_query(conn, sql, params=None):
        return conn.execute(sql, params)

def setup_production_admin():
    """Setup admin user for production environment."""
    
    # Use the same database connection logic as the main app
    if is_postgresql():
        print("Setting up admin user in PostgreSQL database")
    else:
        database_path = os.getenv('DATABASE_PATH', 'pos_tailor.db')
        print(f"Setting up admin user in SQLite database: {database_path}")
    
    try:
        # Connect to database using the same logic as main app
        conn = get_db_connection()
        
        # Check if admin user exists
        if is_postgresql():
            # PostgreSQL syntax
            admin_user = execute_query(conn, 'SELECT * FROM users WHERE user_id = 1 AND email = %s', ('admin@tailorpos.com',)).fetchone()
        else:
            # SQLite syntax
            admin_user = conn.execute('SELECT * FROM users WHERE user_id = 1 AND email = ?', ('admin@tailorpos.com',)).fetchone()
        
        if admin_user:
            print("Admin user already exists")

            # Update password to ensure it's correct
            new_password = "admin123"
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

            if is_postgresql():
                execute_query(conn, '''
                    UPDATE users
                    SET password_hash = %s, is_active = TRUE
                    WHERE user_id = 1 AND email = 'admin@tailorpos.com'
                ''', (password_hash.decode('utf-8'),))
            else:
                conn.execute('''
                    UPDATE users
                    SET password_hash = ?, is_active = 1
                    WHERE user_id = 1 AND email = 'admin@tailorpos.com'
                ''', (password_hash.decode('utf-8'),))

            if not is_postgresql():
                conn.commit()
            print(f"Admin password updated successfully!")
            print(f"   Email: admin@tailorpos.com")
            print(f"   Password: {new_password}")

        else:
            print("Admin user not found, creating...")
            
            # Create admin user
            new_password = "admin123"
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            
            if is_postgresql():
                # PostgreSQL syntax
                execute_query(conn, '''
                    INSERT INTO users (user_id, email, shop_code, password_hash, shop_name, shop_type, contact_number, email_address, is_active)
                    VALUES (1, 'admin@tailorpos.com', 'SHOP001', %s, 'Tajir', 'tailors', '+971 50 123 4567', 'admin@tailorpos.com', TRUE)
                    ON CONFLICT (user_id) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    is_active = TRUE
                ''', (password_hash.decode('utf-8'),))
                
                # Ensure admin user plan exists
                execute_query(conn, '''
                    INSERT INTO user_plans (user_id, plan_type, plan_start_date, is_active)
                    VALUES (1, 'trial', CURRENT_DATE, TRUE)
                ''')
                
                # Ensure admin shop settings exist
                execute_query(conn, '''
                    INSERT INTO shop_settings (setting_id, user_id, shop_name, address, trn, logo_url, shop_mobile, working_hours, invoice_static_info, use_dynamic_invoice_template)
                    VALUES (1, 1, 'Tajir', '', '', '', '', '', '', FALSE)
                ''')
            else:
                # SQLite syntax
                conn.execute('''
                    INSERT OR REPLACE INTO users (user_id, email, shop_code, password_hash, shop_name, shop_type, contact_number, email_address, is_active)
                    VALUES (1, 'admin@tailorpos.com', 'SHOP001', ?, 'Tajir', 'tailors', '+971 50 123 4567', 'admin@tailorpos.com', 1)
                ''', (password_hash.decode('utf-8'),))
                
                # Ensure admin user plan exists
                conn.execute('''
                    INSERT OR REPLACE INTO user_plans (user_id, plan_type, plan_start_date, is_active)
                    VALUES (1, 'trial', CURRENT_DATE, 1)
                ''')
                
                # Ensure admin shop settings exist
                conn.execute('''
                    INSERT OR REPLACE INTO shop_settings (setting_id, user_id, shop_name, address, trn, logo_url, shop_mobile, working_hours, invoice_static_info, use_dynamic_invoice_template)
                    VALUES (1, 1, 'Tajir', '', '', '', '', '', '', 0)
                ''')
            
            if not is_postgresql():
                conn.commit()
            print(f"Admin user created successfully!")
            print(f"   Email: admin@tailorpos.com")
            print(f"   Password: {new_password}")

        conn.close()
        return True

    except Exception as e:
        print(f"Error setting up admin user: {e}")
        return False

if __name__ == "__main__":
    success = setup_production_admin()
    sys.exit(0 if success else 1)



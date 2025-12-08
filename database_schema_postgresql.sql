-- Tailor POS Database Schema - PostgreSQL Version
-- Database: tajir_pos

-- Users Table (Main tenant table)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    mobile VARCHAR(20),
    shop_code VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    shop_type VARCHAR(100),
    contact_number VARCHAR(20),
    email_address VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Plans Table (for pricing plan management)
CREATE TABLE IF NOT EXISTS user_plans (
    plan_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (plan_type IN ('trial', 'basic', 'pro')),
    plan_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Shop Settings Table
CREATE TABLE IF NOT EXISTS shop_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    shop_name VARCHAR(255) DEFAULT 'Tajir',
    address TEXT DEFAULT '',
    trn VARCHAR(50) DEFAULT '',
    logo_url TEXT DEFAULT '',
    shop_mobile VARCHAR(20) DEFAULT '',
    working_hours TEXT DEFAULT '',
    invoice_static_info TEXT DEFAULT '',
    use_dynamic_invoice_template BOOLEAN DEFAULT FALSE,
    payment_mode VARCHAR(20) DEFAULT 'advance' CHECK (payment_mode IN ('advance', 'full')),
    -- Configurable Input Fields
    enable_trial_date BOOLEAN DEFAULT TRUE,
    enable_delivery_date BOOLEAN DEFAULT TRUE,
    enable_advance_payment BOOLEAN DEFAULT TRUE,
    enable_customer_notes BOOLEAN DEFAULT TRUE,
    enable_employee_assignment BOOLEAN DEFAULT TRUE,
    default_delivery_days INTEGER DEFAULT 3,
    default_trial_days INTEGER DEFAULT 3,
    default_employee_id INTEGER,
    city VARCHAR(100) DEFAULT '',
    area VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    mobile VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Types Table (per tenant)
CREATE TABLE IF NOT EXISTS product_types (
    type_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, type_name)
);

-- Products Table (per tenant)
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    barcode VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES product_types(type_id) ON DELETE CASCADE
);

-- Cities Table
CREATE TABLE IF NOT EXISTS cities (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- City Areas Table
CREATE TABLE IF NOT EXISTS city_area (
    area_id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL,
    area_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(city_id) ON DELETE CASCADE,
    UNIQUE(city_id, area_name)
);

-- Customers Table (per tenant)
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'Individual' CHECK (customer_type IN ('Individual', 'Business')),
    business_name VARCHAR(255),
    trn VARCHAR(50),
    email VARCHAR(255),
    city VARCHAR(100),
    area VARCHAR(100),
    address TEXT,
    business_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, phone)
);

-- VAT Rates Table
CREATE TABLE IF NOT EXISTS vat_rates (
    vat_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    rate_name VARCHAR(100) NOT NULL,
    rate_percentage DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(100) DEFAULT 'Employee',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Bills Table
CREATE TABLE IF NOT EXISTS bills (
    bill_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    customer_id INTEGER,
    employee_id INTEGER,
    bill_number VARCHAR(50) NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    trial_date DATE,
    delivery_date DATE,
    customer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

-- Bill Items Table
CREATE TABLE IF NOT EXISTS bill_items (
    item_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    notes TEXT DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

-- Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    category_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, category_name)
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    expense_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(category_id) ON DELETE CASCADE
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    request_data TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- User Actions Table
CREATE TABLE IF NOT EXISTS user_actions (
    action_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    table_name VARCHAR(100),
    action_type VARCHAR(20) CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Insert default data
INSERT INTO cities (city_name) VALUES 
('Dubai'), ('Abu Dhabi'), ('Sharjah'), ('Ajman'), ('Umm Al Quwain'), 
('Ras Al Khaimah'), ('Fujairah'), ('Al Ain') 
ON CONFLICT (city_name) DO NOTHING;

-- Default VAT rates will be created by admin setup

-- ========================================
-- LOYALTY PROGRAM TABLES
-- ========================================

-- Add loyalty configuration to shop_settings
ALTER TABLE shop_settings 
ADD COLUMN IF NOT EXISTS enable_loyalty_program BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS points_per_currency DECIMAL(10,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS min_purchase_amount DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS points_expiry_days INTEGER DEFAULT 365,
ADD COLUMN IF NOT EXISTS referral_bonus_points INTEGER DEFAULT 100;

-- Loyalty Configuration Table
CREATE TABLE IF NOT EXISTS loyalty_config (
    config_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    points_per_currency DECIMAL(10,2) DEFAULT 1.0,
    min_purchase_amount DECIMAL(10,2) DEFAULT 0.0,
    points_expiry_days INTEGER DEFAULT 365,
    referral_bonus_points INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Customer Loyalty Profiles Table
CREATE TABLE IF NOT EXISTS customer_loyalty (
    loyalty_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    current_points INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_redeemed INTEGER DEFAULT 0,
    tier_id INTEGER DEFAULT 1,
    referral_code VARCHAR(20) UNIQUE,
    referred_by INTEGER,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    tier_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tier_name VARCHAR(50) NOT NULL,
    min_points INTEGER DEFAULT 0,
    point_multiplier DECIMAL(3,2) DEFAULT 1.0,
    discount_percentage DECIMAL(5,2) DEFAULT 0.0,
    benefits TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Loyalty Transactions Table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    transaction_id SERIAL PRIMARY KEY,
    loyalty_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    points_change INTEGER NOT NULL,
    bill_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loyalty_id) REFERENCES customer_loyalty(loyalty_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Loyalty Rewards Table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    reward_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reward_name VARCHAR(100) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    discount_amount DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Reward Redemptions Table
CREATE TABLE IF NOT EXISTS reward_redemptions (
    redemption_id SERIAL PRIMARY KEY,
    loyalty_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    bill_id INTEGER,
    points_used INTEGER NOT NULL,
    discount_applied DECIMAL(10,2),
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loyalty_id) REFERENCES customer_loyalty(loyalty_id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(reward_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Personalized Offers Table
CREATE TABLE IF NOT EXISTS personalized_offers (
    offer_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    customer_id INTEGER,
    offer_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2),
    discount_amount DECIMAL(10,2),
    min_purchase_amount DECIMAL(10,2),
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert default loyalty tiers
INSERT INTO loyalty_tiers (tier_id, user_id, tier_name, min_points, point_multiplier, discount_percentage, benefits) VALUES 
(1, 1, 'Bronze', 0, 1.0, 0.0, 'Basic loyalty member'),
(2, 1, 'Silver', 1000, 1.2, 5.0, 'Silver tier with 5% discount'),
(3, 1, 'Gold', 5000, 1.5, 10.0, 'Gold tier with 10% discount'),
(4, 1, 'Platinum', 10000, 2.0, 15.0, 'Platinum tier with 15% discount')
ON CONFLICT (tier_id) DO NOTHING;

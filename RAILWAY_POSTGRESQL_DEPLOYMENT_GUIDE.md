# Railway PostgreSQL Deployment Guide

## Overview
This guide covers the migration from SQLite to PostgreSQL for Railway deployment of Tajir POS.

## Pre-Deployment Checklist

### ✅ Code Changes Completed
- [x] Updated `app.py` with PostgreSQL connection logic
- [x] Added PostgreSQL dependencies to `requirements.txt`
- [x] Created `postgresql_config.py` for configuration
- [x] Fixed database sequence issues for PostgreSQL
- [x] Updated `nixpacks.toml` for Railway build
- [x] Fixed customer table styling issues
- [x] Cleaned up console logs and debug scripts

### ✅ Database Connection Logic
- [x] Dual database support (SQLite for development, PostgreSQL for production)
- [x] Automatic fallback to SQLite if PostgreSQL unavailable
- [x] Environment variable detection for PostgreSQL
- [x] Proper cursor factory for PostgreSQL (RealDictCursor)
- [x] Sequence management for PostgreSQL auto-increment

## Railway Environment Variables Setup

### Required Environment Variables
Set these in your Railway project dashboard:

```bash
# PostgreSQL Configuration
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Application Settings
SECRET_KEY=your_secure_secret_key_here
FLASK_ENV=production
DEBUG=False

# Security Settings
BCRYPT_LOG_ROUNDS=12
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
PERMANENT_SESSION_LIFETIME=3600

# Rate Limiting
RATELIMIT_STORAGE_URL=memory://
RATELIMIT_DEFAULT=200 per day;50 per hour

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/tajir_pos.log
```

### Railway PostgreSQL Plugin Setup
1. Go to your Railway project dashboard
2. Click "New" → "Database" → "PostgreSQL"
3. Railway will automatically set the PostgreSQL environment variables
4. The variables will be prefixed with your database name

## Database Migration Steps

### 1. Database Schema Migration
The application will automatically create tables in PostgreSQL when it first connects. However, you may need to migrate existing data.

### 2. Data Migration (if needed)
If you have existing SQLite data to migrate:

```sql
-- Example migration script (run in PostgreSQL)
-- This is a basic example - adjust based on your actual schema

-- Create tables (if not exists)
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data from SQLite (if migrating)
-- INSERT INTO employees (name, phone, email, role) 
-- SELECT name, phone, email, role FROM sqlite_employees;
```

### 3. Sequence Reset (if needed)
If you encounter sequence issues:

```sql
-- Reset sequences for auto-increment columns
SELECT setval(pg_get_serial_sequence('employees', 'employee_id'), COALESCE((SELECT MAX(employee_id) FROM employees), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('customers', 'customer_id'), COALESCE((SELECT MAX(customer_id) FROM customers), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('products', 'product_id'), COALESCE((SELECT MAX(product_id) FROM products), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('bills', 'bill_id'), COALESCE((SELECT MAX(bill_id) FROM bills), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('bill_items', 'item_id'), COALESCE((SELECT MAX(item_id) FROM bill_items), 0) + 1, false);
```

## Deployment Steps

### 1. Railway Dashboard Setup
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the `nixpacks.toml` configuration
3. Add the PostgreSQL plugin to your project
4. Set the environment variables listed above

### 2. Build Configuration
The `nixpacks.toml` file is configured for:
- Python 3.9
- Tesseract OCR
- PostgreSQL dependencies
- OpenCV (optional, with PIL fallback)

### 3. Deployment Verification
After deployment, verify:
- [ ] Application starts without errors
- [ ] Database connections work
- [ ] All features function correctly
- [ ] Logs show no database errors
- [ ] OCR functionality works (with PIL fallback if OpenCV unavailable)

## Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Errors
```bash
# Check environment variables
echo $POSTGRES_HOST
echo $POSTGRES_DB
echo $POSTGRES_USER
```

#### 2. Sequence Errors
If you get "duplicate key value violates unique constraint" errors:
- The application includes automatic sequence reset logic
- Check logs for sequence reset messages
- Manual reset may be needed for existing data

#### 3. Tesseract OCR Issues
- Railway includes Tesseract in the build
- If OCR fails, check if Tesseract is properly installed
- Fallback to basic image processing is available

#### 4. OpenCV Issues
- OpenCV is optional and may not install on Railway
- Application will use PIL fallback automatically
- Check logs for "OpenCV not available" messages

### Log Analysis
Check Railway logs for:
- Database connection messages
- Sequence reset operations
- OCR initialization
- Any error messages

## Post-Deployment Checklist

### ✅ Functionality Tests
- [ ] User login/authentication
- [ ] Customer management (add, edit, delete)
- [ ] Product management (add, edit, delete)
- [ ] Billing system (create bills, add items)
- [ ] Mobile billing interface
- [ ] OCR scanning functionality
- [ ] Report generation
- [ ] Data export/import

### ✅ Performance Verification
- [ ] Database queries execute quickly
- [ ] No timeout errors
- [ ] Memory usage is reasonable
- [ ] Application responds promptly

### ✅ Security Verification
- [ ] HTTPS is enforced
- [ ] Session cookies are secure
- [ ] Rate limiting is active
- [ ] No sensitive data in logs

## Rollback Plan

If issues occur, you can:
1. Revert to the previous commit
2. Switch back to SQLite temporarily
3. Use Railway's rollback feature to previous deployment

## Support

For Railway-specific issues:
- Check Railway documentation
- Review Railway logs
- Contact Railway support if needed

For application issues:
- Check application logs in `logs/` directory
- Review error messages in Railway dashboard
- Verify environment variables are set correctly

# Demo Shops Guide for Tajir POS

This guide explains how to create realistic demo shops for different business types in the UAE using the `create_demo_shops.py` script.

## Available Shop Types

### 1. Tailors - Perfect Stitch Tailors
- **Login:** demo@perfectstitch.ae
- **Mobile:** 0501234567
- **Product Types:** Saree Services, Kurti & Suits, Western Wear
- **Products:** Saree Fall Stitching, Kurti, Salwar Suit, Shirt, Abaya Stitching, etc.
- **Employees:** Master Tailor, Tailor, Cutter, Stitcher, Ironing

### 2. Laundry/Dry Cleaners - Fresh & Clean Laundry
- **Login:** demo@freshclean.ae
- **Mobile:** 0502345678
- **Product Types:** Washing Services, Dry Cleaning, Pressing Services
- **Products:** Shirt Wash & Iron, Dry Clean Suit, Bed Sheet Set, Express Service, etc.
- **Employees:** Manager, Washer, Dry Cleaner, Ironing, Delivery

### 3. Salons & Barbers - Glamour Beauty Salon
- **Login:** demo@glamour.ae
- **Mobile:** 0503456789
- **Product Types:** Hair Services, Nail Services, Beauty Services
- **Products:** Haircut, Hair Coloring, Manicure, Pedicure, Facial, Makeup, etc.
- **Employees:** Salon Manager, Hair Stylist, Nail Technician, Beauty Therapist, Receptionist

### 4. Mobile/Repair Shops - TechFix Mobile Repair
- **Login:** demo@techfix.ae
- **Mobile:** 0504567890
- **Product Types:** Screen Services, Battery Services, Software Services
- **Products:** iPhone Screen Repair, Battery Replacement, Data Recovery, etc.
- **Employees:** Manager, Technician, Cashier, Assistant

### 5. AC/Electrical Repair - CoolTech AC & Electrical
- **Login:** demo@cooltech.ae
- **Mobile:** 0505678901
- **Product Types:** AC Services, Electrical Services, Maintenance
- **Products:** AC Installation, AC Repair, Electrical Wiring, Emergency Service, etc.
- **Employees:** Manager, AC Technician, Electrician, Technician, Assistant

### 6. Small Cafes/Kiosks - Cafe Delight
- **Login:** demo@cafedelight.ae
- **Mobile:** 0506789012
- **Product Types:** Hot Beverages, Cold Beverages, Food Items
- **Products:** Arabic Coffee, Cappuccino, Orange Juice, Sandwich, Shawarma, etc.
- **Employees:** Manager, Barista, Cashier, Kitchen Staff, Server

### 7. Cobbler/Shoe Repair - Shoe Master Cobbler
- **Login:** demo@shoemaster.ae
- **Mobile:** 0507890123
- **Product Types:** Shoe Repair, Leather Work, Accessories
- **Products:** Sole Replacement, Heel Repair, Leather Bag Repair, Shoe Polish, etc.
- **Employees:** Master Cobbler, Cobbler, Leather Worker, Assistant, Cashier

### 8. Tuition/Home Classes - Bright Minds Tuition
- **Login:** demo@brightminds.ae
- **Mobile:** 0508901234
- **Product Types:** Individual Classes, Group Classes, Specialized Courses
- **Products:** Math Tutoring, English Classes, IELTS Preparation, Computer Classes, etc.
- **Employees:** Principal, Math Teacher, English Teacher, Science Teacher, Admin

### 9. Mini Warehouses - SafeStore Mini Warehouse
- **Login:** demo@safestore.ae
- **Mobile:** 0509012345
- **Product Types:** Storage Units, Additional Services, Moving Services
- **Products:** Small Unit (5x5), Medium Unit (10x10), Climate Control, Moving Service, etc.
- **Employees:** Manager, Security, Maintenance, Customer Service, Moving Staff

### 10. IT Hardware Shops - TechZone IT Hardware
- **Login:** demo@techzone.ae
- **Mobile:** 0500123456
- **Product Types:** Computers, Accessories, Services
- **Products:** Gaming Laptop, Office Desktop, Gaming Mouse, Computer Repair, etc.
- **Employees:** Manager, Sales Representative, Technician, Cashier, Assistant

### 11. Perfume & Oud Shops - Arabian Oud Perfumes
- **Login:** demo@arabianoud.ae
- **Mobile:** 0501234568
- **Product Types:** Traditional Oud, Modern Perfumes, Accessories
- **Products:** Pure Oud Oil, Oud Perfume, Designer Perfume, Perfume Gift Set, etc.
- **Employees:** Manager, Sales Representative, Perfume Expert, Cashier, Assistant

## What Each Shop Gets

Every demo shop includes:

### ✅ **3 Product Types**
- Realistic categories for each business type
- Detailed descriptions

### ✅ **10 Products**
- Realistic product names and prices in AED
- Proper categorization under product types
- Detailed descriptions

### ✅ **5 Employees**
- UAE-style names and positions
- Realistic phone numbers
- Professional email addresses

### ✅ **20 Customers**
- UAE-style names (mix of Arabic and international names)
- Realistic phone numbers
- Distributed across UAE cities and areas

### ✅ **20 Invoices**
- Random dates in the last 3 months
- Realistic bill numbers (BILL-YYYYMMDD-XXX)
- Mix of paid (70%) and pending (30%) invoices
- Proper VAT calculations (5%)
- Random product combinations (1-3 items per invoice)

### ✅ **10 Expenses**
- Business-relevant expenses (rent, electricity, insurance, etc.)
- Realistic amounts for UAE market
- Stored as negative bills for tracking

## Usage Instructions

### Create a Single Shop
```bash
# Create Tailors Shop
python create_demo_shops.py --shop_type tailors

# Create Laundry Shop
python create_demo_shops.py --shop_type laundry

# Create Salon Shop
python create_demo_shops.py --shop_type salons

# Create Mobile Repair Shop
python create_demo_shops.py --shop_type mobile

# Create AC/Electrical Shop
python create_demo_shops.py --shop_type electrical

# Create Cafe Shop
python create_demo_shops.py --shop_type cafes

# Create Cobbler Shop
python create_demo_shops.py --shop_type cobbler

# Create Tuition Center
python create_demo_shops.py --shop_type tuition

# Create Warehouse
python create_demo_shops.py --shop_type warehouse

# Create IT Hardware Shop
python create_demo_shops.py --shop_type it

# Create Perfume Shop
python create_demo_shops.py --shop_type perfume
```

### Create All Shops at Once
```bash
python create_demo_shops.py --shop_type all
```

## Login Information

After creating the shops, you can login using:

| Shop Type | Email | Mobile |
|-----------|-------|--------|
| Tailors | demo@perfectstitch.ae | 0501234567 |
| Laundry | demo@freshclean.ae | 0502345678 |
| Salons | demo@glamour.ae | 0503456789 |
| Mobile Repair | demo@techfix.ae | 0504567890 |
| AC/Electrical | demo@cooltech.ae | 0505678901 |
| Cafes | demo@cafedelight.ae | 0506789012 |
| Cobbler | demo@shoemaster.ae | 0507890123 |
| Tuition | demo@brightminds.ae | 0508901234 |
| Warehouse | demo@safestore.ae | 0509012345 |
| IT Hardware | demo@techzone.ae | 0500123456 |
| Perfume | demo@arabianoud.ae | 0501234568 |

**Note:** All demo shops are created with PRO plan access and use **"demo123"** as the common password.

## Features Demonstrated

Each demo shop showcases:

1. **Multi-tenant Architecture** - Each shop has its own isolated data
2. **Realistic UAE Data** - Names, phone numbers, cities, and areas
3. **Business-Specific Products** - Tailored to each industry
4. **Complete Workflow** - Products, customers, employees, invoices, expenses
5. **VAT Compliance** - Proper 5% VAT calculations
6. **Payment Tracking** - Mix of paid and pending invoices
7. **Professional Setup** - Shop settings, working hours, contact info

## Customization

You can easily modify the `SHOP_DEFINITIONS` in `create_demo_shops.py` to:

- Add new business types
- Change product names and prices
- Modify employee positions
- Adjust expense categories
- Update shop names and contact details

## Database Impact

The script creates new user accounts with sequential user IDs, so it won't interfere with existing data. Each shop gets:

- 1 user record
- 1 shop_settings record
- 1 user_plans record (PRO plan)
- 3 product_types records
- 10 products records
- 5 employees records
- 20 customers records
- 20 bills records (invoices)
- 10 bills records (expenses as negative bills)
- Multiple bill_items records

## Testing Different Scenarios

These demo shops allow you to test:

- **Different Business Types** - See how the app adapts to various industries
- **Product Management** - Different product types and pricing strategies
- **Customer Management** - Realistic customer data and locations
- **Invoice Generation** - Various invoice scenarios and payment statuses
- **Employee Management** - Different roles and responsibilities
- **Expense Tracking** - Business-specific expense categories
- **Reporting** - Generate reports with realistic data

## Notes

- All shops are created with PRO plan access for full feature testing
- Phone numbers follow UAE format (050/052/054/056/058 + 7 digits)
- Cities and areas are realistic UAE locations
- Product prices are in AED and reflect typical UAE market rates
- Invoice dates are spread over the last 3 months for realistic reporting

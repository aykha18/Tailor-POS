# Tajir - Multi-Tenant POS System

A modern, multi-tenant Point of Sale system designed specifically for UAE businesses and the Gulf region. Tajir (تاجر) means "Merchant" in Arabic, reflecting our commitment to empowering local businesses.

**Last Updated: 2025-01-19**

**Live Demo:** [https://tailor-pos-production.up.railway.app/](https://tailor-pos-production.up.railway.app/)

---

## 🚦 Plan Management & Licensing

Tailor POS supports a flexible, config-driven licensing system with four plans:

- **Trial:** All features for 15 days (free)
- **Basic:** All features for 1 month, then only basic features (billing, product/customer management)
- **PRO:** Lifetime access to all features
- **Enterprise:** Custom solutions with additional features

Plan status, expiry, and feature access are managed via `config.json` and enforced in both backend and frontend. Upgrades and plan changes are supported via API and UI.

### Plan Enforcement
- **Trial Expiry:** All features locked after 15 days
- **Basic Expiry:** PRO features (dashboard, customer search, backup/restore) locked after 1 month
- **PRO:** Never expires, all features always available
- **Enterprise:** Custom features and support

---

## 💰 Pricing Structure

| Plan | Price | Duration | Features |
|------|-------|----------|----------|
| **Tailor Trial** | Free | 15 days | All PRO features |
| **Tailor Basic** | AED 3000 | 1 month free, then limited | Basic features + limited PRO features |
| **Tailor PRO** | AED 5000 | Lifetime | All features + upcoming features |
| **Enterprise** | Custom | Custom | Everything in PRO + custom features |

### Upcoming Features (Available in PRO & Enterprise)
- Advanced reporting and analytics
- Mobile App integration
- Payment gateway integration
- Inventory management

---

## ⚙️ Configuration: `config.json`

All plan details, feature definitions, UI lock styles, and upgrade options are defined in `config.json`. You can customize:
- Plan durations, prices, and expiry behaviors
- Which features are enabled/locked per plan
- UI messages and lock overlays
- Upgrade pricing and flows

---

## 🚀 Deployment

### Railway Deployment
The application is currently deployed on Railway:
- **URL:** https://tailor-pos-production.up.railway.app/
- **Database:** SQLite (for demo purposes)
- **Future:** Planning to migrate to Supabase for scalability

### Local Development
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd tailor_pos
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the application**
   Open your web browser and navigate to: `http://localhost:5000`

---

## 🛠️ Backend Features & API Endpoints

### Plan Management APIs
- `GET /api/plan/status` — Get current plan status and expiry
- `POST /api/plan/upgrade` — Change/upgrade plan (trial, basic, pro)
- `GET /api/plan/features` — List enabled/locked features
- `GET /api/plan/check-feature/<feature>` — Check if a feature is enabled
- `GET /api/plan/config` — Get plan config for frontend
- `POST /api/plan/expire-trial` — (Debug) Expire trial instantly
- `POST /api/plan/reset-trial` — (Debug) Reset trial to today

### Plan Logic
- See `plan_manager.py` for all backend plan logic and expiry calculations
- See `test_plan_manager.py` for backend plan logic tests

---

## 📊 Advanced Reports

The Advanced Reports module provides powerful, filterable reports for Invoices, Employees, and Products.

### Invoices Report
- Filter by date range, products, employees, city, area, and status.
- View up to 50 records in the UI (with a note about the limit).
- Download all filtered records as CSV.
- Print all filtered records in a print-friendly format.

### Employees Report
- Filter by date range, products, city, area, and status.
- See bills handled, total billed, and products handled per employee.
- Products are displayed as tags, with "+N more" and a tooltip for long lists.

### Products Report
- Filter by date range, product type, city, area, and status.
- See total quantity sold and total revenue per product.

### Modern UI Features
- All reports have animated loading, fade-in rows, and responsive tables.
- Filter dropdowns are dynamically populated and support multi-select where appropriate.
- Print and Download buttons are available for each report.

### Print Functionality
- Print button opens a print-friendly view of all filtered invoices (not just the limited UI view).
- Print view is styled for clarity and includes all relevant columns.

---

## 🖥️ Frontend Features

- **Dynamic Plan Titles:** Page titles and navbar show current plan (Tailor Trial, Tailor Basic, Tailor Pro)
- **UI plan enforcement:** All feature access is locked/unlocked based on plan status
- **Upgrade prompts:** Users see upgrade modals and lock overlays when features are restricted
- **Debug page:** `/debug-plan` for interactive plan testing and switching
- **Modern UI:** Dark theme with Tailwind CSS and Lucide icons
- **Advanced Reports:** Tabbed interface for Invoices, Employees, and Products with modern filters, animated loading, and responsive tables
- **Animated table row fade-in and skeleton loaders for all reports**
- **Product tags with "+N more" and tooltips for long lists in employee reports**
- **Print and Download buttons for all reports**
- **Print view columns (Bill#, Bill Date, Delivery Date) are styled to prevent wrapping**
- **Shop Settings:** Configure shop name, address, TRN, logo URL, and dynamic invoice template settings

---

## 🧪 Testing & Debugging

- **Debug Page:** `/debug-plan` — Test plan status, expiry, and switch between plans instantly
- **Backend Test Script:** `python test_plan_manager.py` — Run backend plan logic tests
- **Regression Tests (Selenium):** See `tests/selenium/README.md` to run the end-to-end test suite

---

## 📁 .gitignore & Excluded Files

If you do not want to push the `bkpup/` directory to git, add this to your `.gitignore`:
```
bkpup/
```

---

## Features

### 🎯 Core Features
- **Product Management**: Manage product types and individual products with pricing
- **Customer Management**: Store and manage customer information
- **Billing System**: Create and print professional bills with VAT calculation
- **VAT Management**: Configure and manage VAT rates with effective dates
- **Dashboard Analytics**: Real-time business insights and revenue tracking
- **Employee Management**: Track masters/employees and their performance
- **Data Backup/Restore**: Database backup and restore functionality

### 📊 Product Categories
The system comes pre-loaded with common tailoring products:
- **Saree**: Fall stitching, petticoat, belt stitching
- **Kurti**: With/without lining options
- **Palazzo**: With/without lining options
- **Trouser/Pant**: With/without lining options
- **Shirt**: Regular shirts
- **Salwar Suit**: Various lining options
- **Blouse**: Padded/non-padded options
- **Kaftan**: With/without lining options
- **Patiala Suit**: Various lining options
- **Abaya**: Stitching services
- **Anarkali**: 8 kaliyan design
- **Gown**: Stitching services
- **Jump Suit**: Complete jumpsuit
- **Lehenga**: Stitching and choli options
- **Designer Items**: One piece and blouse options
- **Sharara/Gharara**: With kurti combinations
- **Coat/Blazer**: Professional wear
- **Dress**: Indo-western and western styles

### 💰 Pricing Structure
All products come with pre-configured pricing based on market standards:
- Saree fall stitching: AED 30
- Kurti (no lining): AED 55
- Shirt: AED 100
- Lehenga choli: AED 320
- Coat/Blazer: AED 350
- And many more...

## Database Structure

The application uses SQLite with the following main tables:

### `product_types`
- `type_id` (Primary Key)
- `type_name` (Unique)
- `created_at`

### `products`
- `product_id` (Primary Key)
- `type_id` (Foreign Key to product_types)
- `product_name`
- `rate` (Price in AED)
- `description`
- `is_active`
- `created_at`

### `customers`
- `customer_id` (Primary Key)
- `name`
- `phone` (Unique)
- `city`
- `area`
- `email`
- `address`
- `created_at`

### `bills`
- `bill_id` (Primary Key)
- `bill_number` (Unique)
- `customer_id` (Foreign Key to customers)
- `customer_name`
- `customer_phone`
- `customer_city`
- `customer_area`
- `bill_date`
- `delivery_date`
- `payment_method`
- `subtotal`
- `vat_amount`
- `total_amount`
- `advance_paid`
- `balance_amount`
- `status`
- `master_id` (Employee assigned)
- `trial_date`
- `notes`
- `created_at`

### `bill_items`
- `item_id` (Primary Key)
- `bill_id` (Foreign Key to bills)
- `product_id` (Foreign Key to products)
- `product_name`
- `quantity`
- `rate`
- `discount`
- `advance_paid`
- `total_amount`
- `created_at`

### `vat_rates`
- `vat_id` (Primary Key)
- `rate_percentage`
- `effective_from`
- `effective_to`
- `is_active`
- `created_at`

### `employees`
- `employee_id` (Primary Key)
- `name`
- `mobile`
- `address`
- `created_at`

### `user_plans`
- `plan_id` (Primary Key)
- `user_id`
- `plan_type` (trial, basic, pro)
- `plan_start_date`
- `is_active`
- `created_at`
- `updated_at`

## Usage Guide

### 1. Product Types Management
- Navigate to "Product Types" in the sidebar
- Add new product types (e.g., "Wedding Wear", "Casual Wear")
- Delete unused types (only if no products are associated)

### 2. Products Management
- Navigate to "Products" in the sidebar
- Select a product type
- Add product name and price
- View all products in the table below

### 3. Customer Management
- Navigate to "Customers" in the sidebar
- Add customer details: name, phone, city, area
- View all customers in the list

### 4. VAT Configuration
- Navigate to "VAT %" in the sidebar
- Set VAT percentage and effective dates
- Multiple VAT rates can be configured for different periods

### 5. Billing Process
- Navigate to "Billing" in the sidebar
- Fill in customer details and bill information
- Select products from the dropdown
- Adjust quantities, rates, discounts, and advance payments
- Select a Master (employee) and add trial date
- Click "Print Receipt" to generate and print the bill

### 6. Dashboard Analytics
- Navigate to "Dashboard" in the sidebar
- View today's revenue, bills, pending orders, and customer count
- Analyze monthly revenue trends
- Track top-selling products and employee performance

### 7. Employee Management
- Navigate to "Employees" in the sidebar
- Add, edit, and delete employees (Masters)
- Track employee performance in dashboard

## API Endpoints

The application provides RESTful API endpoints for all operations:

### Product Types
- `GET /api/product-types` - Get all product types
- `POST /api/product-types` - Add new product type
- `DELETE /api/product-types/<id>` - Delete product type

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add new product
- `PUT /api/products/<id>` - Update product
- `DELETE /api/products/<id>` - Delete product

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add new customer
- `PUT /api/customers/<id>` - Update customer
- `DELETE /api/customers/<id>` - Delete customer

### VAT Rates
- `GET /api/vat-rates` - Get all VAT rates
- `POST /api/vat-rates` - Add new VAT rate
- `DELETE /api/vat-rates/<id>` - Delete VAT rate

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create new bill
- `GET /api/bills/<id>` - Get specific bill
- `DELETE /api/bills/<id>` - Delete bill
- `GET /api/bills/<id>/print` - Print bill

### Dashboard
- `GET /api/dashboard` - Get dashboard analytics
- `GET /api/employee-analytics` - Get employee performance data

### Plan Management
- `GET /api/plan/status` - Get current plan status
- `POST /api/plan/upgrade` - Upgrade plan
- `GET /api/plan/features` - Get enabled features
- `GET /api/plan/check-feature/<feature>` - Check feature access

### Backup/Restore
- `POST /api/backup/upload` - Upload database backup
- `GET /api/backups` - List available backups
- `GET /api/backup/download/<filename>` - Download backup
- `POST /api/backup/restore/<filename>` - Restore from backup

### Advanced Reports APIs

- `GET /api/reports/invoices` — Filtered invoice report (UI, 50 records)
- `GET /api/reports/invoices/download` — Download all filtered invoices as CSV
- `GET /api/reports/invoices/print` — Print-friendly HTML of all filtered invoices
- `GET /api/reports/employees` — Filtered employee report
- `GET /api/reports/products` — Filtered product report

### Shop Settings APIs

- `GET /api/shop-settings` — Get current shop settings
- `PUT /api/shop-settings` — Update shop settings

## Customization

### Adding New Products
1. First add a product type if needed
2. Navigate to Products section
3. Select the product type
4. Add product name and price
5. The product will be available for billing immediately

### Modifying Prices
1. Navigate to Products section
2. Find the product in the table
3. Click edit (if implemented) or delete and recreate
4. Update the price as needed

### Customizing Bill Template
Edit the `templates/print_bill.html` file to:
- Change business name and contact information
- Modify layout and styling
- Add company logo
- Customize footer text

## Security Features

- Input validation on all forms
- SQL injection prevention through parameterized queries
- XSS protection through proper HTML escaping
- CSRF protection (can be enhanced further)

## Performance Optimizations

- Database indexes on frequently queried columns
- Efficient SQL queries with proper joins
- Client-side caching for static assets
- Responsive design for mobile devices

## Troubleshooting

### Common Issues

1. **Database not created**
   - Ensure the application has write permissions in the directory
   - Check if `database_schema.sql` exists

2. **Port already in use**
   - Change the port in `app.py` line: `app.run(debug=True, host='0.0.0.0', port=5001)`

3. **Dependencies not installed**
   - Run `pip install -r requirements.txt` again
   - Check Python version compatibility

4. **Print not working**
   - Ensure pop-up blockers are disabled
   - Check browser print settings

5. **JSON serialization error**
   - Fixed Infinity values in plan status API
   - Now returns "Unlimited" instead of float('inf')

## Future Enhancements

- User authentication and role-based access
- Inventory management
- Customer loyalty program
- Multi-branch support
- Advanced reporting and analytics
- Mobile app integration
- Payment gateway integration
- Backup and restore functionality

## Support

For technical support or feature requests, please contact the development team.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a production-ready application designed for small to medium tailoring businesses. The database comes pre-loaded with common tailoring products and pricing, but can be fully customized to meet specific business requirements. 

## New Features (2024-2025)

### 👥 Employees Management
- Add, edit, and delete employees (Masters) from the Employees section
- Assign a Master to each bill with autocomplete in billing
- Track employee performance and revenue

### 🧑‍🔧 Master & Trial Date in Billing
- Select a Master (employee) for each bill
- Add a Trial Date for each bill
- Both fields are saved and shown in printouts

### 🧾 Bill Number Auto-Generation
- Bill # is auto-generated in the format `BILL-YYYYMMDD-XXX` (editable by user)
- Ensures unique, sequential bill numbers per day

### 📈 Advanced Analytics
- Dashboard includes:
  - Top 5 Employees by Revenue (bar chart)
  - Revenue Share by Employee (pie chart)
  - Monthly Revenue (vertical bar chart with color effects)
  - Interactive, modern charts with tooltips and effects

### 🖨️ Enhanced Bill Printout
- Printout includes Master (employee) name and Trial Date
- Professional, customizable layout

### 💡 UI/UX Improvements
- Modern toast notifications for errors/info
- Autocomplete for city, area, and master fields
- Visual effects on charts (3D, gradients, hover)
- Dynamic plan-based titles and branding

### 🔐 Plan Management System
- 3-tier licensing system (Trial, Basic, PRO)
- Feature access control based on plan status
- Dynamic UI locking/unlocking
- Plan upgrade functionality
- Debug interface for testing

## How to Push to GitHub

1. **Initialize Git (if not already):**
   ```bash
   git init
   git remote add origin https://github.com/yourusername/yourrepo.git
   ```
2. **Add all changes:**
   ```bash
   git add .
   ```
3. **Commit your changes:**
   ```bash
   git commit -m "Add plan management, pricing updates, and deployment improvements"
   ```
4. **Push to GitHub:**
   ```bash
   git push -u origin main
   ```
   *(If your default branch is 'master', use 'master' instead of 'main')*

--- 

## Change Log

### 2025-01-19
- Added dynamic plan-based titles (Tailor Trial, Tailor Basic, Tailor Pro)
- Updated pricing structure with upcoming features
- Fixed JSON serialization issue with Infinity values
- Added "Inventory management" to upcoming features
- Centered "Upcoming Features" headings in pricing cards
- Updated README.md with current deployment and pricing information

### 2025-07-16
- Fixed Payment Progress Modal HTML placement and ensured only one instance exists.
- Payment Progress Modal now animates and shows after successful payment.
- Improved Mark as Paid logic to use the progress modal and show success only after completion.
- Introduced 3-tier product structure (Trial, Basic, PRO) with feature matrix.
- Updated README.md with pricing, features, and last updated date. 

### 2025-07-21
- Added Advanced Reports: Invoices, Employees, Products tabs with modern filters and tables
- Implemented print-friendly invoice report with styled columns
- Added CSV download for all reports
- Improved product tag display and tooltips in employee report
- Refactored dropdown population code for reusability
- Cleaned up debug logs and console statements
- Added Shop Settings module with shop name, address, TRN, logo URL, and dynamic invoice template configuration 
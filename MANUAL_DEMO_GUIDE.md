# Manual Demo Recording Guide for Tajir POS

## 🎬 Quick Manual Demo Steps

### Prerequisites
- Python 3.7+ installed
- Chrome browser installed
- Recording software (OBS Studio, Windows Game Bar, etc.)

### Step-by-Step Demo Process

#### 1. Start the Application
```bash
python app.py
```
Wait for the message: "Running on http://127.0.0.1:5000"

#### 2. Open Browser and Navigate
- Open Chrome browser
- Go to: `http://localhost:5000/login`

#### 3. Login
- Email: `admin@tailorpos.com`
- Password: `admin123`
- Click "Sign In"

#### 4. Demo Flow (Follow this sequence)

**Dashboard Overview (30 seconds)**
- Click "Dashboard" in sidebar
- Show the charts and metrics
- Point out revenue, sales, and expense data

**Billing System (45 seconds)**
- Click "Billing" in sidebar
- Show the billing form
- Demonstrate adding customer details
- Show product selection and pricing

**Product Management (30 seconds)**
- Click "Products" in sidebar
- Show product list
- Click "Add Product" to show form
- Demonstrate adding a new product

**Customer Management (30 seconds)**
- Click "Customers" in sidebar
- Show customer list
- Click "Add Customer" to show form
- Demonstrate adding a new customer

**Employee Management (30 seconds)**
- Click "Employees" in sidebar
- Show employee list
- Click "Add Employee" to show form
- Demonstrate adding a new employee

**Expense Management (45 seconds)**
- Click "Expenses" in sidebar (or navigate to `/expenses`)
- Show expense categories
- Click "Add Category" to show form
- Click "Add Expense" to show form
- Demonstrate adding an expense

**Reports (30 seconds)**
- Click "Advanced Reports" in sidebar
- Show the three tabs: Invoices, Employees, Products
- Demonstrate filtering options
- Show export functionality

**Mobile View (30 seconds)**
- Resize browser to mobile width (375px)
- Show mobile navigation
- Show responsive design
- Return to desktop view

**Final Overview (15 seconds)**
- Return to Dashboard
- Show updated metrics
- End with a summary

### 5. Recording Tips

#### Setup
- **Resolution**: 1920x1080
- **Frame Rate**: 30 FPS
- **Recording Area**: Full screen or browser window only

#### Timing
- **Total Duration**: ~4-5 minutes
- **Each Section**: 30-45 seconds
- **Transitions**: Smooth and natural

#### Content Focus
- Highlight key features
- Show real data entry
- Demonstrate user workflow
- Emphasize mobile responsiveness

### 6. Voice-Over Script (Optional)

```
"Welcome to Tajir POS, a comprehensive point-of-sale solution for modern businesses.

Let's start with the dashboard, where you can see real-time sales data, revenue trends, and key performance indicators.

The billing system allows you to create professional invoices quickly. Simply add customer details, select products, and generate bills instantly.

Product management is straightforward - add new products, set prices, and organize them by categories.

Customer management helps you build relationships. Store contact information and track purchase history.

Employee management lets you manage your team efficiently with role assignments and performance tracking.

Our expense management feature helps you track business expenses with categories and detailed reporting.

The advanced reports provide comprehensive analytics for invoices, employees, and products with filtering and export capabilities.

The mobile-responsive design ensures your POS works perfectly on any device.

Tajir POS - Streamline your business operations today."
```

### 7. Post-Recording

#### Editing
- Trim unnecessary parts
- Add transitions if needed
- Include captions or text overlays
- Add background music (optional)

#### Export
- Format: MP4 (H.264)
- Quality: 1920x1080, 30 FPS
- File size: Optimize for web sharing

### 8. Alternative: Automated Demo

If manual recording is challenging, you can also use the automated demo script:

```bash
# Install Selenium
pip install selenium

# Run automated demo
python working_demo.py
```

Then record the automated demo using your preferred screen recording software.

---

**Happy Recording! 🎬**

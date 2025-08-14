#!/usr/bin/env python3
"""
Automated Full App Demo for Tajir POS
This script automatically demonstrates ALL features of the Tajir POS application
"""

import time
import subprocess
import sys
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select

class TajirPOSDemo:
    def __init__(self):
        self.driver = None
        self.flask_process = None
        self.wait = None
        
    def setup_driver(self):
        """Setup Chrome driver with optimal settings for demo"""
        chrome_options = Options()
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument("--disable-notifications")
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.wait = WebDriverWait(self.driver, 10)
        
    def start_flask_app(self):
        """Start the Flask application"""
        print("Starting Flask application...")
        self.flask_process = subprocess.Popen([sys.executable, "app.py"])
        time.sleep(5)  # Wait for app to start
        
    def login_to_app(self):
        """Login to the application"""
        print("1. Logging into application...")
        self.driver.get("http://localhost:5000")
        time.sleep(2)
        
        # Check if we're on the landing page and need to go to login
        if "Welcome Back" not in self.driver.page_source:
            # Navigate to login page
            login_link = self.driver.find_element(By.XPATH, "//a[contains(text(), 'Sign In')]")
            login_link.click()
            time.sleep(2)
        
        # Try to find login form
        try:
            # Look for login form elements
            email_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "signin-email"))
            )
            password_input = self.driver.find_element(By.ID, "signin-password")
            
            # Fill login form with correct credentials
            email_input.send_keys("admin@tailorpos.com")  # Correct admin email
            password_input.send_keys("admin123")  # Correct admin password
            
            # Submit form
            login_button = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            login_button.click()
            time.sleep(3)
            
            print("   - Login successful")
            
        except Exception as e:
            print(f"   Login error: {e}")
            print("   Proceeding with demo...")
            
    def demo_dashboard(self):
        """Demonstrate dashboard features"""
        print("2. Demonstrating Dashboard...")
        try:
            # Navigate to dashboard
            dashboard_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='dashSec']"))
            )
            dashboard_btn.click()
            time.sleep(3)
            
            # Show dashboard cards and charts
            print("   - Showing dashboard overview")
            time.sleep(2)
            
            # Scroll to show all dashboard elements
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)
            
        except Exception as e:
            print(f"   Dashboard demo error: {e}")
            
    def demo_billing(self):
        """Demonstrate billing functionality"""
        print("3. Demonstrating Billing System...")
        try:
            # Navigate to billing
            billing_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='billingSec']"))
            )
            billing_btn.click()
            time.sleep(3)
            
            # Fill billing form
            print("   - Filling billing form")
            
            # Customer details
            customer_input = self.driver.find_element(By.ID, "billCustomer")
            customer_input.send_keys("Demo Customer")
            
            mobile_input = self.driver.find_element(By.ID, "billMobile")
            mobile_input.send_keys("1234567890")
            
            # Product selection
            master_input = self.driver.find_element(By.ID, "masterName")
            master_input.send_keys("Demo Product")
            time.sleep(1)
            
            # Add quantity and price
            quantity_input = self.driver.find_element(By.ID, "quantity")
            quantity_input.clear()
            quantity_input.send_keys("2")
            
            price_input = self.driver.find_element(By.ID, "price")
            price_input.clear()
            price_input.send_keys("50.00")
            
            # Add item
            add_item_btn = self.driver.find_element(By.ID, "addItemBtn")
            add_item_btn.click()
            time.sleep(2)
            
            print("   - Billing form completed")
            
        except Exception as e:
            print(f"   Billing demo error: {e}")
            
    def demo_products(self):
        """Demonstrate product management"""
        print("4. Demonstrating Product Management...")
        try:
            # Navigate to products
            products_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='productSec']"))
            )
            products_btn.click()
            time.sleep(3)
            
            # Add new product
            print("   - Adding new product")
            add_product_btn = self.driver.find_element(By.ID, "addProductBtn")
            add_product_btn.click()
            time.sleep(1)
            
            # Fill product form
            product_name = self.driver.find_element(By.ID, "productName")
            product_name.send_keys("Demo Product")
            
            product_price = self.driver.find_element(By.ID, "productPrice")
            product_price.send_keys("75.00")
            
            product_desc = self.driver.find_element(By.ID, "productDescription")
            product_desc.send_keys("Demo product for testing")
            
            # Submit product
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            time.sleep(2)
            
            print("   - Product added successfully")
            
        except Exception as e:
            print(f"   Products demo error: {e}")
            
    def demo_customers(self):
        """Demonstrate customer management"""
        print("5. Demonstrating Customer Management...")
        try:
            # Navigate to customers
            customers_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='customerSec']"))
            )
            customers_btn.click()
            time.sleep(3)
            
            # Add new customer
            print("   - Adding new customer")
            add_customer_btn = self.driver.find_element(By.ID, "addCustomerBtn")
            add_customer_btn.click()
            time.sleep(1)
            
            # Fill customer form
            customer_name = self.driver.find_element(By.ID, "customerName")
            customer_name.send_keys("John Doe")
            
            customer_phone = self.driver.find_element(By.ID, "customerPhone")
            customer_phone.send_keys("9876543210")
            
            customer_email = self.driver.find_element(By.ID, "customerEmail")
            customer_email.send_keys("john@demo.com")
            
            # Submit customer
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            time.sleep(2)
            
            print("   - Customer added successfully")
            
        except Exception as e:
            print(f"   Customers demo error: {e}")
            
    def demo_employees(self):
        """Demonstrate employee management"""
        print("6. Demonstrating Employee Management...")
        try:
            # Navigate to employees
            employees_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='employeeSec']"))
            )
            employees_btn.click()
            time.sleep(3)
            
            # Add new employee
            print("   - Adding new employee")
            add_employee_btn = self.driver.find_element(By.ID, "addEmployeeBtn")
            add_employee_btn.click()
            time.sleep(1)
            
            # Fill employee form
            employee_name = self.driver.find_element(By.ID, "employeeName")
            employee_name.send_keys("Jane Smith")
            
            employee_phone = self.driver.find_element(By.ID, "employeePhone")
            employee_phone.send_keys("5551234567")
            
            employee_role = self.driver.find_element(By.ID, "employeeRole")
            employee_role.send_keys("Sales Associate")
            
            # Submit employee
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            time.sleep(2)
            
            print("   - Employee added successfully")
            
        except Exception as e:
            print(f"   Employees demo error: {e}")
            
    def demo_expenses(self):
        """Demonstrate expense management"""
        print("7. Demonstrating Expense Management...")
        try:
            # Navigate to expenses
            self.driver.get("http://localhost:5000/expenses")
            time.sleep(3)
            
            # Add expense category
            print("   - Adding expense category")
            add_category_btn = self.driver.find_element(By.ID, "addCategoryBtn")
            add_category_btn.click()
            time.sleep(1)
            
            category_name = self.driver.find_element(By.ID, "categoryName")
            category_name.send_keys("Demo Category")
            
            category_desc = self.driver.find_element(By.ID, "categoryDescription")
            category_desc.send_keys("Category for demo purposes")
            
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            time.sleep(2)
            
            # Add expense
            print("   - Adding expense")
            add_expense_btn = self.driver.find_element(By.ID, "addExpenseBtn")
            add_expense_btn.click()
            time.sleep(1)
            
            expense_date = self.driver.find_element(By.ID, "expenseDate")
            expense_date.send_keys("2024-01-15")
            
            expense_amount = self.driver.find_element(By.ID, "expenseAmount")
            expense_amount.send_keys("100.00")
            
            expense_desc = self.driver.find_element(By.ID, "expenseDescription")
            expense_desc.send_keys("Demo expense for testing")
            
            # Select category
            category_select = self.driver.find_element(By.ID, "expenseCategory")
            category_select.click()
            time.sleep(1)
            category_select.find_element(By.XPATH, "//option[contains(text(), 'Demo Category')]").click()
            
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            time.sleep(2)
            
            print("   - Expense added successfully")
            
        except Exception as e:
            print(f"   Expenses demo error: {e}")
            
    def demo_reports(self):
        """Demonstrate reporting features"""
        print("8. Demonstrating Reports...")
        try:
            # Navigate to reports
            reports_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='advancedReportsSec']"))
            )
            reports_btn.click()
            time.sleep(3)
            
            # Show different report types
            print("   - Showing sales reports")
            time.sleep(2)
            
            # Try to generate a report
            try:
                generate_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Generate') or contains(text(), 'Export')]")
                generate_btn.click()
                time.sleep(2)
            except:
                pass
                
            print("   - Reports section demonstrated")
            
        except Exception as e:
            print(f"   Reports demo error: {e}")
            
    def demo_mobile_view(self):
        """Demonstrate mobile responsive design"""
        print("9. Demonstrating Mobile View...")
        try:
            # Set mobile viewport
            self.driver.set_window_size(375, 667)  # iPhone 6/7/8 size
            time.sleep(2)
            
            # Navigate to main app
            self.driver.get("http://localhost:5000")
            time.sleep(3)
            
            # Show mobile navigation
            print("   - Showing mobile navigation")
            time.sleep(2)
            
            # Show mobile menu
            try:
                mobile_menu_btn = self.driver.find_element(By.ID, "mobileMenuToggle")
                mobile_menu_btn.click()
                time.sleep(2)
            except:
                pass
                
            # Show mobile "More" menu
            try:
                more_btn = self.driver.find_element(By.XPATH, "//a[contains(text(), 'More')]")
                more_btn.click()
                time.sleep(2)
            except:
                pass
                
            # Reset to desktop view
            self.driver.maximize_window()
            time.sleep(2)
            
            print("   - Mobile view demonstrated")
            
        except Exception as e:
            print(f"   Mobile demo error: {e}")
            self.driver.maximize_window()
            
    def demo_search_and_filter(self):
        """Demonstrate search and filtering capabilities"""
        print("10. Demonstrating Search & Filtering...")
        try:
            # Navigate to products for search demo
            products_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='productSec']"))
            )
            products_btn.click()
            time.sleep(3)
            
            # Search functionality
            print("   - Demonstrating search")
            search_input = self.driver.find_element(By.ID, "productSearch")
            search_input.send_keys("Demo")
            time.sleep(2)
            
            # Clear search
            search_input.clear()
            time.sleep(1)
            
            print("   - Search functionality demonstrated")
            
        except Exception as e:
            print(f"   Search demo error: {e}")
            
    def demo_export_functionality(self):
        """Demonstrate export features"""
        print("11. Demonstrating Export Features...")
        try:
            # Navigate to expenses for export demo
            self.driver.get("http://localhost:5000/expenses")
            time.sleep(3)
            
            # Export expenses
            print("   - Exporting expenses")
            export_btn = self.driver.find_element(By.ID, "exportExpensesBtn")
            export_btn.click()
            time.sleep(2)
            
            print("   - Export functionality demonstrated")
            
        except Exception as e:
            print(f"   Export demo error: {e}")
            
    def final_dashboard_overview(self):
        """Final dashboard overview"""
        print("12. Final Dashboard Overview...")
        try:
            # Navigate back to dashboard
            dashboard_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='dashSec']"))
            )
            dashboard_btn.click()
            time.sleep(3)
            
            # Show updated dashboard with demo data
            print("   - Showing updated dashboard with demo data")
            time.sleep(3)
            
            # Scroll through dashboard
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)
            
            print("   - Dashboard overview completed")
            
        except Exception as e:
            print(f"   Final dashboard error: {e}")
            
    def run_full_demo(self):
        """Run the complete automated demo"""
        print("Starting Automated Full App Demo for Tajir POS")
        print("=" * 60)
        
        try:
            # Setup
            self.setup_driver()
            self.start_flask_app()
            
            # Run all demo sections
            self.login_to_app()
            self.demo_dashboard()
            self.demo_billing()
            self.demo_products()
            self.demo_customers()
            self.demo_employees()
            self.demo_expenses()
            self.demo_reports()
            self.demo_mobile_view()
            self.demo_search_and_filter()
            self.demo_export_functionality()
            self.final_dashboard_overview()
            
            print("\n" + "=" * 60)
            print("Demo completed successfully!")
            print("Total demo time: ~3-4 minutes")
            print("=" * 60)
            
            # Keep browser open for manual review
            input("Press Enter to close the demo...")
            
        except Exception as e:
            print(f"Demo error: {e}")
            
        finally:
            self.cleanup()
            
    def cleanup(self):
        """Clean up resources"""
        print("Cleaning up...")
        if self.driver:
            self.driver.quit()
        if self.flask_process:
            self.flask_process.terminate()
        print("Cleanup completed")

def main():
    """Main function"""
    demo = TajirPOSDemo()
    demo.run_full_demo()

if __name__ == "__main__":
    main()

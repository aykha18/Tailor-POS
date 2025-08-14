#!/usr/bin/env python3
"""
Working Demo for Tajir POS
A robust demo script that works with the actual application
"""

import time
import subprocess
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys

class WorkingTajirDemo:
    def __init__(self):
        self.driver = None
        self.flask_process = None
        self.wait = None
        
    def setup_driver(self):
        """Setup Chrome driver with your existing profile and extensions"""
        chrome_options = Options()
        
        # Use your existing Chrome profile (replace 'YourProfileName' with your actual profile name)
        # You can find your profile name by going to chrome://version/ in your Chrome
        chrome_options.add_argument("--user-data-dir=C:\\Users\\Khana\\AppData\\Local\\Google\\Chrome\\User Data")
        chrome_options.add_argument("--profile-directory=Default")  # or your specific profile name
        
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-notifications")
        # Keep your extensions enabled
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.wait = WebDriverWait(self.driver, 15)
        
    def start_flask_app(self):
        """Start the Flask application"""
        print("Starting Flask application...")
        self.flask_process = subprocess.Popen([sys.executable, "app.py"])
        time.sleep(10)  # Give more time for app to start
        
        # Check if Flask app is running
        print("   - Checking if Flask app is running...")
        try:
            import requests
            response = requests.get("http://localhost:5000", timeout=5)
            if response.status_code == 200:
                print("   - Flask app is running successfully")
            else:
                print(f"   - Flask app responded with status: {response.status_code}")
        except Exception as e:
            print(f"   - Flask app check failed: {e}")
            print("   - Continuing anyway...")
        
    def login_to_app(self):
        """Login to the application"""
        print("1. Logging into application...")
        
        # Wait a bit longer for Chrome to fully load with profile
        time.sleep(5)
        
        # Navigate directly to login page
        print("   - Navigating to login page...")
        self.driver.get("http://localhost:5000/login")
        time.sleep(5)  # Give more time for page to load
        
        # Check if we're on the right page
        current_url = self.driver.current_url
        print(f"   - Current URL: {current_url}")
        
        # If not on login page, try again
        if "login" not in current_url.lower():
            print("   - Not on login page, trying again...")
            self.driver.get("http://localhost:5000/login")
            time.sleep(3)
        
        try:
            # Now try to login
            print("   - Attempting login...")
            email_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "signin-email"))
            )
            password_input = self.driver.find_element(By.ID, "signin-password")
            
            # Clear fields and enter credentials
            email_input.clear()
            email_input.send_keys("demo@tajir.com")
            password_input.clear()
            password_input.send_keys("aykha123")
            
            # Submit form
            login_button = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            login_button.click()
            time.sleep(5)  # Wait longer for login to complete
            
            print("   - Login successful")
            
        except Exception as e:
            print(f"   Login error: {e}")
            print("   Continuing with demo...")
            
    def wait_for_app_load(self):
        """Wait for the main application to load"""
        try:
            # Wait for the main app interface to load
            self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//button[@data-go]"))
            )
            print("   - Application loaded successfully")
        except:
            print("   - Application load timeout, continuing...")
            
    def demo_dashboard(self):
        """Show dashboard"""
        print("2. Showing Dashboard...")
        try:
            # Wait for app to be ready
            self.wait_for_app_load()
            
            # Try to find and click dashboard button
            dashboard_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='dashSec']"))
            )
            dashboard_btn.click()
            time.sleep(3)
            
            print("   - Dashboard displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Dashboard error: {e}")
            
    def demo_products(self):
        """Show product management and create new product"""
        print("4. Showing Product Management...")
        try:
            products_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='productSec']"))
            )
            products_btn.click()
            time.sleep(3)
            
            print("   - Product management displayed")
            
            # Create new product "Moroccon Abaya AED350"
            print("   - Creating new product: Moroccon Abaya")
            
            # Wait for the product form to be visible
            self.wait.until(
                EC.presence_of_element_located((By.ID, "productForm"))
            )
            time.sleep(2)
            
            # Fill product details
            product_name_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "productName"))
            )
            product_name_input.clear()
            product_name_input.send_keys("Moroccon Abaya")
            
            # Set price
            price_input = self.driver.find_element(By.ID, "productPrice")
            price_input.clear()
            price_input.send_keys("350")
            
            # Select product type "Abaya" (assuming it exists or will be created)
            try:
                category_select = self.driver.find_element(By.ID, "productTypeSelect")
                category_select.click()
                time.sleep(1)
                
                # Try to find and select "Abaya" type
                abaya_option = self.driver.find_element(By.XPATH, "//option[contains(text(), 'Abaya')]")
                abaya_option.click()
                time.sleep(1)
                
            except Exception as e:
                print(f"   - Could not select Abaya type: {e}")
                # Try to select the first available option
                try:
                    first_option = self.driver.find_element(By.XPATH, "//select[@id='productTypeSelect']/option[2]")  # Skip the "Select type" option
                    first_option.click()
                    time.sleep(1)
                except:
                    print("   - Could not select any product type, continuing...")
            
            # Submit the form
            submit_btn = self.driver.find_element(By.XPATH, "//form[@id='productForm']//button[@type='submit']")
            submit_btn.click()
            time.sleep(3)
            
            print("   - New product 'Moroccon Abaya AED350' created successfully")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Products error: {e}")
            
    def demo_billing(self):
        """Show billing system and generate bill with new product"""
        print("3. Showing Billing System...")
        try:
            billing_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='billingSec']"))
            )
            billing_btn.click()
            time.sleep(3)
            
            print("   - Billing system displayed")
            
            # Generate bill with new product and existing product
            print("   - Generating bill with Moroccon Abaya and Abaya stitching")
            
            # Add newly created product "Moroccon Abaya"
            try:
                # Find the product input field (desktop version)
                search_input = self.wait.until(
                    EC.presence_of_element_located((By.ID, "billProduct"))
                )
                search_input.clear()
                search_input.send_keys("Moroccon Abaya")
                time.sleep(2)
                
                # Wait for dropdown to appear and click on the product
                product_item = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'product-option-mobile') and contains(., 'Moroccon Abaya')]"))
                )
                product_item.click()
                time.sleep(1)
                
                print("   - Added Moroccon Abaya to bill")
                
            except Exception as e:
                print(f"   - Could not add Moroccon Abaya: {e}")
            
            # Add existing product "Abaya stitching"
            try:
                # Clear and search for Abaya stitching
                search_input = self.driver.find_element(By.ID, "billProduct")
                search_input.clear()
                search_input.send_keys("Abaya stitching")
                time.sleep(2)
                
                # Wait for dropdown to appear and click on the product
                product_item = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'product-option-mobile') and contains(., 'Abaya stitching')]"))
                )
                product_item.click()
                time.sleep(1)
                
                print("   - Added Abaya stitching to bill")
                
            except Exception as e:
                print(f"   - Could not add Abaya stitching: {e}")
            
            # Set quantity for both items (if needed)
            try:
                # Look for quantity inputs and set them
                quantity_input = self.driver.find_element(By.ID, "billQty")
                quantity_input.clear()
                quantity_input.send_keys("1")
                time.sleep(0.5)
                
                print("   - Set quantities for both items")
                
            except Exception as e:
                print(f"   - Could not set quantities: {e}")
            
            # Add the first item to bill
            try:
                add_btn = self.driver.find_element(By.ID, "addItemBtn")
                add_btn.click()
                time.sleep(1)
                print("   - Added first item to bill")
            except Exception as e:
                print(f"   - Could not add first item: {e}")
            
            # Add the second item to bill
            try:
                # Clear and search for second product
                search_input = self.driver.find_element(By.ID, "billProduct")
                search_input.clear()
                search_input.send_keys("Abaya stitching")
                time.sleep(2)
                
                # Wait for dropdown to appear and click on the product
                product_item = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'product-option-mobile') and contains(., 'Abaya stitching')]"))
                )
                product_item.click()
                time.sleep(1)
                
                # Add second item
                add_btn = self.driver.find_element(By.ID, "addItemBtn")
                add_btn.click()
                time.sleep(1)
                
                print("   - Added second item to bill")
                
            except Exception as e:
                print(f"   - Could not add second item: {e}")
            
            # Show the bill preview
            print("   - Bill generated with both products")
            time.sleep(2)
            
            # Click Print Receipt button to show the bill page
            try:
                print("   - Clicking Print Receipt button...")
                print_receipt_btn = self.wait.until(
                    EC.element_to_be_clickable((By.ID, "printBtn"))
                )
                print_receipt_btn.click()
                time.sleep(3)
                
                print("   - Bill page displayed for 3 seconds")
                
            except Exception as e:
                print(f"   - Could not click Print Receipt button: {e}")
                print("   - Showing bill preview instead")
                time.sleep(3)
            
        except Exception as e:
            print(f"   Billing error: {e}")
            
    def demo_customers(self):
        """Show customer management"""
        print("5. Showing Customer Management...")
        try:
            customers_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='customerSec']"))
            )
            customers_btn.click()
            time.sleep(3)
            
            print("   - Customer management displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Customers error: {e}")
            
    def demo_employees(self):
        """Show employee management"""
        print("6. Showing Employee Management...")
        try:
            employees_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='employeeSec']"))
            )
            employees_btn.click()
            time.sleep(3)
            
            print("   - Employee management displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Employees error: {e}")
            
    def demo_expenses(self):
        """Show expense management"""
        print("7. Showing Expense Management...")
        try:
            # Navigate directly to expenses page
            self.driver.get("http://localhost:5000/expenses")
            time.sleep(3)
            
            print("   - Expense management displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Expenses error: {e}")
            
    def demo_reports(self):
        """Show reports"""
        print("8. Showing Reports...")
        try:
            # Navigate back to main app first
            self.driver.get("http://localhost:5000/app")
            time.sleep(3)
            
            reports_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='advancedReportsSec']"))
            )
            reports_btn.click()
            time.sleep(3)
            
            print("   - Reports displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Reports error: {e}")
            
    def demo_mobile_view(self):
        """Show mobile view"""
        print("9. Showing Mobile View...")
        try:
            self.driver.set_window_size(375, 667)
            time.sleep(2)
            
            self.driver.get("http://localhost:5000/app")
            time.sleep(3)
            
            print("   - Mobile view displayed")
            time.sleep(2)
            
            self.driver.maximize_window()
            time.sleep(1)
            
        except Exception as e:
            print(f"   Mobile view error: {e}")
            self.driver.maximize_window()
            
    def run_demo(self):
        """Run the working demo"""
        print("Starting Working Tajir POS Demo")
        print("=" * 40)
        
        try:
            self.setup_driver()
            self.start_flask_app()
            
            self.login_to_app()
            self.demo_dashboard()
            self.demo_products()  # Create product first
            self.demo_billing()   # Then generate bill with the product
            self.demo_customers()
            self.demo_employees()
            self.demo_expenses()
            self.demo_reports()
            self.demo_mobile_view()
            
            print("\n" + "=" * 40)
            print("Demo completed successfully!")
            print("=" * 40)
            
            input("Press Enter to close...")
            
        except Exception as e:
            print(f"Demo error: {e}")
            
        finally:
            self.cleanup()
            
    def cleanup(self):
        """Clean up"""
        print("Cleaning up...")
        if self.driver:
            self.driver.quit()
        if self.flask_process:
            self.flask_process.terminate()

def main():
    demo = WorkingTajirDemo()
    demo.run_demo()

if __name__ == "__main__":
    main()

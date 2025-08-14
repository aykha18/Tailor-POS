#!/usr/bin/env python3
"""
Simple Demo for Tajir POS
A simplified demo script that focuses on core functionality
"""

import time
import subprocess
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

class SimpleTajirDemo:
    def __init__(self):
        self.driver = None
        self.flask_process = None
        self.wait = None
        
    def setup_driver(self):
        """Setup Chrome driver"""
        chrome_options = Options()
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-notifications")
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        
    def start_flask_app(self):
        """Start the Flask application"""
        print("Starting Flask application...")
        self.flask_process = subprocess.Popen([sys.executable, "app.py"])
        time.sleep(5)
        
    def login_to_app(self):
        """Login to the application"""
        print("1. Logging into application...")
        self.driver.get("http://localhost:5000")
        time.sleep(2)
        
        try:
            # Check if we need to go to login page
            if "Welcome Back" not in self.driver.page_source:
                login_link = self.driver.find_element(By.XPATH, "//a[contains(text(), 'Sign In')]")
                login_link.click()
                time.sleep(2)
            
            # Login with correct credentials
            email_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "signin-email"))
            )
            password_input = self.driver.find_element(By.ID, "signin-password")
            
            email_input.send_keys("admin@tailorpos.com")
            password_input.send_keys("admin123")
            
            login_button = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            login_button.click()
            time.sleep(3)
            
            print("   - Login successful")
            
        except Exception as e:
            print(f"   Login error: {e}")
            
    def demo_dashboard(self):
        """Show dashboard"""
        print("2. Showing Dashboard...")
        try:
            dashboard_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='dashSec']"))
            )
            dashboard_btn.click()
            time.sleep(3)
            
            print("   - Dashboard displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Dashboard error: {e}")
            
    def demo_billing(self):
        """Show billing system"""
        print("3. Showing Billing System...")
        try:
            billing_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='billingSec']"))
            )
            billing_btn.click()
            time.sleep(3)
            
            print("   - Billing system displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Billing error: {e}")
            
    def demo_products(self):
        """Show product management"""
        print("4. Showing Product Management...")
        try:
            products_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@data-go='productSec']"))
            )
            products_btn.click()
            time.sleep(3)
            
            print("   - Product management displayed")
            time.sleep(2)
            
        except Exception as e:
            print(f"   Products error: {e}")
            
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
            
            self.driver.get("http://localhost:5000")
            time.sleep(3)
            
            print("   - Mobile view displayed")
            time.sleep(2)
            
            self.driver.maximize_window()
            time.sleep(1)
            
        except Exception as e:
            print(f"   Mobile view error: {e}")
            self.driver.maximize_window()
            
    def run_demo(self):
        """Run the simple demo"""
        print("Starting Simple Tajir POS Demo")
        print("=" * 40)
        
        try:
            self.setup_driver()
            self.start_flask_app()
            
            self.login_to_app()
            self.demo_dashboard()
            self.demo_billing()
            self.demo_products()
            self.demo_customers()
            self.demo_employees()
            self.demo_expenses()
            self.demo_reports()
            self.demo_mobile_view()
            
            print("\n" + "=" * 40)
            print("Demo completed!")
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
    demo = SimpleTajirDemo()
    demo.run_demo()

if __name__ == "__main__":
    main()

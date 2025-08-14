#!/usr/bin/env python3
"""
Automated Demo Video Generator using Selenium
This script automatically demonstrates the expense management feature
"""

import time
import subprocess
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def setup_driver():
    """Setup Chrome driver with recording capabilities"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def run_automated_demo():
    """Run automated demo of expense management"""
    print("Starting Automated Demo...")
    
    # Start Flask app
    flask_process = subprocess.Popen([sys.executable, "app.py"])
    time.sleep(3)
    
    try:
        driver = setup_driver()
        driver.get("http://localhost:5000")
        
        # Demo steps
        print("1. Navigating to expenses...")
        time.sleep(2)
        
        # Find and click expenses button
        try:
            expenses_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Expenses')]"))
            )
            expenses_btn.click()
            time.sleep(3)
        except:
            print("Could not find expenses button, navigating manually...")
            driver.get("http://localhost:5000/expenses")
            time.sleep(3)
        
        print("2. Adding expense category...")
        # Add category demo
        add_category_btn = driver.find_element(By.ID, "addCategoryBtn")
        add_category_btn.click()
        time.sleep(1)
        
        # Fill category form
        name_input = driver.find_element(By.ID, "categoryName")
        name_input.send_keys("Demo Category")
        
        desc_input = driver.find_element(By.ID, "categoryDescription")
        desc_input.send_keys("Category for demo purposes")
        
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(2)
        
        print("3. Adding expense...")
        # Add expense demo
        add_expense_btn = driver.find_element(By.ID, "addExpenseBtn")
        add_expense_btn.click()
        time.sleep(1)
        
        # Fill expense form
        driver.find_element(By.ID, "expenseDate").send_keys("2024-01-15")
        driver.find_element(By.ID, "expenseAmount").send_keys("50.00")
        driver.find_element(By.ID, "expenseDescription").send_keys("Demo expense")
        
        # Select category
        category_select = driver.find_element(By.ID, "expenseCategory")
        category_select.click()
        time.sleep(1)
        category_select.find_element(By.XPATH, "//option[contains(text(), 'Demo Category')]").click()
        
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(2)
        
        print("4. Demonstrating search...")
        search_input = driver.find_element(By.ID, "expenseSearch")
        search_input.send_keys("Demo")
        time.sleep(2)
        
        print("5. Demo completed!")
        time.sleep(3)
        
    except Exception as e:
        print(f"Demo error: {e}")
    
    finally:
        driver.quit()
        flask_process.terminate()
        print("Demo cleanup completed")

if __name__ == "__main__":
    run_automated_demo()

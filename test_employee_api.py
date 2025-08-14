#!/usr/bin/env python3
"""
Test script to verify employee API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_employee_api():
    print("🧪 Testing Employee API...")
    
    # Test 1: Get all employees
    print("\n1. Testing GET /api/employees")
    try:
        response = requests.get(f"{BASE_URL}/api/employees")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            employees = response.json()
            print(f"   Found {len(employees)} employees")
            for emp in employees:
                print(f"   - ID: {emp.get('employee_id')}, Name: {emp.get('name')}, Position: {emp.get('position', 'N/A')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Get specific employee (if any exist)
    print("\n2. Testing GET /api/employees/<id>")
    try:
        response = requests.get(f"{BASE_URL}/api/employees")
        if response.status_code == 200:
            employees = response.json()
            if employees:
                first_emp_id = employees[0]['employee_id']
                print(f"   Testing with employee ID: {first_emp_id}")
                
                response2 = requests.get(f"{BASE_URL}/api/employees/{first_emp_id}")
                print(f"   Status: {response2.status_code}")
                if response2.status_code == 200:
                    employee = response2.json()
                    print(f"   Employee data: {json.dumps(employee, indent=2)}")
                else:
                    print(f"   Error: {response2.text}")
            else:
                print("   No employees found to test with")
        else:
            print(f"   Error getting employees list: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: Test with invalid ID
    print("\n3. Testing GET /api/employees/999999 (invalid ID)")
    try:
        response = requests.get(f"{BASE_URL}/api/employees/999999")
        print(f"   Status: {response.status_code}")
        if response.status_code == 404:
            print("   ✅ Correctly returned 404 for invalid ID")
        else:
            print(f"   Unexpected response: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_employee_api()

import requests
from bs4 import BeautifulSoup
import time
import json

def extract_vat_section():
    try:
        # Wait for app to start
        time.sleep(3)
        
        # Use the app-template route which serves app.html directly without authentication
        print("Navigating to /app-template page...")
        response = requests.get('http://localhost:5000/app-template')
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            print("=== PAGE ANALYSIS ===")
            print(f"Current page: /app-template")
            
            # Find VAT section
            vat_section = soup.find('div', {'id': 'vatPercent'})
            if vat_section:
                print("\n1. VAT Input Found:")
                print(f"   ID: {vat_section.get('id')}")
                print(f"   Classes: {vat_section.get('class', [])}")
                print(f"   Parent: {vat_section.parent.name if vat_section.parent else 'None'}")
                print(f"   Parent Classes: {vat_section.parent.get('class', []) if vat_section.parent else 'None'}")
                
                # Find the container div
                container = vat_section.parent
                if container:
                    print(f"\n2. Container Analysis:")
                    print(f"   Tag: {container.name}")
                    print(f"   Classes: {container.get('class', [])}")
                    print(f"   Children: {[child.name for child in container.children if hasattr(child, 'name')]}")
                    
                    # Find VAT button
                    vat_btn = container.find('button', {'id': 'vatConfigBtn'})
                    if vat_btn:
                        print(f"\n3. VAT Button Found:")
                        print(f"   ID: {vat_btn.get('id')}")
                        print(f"   Classes: {vat_btn.get('class', [])}")
                        print(f"   Inline Style: {vat_btn.get('style', 'None')}")
                        print(f"   Position in container: {list(container.children).index(vat_btn) if vat_btn in container.children else 'Not direct child'}")
                    else:
                        print("\n3. VAT Button NOT found in container")
                        
                        # Search in parent
                        parent_container = container.parent
                        if parent_container:
                            vat_btn = parent_container.find('button', {'id': 'vatConfigBtn'})
                            if vat_btn:
                                print(f"   Found in parent container:")
                                print(f"   Classes: {vat_btn.get('class', [])}")
                                print(f"   Inline Style: {vat_btn.get('style', 'None')}")
                            else:
                                print("   Not found in parent either")
                
                # Check for mobile VAT section too
                mobile_vat = soup.find('div', {'id': 'vatPercentMobile'})
                if mobile_vat:
                    print(f"\n4. Mobile VAT Input Found:")
                    print(f"   ID: {mobile_vat.get('id')}")
                    print(f"   Classes: {mobile_vat.get('class', [])}")
                    
                    mobile_container = mobile_vat.parent
                    if mobile_container:
                        mobile_btn = mobile_container.find('button', {'id': 'vatConfigBtnMobile'})
                        if mobile_btn:
                            print(f"   Mobile Button Classes: {mobile_btn.get('class', [])}")
                            print(f"   Mobile Button Style: {mobile_btn.get('style', 'None')}")
                
                # Check CSS rules
                print(f"\n5. CSS Analysis:")
                style_tags = soup.find_all('style')
                for i, style in enumerate(style_tags):
                    if 'vatConfigBtn' in style.text or 'vat-input-container' in style.text:
                        print(f"   Style Tag {i+1} (VAT related):")
                        print(f"   Content: {style.text[:200]}...")
                
                # Check for any conflicting CSS
                print(f"\n6. Potential Conflicts:")
                all_buttons = soup.find_all('button')
                for btn in all_buttons:
                    if 'absolute' in str(btn.get('class', [])) or 'relative' in str(btn.get('class', [])):
                        print(f"   Button {btn.get('id', 'No ID')}: {vat_btn.get('class', [])}")
                
                # Show the actual HTML structure around VAT
                print(f"\n7. VAT Section HTML Structure:")
                if vat_section:
                    # Show parent structure
                    parent = vat_section.parent
                    if parent:
                        print("   Parent container:")
                        print(f"   {parent}")
                        
                        # Show siblings
                        siblings = [sib for sib in parent.children if hasattr(sib, 'name')]
                        print(f"   Siblings: {[sib.name for sib in siblings]}")
                        
                        # Show the actual VAT input HTML
                        print("   VAT Input HTML:")
                        print(f"   {vat_section}")
                
            else:
                print("VAT Input section not found!")
                print("Searching for any elements with 'vat' in ID or class...")
                
                # Search for any VAT-related elements
                vat_elements = soup.find_all(attrs={'id': lambda x: x and 'vat' in x.lower()})
                if vat_elements:
                    print("Found VAT-related elements:")
                    for elem in vat_elements:
                        print(f"   {elem.name} - ID: {elem.get('id')} - Classes: {elem.get('class', [])}")
                else:
                    print("No VAT-related elements found")
                
                # Check if we're on the right page
                page_title = soup.find('title')
                if page_title:
                    print(f"Page title: {page_title.text}")
                
                # Check for billing-related content
                billing_content = soup.find_all(string=lambda text: text and 'billing' in text.lower())
                if billing_content:
                    print("Found billing-related text:")
                    for text in billing_content[:5]:  # Show first 5
                        print(f"   {text.strip()}")
                
            print(f"\n=== FULL HTML SOURCE ===")
            print(response.text)
            
        else:
            print(f"Failed to get /app-template page: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    extract_vat_section()

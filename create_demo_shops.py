#!/usr/bin/env python3
"""
Demo Shop Generator for Tajir POS

Creates realistic demo shops for different business types in the UAE:
- Electronics Store
- Grocery Store  
- Fashion Boutique
- Hardware Store
- Beauty Salon

Each shop gets:
- 3 Product Types
- 10 Products
- 5 Employees
- 20 Customers
- 20 Invoices
- 10 Expenses

Usage:
  python create_demo_shops.py --shop_type electronics
  python create_demo_shops.py --shop_type all
"""

import argparse
import os
import random
import sqlite3
import string
import uuid
from datetime import date, datetime, timedelta
from typing import Dict, List, Tuple
import bcrypt

DB_PATH = os.environ.get("TAILOR_POS_DB", "pos_tailor.db")

# Common password for all demo shops
COMMON_PASSWORD = "demo123"
COMMON_PASSWORD_HASH = bcrypt.hashpw(COMMON_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Business Type Definitions - All shop types from setup wizard
SHOP_DEFINITIONS = {
    "tailors": {
        "name": "Perfect Stitch Tailors",
        "email": "demo@perfectstitch.ae",
        "mobile": "0501234567",
        "shop_code": "TAIL001",
        "product_types": {
            "Saree Services": {
                "description": "Saree stitching and alterations"
            },
            "Kurti & Suits": {
                "description": "Kurti, salwar suits, and traditional wear"
            },
            "Western Wear": {
                "description": "Shirts, pants, and western clothing"
            }
        },
        "products": [
            ("Saree Fall Stitching", "Saree Services", 30, "Saree fall with fabric"),
            ("Saree Petticoat", "Saree Services", 40, "Petticoat stitching"),
            ("Kurti (No Lining)", "Kurti & Suits", 55, "Simple kurti without lining"),
            ("Kurti (With Lining)", "Kurti & Suits", 75, "Kurti with full lining"),
            ("Salwar Suit", "Kurti & Suits", 100, "Complete salwar suit"),
            ("Shirt", "Western Wear", 100, "Men's formal shirt"),
            ("Trousers", "Western Wear", 80, "Men's trousers"),
            ("Blouse", "Kurti & Suits", 115, "Women's blouse"),
            ("Abaya Stitching", "Kurti & Suits", 125, "Traditional abaya"),
            ("Coat/Blazer", "Western Wear", 350, "Formal coat or blazer")
        ],
        "employees": [
            ("Ahmed Al Mansoori", "Master Tailor", "0501111111"),
            ("Fatima Al Falasi", "Tailor", "0502222222"),
            ("Omar Al Maktoum", "Cutter", "0503333333"),
            ("Aisha Al Qasimi", "Stitcher", "0504444444"),
            ("Khalid Al Nuaimi", "Ironing", "0505555555")
        ],
        "expenses": [
            ("Rent", 12000, "Monthly shop rent"),
            ("Electricity", 2000, "Monthly electricity bill"),
            ("Insurance", 1500, "Business insurance"),
            ("Fabric", 3000, "Fabric and materials"),
            ("Equipment", 2000, "Sewing machines and tools"),
            ("Cleaning", 800, "Shop cleaning service"),
            ("Security", 1000, "Security system"),
            ("Marketing", 1500, "Local advertising"),
            ("Utilities", 1000, "Water and other utilities"),
            ("Maintenance", 1200, "Equipment maintenance")
        ]
    },
    
    "laundry": {
        "name": "Fresh & Clean Laundry",
        "email": "demo@freshclean.ae",
        "mobile": "0502345678",
        "shop_code": "LAUN001",
        "product_types": {
            "Washing Services": {
                "description": "Regular washing and cleaning"
            },
            "Dry Cleaning": {
                "description": "Professional dry cleaning"
            },
            "Pressing Services": {
                "description": "Ironing and pressing"
            }
        },
        "products": [
            ("Shirt Wash & Iron", "Washing Services", 15, "Shirt washing and ironing"),
            ("Pants Wash & Iron", "Washing Services", 12, "Pants washing and ironing"),
            ("Dry Clean Suit", "Dry Cleaning", 45, "Suit dry cleaning"),
            ("Dry Clean Dress", "Dry Cleaning", 35, "Dress dry cleaning"),
            ("Bed Sheet Set", "Washing Services", 25, "Bed sheet washing"),
            ("Curtain Cleaning", "Dry Cleaning", 60, "Curtain dry cleaning"),
            ("Carpet Cleaning", "Dry Cleaning", 80, "Carpet deep cleaning"),
            ("Express Service", "Washing Services", 30, "Same day service"),
            ("Bulk Washing", "Washing Services", 8, "Per kg bulk washing"),
            ("Starch Service", "Pressing Services", 5, "Additional starch")
        ],
        "employees": [
            ("Mohammed Al Hosani", "Manager", "0506666666"),
            ("Mariam Al Zaabi", "Washer", "0507777777"),
            ("Yousef Al Marri", "Dry Cleaner", "0508888888"),
            ("Noora Al Balushi", "Ironing", "0509999999"),
            ("Abdullah Al Suwaidi", "Delivery", "0500000000")
        ],
        "expenses": [
            ("Rent", 10000, "Monthly shop rent"),
            ("Electricity", 4000, "High electricity for machines"),
            ("Water", 2000, "Water consumption"),
            ("Detergents", 1500, "Cleaning supplies"),
            ("Equipment", 3000, "Washing machines maintenance"),
            ("Insurance", 1200, "Business insurance"),
            ("Cleaning", 800, "Shop cleaning"),
            ("Security", 1000, "Security system"),
            ("Utilities", 1500, "Other utilities"),
            ("Marketing", 1000, "Local advertising")
        ]
    },
    
    "salons": {
        "name": "Glamour Beauty Salon",
        "email": "demo@glamour.ae",
        "mobile": "0503456789",
        "shop_code": "SALON001",
        "product_types": {
            "Hair Services": {
                "description": "Hair cutting, styling, and treatments"
            },
            "Nail Services": {
                "description": "Manicure, pedicure, and nail art"
            },
            "Beauty Services": {
                "description": "Facial, makeup, and beauty treatments"
            }
        },
        "products": [
            ("Haircut", "Hair Services", 120, "Professional haircut"),
            ("Hair Coloring", "Hair Services", 300, "Professional hair coloring"),
            ("Hair Styling", "Hair Services", 150, "Special occasion styling"),
            ("Manicure", "Nail Services", 80, "Classic manicure"),
            ("Pedicure", "Nail Services", 120, "Relaxing pedicure"),
            ("Nail Art", "Nail Services", 100, "Creative nail design"),
            ("Facial", "Beauty Services", 200, "Rejuvenating facial"),
            ("Makeup", "Beauty Services", 250, "Professional makeup"),
            ("Threading", "Beauty Services", 30, "Eyebrow threading"),
            ("Waxing", "Beauty Services", 80, "Body waxing")
        ],
        "employees": [
            ("Fatima Al Hosani", "Salon Manager", "0501111112"),
            ("Aisha Al Zaabi", "Hair Stylist", "0502222223"),
            ("Mariam Al Marri", "Nail Technician", "0503333334"),
            ("Noora Al Balushi", "Beauty Therapist", "0504444445"),
            ("Hessa Al Suwaidi", "Receptionist", "0505555556")
        ],
        "expenses": [
            ("Rent", 16000, "Monthly salon rent"),
            ("Electricity", 2500, "Monthly electricity bill"),
            ("Insurance", 1800, "Business insurance"),
            ("Products", 4000, "Beauty products and supplies"),
            ("Equipment", 2000, "Salon equipment maintenance"),
            ("Marketing", 3000, "Beauty marketing campaigns"),
            ("Cleaning", 1500, "Salon cleaning service"),
            ("Security", 1200, "Security system"),
            ("Training", 2500, "Staff training and certification"),
            ("Utilities", 1000, "Water and other utilities")
        ]
    },
    
    "mobile": {
        "name": "TechFix Mobile Repair",
        "email": "demo@techfix.ae",
        "mobile": "0504567890",
        "shop_code": "MOB001",
        "product_types": {
            "Screen Services": {
                "description": "Screen replacement and repair"
            },
            "Battery Services": {
                "description": "Battery replacement and charging"
            },
            "Software Services": {
                "description": "Software issues and data recovery"
            }
        },
        "products": [
            ("iPhone Screen Repair", "Screen Services", 400, "iPhone screen replacement"),
            ("Samsung Screen Repair", "Screen Services", 350, "Samsung screen replacement"),
            ("Battery Replacement", "Battery Services", 150, "Phone battery replacement"),
            ("Charging Port Repair", "Battery Services", 120, "Charging port fix"),
            ("Software Reset", "Software Services", 80, "Factory reset and setup"),
            ("Data Recovery", "Software Services", 200, "Data recovery service"),
            ("Water Damage Repair", "Screen Services", 300, "Water damage treatment"),
            ("Camera Repair", "Screen Services", 180, "Camera module replacement"),
            ("Speaker Repair", "Battery Services", 100, "Speaker replacement"),
            ("Unlock Service", "Software Services", 120, "Phone unlocking")
        ],
        "employees": [
            ("Omar Al Mansoori", "Manager", "0506666667"),
            ("Khalid Al Falasi", "Technician", "0507777778"),
            ("Ahmed Al Maktoum", "Technician", "0508888889"),
            ("Yousef Al Qasimi", "Cashier", "0509999990"),
            ("Abdullah Al Nuaimi", "Assistant", "0500000001")
        ],
        "expenses": [
            ("Rent", 12000, "Monthly shop rent"),
            ("Electricity", 2000, "Monthly electricity bill"),
            ("Insurance", 2000, "Business insurance"),
            ("Parts", 5000, "Mobile parts inventory"),
            ("Equipment", 3000, "Repair tools and equipment"),
            ("Marketing", 2000, "Online advertising"),
            ("Cleaning", 800, "Shop cleaning"),
            ("Security", 1500, "Security system"),
            ("Utilities", 1000, "Water and other utilities"),
            ("Training", 2000, "Technical training")
        ]
    },
    
    "electrical": {
        "name": "CoolTech AC & Electrical",
        "email": "demo@cooltech.ae",
        "mobile": "0505678901",
        "shop_code": "ELEC001",
        "product_types": {
            "AC Services": {
                "description": "Air conditioning installation and repair"
            },
            "Electrical Services": {
                "description": "Electrical wiring and repairs"
            },
            "Maintenance": {
                "description": "Regular maintenance services"
            }
        },
        "products": [
            ("AC Installation", "AC Services", 800, "New AC unit installation"),
            ("AC Repair", "AC Services", 300, "AC repair service"),
            ("AC Maintenance", "Maintenance", 150, "Regular AC maintenance"),
            ("Electrical Wiring", "Electrical Services", 500, "New electrical wiring"),
            ("Switch Repair", "Electrical Services", 100, "Switch and socket repair"),
            ("Circuit Repair", "Electrical Services", 200, "Circuit board repair"),
            ("Emergency Service", "AC Services", 400, "Emergency AC repair"),
            ("Gas Refill", "AC Services", 250, "AC gas refill"),
            ("Filter Cleaning", "Maintenance", 80, "AC filter cleaning"),
            ("Inspection", "Maintenance", 120, "Electrical inspection")
        ],
        "employees": [
            ("Hassan Al Mansoori", "Manager", "0501111113"),
            ("Ali Al Falasi", "AC Technician", "0502222224"),
            ("Bilal Al Maktoum", "Electrician", "0503333335"),
            ("Imran Al Qasimi", "Technician", "0504444446"),
            ("Ibrahim Al Nuaimi", "Assistant", "0505555557")
        ],
        "expenses": [
            ("Rent", 14000, "Monthly shop rent"),
            ("Electricity", 3000, "Monthly electricity bill"),
            ("Insurance", 2500, "Business and liability insurance"),
            ("Equipment", 4000, "Tools and equipment"),
            ("Parts", 3000, "AC and electrical parts"),
            ("Vehicle", 2000, "Service vehicle costs"),
            ("Cleaning", 800, "Shop cleaning"),
            ("Security", 1500, "Security system"),
            ("Utilities", 1200, "Water and other utilities"),
            ("Training", 3000, "Technical training")
        ]
    },
    
    "cafes": {
        "name": "Cafe Delight",
        "email": "demo@cafedelight.ae",
        "mobile": "0506789012",
        "shop_code": "CAFE001",
        "product_types": {
            "Hot Beverages": {
                "description": "Coffee, tea, and hot drinks"
            },
            "Cold Beverages": {
                "description": "Juices, smoothies, and cold drinks"
            },
            "Food Items": {
                "description": "Snacks, sandwiches, and light meals"
            }
        },
        "products": [
            ("Arabic Coffee", "Hot Beverages", 15, "Traditional Arabic coffee"),
            ("Cappuccino", "Hot Beverages", 18, "Italian cappuccino"),
            ("Green Tea", "Hot Beverages", 12, "Fresh green tea"),
            ("Orange Juice", "Cold Beverages", 20, "Fresh orange juice"),
            ("Smoothie", "Cold Beverages", 25, "Fresh fruit smoothie"),
            ("Sandwich", "Food Items", 30, "Fresh sandwich"),
            ("Croissant", "Food Items", 15, "Butter croissant"),
            ("Cake Slice", "Food Items", 20, "Fresh cake slice"),
            ("Shawarma", "Food Items", 25, "Chicken shawarma"),
            ("Falafel Wrap", "Food Items", 22, "Vegetarian falafel wrap")
        ],
        "employees": [
            ("Karim Al Mansoori", "Manager", "0506666668"),
            ("Majid Al Falasi", "Barista", "0507777779"),
            ("Amir Al Maktoum", "Cashier", "0508888890"),
            ("Nasser Al Qasimi", "Kitchen Staff", "0509999991"),
            ("Ziad Al Nuaimi", "Server", "0500000002")
        ],
        "expenses": [
            ("Rent", 18000, "Monthly cafe rent"),
            ("Electricity", 3000, "Monthly electricity bill"),
            ("Insurance", 2000, "Business insurance"),
            ("Ingredients", 5000, "Food and beverage ingredients"),
            ("Equipment", 3000, "Coffee machines and kitchen equipment"),
            ("Marketing", 2000, "Cafe marketing"),
            ("Cleaning", 1500, "Daily cleaning service"),
            ("Security", 1200, "Security system"),
            ("Utilities", 1500, "Water and other utilities"),
            ("Staff Training", 2000, "Barista and staff training")
        ]
    },
    
    "cobbler": {
        "name": "Shoe Master Cobbler",
        "email": "demo@shoemaster.ae",
        "mobile": "0507890123",
        "shop_code": "COBB001",
        "product_types": {
            "Shoe Repair": {
                "description": "Shoe repair and maintenance"
            },
            "Leather Work": {
                "description": "Leather goods repair and customization"
            },
            "Accessories": {
                "description": "Shoe accessories and supplies"
            }
        },
        "products": [
            ("Sole Replacement", "Shoe Repair", 80, "Complete sole replacement"),
            ("Heel Repair", "Shoe Repair", 50, "Heel repair and replacement"),
            ("Stitching", "Shoe Repair", 30, "Shoe stitching repair"),
            ("Leather Bag Repair", "Leather Work", 120, "Leather bag repair"),
            ("Belt Repair", "Leather Work", 40, "Leather belt repair"),
            ("Shoe Polish", "Accessories", 15, "Professional shoe polish"),
            ("Shoe Laces", "Accessories", 10, "Quality shoe laces"),
            ("Shoe Insoles", "Accessories", 25, "Comfort insoles"),
            ("Waterproofing", "Shoe Repair", 35, "Shoe waterproofing"),
            ("Color Restoration", "Shoe Repair", 45, "Shoe color restoration")
        ],
        "employees": [
            ("Mustafa Al Mansoori", "Master Cobbler", "0501111114"),
            ("Ziad Al Falasi", "Cobbler", "0502222225"),
            ("Amir Al Maktoum", "Leather Worker", "0503333336"),
            ("Nasser Al Qasimi", "Assistant", "0504444447"),
            ("Karim Al Nuaimi", "Cashier", "0505555558")
        ],
        "expenses": [
            ("Rent", 8000, "Monthly shop rent"),
            ("Electricity", 1500, "Monthly electricity bill"),
            ("Insurance", 1200, "Business insurance"),
            ("Materials", 2000, "Leather and repair materials"),
            ("Equipment", 2500, "Cobbling tools and machines"),
            ("Marketing", 1000, "Local advertising"),
            ("Cleaning", 600, "Shop cleaning"),
            ("Security", 800, "Security system"),
            ("Utilities", 800, "Water and other utilities"),
            ("Training", 1500, "Skill training")
        ]
    },
    
    "tuition": {
        "name": "Bright Minds Tuition",
        "email": "demo@brightminds.ae",
        "mobile": "0508901234",
        "shop_code": "TUIT001",
        "product_types": {
            "Individual Classes": {
                "description": "One-on-one tutoring sessions"
            },
            "Group Classes": {
                "description": "Small group learning sessions"
            },
            "Specialized Courses": {
                "description": "Subject-specific intensive courses"
            }
        },
        "products": [
            ("Math Tutoring", "Individual Classes", 150, "One-on-one math tutoring"),
            ("English Classes", "Individual Classes", 120, "English language tutoring"),
            ("Science Tutoring", "Individual Classes", 140, "Science subject tutoring"),
            ("Group Math", "Group Classes", 80, "Group math classes"),
            ("Group English", "Group Classes", 70, "Group English classes"),
            ("IELTS Preparation", "Specialized Courses", 200, "IELTS exam preparation"),
            ("SAT Preparation", "Specialized Courses", 250, "SAT exam preparation"),
            ("Arabic Classes", "Individual Classes", 100, "Arabic language tutoring"),
            ("Computer Classes", "Specialized Courses", 180, "Computer skills training"),
            ("Art Classes", "Specialized Courses", 120, "Art and drawing classes")
        ],
        "employees": [
            ("Dr. Ahmed Al Mansoori", "Principal", "0506666669"),
            ("Ms. Fatima Al Falasi", "Math Teacher", "0507777780"),
            ("Mr. Omar Al Maktoum", "English Teacher", "0508888891"),
            ("Ms. Aisha Al Qasimi", "Science Teacher", "0509999992"),
            ("Mr. Khalid Al Nuaimi", "Admin", "0500000003")
        ],
        "expenses": [
            ("Rent", 15000, "Monthly center rent"),
            ("Electricity", 2000, "Monthly electricity bill"),
            ("Insurance", 1800, "Business insurance"),
            ("Teaching Materials", 2000, "Books and educational materials"),
            ("Equipment", 3000, "Computers and teaching equipment"),
            ("Marketing", 2500, "Educational marketing"),
            ("Cleaning", 1000, "Center cleaning"),
            ("Security", 1200, "Security system"),
            ("Utilities", 1200, "Water and other utilities"),
            ("Teacher Training", 3000, "Professional development")
        ]
    },
    
    "warehouse": {
        "name": "SafeStore Mini Warehouse",
        "email": "demo@safestore.ae",
        "mobile": "0509012345",
        "shop_code": "WARE001",
        "product_types": {
            "Storage Units": {
                "description": "Different sized storage units"
            },
            "Additional Services": {
                "description": "Extra services and amenities"
            },
            "Moving Services": {
                "description": "Moving and logistics services"
            }
        },
        "products": [
            ("Small Unit (5x5)", "Storage Units", 300, "5x5 feet storage unit"),
            ("Medium Unit (10x10)", "Storage Units", 600, "10x10 feet storage unit"),
            ("Large Unit (15x15)", "Storage Units", 900, "15x15 feet storage unit"),
            ("Climate Control", "Additional Services", 200, "Climate controlled storage"),
            ("24/7 Access", "Additional Services", 150, "24/7 facility access"),
            ("Insurance", "Additional Services", 100, "Storage insurance"),
            ("Moving Service", "Moving Services", 500, "Professional moving service"),
            ("Packing Service", "Moving Services", 300, "Professional packing"),
            ("Truck Rental", "Moving Services", 400, "Moving truck rental"),
            ("Loading Help", "Moving Services", 200, "Loading and unloading help")
        ],
        "employees": [
            ("Abdullah Al Mansoori", "Manager", "0501111115"),
            ("Hamza Al Falasi", "Security", "0502222226"),
            ("Fahad Al Maktoum", "Maintenance", "0503333337"),
            ("Sami Al Qasimi", "Customer Service", "0504444448"),
            ("Ali Al Nuaimi", "Moving Staff", "0505555559")
        ],
        "expenses": [
            ("Rent", 20000, "Monthly warehouse rent"),
            ("Electricity", 4000, "Monthly electricity bill"),
            ("Insurance", 3000, "Business and liability insurance"),
            ("Security", 2500, "Security system and personnel"),
            ("Maintenance", 2000, "Facility maintenance"),
            ("Cleaning", 1500, "Warehouse cleaning"),
            ("Utilities", 2000, "Water and other utilities"),
            ("Marketing", 1500, "Storage marketing"),
            ("Equipment", 3000, "Moving equipment"),
            ("Staff Training", 2000, "Safety and customer service training")
        ]
    },
    
    "it": {
        "name": "TechZone IT Hardware",
        "email": "demo@techzone.ae",
        "mobile": "0500123456",
        "shop_code": "IT001",
        "product_types": {
            "Computers": {
                "description": "Desktop and laptop computers"
            },
            "Accessories": {
                "description": "Computer accessories and peripherals"
            },
            "Services": {
                "description": "IT services and support"
            }
        },
        "products": [
            ("Gaming Laptop", "Computers", 3500, "High-performance gaming laptop"),
            ("Office Desktop", "Computers", 2000, "Business desktop computer"),
            ("Student Laptop", "Computers", 1800, "Affordable student laptop"),
            ("Gaming Mouse", "Accessories", 300, "High-performance gaming mouse"),
            ("Wireless Keyboard", "Accessories", 250, "Bluetooth keyboard"),
            ("Monitor 24\"", "Accessories", 800, "24-inch computer monitor"),
            ("Computer Repair", "Services", 200, "Computer repair service"),
            ("Software Installation", "Services", 150, "Software installation service"),
            ("Data Recovery", "Services", 300, "Data recovery service"),
            ("Network Setup", "Services", 400, "Home/office network setup")
        ],
        "employees": [
            ("Yousef Al Mansoori", "Manager", "0506666670"),
            ("Khalid Al Falasi", "Sales Representative", "0507777781"),
            ("Ahmed Al Maktoum", "Technician", "0508888892"),
            ("Omar Al Qasimi", "Cashier", "0509999993"),
            ("Abdullah Al Nuaimi", "Assistant", "0500000004")
        ],
        "expenses": [
            ("Rent", 15000, "Monthly shop rent"),
            ("Electricity", 2500, "Monthly electricity bill"),
            ("Insurance", 2000, "Business insurance"),
            ("Inventory", 8000, "Computer hardware inventory"),
            ("Equipment", 3000, "Repair tools and equipment"),
            ("Marketing", 3000, "IT marketing campaigns"),
            ("Cleaning", 800, "Shop cleaning"),
            ("Security", 1500, "Security system"),
            ("Utilities", 1200, "Water and other utilities"),
            ("Training", 2500, "Technical training")
        ]
    },
    
    "perfume": {
        "name": "Arabian Oud Perfumes",
        "email": "demo@arabianoud.ae",
        "mobile": "0501234568",
        "shop_code": "PERF001",
        "product_types": {
            "Traditional Oud": {
                "description": "Traditional Arabian oud perfumes"
            },
            "Modern Perfumes": {
                "description": "Contemporary fragrance collections"
            },
            "Accessories": {
                "description": "Perfume accessories and gift sets"
            }
        },
        "products": [
            ("Pure Oud Oil", "Traditional Oud", 800, "Pure Arabian oud oil"),
            ("Oud Perfume", "Traditional Oud", 600, "Traditional oud perfume"),
            ("Bakhoor", "Traditional Oud", 200, "Traditional bakhoor incense"),
            ("Designer Perfume", "Modern Perfumes", 400, "International designer perfume"),
            ("Niche Perfume", "Modern Perfumes", 500, "Exclusive niche perfume"),
            ("Perfume Gift Set", "Accessories", 300, "Luxury perfume gift set"),
            ("Perfume Atomizer", "Accessories", 150, "Travel perfume atomizer"),
            ("Oud Burner", "Accessories", 250, "Traditional oud burner"),
            ("Perfume Sample", "Modern Perfumes", 50, "Perfume sample vial"),
            ("Custom Blend", "Traditional Oud", 1000, "Custom oud blend")
        ],
        "employees": [
            ("Shaikha Al Mansoori", "Manager", "0501111116"),
            ("Salama Al Falasi", "Sales Representative", "0502222227"),
            ("Alia Al Maktoum", "Perfume Expert", "0503333338"),
            ("Dana Al Qasimi", "Cashier", "0504444449"),
            ("Layla Al Nuaimi", "Assistant", "0505555560")
        ],
        "expenses": [
            ("Rent", 16000, "Monthly shop rent"),
            ("Electricity", 2000, "Monthly electricity bill"),
            ("Insurance", 2000, "Business insurance"),
            ("Inventory", 10000, "Perfume and oud inventory"),
            ("Display", 3000, "Luxury display fixtures"),
            ("Marketing", 4000, "Luxury perfume marketing"),
            ("Cleaning", 1200, "Shop cleaning"),
            ("Security", 2000, "Security system"),
            ("Utilities", 1000, "Water and other utilities"),
            ("Training", 3000, "Perfume knowledge training")
        ]
    }
}

# UAE Names for Customers
FIRST_NAMES = [
    "Ahmed", "Mohammed", "Hassan", "Omar", "Yousef", "Khalid", "Abdullah", "Hamza", "Fahad", "Sami",
    "Ali", "Bilal", "Imran", "Ibrahim", "Mustafa", "Ziad", "Amir", "Nasser", "Karim", "Majid",
    "Fatima", "Aisha", "Mariam", "Noora", "Hessa", "Shaikha", "Salama", "Alia", "Dana", "Layla"
]

LAST_NAMES = [
    "Al Mansoori", "Al Falasi", "Al Maktoum", "Al Nahyan", "Al Qasimi", "Al Nuaimi", "Al Mualla",
    "Al Sharqi", "Al Hammadi", "Al Suwaidi", "Al Hosani", "Al Zaabi", "Al Marri", "Al Balushi",
    "Al Gergawi", "Al Tayer", "Al Qassimi", "Al Shamsi", "Al Dhaheri", "Al Ameri"
]

# UAE Cities and Areas
CITIES_AREAS = {
    "Dubai": ["Deira", "Bur Dubai", "Al Barsha", "Karama", "Mirdif", "JLT", "JVC", "Marina", "Satwa", "Al Qusais"],
    "Abu Dhabi": ["Al Ain", "Al Dhafra", "Al Raha", "Al Reem", "Al Saadiyat", "Corniche", "Khalifa City", "Masdar City"],
    "Sharjah": ["Al Khan", "Al Majaz", "Al Nahda", "Al Qasba", "Al Taawun", "Muwailih", "University City"],
    "Ajman": ["Al Nuaimiya", "Al Rashidiya", "Al Zahra", "Emirates City", "Al Hamidiya"],
    "Ras Al Khaimah": ["Al Hamra", "Al Jazeera Al Hamra", "Al Nakheel", "Al Qusaidat", "Al Rams"]
}

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def random_phone():
    prefix = random.choice(["050", "052", "054", "056", "058"])
    return prefix + ''.join(random.choices(string.digits, k=7))

def create_user(conn, shop_data):
    """Create a new user account for the shop"""
    user_id = conn.execute("SELECT MAX(user_id) FROM users").fetchone()[0] or 0
    user_id += 1
    
    conn.execute("""
        INSERT INTO users (user_id, email, mobile, shop_code, password_hash, shop_name, shop_type, contact_number, email_address, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (
        user_id, shop_data["email"], shop_data["mobile"], shop_data["shop_code"],
        COMMON_PASSWORD_HASH, shop_data["name"], "demo", shop_data["mobile"], shop_data["email"]
    ))
    
    # Create shop settings
    conn.execute("""
        INSERT INTO shop_settings (user_id, shop_name, address, trn, logo_url, shop_mobile, working_hours, invoice_static_info, payment_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, shop_data["name"], "Dubai, UAE", "123456789012345", "", shop_data["mobile"],
        "9:00 AM - 10:00 PM", "Thank you for your business!", "advance"
    ))
    
    # Create user plan (PRO for demo)
    conn.execute("""
        INSERT INTO user_plans (user_id, plan_type, plan_start_date, plan_end_date, is_active)
        VALUES (?, 'pro', CURRENT_DATE, NULL, 1)
    """, (user_id,))
    
    conn.commit()
    return user_id

def create_product_types(conn, user_id, product_types):
    """Create product types for the shop"""
    type_ids = {}
    for type_name, type_data in product_types.items():
        conn.execute("""
            INSERT INTO product_types (user_id, type_name, description)
            VALUES (?, ?, ?)
        """, (user_id, type_name, type_data["description"]))
        type_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        type_ids[type_name] = type_id
    conn.commit()
    return type_ids

def create_products(conn, user_id, products, type_ids):
    """Create products for the shop"""
    product_ids = []
    for product_name, type_name, rate, description in products:
        type_id = type_ids[type_name]
        conn.execute("""
            INSERT INTO products (user_id, type_id, product_name, rate, description, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (user_id, type_id, product_name, rate, description))
        product_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        product_ids.append(product_id)
    conn.commit()
    return product_ids

def create_employees(conn, user_id, employees):
    """Create employees for the shop"""
    employee_ids = []
    for name, position, phone in employees:
        conn.execute("""
            INSERT INTO employees (user_id, name, phone, address, email, position, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        """, (user_id, name, phone, "Dubai, UAE", f"{name.lower().replace(' ', '.')}@company.ae", position))
        employee_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        employee_ids.append(employee_id)
    conn.commit()
    return employee_ids

def create_customers(conn, user_id, count=20):
    """Create customers for the shop"""
    customer_ids = []
    cities = list(CITIES_AREAS.keys())
    
    for i in range(count):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        phone = random_phone()
        city = random.choice(cities)
        area = random.choice(CITIES_AREAS[city])
        
        conn.execute("""
            INSERT INTO customers (user_id, name, phone, city, area, customer_type)
            VALUES (?, ?, ?, ?, ?, 'Individual')
        """, (user_id, name, phone, city, area))
        customer_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        customer_ids.append(customer_id)
    conn.commit()
    return customer_ids

def create_expenses(conn, user_id, expenses):
    """Create expenses for the shop"""
    expense_ids = []
    
    # First create expense categories
    category_ids = {}
    default_categories = [
        ("Rent", "Shop rent and utilities"),
        ("Supplies", "Raw materials and supplies"),
        ("Equipment", "Machines and tools"),
        ("Marketing", "Advertising and promotion"),
        ("Transportation", "Delivery and travel costs"),
        ("Utilities", "Electricity, water, internet"),
        ("Maintenance", "Equipment and shop maintenance"),
        ("Miscellaneous", "Other expenses")
    ]
    
    for cat_name, cat_desc in default_categories:
        conn.execute("""
            INSERT INTO expense_categories (user_id, category_name, description)
            VALUES (?, ?, ?)
        """, (user_id, cat_name, cat_desc))
        category_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        category_ids[cat_name] = category_id
    
    # Create expenses using the shop's expense data
    for name, amount, description in expenses:
        # Map expense name to category
        if "rent" in name.lower():
            category_id = category_ids.get("Rent", category_ids["Miscellaneous"])
        elif "electricity" in name.lower() or "utilities" in name.lower():
            category_id = category_ids.get("Utilities", category_ids["Miscellaneous"])
        elif "equipment" in name.lower():
            category_id = category_ids.get("Equipment", category_ids["Miscellaneous"])
        elif "marketing" in name.lower():
            category_id = category_ids.get("Marketing", category_ids["Miscellaneous"])
        elif "cleaning" in name.lower() or "maintenance" in name.lower():
            category_id = category_ids.get("Maintenance", category_ids["Miscellaneous"])
        elif "insurance" in name.lower():
            category_id = category_ids.get("Miscellaneous", category_ids["Miscellaneous"])
        else:
            category_id = category_ids.get("Miscellaneous", category_ids["Miscellaneous"])
        
        # Create expense record
        conn.execute("""
            INSERT INTO expenses (user_id, category_id, expense_date, amount, description, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id, category_id, date.today().strftime("%Y-%m-%d"), amount, description, "Cash"
        ))
        expense_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        expense_ids.append(expense_id)
    
    conn.commit()
    return expense_ids

def create_invoices(conn, user_id, product_ids, employee_ids, customer_ids, count=20):
    """Create sample invoices for the shop"""
    invoice_ids = []
    
    for i in range(count):
        # Random dates in the last 3 months
        bill_date = date.today() - timedelta(days=random.randint(1, 90))
        delivery_date = bill_date + timedelta(days=random.randint(1, 7))
        
        # Random customer and employee
        customer_id = random.choice(customer_ids)
        employee_id = random.choice(employee_ids)
        
        # Get customer details
        customer = conn.execute("SELECT name, phone, city, area FROM customers WHERE customer_id = ?", (customer_id,)).fetchone()
        
        # Create 1-3 random products
        num_items = random.randint(1, 3)
        selected_products = random.sample(product_ids, min(num_items, len(product_ids)))
        
        subtotal = 0
        for product_id in selected_products:
            product = conn.execute("SELECT product_name, rate FROM products WHERE product_id = ?", (product_id,)).fetchone()
            quantity = random.randint(1, 3)
            rate = float(product["rate"])
            line_total = rate * quantity
            subtotal += line_total
        
        vat_amount = subtotal * 0.05  # 5% VAT
        total_amount = subtotal + vat_amount
        
        # Payment status
        is_paid = random.random() < 0.7  # 70% paid
        if is_paid:
            advance_paid = total_amount
            balance_amount = 0
            status = "Paid"
        else:
            advance_paid = round(total_amount * random.uniform(0.3, 0.8), 2)
            balance_amount = round(total_amount - advance_paid, 2)
            status = "Pending"
        
        # Create bill
        bill_number = f"BILL-{bill_date.strftime('%Y%m%d')}-{i+1:03d}"
        conn.execute("""
            INSERT INTO bills (user_id, bill_number, customer_id, customer_name, customer_phone,
                             customer_city, customer_area, bill_date, delivery_date, payment_method,
                             subtotal, vat_amount, total_amount, advance_paid, balance_amount,
                             status, master_id, uuid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, bill_number, customer_id, customer["name"], customer["phone"],
            customer["city"], customer["area"], bill_date.strftime("%Y-%m-%d"), 
            delivery_date.strftime("%Y-%m-%d"), "Cash", subtotal, vat_amount, total_amount,
            advance_paid, balance_amount, status, employee_id, str(uuid.uuid4())
        ))
        
        bill_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        invoice_ids.append(bill_id)
        
        # Create bill items
        for product_id in selected_products:
            product = conn.execute("SELECT product_name, rate FROM products WHERE product_id = ?", (product_id,)).fetchone()
            quantity = random.randint(1, 3)
            rate = float(product["rate"])
            line_total = rate * quantity
            vat_line = line_total * 0.05
            
            conn.execute("""
                INSERT INTO bill_items (user_id, bill_id, product_id, product_name, quantity,
                                      rate, discount, vat_amount, advance_paid, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, bill_id, product_id, product["product_name"], quantity,
                rate, 0, vat_line, 0, line_total + vat_line
            ))
    
    conn.commit()
    return invoice_ids

def create_demo_shop(shop_type):
    """Create a complete demo shop"""
    if shop_type not in SHOP_DEFINITIONS:
        print(f"Error: Unknown shop type '{shop_type}'")
        return False
    
    shop_data = SHOP_DEFINITIONS[shop_type]
    conn = get_conn()
    
    try:
        print(f"Creating {shop_data['name']} ({shop_type})...")
        
        # Create user account
        user_id = create_user(conn, shop_data)
        print(f"  ✓ Created user account (ID: {user_id})")
        
        # Create product types
        type_ids = create_product_types(conn, user_id, shop_data["product_types"])
        print(f"  ✓ Created {len(type_ids)} product types")
        
        # Create products
        product_ids = create_products(conn, user_id, shop_data["products"], type_ids)
        print(f"  ✓ Created {len(product_ids)} products")
        
        # Create employees
        employee_ids = create_employees(conn, user_id, shop_data["employees"])
        print(f"  ✓ Created {len(employee_ids)} employees")
        
        # Create customers
        customer_ids = create_customers(conn, user_id, 20)
        print(f"  ✓ Created 20 customers")
        
        # Create invoices
        invoice_ids = create_invoices(conn, user_id, product_ids, employee_ids, customer_ids, 20)
        print(f"  ✓ Created 20 invoices")
        
        # Create expenses
        expense_ids = create_expenses(conn, user_id, shop_data["expenses"])
        print(f"  ✓ Created {len(expense_ids)} expenses")
        
        print(f"  ✓ {shop_data['name']} created successfully!")
        print(f"  Login: {shop_data['email']}")
        print(f"  Mobile: {shop_data['mobile']}")
        print()
        
        return True
        
    except Exception as e:
        print(f"Error creating {shop_type} shop: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def main():
    parser = argparse.ArgumentParser(description="Create demo shops for Tajir POS")
    parser.add_argument("--shop_type", choices=list(SHOP_DEFINITIONS.keys()) + ["all"], 
                       default="electronics", help="Type of shop to create")
    args = parser.parse_args()
    
    if args.shop_type == "all":
        print("Creating all demo shops...")
        for shop_type in SHOP_DEFINITIONS.keys():
            create_demo_shop(shop_type)
        print("All demo shops created successfully!")
    else:
        create_demo_shop(args.shop_type)

if __name__ == "__main__":
    main()

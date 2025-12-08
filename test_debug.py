#!/usr/bin/env python3

import os
import sys
sys.path.append('.')

# Set environment
os.environ['DATABASE_URL'] = 'postgresql://postgres:aykha123@localhost:5432/tajir_pos'

try:
    print("Step 1: Importing Flask app...")
    from app import app, get_db_connection, execute_query, get_current_user_id
    print("[OK] Flask app imported successfully")

    print("\nStep 2: Testing database connection...")
    conn = get_db_connection()
    cursor = execute_query(conn, "SELECT 1 as test", ())
    result = cursor.fetchone()
    print(f"[OK] Database connection successful: {result}")
    conn.close()

    print("\nStep 3: Testing shop settings query...")
    conn = get_db_connection()
    cursor = execute_query(conn, "SELECT * FROM shop_settings WHERE user_id = %s", (2,))
    settings = cursor.fetchone()
    print(f"[OK] Shop settings query executed (found: {settings is not None})")
    if settings:
        print(f"Settings keys: {list(settings.keys())}")
        # Check for problematic fields
        for key, value in settings.items():
            try:
                str(value)
                print(f"  {key}: OK")
            except:
                print(f"  {key}: PROBLEMATIC")
    conn.close()

    print("\nStep 4: Testing JSON serialization...")
    if settings:
        from decimal import Decimal
        settings_dict = dict(settings)
        print(f"Original settings: {settings_dict}")

        for key, value in settings_dict.items():
            if hasattr(value, 'isoformat'):  # datetime object
                settings_dict[key] = value.isoformat()
                print(f"[OK] Converted datetime {key}: {settings_dict[key]}")
            elif isinstance(value, Decimal):
                settings_dict[key] = float(value)  # Convert Decimal to float
                print(f"[OK] Converted Decimal {key}: {settings_dict[key]}")

        print(f"Final settings dict: {settings_dict}")

        import json
        json_str = json.dumps(settings_dict)
        print(f"[OK] JSON serialization successful: {len(json_str)} characters")

    print("\n[SUCCESS] All tests passed!")

except Exception as e:
    print(f"[ERROR] Error at step: {e}")
    import traceback
    print(f"Full traceback:\n{traceback.format_exc()}")
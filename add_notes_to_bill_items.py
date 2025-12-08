#!/usr/bin/env python3
"""
Migration script to add notes column to bill_items table
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

def add_notes_column():
    """Add notes column to bill_items table if it doesn't exist"""
    try:
        # Load environment variables
        load_dotenv()

        # Get database connection parameters
        pg_host = os.getenv('POSTGRES_HOST') or os.getenv('PGHOST')
        pg_port = os.getenv('POSTGRES_PORT') or os.getenv('PGPORT', '5432')
        pg_database = os.getenv('POSTGRES_DB') or os.getenv('PGDATABASE', 'tajir_pos')
        pg_user = os.getenv('POSTGRES_USER') or os.getenv('PGUSER', 'postgres')
        pg_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('PGPASSWORD', 'password')

        if not pg_host:
            print("ERROR: POSTGRES_HOST not found in environment variables")
            return False

        pg_config = {
            'host': pg_host,
            'port': pg_port,
            'database': pg_database,
            'user': pg_user,
            'password': pg_password,
            'cursor_factory': RealDictCursor
        }

        conn = psycopg2.connect(**pg_config)
        cursor = conn.cursor()

        # Check if notes column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'bill_items' AND column_name = 'notes'
        """)

        if cursor.fetchone():
            print("SUCCESS: Notes column already exists in bill_items table")
            conn.close()
            return True

        # Add notes column
        print("Adding notes column to bill_items table...")
        cursor.execute("""
            ALTER TABLE bill_items ADD COLUMN notes TEXT DEFAULT ''
        """)

        conn.commit()
        conn.close()

        print("SUCCESS: Successfully added notes column to bill_items table")
        return True

    except Exception as e:
        print(f"ERROR: Error adding notes column: {e}")
        return False

if __name__ == "__main__":
    print("Starting migration: Add notes column to bill_items table")
    success = add_notes_column()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        exit(1)
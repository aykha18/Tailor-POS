import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
load_dotenv()

def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    pg_host = os.getenv('PGHOST')

    if database_url:
        # Use DATABASE_URL (Railway standard approach)
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    else:
        # Use individual variables
        pg_port = os.getenv('PGPORT', '5432')
        pg_database = os.getenv('PGDATABASE', 'tajir_pos')
        pg_user = os.getenv('PGUSER', 'postgres')
        pg_password = os.getenv('PGPASSWORD', 'password')

        pg_config = {
            'host': pg_host,
            'port': pg_port,
            'database': pg_database,
            'user': pg_user,
            'password': pg_password,
            'cursor_factory': RealDictCursor
        }
        conn = psycopg2.connect(**pg_config)
    return conn

def test_db():
    try:
        conn = get_db_connection()

        cursor = conn.cursor()

        # Check if expenses table exists
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses'")
        result = cursor.fetchone()
        print(f"Expenses table exists: {result is not None}")

        # Check if expense_categories table exists
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories'")
        result = cursor.fetchone()
        print(f"Expense categories table exists: {result is not None}")

        # Try to select from expenses table
        try:
            cursor.execute("SELECT COUNT(*) as count FROM expenses WHERE user_id = 2")
            count_result = cursor.fetchone()
            print(f"Expenses count for user 2: {count_result['count']}")
        except Exception as e:
            print(f"Error querying expenses table: {e}")

        # Try to select from expense_categories table
        try:
            cursor.execute("SELECT COUNT(*) as count FROM expense_categories WHERE user_id = 2 AND is_active = TRUE")
            count_result = cursor.fetchone()
            print(f"Expense categories count for user 2: {count_result['count']}")
        except Exception as e:
            print(f"Error querying expense_categories table: {e}")

        conn.close()
        print("Database test completed successfully")

    except Exception as e:
        print(f"Database test error: {e}")

if __name__ == "__main__":
    test_db()
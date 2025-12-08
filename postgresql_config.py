"""
PostgreSQL Configuration for Tajir POS
This file contains the database connection configuration
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# PostgreSQL Configuration
POSTGRES_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB', 'tajir_pos'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'password'),
    'minconn': 1,
    'maxconn': 20
}

# Connection string for SQLAlchemy (if needed later)
DATABASE_URL = f"postgresql://{POSTGRES_CONFIG['user']}:{POSTGRES_CONFIG['password']}@{POSTGRES_CONFIG['host']}:{POSTGRES_CONFIG['port']}/{POSTGRES_CONFIG['database']}"

# Environment setup instructions
SETUP_INSTRUCTIONS = """
To set up PostgreSQL for Tajir POS:

1. Install PostgreSQL on your system
2. Create a database named 'tajir_pos'
3. Create a user with appropriate permissions
4. Set the following environment variables:

   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=tajir_pos
   POSTGRES_USER=your_username
   POSTGRES_PASSWORD=your_password

5. Or create a .env file with these variables
"""

if __name__ == "__main__":
    print("PostgreSQL Configuration:")
    print(f"Host: {POSTGRES_CONFIG['host']}")
    print(f"Port: {POSTGRES_CONFIG['port']}")
    print(f"Database: {POSTGRES_CONFIG['database']}")
    print(f"User: {POSTGRES_CONFIG['user']}")
    print(f"Password: {'*' * len(POSTGRES_CONFIG['password'])}")
    print("\n" + SETUP_INSTRUCTIONS)

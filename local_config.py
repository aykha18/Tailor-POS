# Local Development Configuration
# Run this script to set up local PostgreSQL connection

import os

# Local PostgreSQL connection string
DATABASE_URL = "postgresql://postgres:aykha123@localhost:5432/tajir_pos"

def setup_local_environment():
    """Set up environment variables for local PostgreSQL development"""
    # Set local development environment
    os.environ['FLASK_ENV'] = 'development'
    os.environ['ENVIRONMENT'] = 'local'
    
    # Set local PostgreSQL connection
    os.environ['PGHOST'] = 'localhost'
    os.environ['PGPORT'] = '5432'
    os.environ['PGDATABASE'] = 'tajir_pos'
    os.environ['PGUSER'] = 'postgres'
    os.environ['PGPASSWORD'] = 'aykha123'  # Change this to your actual password
    
    # Remove Railway DATABASE_URL to force local connection
    if 'DATABASE_URL' in os.environ:
        print("⚠️ DATABASE_URL found - removing for local development")
        os.environ.pop('DATABASE_URL', None)
    
    print("✅ Local environment configured for PostgreSQL")
    print(f"   Host: {os.environ.get('PGHOST')}")
    print(f"   Port: {os.environ.get('PGPORT')}")
    print(f"   Database: {os.environ.get('PGDATABASE')}")
    print(f"   User: {os.environ.get('PGUSER')}")

if __name__ == "__main__":
    setup_local_environment()

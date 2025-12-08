# PostgreSQL Installation Guide for Tajir POS Migration

## 🐘 Installing PostgreSQL on Windows

### Option 1: Download from Official Website (Recommended)

1. **Download PostgreSQL**
   - Go to: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Choose the latest version (currently 16.x)

2. **Run the Installer**
   - Run the downloaded `.exe` file
   - Follow the installation wizard
   - **Important Settings:**
     - Installation Directory: `C:\Program Files\PostgreSQL\16\`
     - Data Directory: `C:\Program Files\PostgreSQL\16\data\`
     - Password: Set a strong password (remember this!)
     - Port: `5432` (default)
     - Locale: `Default locale`

3. **Post-Installation Setup**
   - The installer will offer to install additional tools
   - **Check "pgAdmin 4"** (GUI management tool)
   - **Check "Stack Builder"** (optional)

### Option 2: Using Chocolatey (if you have it installed)

```powershell
# Install Chocolatey first if you don't have it
# Then run:
choco install postgresql
```

### Option 3: Using Docker (Advanced)

```bash
# Pull PostgreSQL image
docker pull postgres:16

# Run PostgreSQL container
docker run --name tajir-postgres \
  -e POSTGRES_DB=tajir_pos \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:16
```

## 🔧 Post-Installation Configuration

### 1. Verify Installation

After installation, verify PostgreSQL is running:

```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*

# Or try connecting with psql
psql -U postgres -h localhost
```

### 2. Create Database and User

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE tajir_pos;

-- Create user (optional, you can use postgres user)
CREATE USER tajir_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE tajir_pos TO tajir_user;

-- Exit psql
\q
```

### 3. Set Environment Variables

Create a `.env` file in your project root:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tajir_pos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
```

## 🧪 Testing the Installation

### Test Connection

```python
# Run this Python script to test connection
python -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='localhost',
        port='5432',
        database='tajir_pos',
        user='postgres',
        password='your_password'
    )
    print('✅ PostgreSQL connection successful!')
    conn.close()
except Exception as e:
    print(f'❌ Connection failed: {e}')
"
```

### Test with pgAdmin 4

1. Open pgAdmin 4 (installed with PostgreSQL)
2. Connect to your local server
3. Browse the `tajir_pos` database

## 🚀 Next Steps

Once PostgreSQL is installed and configured:

1. **Run the migration script:**
   ```bash
   python migration_setup.py
   ```

2. **Update the application:**
   - Modify `app.py` to use PostgreSQL
   - Test all functionality

3. **Backup SQLite:**
   ```bash
   copy pos_tailor.db pos_tailor_backup.db
   ```

## 🔍 Troubleshooting

### Common Issues:

1. **"Connection refused"**
   - Check if PostgreSQL service is running
   - Verify port 5432 is not blocked by firewall

2. **"Authentication failed"**
   - Check username/password in `.env` file
   - Verify user has proper permissions

3. **"Database does not exist"**
   - Create the database: `CREATE DATABASE tajir_pos;`

4. **"psql command not found"**
   - Add PostgreSQL bin directory to PATH
   - Default: `C:\Program Files\PostgreSQL\16\bin\`

### Getting Help:

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Stack Overflow: https://stackoverflow.com/questions/tagged/postgresql
- GitHub Issues: Create an issue in the project repository

## 📋 Checklist

- [ ] PostgreSQL installed
- [ ] Database `tajir_pos` created
- [ ] User permissions set
- [ ] Environment variables configured
- [ ] Connection test successful
- [ ] Ready to run migration script

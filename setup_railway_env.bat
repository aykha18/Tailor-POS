@echo off
echo Railway Environment Variables Setup for Tajir POS
echo ================================================

REM Check if Railway CLI is available
railway --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Railway CLI not found. Please install it first:
    echo npm install -g @railway/cli
    pause
    exit /b 1
)

echo Railway CLI is available

REM Check if we're in a Railway project
railway status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not in a Railway project. Please run 'railway link' first.
    pause
    exit /b 1
)

echo Connected to Railway project

REM Generate a secure secret key (simple version)
set SECRET_KEY=secret_key_%RANDOM%_%RANDOM%_%RANDOM%_%RANDOM%

echo Setting up environment variables...

REM Application Settings
railway variables set SECRET_KEY=%SECRET_KEY%
railway variables set FLASK_ENV=production
railway variables set DEBUG=False

REM Security Settings
railway variables set BCRYPT_LOG_ROUNDS=12
railway variables set SESSION_COOKIE_SECURE=True
railway variables set SESSION_COOKIE_HTTPONLY=True
railway variables set PERMANENT_SESSION_LIFETIME=3600

REM Rate Limiting
railway variables set RATELIMIT_STORAGE_URL=memory://
railway variables set RATELIMIT_DEFAULT=200 per day;50 per hour

REM Logging
railway variables set LOG_LEVEL=INFO
railway variables set LOG_FILE=logs/tajir_pos.log

echo.
echo Environment variables set successfully!
echo.
echo Current environment variables:
railway variables

echo.
echo PostgreSQL Variables Note:
echo The following PostgreSQL variables will be automatically set by Railway:
echo - POSTGRES_HOST
echo - POSTGRES_PORT
echo - POSTGRES_DB
echo - POSTGRES_USER
echo - POSTGRES_PASSWORD
echo.
echo Make sure you have added a PostgreSQL plugin to your Railway project!
echo.
echo Next steps:
echo 1. Add PostgreSQL plugin to your Railway project
echo 2. Deploy your application: railway up
echo 3. Check logs: railway logs

pause

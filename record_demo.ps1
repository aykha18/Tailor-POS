# Screen Recording Script for Windows
# This script uses Windows Game Bar or OBS Studio for recording

param(
    [string]$OutputPath = "expense_demo.mp4",
    [int]$Duration = 300  # 5 minutes default
)

Write-Host "Starting Screen Recording..." -ForegroundColor Green

# Check if OBS Studio is installed
$obsPath = "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
if (Test-Path $obsPath) {
    Write-Host "OBS Studio found" -ForegroundColor Green
    Write-Host "Starting OBS Studio for recording..." -ForegroundColor Yellow
    Start-Process $obsPath
    Write-Host "Please start recording in OBS Studio manually" -ForegroundColor Yellow
} else {
    Write-Host "OBS Studio not found" -ForegroundColor Yellow
    Write-Host "Using Windows Game Bar (Win + G)" -ForegroundColor Yellow
    Write-Host "Press Win + G to open Game Bar and start recording" -ForegroundColor Cyan
}

# Start the Flask application
Write-Host "Starting Flask application..." -ForegroundColor Green
Start-Process python -ArgumentList "app.py" -WindowStyle Minimized

# Wait for app to start
Start-Sleep -Seconds 5

# Open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5000"

Write-Host "Demo Steps:" -ForegroundColor Cyan
Write-Host "1. Login to the application" -ForegroundColor White
Write-Host "2. Navigate to Expenses section" -ForegroundColor White
Write-Host "3. Add a new expense category" -ForegroundColor White
Write-Host "4. Add a new expense" -ForegroundColor White
Write-Host "5. Show filtering and search" -ForegroundColor White
Write-Host "6. Demonstrate mobile view" -ForegroundColor White
Write-Host "7. Show export functionality" -ForegroundColor White

Write-Host "Recording will continue for $Duration seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds $Duration

Write-Host "Recording completed!" -ForegroundColor Green
Write-Host "Please stop recording in your recording software" -ForegroundColor Yellow

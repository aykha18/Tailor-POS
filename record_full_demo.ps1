# Full App Demo Recording Script for Windows
# This script records the complete Tajir POS application demo

param(
    [string]$OutputPath = "tajir_pos_full_demo.mp4",
    [int]$Duration = 300  # 5 minutes default
)

Write-Host "Starting Full App Demo Recording..." -ForegroundColor Green
Write-Host "This will record the complete Tajir POS application demo" -ForegroundColor Cyan

# Check if OBS Studio is installed
$obsPath = "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
if (Test-Path $obsPath) {
    Write-Host "OBS Studio found" -ForegroundColor Green
    Write-Host "Starting OBS Studio for recording..." -ForegroundColor Yellow
    Start-Process $obsPath
    Write-Host "Please configure OBS Studio:" -ForegroundColor Yellow
    Write-Host "1. Add 'Display Capture' as source" -ForegroundColor White
    Write-Host "2. Set recording path to: $OutputPath" -ForegroundColor White
    Write-Host "3. Click 'Start Recording'" -ForegroundColor White
    Write-Host "4. Press Enter when ready to start demo..." -ForegroundColor Cyan
    Read-Host
} else {
    Write-Host "OBS Studio not found" -ForegroundColor Yellow
    Write-Host "Using Windows Game Bar (Win + G)" -ForegroundColor Yellow
    Write-Host "Press Win + G to open Game Bar and start recording" -ForegroundColor Cyan
    Write-Host "Press Enter when recording is started..." -ForegroundColor Cyan
    Read-Host
}

# Install Selenium if not already installed
Write-Host "Checking Selenium installation..." -ForegroundColor Green
try {
    python -c "import selenium" 2>$null
    Write-Host "Selenium is already installed" -ForegroundColor Green
} catch {
    Write-Host "Installing Selenium..." -ForegroundColor Yellow
    pip install selenium
}

# Start the Flask application
Write-Host "Starting Flask application..." -ForegroundColor Green
Start-Process python -ArgumentList "app.py" -WindowStyle Minimized

# Wait for app to start
Start-Sleep -Seconds 5

# Open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5000"

Write-Host "Demo Overview:" -ForegroundColor Cyan
Write-Host "1. Login to Application" -ForegroundColor White
Write-Host "2. Dashboard Overview" -ForegroundColor White
Write-Host "3. Billing System" -ForegroundColor White
Write-Host "4. Product Management" -ForegroundColor White
Write-Host "5. Customer Management" -ForegroundColor White
Write-Host "6. Employee Management" -ForegroundColor White
Write-Host "7. Expense Management" -ForegroundColor White
Write-Host "8. Reports & Analytics" -ForegroundColor White
Write-Host "9. Mobile Responsive Design" -ForegroundColor White
Write-Host "10. Search & Filtering" -ForegroundColor White
Write-Host "11. Export Functionality" -ForegroundColor White
Write-Host "12. Final Dashboard Overview" -ForegroundColor White

Write-Host "Starting automated demo in 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Run the automated demo
Write-Host "Running automated demo..." -ForegroundColor Green
python automated_full_demo.py

Write-Host "Demo completed!" -ForegroundColor Green
Write-Host "Please stop recording in your recording software" -ForegroundColor Yellow

# Optional: Open the output directory
Write-Host "Opening output directory..." -ForegroundColor Green
Start-Process "explorer.exe" -ArgumentList "/select,$OutputPath"

# start.ps1
Write-Host "Starting MealMind Backend and Frontend..." -ForegroundColor Cyan

# Start Backend Server
$backendPath = ".\Backend\Mind-Meals-swarali-backend\Mind-Meals-swarali-backend\server"
Write-Host "Starting Backend from $backendPath" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal

# Start Frontend Vite Server
$frontendPath = ".\Frontend\mealmind-v2\mealmind-v2\web"
Write-Host "Starting Frontend from $frontendPath" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host "Servers are starting in new windows." -ForegroundColor Green

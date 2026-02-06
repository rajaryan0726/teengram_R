# 🚀 Quick Start Script for TeenGram

Write-Host "================================" -ForegroundColor Cyan
Write-Host "   TeenGram Setup Checker" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check node_modules
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Dependencies not installed. Run: npm install" -ForegroundColor Yellow
}

# Check .env.local
Write-Host "Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local file exists" -ForegroundColor Green
    
    # Check if it has actual values
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "your_github_client_id_here") {
        Write-Host "⚠️  WARNING: .env.local has placeholder values!" -ForegroundColor Yellow
        Write-Host "   Please update with your actual credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Environment variables configured" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .env.local not found!" -ForegroundColor Red
    Write-Host "   Copy .env.local.example to .env.local and fill in values" -ForegroundColor Yellow
}

# Check MongoDB
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoService = Get-Service -Name MongoDB -ErrorAction Stop
    if ($mongoService.Status -eq "Running") {
        Write-Host "✅ MongoDB service is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB service exists but not running" -ForegroundColor Yellow
        Write-Host "   Start it with: net start MongoDB (as Administrator)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  MongoDB service not found" -ForegroundColor Yellow
    Write-Host "   Options:" -ForegroundColor Yellow
    Write-Host "   1. Install MongoDB: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host "   2. Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas" -ForegroundColor Cyan
    Write-Host "   3. Use Docker: docker run -d -p 27017:27017 mongo" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "   Setup Status Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "1. Ensure MongoDB is running" -ForegroundColor White
Write-Host "2. Update .env.local with your credentials:" -ForegroundColor White
Write-Host "   - GitHub OAuth (from https://github.com/settings/developers)" -ForegroundColor Cyan
Write-Host "   - OpenAI API Key (optional, from https://platform.openai.com/api-keys)" -ForegroundColor Cyan
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host "4. Open: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Ask if user wants to start
$response = Read-Host "Do you want to start the development server now? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "Starting development server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "Run 'npm run dev' when ready to start!" -ForegroundColor Cyan
}

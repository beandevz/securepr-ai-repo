Write-Host "SecurePR Setup Starting..." -ForegroundColor Cyan

# 1. Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "Python not found. Install Python 3.10+" -ForegroundColor Red
    exit 1
}
Write-Host "Python found" -ForegroundColor Green

# 2. Create venv
if (!(Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
} else {
    Write-Host ".venv already exists" -ForegroundColor Green
}

# 3. Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".venv\Scripts\Activate.ps1"

# 4. Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# 5. Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install -r backend/requirements.txt

# 6. Setup .env
if (!(Test-Path "backend\.env")) {
    Write-Host "Creating .env..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
} else {
    Write-Host ".env already exists" -ForegroundColor Green
}

# 7. Finish
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next:"
Write-Host "cd backend"
Write-Host "uvicorn app.main:app --reload"
$ErrorActionPreference = "Stop"
$project = Split-Path $PSScriptRoot
Push-Location "$project/frontend"
try {
    npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE) { throw "npm ci failed" }
    npm.cmd run build
    if ($LASTEXITCODE) { throw "Frontend build failed" }
} finally { Pop-Location }
Push-Location "$project/backend"
try {
    uv sync --frozen --python 3.12
    if ($LASTEXITCODE) { throw "Python setup failed" }
    uv run --frozen python -m uvicorn app.main:app --host 127.0.0.1 --port 8130
} finally { Pop-Location }

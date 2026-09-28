param(
  [string]$BackupDirectory = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) { throw "Run this script inside the Propulse Git repository." }

$backend = Join-Path $repoRoot "backend"
Push-Location $backend
try {
  if ($BackupDirectory) {
    $env:BACKUP_DIRECTORY = [System.IO.Path]::GetFullPath($BackupDirectory)
  }
  npm run backup:all
  if ($LASTEXITCODE -ne 0) {
    Write-Host "If the error says BACKUP_SCHEMA_NOT_READY or backup_verification_runs is missing, run: cd backend; npm run db:migrate" -ForegroundColor Yellow
    throw "Production backup verification failed."
  }
}
finally {
  Pop-Location
}

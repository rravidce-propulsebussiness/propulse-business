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
  if ($LASTEXITCODE -ne 0) { throw "Production backup verification failed." }
}
finally {
  Pop-Location
}

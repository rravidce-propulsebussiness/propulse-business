param(
  [string]$OutputDirectory = "."
)

$ErrorActionPreference = "Stop"
$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) { throw "Run this script inside the Propulse Git repository." }

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$commit = (git -C $repoRoot rev-parse --short HEAD).Trim()
$outputDir = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDirectory))
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$output = Join-Path $outputDir "propulse-business-source-$timestamp-$commit.zip"

git -C $repoRoot archive --format=zip --output=$output HEAD
if ($LASTEXITCODE -ne 0) { throw "git archive failed." }

Write-Host "Created safe source backup: $output"
Write-Host "The archive contains committed source only; .env files, node_modules, runtime uploads, and other untracked files are excluded."

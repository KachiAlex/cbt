# Creates a timestamped restore point (zip) of key project files and a manifest
# Usage: powershell -ExecutionPolicy Bypass -File .\create-restore-point.ps1

param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$OutputDir = "backend\\backups\\restore-points"
)

$ErrorActionPreference = 'Stop'

function New-Timestamp {
    return (Get-Date).ToString('yyyy-MM-ddTHH-mm-ss-fffZ')
}

function Ensure-Directory($Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

# Resolve paths
$root = (Resolve-Path $ProjectRoot).Path
$rootWithSep = $root + [System.IO.Path]::DirectorySeparatorChar
$restoreRoot = Join-Path $root $OutputDir
Ensure-Directory $restoreRoot

$stamp = New-Timestamp
$workDir = Join-Path $restoreRoot $stamp
Ensure-Directory $workDir

# Files/folders to include in snapshot
$includePaths = @(
    'backend/src',
    'backend/package.json',
    'backend/package-lock.json',
    'backend/render.yaml',
    'backend/Dockerfile',
    'backend/managed-admin-ui.html',
    'backend/public',
    'frontend/src',
    'frontend/public',
    'frontend/package.json',
    'frontend/package-lock.json',
    'netlify.toml',
    'firebase.json',
    'README.md',
    'MULTI_TENANT_IMPLEMENTATION_SUMMARY.md',
    'MULTI_TENANT_ADMIN_ACCESS_GUIDE.md',
    'INSTITUTION_URLS_DEPLOYMENT.md'
) | ForEach-Object { Join-Path $root $_ }

# Build manifest
$changes = @()
try {
    # Try to gather recent modified files (last 24h)
    $recent = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) } |
        Select-Object FullName, LastWriteTime
    $changes = $recent | ForEach-Object {
        @{ path = $_.FullName.Replace($rootWithSep, ''); modifiedAt = ($_.LastWriteTime.ToString('o')) }
    }
} catch {}

$manifest = [ordered]@{
    createdAt = (Get-Date).ToString('o')
    projectRoot = $root
    restorePointId = $stamp
    include = $includePaths | ForEach-Object { $_.Replace($rootWithSep, '') }
    recentChanges = $changes
}

$manifestPath = Join-Path $workDir 'manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Out-File -FilePath $manifestPath -Encoding UTF8

# Stage files into a temp staging folder to preserve structure
$staging = Join-Path $workDir 'staging'
Ensure-Directory $staging

foreach ($p in $includePaths) {
    if (Test-Path -LiteralPath $p) {
        $relative = $p.Replace($rootWithSep, '')
        $dest = Join-Path $staging $relative
        $destDir = Split-Path $dest -Parent
        Ensure-Directory $destDir
        if ((Get-Item $p).PSIsContainer) {
            Copy-Item -Path $p -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            Copy-Item -Path $p -Destination $dest -Force -ErrorAction SilentlyContinue
        }
    }
}

# Add manifest into the root of the archive content as well
Copy-Item -Path $manifestPath -Destination (Join-Path $staging 'manifest.json') -Force

# Create archive
$zipPath = Join-Path $restoreRoot ("restore-" + $stamp + ".zip")
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -Force

# Also write a top-level latest.json pointer
$latest = [ordered]@{
    latestRestorePoint = $stamp
    createdAt = (Get-Date).ToString('o')
    archive = [ordered]@{ path = (Resolve-Path $zipPath).Path; sizeBytes = (Get-Item $zipPath).Length }
}
$latest | ConvertTo-Json -Depth 6 | Out-File -FilePath (Join-Path $restoreRoot 'latest.json') -Encoding UTF8

Write-Host "✅ Restore point created:" $zipPath

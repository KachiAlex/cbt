# Multi-Tenant CBT System Deployment Script (PowerShell)
# This script helps deploy the multi-tenant managed admin platform on Windows

param(
    [switch]$Start
)

Write-Host "🚀 Multi-Tenant CBT System Deployment Script" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the backend directory."
    exit 1
}

Write-Status "Starting deployment process..."

# Step 1: Install dependencies
Write-Status "Installing dependencies..."
try {
    npm install
    Write-Success "Dependencies installed successfully"
} catch {
    Write-Error "Failed to install dependencies: $($_.Exception.Message)"
    exit 1
}

# Step 2: Check environment variables
Write-Status "Checking environment variables..."
if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found. Creating from example..."
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Warning "Please edit .env file with your configuration before continuing."
        Write-Warning "Required variables: MONGODB_URI, JWT_SECRET"
        exit 1
    } else {
        Write-Error ".env.example not found. Please create .env file manually."
        exit 1
    }
}

# Step 3: Create database backup (if data exists)
Write-Status "Creating database backup..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    try {
        node create-db-backup.js
        Write-Success "Database backup completed"
    } catch {
        Write-Warning "Failed to create backup: $($_.Exception.Message)"
    }
} else {
    Write-Warning "Node.js not found. Skipping backup creation."
}

# Step 4: Initialize super admin users
Write-Status "Initializing super admin users..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    try {
        node create-super-admin.js
        Write-Success "Super admin users initialized"
    } catch {
        Write-Error "Failed to initialize super admin users: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Warning "Node.js not found. Skipping super admin initialization."
}

# Step 5: Test database connection
Write-Status "Testing database connection..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    try {
        $testScript = @"
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Database connection successful');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });
"@
        $testScript | node
        Write-Success "Database connection test passed"
    } catch {
        Write-Error "Database connection test failed: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Warning "Node.js not found. Skipping database connection test."
}

# Step 6: Start the server
Write-Status "Starting the server..."
if ($Start) {
    Write-Status "Starting server in production mode..."
    npm start
} else {
    Write-Status "Server ready to start. Run 'npm start' to start the server."
}

Write-Success "Deployment completed successfully!"
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start the server: npm start"
Write-Host "2. Access the Managed Admin UI: open managed-admin-ui.html in your browser"
Write-Host "3. Test the API endpoints using the UI or curl commands"
Write-Host "4. Create your first school tenant"
Write-Host ""
Write-Host "🔐 Default Credentials:" -ForegroundColor Cyan
Write-Host "Super Admin: superadmin@cbt-system.com / superadmin123"
Write-Host "Managed Admin: managedadmin@cbt-system.com / managedadmin123"
Write-Host ""
Write-Host "⚠️  IMPORTANT: Change default passwords immediately!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Documentation: MULTI_TENANT_README.md" -ForegroundColor Cyan

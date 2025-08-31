#!/bin/bash

# Multi-Tenant CBT System Deployment Script
# This script helps deploy the multi-tenant managed admin platform

set -e  # Exit on any error

echo "🚀 Multi-Tenant CBT System Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the backend directory."
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm install

# Step 2: Check environment variables
print_status "Checking environment variables..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before continuing."
        print_warning "Required variables: MONGODB_URI, JWT_SECRET"
        exit 1
    else
        print_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Step 3: Create database backup (if data exists)
print_status "Creating database backup..."
if command -v node &> /dev/null; then
    node create-db-backup.js
    print_success "Database backup completed"
else
    print_warning "Node.js not found. Skipping backup creation."
fi

# Step 4: Initialize super admin users
print_status "Initializing super admin users..."
if command -v node &> /dev/null; then
    node create-super-admin.js
    print_success "Super admin users initialized"
else
    print_warning "Node.js not found. Skipping super admin initialization."
fi

# Step 5: Test database connection
print_status "Testing database connection..."
if command -v node &> /dev/null; then
    node -e "
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
    "
    print_success "Database connection test passed"
else
    print_warning "Node.js not found. Skipping database connection test."
fi

# Step 6: Start the server
print_status "Starting the server..."
if [ "$1" = "--start" ]; then
    print_status "Starting server in production mode..."
    npm start
else
    print_status "Server ready to start. Run 'npm start' to start the server."
fi

print_success "Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the server: npm start"
echo "2. Access the Managed Admin UI: open managed-admin-ui.html in your browser"
echo "3. Test the API endpoints using the UI or curl commands"
echo "4. Create your first school tenant"
echo ""
echo "🔐 Default Credentials:"
echo "Super Admin: superadmin@cbt-system.com / superadmin123"
echo "Managed Admin: managedadmin@cbt-system.com / managedadmin123"
echo ""
echo "⚠️  IMPORTANT: Change default passwords immediately!"
echo ""
echo "📚 Documentation: MULTI_TENANT_README.md"

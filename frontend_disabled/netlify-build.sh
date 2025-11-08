#!/bin/bash

# Netlify Build Script for CBT Frontend
echo "🚀 Starting CBT Frontend Build..."

# Ensure we're in the frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --audit-level=moderate

# Check if react-scripts is available
if [ ! -f "node_modules/.bin/react-scripts" ]; then
    echo "❌ react-scripts not found. Installing..."
    npm install react-scripts@5.0.1
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build directory contents:"
    ls -la build/
else
    echo "❌ Build failed!"
    exit 1
fi 
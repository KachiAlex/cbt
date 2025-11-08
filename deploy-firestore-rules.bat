@echo off
echo ========================================
echo Deploying Firestore Security Rules
echo ========================================
echo.

cd frontend_disabled

echo Checking Firebase CLI...
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Firebase CLI not found!
    echo.
    echo Please install Firebase CLI first:
    echo npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

echo Firebase CLI found!
echo.

echo Deploying rules to Firebase...
firebase deploy --only firestore:rules

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed!
    echo.
    echo Make sure you're logged in to Firebase:
    echo firebase login
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Firestore rules deployed!
echo ========================================
echo.
echo The institution login pages can now load without authentication.
echo.
pause


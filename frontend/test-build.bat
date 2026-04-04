@echo off
REM Troubleshooting script for Netlify 404 errors on ME-MOO STOCK frontend

echo.
echo ====================================
echo ME-MOO STOCK - Netlify Debug Script
echo ====================================
echo.

REM Check if Node is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ❌ Node.js not found! Install from https://nodejs.org
    exit /b 1
) else (
    echo   ✅ Node.js: %errorlevel%
    node --version
)

REM Navigate to frontend
cd frontend
if errorlevel 1 (
    echo   ❌ frontend/ directory not found
    exit /b 1
)

echo.
echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo   ❌ npm install failed
    exit /b 1
)
echo   ✅ Dependencies installed

echo.
echo [3/5] Running build...
call npm run build
if errorlevel 1 (
    echo   ❌ Build failed - check errors above
    exit /b 1
)
echo   ✅ Build succeeded

echo.
echo [4/5] Verifying dist/ folder...
if not exist "dist\index.html" (
    echo   ❌ dist/index.html not found!
    exit /b 1
)
echo   ✅ dist/index.html exists

REM Count files in dist
setlocal enabledelayedexpansion
set count=0
for /r dist %%F in (*) do set /a count+=1
echo   ℹ️  Found %count% files in dist/

echo.
echo [5/5] Testing preview server...
echo   ℹ️  Starting preview server on http://localhost:4173
echo   ℹ️  Press Ctrl+C to stop. Test all routes in browser.
echo.

call npm run preview

echo.
echo ====================================
echo If no issues above, Netlify should work!
echo If still broken:
echo   1. Check VITE_API_URL environment variable in Netlify
echo   2. Read frontend/NETLIFY_404_FIX.md
echo   3. Consider using Render for full-stack deployment
echo ====================================
echo.

endlocal

@echo off
echo Starting SahyOpt Application Suite...
echo ===================================

:: Check if PostgreSQL is already running on port 5433
netstat -ano | findstr :5433 >nul
if %errorlevel% equ 0 (
    echo [INFO] PostgreSQL is already running on port 5433.
) else (
    echo [INFO] Starting PostgreSQL on port 5433...
    start "SahyOpt PostgreSQL Database" cmd /k ""C:\Program Files\PostgreSQL\15\bin\postgres.exe" -D "%~dp0local_db" -p 5433"
    :: Wait a moment for postgres to boot up
    timeout /t 3 >nul
)

:: Check if Solver Backend is already running on port 8000
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo [INFO] Solver Backend is already running on port 8000.
) else (
    echo [INFO] Starting Solver Backend on port 8000...
    start "SahyOpt Solver Backend" cmd /k "cd /d "%~dp0solver" && python -m uvicorn server:app --host 127.0.0.1 --port 8000"
)

:: Check if Next.js Frontend is already running on port 3000
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [INFO] Next.js Frontend is already running on port 3000.
) else (
    echo [INFO] Starting Next.js Frontend on port 3000...
    start "SahyOpt Next.js Frontend" cmd /k "cd /d "%~dp0web" && npm run dev"
)

echo.
echo [SUCCESS] All services started successfully!
echo - Database: Port 5433
echo - Solver Backend: http://localhost:8000
echo - Next.js Frontend: http://localhost:3000
echo.
pause

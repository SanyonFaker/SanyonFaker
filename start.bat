@echo off
title ENPEI - Photography Portfolio
cd /d "%~dp0"

echo.
echo   ENPEI - Photography Portfolio
echo   ==============================
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo   [ERROR] pnpm was not found on your PATH.
  echo.
  echo   Install Node.js from https://nodejs.org ^(LTS^), then run:
  echo       npm install -g pnpm@10
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   [1/2] First run - installing dependencies, this takes a minute...
  call pnpm install
  if errorlevel 1 (
    echo.
    echo   [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo   [2/2] Starting the local server...
echo.
start "ENPEI Dev Server" cmd /k "pnpm dev"

echo   Waiting for the server to come up...
rem  `timeout` fails when stdin is redirected, so ping is used as the delay.
ping -n 10 127.0.0.1 >nul

start "" http://localhost:3000

echo.
echo   Browser opened at  http://localhost:3000
echo   Studio (admin) at  http://localhost:3000/admin
echo.
echo   To stop the site, close the window titled "ENPEI Dev Server".
echo.
ping -n 9 127.0.0.1 >nul
exit /b 0

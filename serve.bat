@echo off
chcp 65001 >nul
title Agent Insight Portal
cd /d %~dp0
echo.
echo  Agent Insight Portal - local preview
echo  ------------------------------------
echo  Serving %CD% on http://localhost:8000
echo  Press Ctrl+C to stop.
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8000
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -m http.server 8000
  ) else (
    echo [ERROR] Python not found. Please install Python 3 or use:
    echo   npx serve -l 8000
    pause
  )
)

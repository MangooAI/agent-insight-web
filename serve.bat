@echo off
chcp 65001 >nul
title Agent Insight - local preview
cd /d %~dp0
where python >nul 2>nul
if %errorlevel%==0 (
  python tools\serve.py 8000
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py tools\serve.py 8000
  ) else (
    echo [ERROR] Python not found. Please install Python 3.
    pause
  )
)

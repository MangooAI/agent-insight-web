@echo off
cd /d "%~dp0.."
python tools\update_docs.py %*
pause

@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Lancer-CinemaOS.ps1"
if errorlevel 1 (
  echo.
  echo Cinema OS n'a pas pu demarrer. Le message ci-dessus indique la cause.
  pause
)

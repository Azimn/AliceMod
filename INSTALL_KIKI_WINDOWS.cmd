@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Kiki Windows Build and Install
echo ============================================================
echo.
echo This will validate the local build, prepare Kiki, and launch
echo the generated Windows installer.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-kiki-windows.ps1"
set EXITCODE=%ERRORLEVEL%

if not "%EXITCODE%"=="0" (
  echo.
  echo Kiki setup stopped because a required step failed.
  echo The error above is the useful part. Copy it into ChatGPT if needed.
  echo.
  pause
  exit /b %EXITCODE%
)

echo.
echo Kiki build/install preparation completed.
pause

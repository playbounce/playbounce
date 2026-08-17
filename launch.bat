@echo off
REM Opens playbounce in the default browser. Works from wherever the folder lives.
cd /d "%~dp0"

if not exist "web\index.html" (
  echo Can't find web\index.html next to this launcher.
  echo Keep launch.bat in the playbounce folder, alongside the web\ directory.
  pause
  exit /b 1
)

start "" "web\index.html"

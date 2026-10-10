@echo off
REM Gecis: dev sunucuyu durdur, uretim sunucusunu baslat
for /F "tokens=5" %%P in ('netstat -aon ^| findstr LISTENING ^| findstr :3000') do taskkill /F /PID %%P >nul 2>nul
ping -n 4 127.0.0.1 >nul
cd /d "%~dp0"
call npm start

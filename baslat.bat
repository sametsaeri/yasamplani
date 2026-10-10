@echo off
REM Hesap Planim - baslatma menusu
cd /d "%~dp0"
chcp 65001 >nul 2>nul
title Hesap Planim

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Once https://nodejs.org adresinden kur.
  pause
  exit /b 1
)

:MENU
cls
echo ==========================================================
echo    HESAP PLANIM - Muhasebe ^& Bute   (Yerel, %100 guvenli)
echo ==========================================================
echo.
echo   [1] Uygulamayi ac  (uretim modu - onerilen)
echo   [2] Gelistirme modu ac (npm run dev)
echo   [3] Masaustu EXE'yi ac  (kuruluysa)
echo   [4] EXE kurulum paketini baslat  (kurulum\*.exe)
echo   [5] EXE'yi yeniden derle  (npm run dist)
echo   [6] Temiz kurulum  (node_modules + .next silip yeniden kur)
echo.
echo   [0] Cikis
echo.
echo ==========================================================
set /p sec=Secimin (0-6): 

if "%sec%"=="1" goto URETIM
if "%sec%"=="2" goto GELISTIRME
if "%sec%"=="3" goto EXE_AC
if "%sec%"=="4" goto EXE_KUR
if "%sec%"=="5" goto EXE_DERLE
if "%sec%"=="6" goto TEMIZ
if "%sec%"=="0" exit /b 0
goto MENU

:URETIM
if not exist node_modules (
  echo Ilk kurulum: paketler yukleniyor...
  call npm install --no-audit --no-fund
)
if not exist .next (
  echo Derleniyor...
  call npm run build
)
echo.
echo 3000 portu bossa kapatiliyor, uretim modunda aciliyor: http://localhost:3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :3000') do taskkill /F /PID %%a >nul 2>nul
ping -n 3 127.0.0.1 >nul
echo Kapatmak icin bu pencereyi kapatman yeterli.
call npm start
goto MENU

:GELISTIRME
if not exist node_modules (
  echo Ilk kurulum: paketler yukleniyor...
  call npm install --no-audit --no-fund
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :3000') do taskkill /F /PID %%a >nul 2>nul
ping -n 3 127.0.0.1 >nul
echo Gelistirme modu: http://localhost:3000
call npm run dev
goto MENU

:EXE_AC
set "exepath=%LocalAppData%\Programs\Hesap Planim\Hesap Planim.exe"
if exist "%exepath%" (
  start "" "%exepath%"
  exit /b 0
)
echo Kurulu EXE bulunamadi. Once [4] ile kur.
pause
goto MENU

:EXE_KUR
set "setup="
for %%f in ("kurulum\*Setup*.exe") do set "setup=%%f"
if not defined setup (
  echo Kurulum paketi yok. Once [5] ile derle.
  pause
  goto MENU
)
echo Kuruluyor: %setup%
start "" "%setup%"
exit /b 0

:EXE_DERLE
echo Statik cikti + kurulum paketi derleniyor (biraz surebilir)...
call npm run dist
if exist "kurulum\Hesap Planım Setup 1.0.0.exe" (
  echo.
  echo TAMAM: kurulum\Hesap Planim Setup 1.0.0.exe hazir.
) else (
  echo.
  echo Derleme basarisiz olabilir. Ciktilari kontrol et.
)
pause
goto MENU

:TEMIZ
echo node_modules ve .next silinecek, yeniden kurulacak...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
if exist out rmdir /s /q out
call npm install --no-audit --no-fund
call npm run build
echo Temiz kurulum tamam.
pause
goto MENU

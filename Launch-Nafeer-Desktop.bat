@echo off
chcp 65001 >nul
title نظام إدارة بنك الدم المركزي - نفير (وضع أوفلاين المكتبي)
color 0A

echo ======================================================================
echo    نظام إدارة بنك الدم المركزي - نفير (تشغيل سطح المكتب بدون إنترنت)
echo ======================================================================
echo.

cd /d "%~dp0"
set TARGET_URL=http://127.0.0.1:3000
set NEXT_TELEMETRY_DISABLED=1

:: فتح المنفذ 3000 تلقائياً في جدار حماية ويندوز في حال التشغيل كمسؤول (Run as administrator)
netsh advfirewall firewall show rule name="Nafeer Blood Bank Port 3000" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    netsh advfirewall firewall add rule name="Nafeer Blood Bank Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
)

:: Check if server is already running on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    echo [+] الخادم المحلي يعمل بالفعل على المنفذ 3000.
    goto OPEN_WINDOW
)

echo [*] جاري تشغيل خادم النظام المحلي وقاعدة البيانات المحلية...
start /b "" node scripts\migrate-post-responses.cjs >nul 2>&1
start /b "" node node_modules\next\dist\bin\next start -H 0.0.0.0 -p 3000 >nul 2>&1

:: Loop check until port 3000 is listening (up to 20 seconds)
echo [*] جاري انتظار جاهزية الخادم المحلي...
for /l %%i in (1, 1, 40) do (
    netstat -ano | findstr :3000 | findstr LISTENING >nul
    if %ERRORLEVEL% equ 0 goto OPEN_WINDOW
    timeout /t 1 /nobreak >nul
)

:OPEN_WINDOW
echo [+] تم تجهيز النظام المحلي بنجاح!
echo [*] جاري فتح نافذة التطبيق المستقلة...

if exist "%~dp0dist-electron\win-unpacked\Nafeer Blood Bank Management System.exe" (
    set NAFEER_APP_URL=%TARGET_URL%
    start "" "%~dp0dist-electron\win-unpacked\Nafeer Blood Bank Management System.exe"
    goto DONE
)

if exist "%LOCALAPPDATA%\Programs\Nafeer Blood Bank Management System\Nafeer Blood Bank Management System.exe" (
    set NAFEER_APP_URL=%TARGET_URL%
    start "" "%LOCALAPPDATA%\Programs\Nafeer Blood Bank Management System\Nafeer Blood Bank Management System.exe"
    goto DONE
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1366,820
    goto DONE
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1366,820
    goto DONE
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1366,820
    goto DONE
)

start "" "%TARGET_URL%"

:DONE
echo.
echo ======================================================================
echo   التطبيق يعمل الآن في وضع أوفلاين بالكامل (Local Offline Mode).
echo   جميع البيانات تقرأ وتكتب في قاعدة البيانات المحلية: blood-bank-test.db
echo ======================================================================
echo.
echo يمكنك تصغير هذه النافذة أو تركها تعمل في الخلفية.
pause

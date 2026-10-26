@echo off
chcp 65001 >nul
title فتح منفذ الخادم المحلي 3000 في جدار الحماية
color 0B

echo ======================================================================
echo    تفعيل الاتصال بين تطبيق الهاتف ونظام بنك الدم المكتبي
echo ======================================================================
echo.
echo جاري إضافة قاعدة في جدار حماية ويندوز للسماح للهواتف بالاتصال بالمنفذ 3000...
echo.

netsh advfirewall firewall add rule name="Nafeer Blood Bank Port 3000" dir=in action=allow protocol=TCP localport=3000

if %ERRORLEVEL% equ 0 (
    echo.
    echo [+] تم فتح المنفذ 3000 بنجاح في جدار الحماية!
    echo [+] يمكن لهواتف أندرويد الآن الوصول إلى المنشورات عبر شبكة Wi-Fi.
) else (
    echo.
    echo [-] يرجى تشغيل هذا الملف بالنقر بزر الفأرة الأيمن واختيار:
    echo     "Run as administrator" (تشغيل كمسؤول)
)

echo.
pause

@echo off
title إيقاف خادم بنك الدم المحلي
echo جاري إيقاف الخادم المحلي على المنفذ 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo تم إيقاف الخادم المحلي بنجاح.

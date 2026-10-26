@echo off
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
node scripts\migrate-post-responses.cjs
node node_modules\next\dist\bin\next start -H 0.0.0.0 -p 3000

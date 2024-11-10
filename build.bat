@echo off
title Build Syncify
echo Building...
echo Build logs are being written to build.log.
timeout /t 1 >NUL
npm run build > build.log
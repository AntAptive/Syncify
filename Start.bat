@echo off
setlocal
title Syncify

rem Reinstall dependencies when package-lock.json changed since the last install
rem (e.g. after an update) or when node_modules is missing
set "HASH_FILE=node_modules\.syncify-lock-hash"
set LOCK_HASH=
set SAVED_HASH=

if exist package-lock.json (
    for /f "skip=1 delims=" %%h in ('certutil -hashfile package-lock.json SHA256') do (
        if not defined LOCK_HASH set "LOCK_HASH=%%h"
    )
)
if exist "%HASH_FILE%" set /p SAVED_HASH=<"%HASH_FILE%"

if not "%LOCK_HASH%"=="%SAVED_HASH%" (
    echo Installing dependencies...
    echo.
    call npm ci
    if errorlevel 1 (
        echo.
        echo Failed to install dependencies. See above for details. Closing Syncify.
        pause >NUL
        exit /b 1
    )
    >"%HASH_FILE%" echo %LOCK_HASH%
    echo.
)

if not exist dist (
    call Build.bat auto

    if not exist dist (
        echo The build process did not produce the necessary build files. Closing Syncify.
        pause >NUL
        exit /b 1
    )
)

node server.js
pause
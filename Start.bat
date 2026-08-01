@echo off
title Syncify

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
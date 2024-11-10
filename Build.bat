@echo off

rem Enable Unicode support
chcp 65001 >NUL

echo Building...
echo.

rem Build and write to log file
call npm run build > build.log

rem Show the log
type build.log
echo.

echo Build script complete. See above for potential errors.
echo Build log was saved to build.log
echo.
echo Press any key to close this window.
pause >NUL

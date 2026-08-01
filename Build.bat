@echo off
setlocal enabledelayedexpansion

rem Enable Unicode support
chcp 65001 >NUL

rem Skip "press any key" prompt if called from Start.bat
set CALLED_FROM_START=0
if /i "%~1"=="auto" set CALLED_FROM_START=1

echo Building...
echo.

rem Build and write to log file
call npm run build > build.log
set BUILD_EXIT_CODE=%ERRORLEVEL%

rem Show the log
type build.log
echo.

if %BUILD_EXIT_CODE% neq 0 (
    echo Build script complete. See above for potential errors.
    echo Build log was saved to build.log

    if !CALLED_FROM_START!==0 (
        echo.
        echo Press any key to close this window.
        pause >NUL
    )
    exit /b %BUILD_EXIT_CODE%
)

rem Read SOURCE out of config.env to decide if the SMTC helper needs building
set SOURCE=
if exist config.env (
    for /f "usebackq tokens=1,2 delims==" %%A in ("config.env") do (
        if /i "%%A"=="SOURCE" set SOURCE=%%B
    )
)

if /i "!SOURCE!"=="smtc" (
    echo SOURCE is set to smtc. Building NowPlaying.exe...
    echo.

    pushd helper
    call dotnet publish -c Release -r win-x64 -o ./dist >> ../build.log 2>&1
    set HELPER_EXIT_CODE=!ERRORLEVEL!
    popd

    if !HELPER_EXIT_CODE! neq 0 (
        echo NowPlaying.exe build failed. See build.log for details.
    ) else (
        echo NowPlaying.exe built successfully.
    )
    echo.
)

echo Build script complete. See above for potential errors.
echo Build log was saved to build.log

if !CALLED_FROM_START!==0 (
    echo.
    echo Press any key to close this window.
    pause >NUL
)

exit /b 0
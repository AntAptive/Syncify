@echo off
setlocal

echo Checking for updates...
echo.

rem Store the current directory
set "REPO_DIR=%~dp0"

rem Navigate to the repository directory
cd /d "%REPO_DIR%"

rem Check if it's a git repository
if not exist ".git" (
    echo Error: This is not a git repository.
    echo Please run this script from within a git repository.
    pause
    exit /b 1
)

rem Fetch the latest changes
echo Fetching latest changes...
git fetch
if %errorlevel% neq 0 (
    echo Error: Failed to fetch updates.
    pause
    exit /b 1
)

rem Check if we're behind the remote
for /f %%i in ('git rev-list HEAD..origin/main --count') do set BEHIND=%%i

if %BEHIND% equ 0 (
    echo.
    echo Syncify is up to date! Closing...
    timeout /t 3 >NUL
    exit /b 0
)

rem If we're here, there are updates available
echo.
echo Updates found! Your version of Syncify is %BEHIND% commit(s) behind.
echo.

:confirmation
rem Ask user for confirmation
set /p CONFIRM="Do you want to update now? (Y/N): "
if /i "%CONFIRM%"=="N" (
    echo Update cancelled. Closing...
    timeout /t 2 >NUL
    exit /b 0
)
if /i "%CONFIRM%" neq "Y" (
    echo Please enter a valid response.
    goto confirmation
)

rem Pull the changes
echo.
echo Updating Syncify...
git pull
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to update Syncify.
    echo This might be due to local changes conflicting with updates.
    echo If this is a theme file, please rename it to a name not conflicting with theme files included with Syncify.
    echo If these are code files and you are not a developer, please contact AntAptive or open an issue on the repo.
    echo.
    echo If you're unable to resolve the issues above, please reinstall Syncify in a blank folder.
    pause
    exit /b 1
)

echo.
echo Update completed successfully!
pause
exit /b 0
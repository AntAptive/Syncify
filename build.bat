@echo off
title Build Syncify
:main
echo Note: This window will close when the build is complete, regardless of if there's errors.
echo To troubleshoot, please type B below.
echo.
echo Build Syncify?
echo Y = Yes, build
echo N = No, don't build
echo B = Run "npm run build" in a new Command Prompt window (debug)
set /p cho=Choose:
if /i %cho%==y goto yes
if /i %cho%==n goto no
if /i %cho%==b goto cmdprompt

cls
color c
echo Please type Y, N or B below (case-insensitive)
timeout /t 1 >NUL

cls
color 07
echo Please type Y, N or B below (case-insensitive)
timeout /t 1 >NUL

cls
color c
echo Please type Y, N or B below (case-insensitive)
timeout /t 1 >NUL

cls
color 07
echo Please type Y, N or B below (case-insensitive)

goto main

:yes
cls
echo Building...
echo.
npm run build
exit

:no
cls
echo Exiting...
timeout /t 1 /nobreak >NUL
exit

:cmdprompt
cls
cd /d "%~dp0"
start cmd /k npm run build
exit
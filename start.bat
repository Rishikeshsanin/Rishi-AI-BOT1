@echo off
setlocal

title Rishi AI BOT1 - Qwen3 1.7B
cd /d "%~dp0"

set "LLAMAFILE=llamafile-0.10.5.exe"
set "MODEL=qwen3-1.7b-q4_k_m.gguf"
set "HOST=127.0.0.1"
set "PORT=8081"

cls
echo ==================================================
echo                  RISHI AI BOT1
echo            Qwen3 1.7B - Offline AI
echo ==================================================
echo.
echo [Mode]    CPU only
echo [Host]    %HOST%
echo [Port]    %PORT%
echo [Web UI]  http://%HOST%:%PORT%
echo.

if not exist "%LLAMAFILE%" (
    echo [ERROR] Missing Llamafile runtime:
    echo         %LLAMAFILE%
    echo.
    echo Put the file in this folder and run start.bat again.
    echo.
    pause
    exit /b 1
)

if not exist "%MODEL%" (
    echo [ERROR] Missing Qwen model:
    echo         %MODEL%
    echo.
    echo Put the file in this folder and run start.bat again.
    echo.
    pause
    exit /b 1
)

echo [OK] Required files found.
echo [INFO] Loading the model. First startup may take a little time.
echo [INFO] Keep this window open while using the assistant.
echo.
echo --------------------------------------------------
echo.

"%LLAMAFILE%" ^
  --server ^
  --model "%MODEL%" ^
  --gpu disable ^
  --host %HOST% ^
  --port %PORT%

set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo --------------------------------------------------
if "%EXIT_CODE%"=="0" (
    echo Rishi AI BOT1 stopped normally.
) else (
    echo Rishi AI BOT1 stopped with exit code %EXIT_CODE%.
    echo Check the messages above for the cause.
)
echo --------------------------------------------------
echo.
pause
exit /b %EXIT_CODE%

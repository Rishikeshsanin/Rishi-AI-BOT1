@echo off
title Manan Offline AI - Qwen3 1.7B

cd /d "%~dp0"

echo ==========================================
echo       Starting Qwen3 1.7B Offline AI
echo             CPU ONLY MODE
echo ==========================================
echo.

.\llamafile-0.10.5.exe ^
  --server ^
  --model "qwen3-1.7b-q4_k_m.gguf" ^
  --gpu disable ^
  --host 127.0.0.1 ^
  --port 8081

echo.
echo ==========================================
echo Llamafile stopped.
echo ==========================================
pause
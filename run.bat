@echo off
title Becak Listrik Platform - Local Server
color 0B
cls

echo ================================================================
echo    BECAK LISTRIK MOBILITY PLATFORM - RUNNER
echo    Green Mobility & Fleet Simulation Platform Majalengka
echo ================================================================
echo.
echo  [1/3] Memverifikasi Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [PERINGATAN] Gagal menjalankan prisma generate, melanjutkan ke dev server...
)

echo.
echo  [2/3] Membuka otomatis browser ke http://localhost:3000 ...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo.
echo  [3/3] Menjalankan Next.js Development Server...
echo.
echo ----------------------------------------------------------------
echo   URL Web    : http://localhost:3000
echo   Halaman    :
echo     - Beranda   : http://localhost:3000/
echo     - Login     : http://localhost:3000/login
echo     - Pelanggan : http://localhost:3000/pelanggan
echo     - Driver    : http://localhost:3000/driver
echo     - Admin     : http://localhost:3000/admin
echo.
echo   Tekan Ctrl + C untuk menghentikan server kapan saja.
echo ----------------------------------------------------------------
echo.

call npm run dev
pause


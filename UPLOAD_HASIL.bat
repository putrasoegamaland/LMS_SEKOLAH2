@echo off
chcp 65001 >nul 2>&1
title LMS Upload Hasil Ujian

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║       📤 UPLOAD HASIL UJIAN KE SUPABASE          ║
echo ╚═══════════════════════════════════════════════════╝
echo.

REM ── Check Node.js ──
where node >nul 2>&1
if errorlevel 1 (
    echo   ❌ Node.js belum terinstall!
    echo   Download dari: https://nodejs.org/en/download/
    pause
    exit /b 1
)

echo   ✅ Node.js ditemukan
echo.

REM ── Navigate to offline directory ──
pushd "%~dp0offline"

REM ── Check if node_modules exists ──
if not exist "node_modules" (
    echo   📦 Menginstall dependencies...
    call npm install --no-fund --no-audit 2>&1
    if errorlevel 1 (
        echo   ❌ Instalasi gagal. Periksa koneksi internet.
        popd
        pause
        exit /b 1
    )
)

REM ── Check if offline.db exists ──
if not exist "data\offline.db" (
    echo ═══════════════════════════════════════════════════
    echo   ❌ DATABASE OFFLINE TIDAK DITEMUKAN
    echo ═══════════════════════════════════════════════════
    echo.
    echo   Jalankan MULAI_UJIAN_OFFLINE.bat terlebih dahulu
    echo   untuk mengunduh data dan menjalankan ujian.
    echo ═══════════════════════════════════════════════════
    popd
    pause
    exit /b 1
)

echo   📤 Memulai upload...
echo.

REM ── Run upload ──
node upload.js

popd
echo.
pause

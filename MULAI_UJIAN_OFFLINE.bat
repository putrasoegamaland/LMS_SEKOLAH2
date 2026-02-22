@echo off
chcp 65001 >nul 2>&1
title LMS Ujian Offline

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║       📡 LMS UJIAN OFFLINE — MULAI SERVER        ║
echo ╚═══════════════════════════════════════════════════╝
echo.

REM ── E1: Check Node.js ──
where node >nul 2>&1
if errorlevel 1 (
    echo ═══════════════════════════════════════════════════
    echo   ❌ NODE.JS BELUM TERINSTALL
    echo ═══════════════════════════════════════════════════
    echo.
    echo   Download dan install Node.js dari:
    echo   https://nodejs.org/en/download/
    echo.
    echo   Pilih versi LTS ^(Long Term Support^).
    echo   Setelah install, jalankan file ini lagi.
    echo ═══════════════════════════════════════════════════
    echo.
    pause
    exit /b 1
)

echo   ✅ Node.js ditemukan
for /f "delims=" %%v in ('node --version') do echo      Versi: %%v
echo.

REM ── Navigate to offline directory ──
pushd "%~dp0offline"

REM ── Auto-install dependencies (first run) ──
if not exist "node_modules" (
    echo   📦 Menginstall dependencies ^(pertama kali^)...
    echo      Mohon tunggu, ini bisa memakan waktu beberapa menit.
    echo.
    call npm install --no-fund --no-audit 2>&1
    if errorlevel 1 (
        echo.
        echo ═══════════════════════════════════════════════════
        echo   ❌ INSTALASI GAGAL
        echo ═══════════════════════════════════════════════════
        echo.
        echo   Kemungkinan penyebab:
        echo   1. Koneksi internet tidak stabil
        echo   2. Node.js versi terlalu lama ^(minimal v18^)
        echo.
        echo   Coba:
        echo   - Periksa koneksi internet
        echo   - Update Node.js ke versi terbaru
        echo   - Jalankan ulang file ini
        echo ═══════════════════════════════════════════════════
        popd
        pause
        exit /b 1
    )
    echo.
    echo   ✅ Dependencies berhasil diinstall
    echo.
)

REM ── E5: Open firewall port (may need admin) ──
netsh advfirewall firewall add rule name="LMS Offline Server" dir=in action=allow protocol=tcp localport=3000-3005 >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  Tidak bisa membuka firewall ^(bukan Admin^)
    echo      Jika murid tidak bisa akses, jalankan sebagai Administrator.
    echo.
) else (
    echo   ✅ Firewall port 3000-3005 dibuka
    echo.
)

echo   🚀 Memulai server...
echo      Browser akan terbuka otomatis.
echo      Masukkan NIP di halaman yang terbuka.
echo.

REM ── Start server (no --nip needed, login via browser) ──
node server.js

popd
pause

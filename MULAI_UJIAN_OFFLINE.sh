#!/bin/bash

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║       📡 LMS UJIAN OFFLINE — MULAI SERVER        ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── E1: Check Node.js ──
if ! command -v node &> /dev/null; then
    echo "═══════════════════════════════════════════════════"
    echo "  ❌ NODE.JS BELUM TERINSTALL"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "  Install Node.js:"
    echo "  • macOS (Homebrew): brew install node"
    echo "  • macOS (Download): https://nodejs.org/en/download/"
    echo "  • Linux: sudo apt install nodejs npm"
    echo ""
    echo "  Pilih versi LTS (Long Term Support)."
    echo "  Setelah install, jalankan file ini lagi."
    echo "═══════════════════════════════════════════════════"
    echo ""
    read -p "Tekan Enter untuk keluar..."
    exit 1
fi

echo "  ✅ Node.js ditemukan"
echo "     Versi: $(node --version)"
echo ""

# ── Navigate to offline directory ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/offline"

# ── Auto-install dependencies (first run) ──
if [ ! -d "node_modules" ]; then
    echo "  📦 Menginstall dependencies (pertama kali)..."
    echo "     Mohon tunggu, ini bisa memakan waktu beberapa menit."
    echo ""
    npm install --no-fund --no-audit 2>&1
    if [ $? -ne 0 ]; then
        echo ""
        echo "═══════════════════════════════════════════════════"
        echo "  ❌ INSTALASI GAGAL"
        echo "═══════════════════════════════════════════════════"
        echo ""
        echo "  Kemungkinan penyebab:"
        echo "  1. Koneksi internet tidak stabil"
        echo "  2. Node.js versi terlalu lama (minimal v18)"
        echo ""
        echo "  Coba:"
        echo "  - Periksa koneksi internet"
        echo "  - Update Node.js ke versi terbaru"
        echo "  - Jalankan ulang file ini"
        echo "═══════════════════════════════════════════════════"
        read -p "Tekan Enter untuk keluar..."
        exit 1
    fi
    echo ""
    echo "  ✅ Dependencies berhasil diinstall"
    echo ""
fi

# ── macOS: Open firewall (no-op, macOS doesn't block by default) ──
echo "  ✅ Siap dijalankan"
echo ""

echo "  🚀 Memulai server..."
echo "     Browser akan terbuka otomatis."
echo "     Masukkan NIP di halaman yang terbuka."
echo ""

# ── Start server ──
node server.js

echo ""
read -p "Tekan Enter untuk keluar..."

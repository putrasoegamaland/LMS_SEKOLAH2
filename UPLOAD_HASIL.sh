#!/bin/bash

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║       📤 UPLOAD HASIL UJIAN KE SUPABASE          ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── Check Node.js ──
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js belum terinstall!"
    echo "  • macOS: brew install node"
    echo "  • Download: https://nodejs.org/en/download/"
    read -p "Tekan Enter untuk keluar..."
    exit 1
fi

echo "  ✅ Node.js ditemukan"
echo ""

# ── Navigate to offline directory ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/offline"

# ── Check if node_modules exists ──
if [ ! -d "node_modules" ]; then
    echo "  📦 Menginstall dependencies..."
    npm install --no-fund --no-audit 2>&1
    if [ $? -ne 0 ]; then
        echo "  ❌ Instalasi gagal. Periksa koneksi internet."
        read -p "Tekan Enter untuk keluar..."
        exit 1
    fi
fi

# ── Check if offline.db exists ──
if [ ! -f "data/offline.db" ]; then
    echo "═══════════════════════════════════════════════════"
    echo "  ❌ DATABASE OFFLINE TIDAK DITEMUKAN"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "  Jalankan ./MULAI_UJIAN_OFFLINE.sh terlebih dahulu"
    echo "  untuk mengunduh data dan menjalankan ujian."
    echo "═══════════════════════════════════════════════════"
    read -p "Tekan Enter untuk keluar..."
    exit 1
fi

echo "  📤 Memulai upload..."
echo ""

# ── Run upload ──
node upload.js

echo ""
read -p "Tekan Enter untuk keluar..."

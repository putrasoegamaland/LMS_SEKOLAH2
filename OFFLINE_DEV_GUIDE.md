# 📡 LMS Offline Tethering Mode — Development Guide

> **Versi:** 1.0 · **Terakhir diperbarui:** 21 Februari 2026

---

## Daftar Isi

- [Ringkasan](#ringkasan)
- [Arsitektur](#arsitektur)
- [Alur Penggunaan](#alur-penggunaan)
- [Struktur File](#struktur-file)
- [Skema Database](#skema-database)
- [API Endpoints](#api-endpoints)
- [Keamanan](#keamanan)
- [Troubleshooting](#troubleshooting)
- [Development Notes: String Pattern Error](#development-notes-string-pattern-error)

---

## Ringkasan

Mode Offline Tethering memungkinkan guru menyelenggarakan ujian/kuis secara **100% offline** menggunakan WiFi hotspot. Data diunduh dari Supabase sebelumnya, ujian dijalankan secara lokal, dan hasil di-upload setelah terhubung kembali ke internet.

**Prinsip desain:** Satu klik untuk guru, tanpa setup teknis.

---

## Arsitektur

```
┌─────────────────────────────────────────────────────┐
│                  LAPTOP GURU                        │
│                                                     │
│  ┌─────────────┐    ┌──────────────┐                │
│  │ .bat file    │───>│ Express.js   │                │
│  │ (launcher)   │    │ Server :3000 │                │
│  └─────────────┘    └──────┬───────┘                │
│                            │                        │
│                     ┌──────┴───────┐                │
│                     │ SQLite DB    │                │
│                     │ offline.db   │                │
│                     └──────────────┘                │
└───────────────┬─────────────────────────────────────┘
                │ WiFi Hotspot
        ┌───────┴────────┐
        │                │
   ┌────┴────┐     ┌─────┴───┐
   │ HP Murid│     │ HP Murid│
   │ Browser │     │ Browser │
   └─────────┘     └─────────┘
```

**Alur data tiga fase:**

| Fase | Koneksi | Aksi |
|------|---------|------|
| 1. Download | 🌐 Online | Data Supabase → SQLite lokal |
| 2. Ujian | 📡 Offline | Murid mengerjakan via WiFi hotspot |
| 3. Upload | 🌐 Online | Hasil lokal → Supabase cloud |

---

## Alur Penggunaan

### Guru

1. **Pastikan internet aktif** untuk download data awal
2. **Klik 2x** `MULAI_UJIAN_OFFLINE.bat`
   - Auto-install dependencies (pertama kali)
   - Download data dari Supabase
   - Tampilkan QR code + IP address
3. **Nyalakan hotspot WiFi** di HP/laptop
4. **Monitor ujian** di `http://localhost:3000/teacher.html`
5. Selesai ujian → **Klik 2x** `UPLOAD_HASIL.bat`

### Murid

1. Konek ke WiFi hotspot guru
2. Buka browser → scan QR code atau ketik IP address
3. Login dengan NIS
4. Kerjakan kuis (ada timer) atau tugas
5. Lihat skor langsung setelah submit

---

## Struktur File

```
LMS-SEKOLAH-main/
├── MULAI_UJIAN_OFFLINE.bat    # Launcher utama (1 klik)
├── UPLOAD_HASIL.bat           # Upload hasil (1 klik)
│
└── offline/
    ├── server.js              # Express server + API + download
    ├── db.js                  # SQLite adapter + tabel
    ├── upload.js              # Sync hasil ke Supabase
    │
    ├── data/
    │   └── offline.db         # Database SQLite (auto-generated)
    │
    └── public/                # File yang diakses murid
        ├── index.html         # Halaman utama (login/dashboard/kuis/tugas)
        ├── teacher.html       # Panel monitoring guru
        ├── css/
        │   └── style.css      # Dark theme
        └── js/
            └── app.js         # Client-side logic
```

---

## Skema Database

### SQLite Lokal (`offline.db`)

| Tabel | Fungsi | Sumber |
|-------|--------|--------|
| `students` | Daftar murid (id, nis, nama, kelas) | Download dari Supabase |
| `quizzes` | Daftar kuis (judul, mapel, durasi) | Download dari Supabase |
| `quiz_questions` | Soal kuis (teks, opsi JSONB, jawaban benar) | Download dari Supabase |
| `assignments` | Daftar tugas | Download dari Supabase |
| `quiz_submissions` | Jawaban kuis murid + skor | Dibuat saat ujian |
| `assignment_submissions` | Jawaban tugas murid | Dibuat saat ujian |
| `sessions` | Token login murid | Dibuat saat login |
| `meta` | Metadata (timestamp download terakhir) | Auto |

### Perbedaan Kolom Supabase vs SQLite

> [!WARNING]
> Skema Supabase dan SQLite **tidak identik**. Yang paling kritis:

| Data | Supabase | SQLite Lokal |
|------|----------|--------------|
| Opsi soal | `options JSONB` (array: `["A","B","C","D"]`) | `options TEXT` (JSON string) |
| Urutan soal | `order_index INTEGER` | `order_index INTEGER` |
| Jawaban tugas | `answers JSONB` (array objek) | `answer_text TEXT` |
| Submit kuis | `student_id UUID` (FK) | `student_id TEXT` |

---

## API Endpoints

| Method | Endpoint | Auth | Fungsi |
|--------|----------|------|--------|
| POST | `/api/login` | ❌ | Login dengan NIS, return token |
| GET | `/api/quizzes` | ✅ | Daftar kuis + status submit |
| GET | `/api/quizzes/:id` | ✅ | Detail kuis + soal (tanpa jawaban benar) |
| POST | `/api/quizzes/:id/submit` | ✅ | Submit jawaban, scoring server-side |
| GET | `/api/assignments` | ✅ | Daftar tugas + status submit |
| POST | `/api/assignments/:id/submit` | ✅ | Submit jawaban tugas |
| GET | `/api/teacher/status` | ❌ | Statistik (jumlah murid, kuis, submission) |
| GET | `/api/teacher/results` | ❌ | Hasil kuis + tugas yang masuk |

---

## Keamanan

| Aspek | Proteksi |
|-------|----------|
| **Jawaban benar** | Tidak pernah dikirim ke browser — scoring di server |
| **Database file** | `express.static` hanya serve `public/` — `data/` tidak bisa diakses |
| **Session** | Token random per login, disimpan via header `x-session-token` |
| **Duplikat submit** | Server cek `UNIQUE(quiz_id, student_id)` sebelum insert |
| **Firewall** | `.bat` auto-buka port 3000 via `netsh advfirewall` |

---

## Troubleshooting

### Server tidak bisa diakses murid
- Pastikan **hotspot aktif** dan murid sudah konek
- Periksa IP address yang ditampilkan server
- Coba buka `http://[IP]:3000` di browser guru dulu
- Jika firewall memblokir: jalankan `.bat` sebagai **Administrator**

### 0 soal kuis didownload
- Periksa nama kolom di Supabase: harus `options` (bukan `option_a/b/c/d`)
- Pastikan kolom `order_index` ada (bukan `question_order`)
- Hapus `offline/data/offline.db` dan restart server

### Upload gagal 400
- Periksa nama kolom `student_submissions`: harus `answers` (JSONB), bukan `content`
- Kolom `source` tidak ada di Supabase — jangan dikirim
- Pastikan `.env.local` berisi `SUPABASE_SERVICE_ROLE_KEY` yang valid

---

## Development Notes: String Pattern Error

### Masalah

Saat murid klik kuis di browser, muncul error:
```
the string did not match the expected pattern
```

### Akar Masalah

Error ini berasal dari **Fetch API pada mobile browser** (terutama Safari/WebKit). Ketika `fetch()` dipanggil dengan **relative URL** (e.g. `/api/quizzes/uuid`), beberapa browser tidak bisa me-resolve URL relatif dengan benar jika halaman diakses via **IP address + port** (e.g. `http://172.20.10.2:3000`).

Secara teknis, browser memanggil `new URL(relativeUrl, baseUrl)` secara internal. Pada beberapa implementasi WebKit, kombinasi relative path + IP base URL memicu `TypeError: The string did not match the expected pattern`.

### Solusi

Gunakan **absolute URL** dengan `window.location.origin`:

```diff
- const API = '';
+ const API = window.location.origin;
```

Sehingga `fetch()` selalu menerima URL lengkap:
```
http://172.20.10.2:3000/api/quizzes/uuid
```

### Pencegahan Sejak Awal

> [!TIP]
> Jika kamu membangun fungsi `fetch()` wrapper untuk aplikasi yang akan diakses via IP lokal / WiFi tethering, ikuti checklist ini:

1. **Selalu gunakan absolute URL**
   ```javascript
   // ❌ Rawan error di mobile browser
   fetch('/api/endpoint')
   
   // ✅ Aman di semua browser
   fetch(window.location.origin + '/api/endpoint')
   ```

2. **Jangan set `Content-Type` pada GET request**
   ```javascript
   // ❌ Beberapa browser menolak Content-Type pada GET
   fetch(url, { headers: { 'Content-Type': 'application/json' } })
   
   // ✅ Hanya set Content-Type untuk POST/PUT
   const headers = {};
   if (method === 'POST') headers['Content-Type'] = 'application/json';
   ```

3. **Wrap `fetch()` dengan try-catch dan logging**
   ```javascript
   async function api(url, opts = {}) {
       const fullUrl = window.location.origin + url;
       try {
           const res = await fetch(fullUrl, opts);
           return await res.json();
       } catch (err) {
           console.error('Fetch failed:', fullUrl, err);
           throw err;
       }
   }
   ```

4. **Test di perangkat yang berbeda**
   - Chrome Desktop ✅ (relative URL biasanya OK)
   - Chrome Android ✅ (biasanya OK)
   - Safari iOS ⚠️ (paling sering bermasalah dengan relative URL + IP)
   - Samsung Internet ⚠️ (WebKit-based, bisa bermasalah)

5. **Hindari nested template literals di onclick HTML**
   ```javascript
   // ⚠️ Sulit di-debug kalau ada masalah escaping
   onclick="${condition ? `func('${id}')` : ''}"
   
   // ✅ Lebih aman: gunakan data attribute + event delegation
   // <div data-quiz-id="${id}">
   // document.addEventListener('click', e => {
   //     const id = e.target.closest('[data-quiz-id]')?.dataset.quizId;
   //     if (id) startQuiz(id);
   // });
   ```

### Ringkasan Root Cause

```
Mobile Browser (Safari/WebKit)
    └── fetch('/api/quizzes/uuid')          ← relative URL
        └── internal: new URL(path, base)   ← base = http://IP:port
            └── TypeError: string did not match expected pattern
                └── FIX: gunakan window.location.origin + path
```

---

## Daftar Pustaka

| Topik | Referensi |
|-------|-----------|
| Express.js | https://expressjs.com |
| better-sqlite3 | https://github.com/WiseLibs/better-sqlite3 |
| QR code terminal | https://github.com/gtanner/qrcode-terminal |
| Supabase REST API | https://supabase.com/docs/guides/api |
| WebKit fetch bug | Fetch API URL resolution dengan IP address |

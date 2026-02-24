-- ═══════════════════════════════════════════════════════════════
--  RESTORE TAHUN AJARAN YANG TIDAK SENGAJA DISELESAIKAN
-- ═══════════════════════════════════════════════════════════════
--  Jalankan di: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════╗
-- ║  LANGKAH 1: Cek semua tahun ajaran & statusnya   ║
-- ╚═══════════════════════════════════════════════════╝
-- Jalankan ini dulu untuk melihat daftar tahun ajaran
-- dan mencari ID tahun ajaran yang perlu di-restore.

SELECT id, name, status, is_active, start_date, end_date
FROM academic_years
ORDER BY start_date DESC;


-- ╔═══════════════════════════════════════════════════╗
-- ║  LANGKAH 2: Restore tahun ajaran                 ║
-- ╚═══════════════════════════════════════════════════╝
-- ⚠️ GANTI 'a1000000-0000-0000-0000-000000000001' dengan ID dari Langkah 1!

UPDATE academic_years
SET 
    status = 'ACTIVE',
    is_active = true,
    end_date = NULL
WHERE id = 'a1000000-0000-0000-0000-000000000001';
-- Contoh: WHERE id = 'abc123-def456-...';


-- ╔═══════════════════════════════════════════════════╗
-- ║  LANGKAH 3: Cek enrollment yang perlu di-restore ║
-- ╚═══════════════════════════════════════════════════╝
-- Lihat enrollment yang terkait tahun ajaran tersebut.
-- Jika statusnya BUKAN 'ACTIVE', mungkin perlu di-restore.

SELECT 
    se.id AS enrollment_id,
    u.full_name AS nama_siswa,
    c.name AS kelas,
    se.status AS enrollment_status,
    se.ended_at,
    ay.name AS tahun_ajaran
FROM student_enrollments se
JOIN students s ON se.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN classes c ON se.class_id = c.id
JOIN academic_years ay ON se.academic_year_id = ay.id
WHERE se.academic_year_id = 'a1000000-0000-0000-0000-000000000001'
ORDER BY c.name, u.full_name;


-- ╔═══════════════════════════════════════════════════╗
-- ║  LANGKAH 4: Restore enrollment siswa ke ACTIVE   ║
-- ╚═══════════════════════════════════════════════════╝
-- ⚠️ Jalankan INI hanya jika enrollment perlu di-restore!
-- Ini akan mengembalikan SEMUA enrollment tahun ajaran
-- tersebut yang berstatus selain ACTIVE.

UPDATE student_enrollments
SET 
    status = 'ACTIVE',
    ended_at = NULL,
    updated_at = NOW()
WHERE academic_year_id = 'a1000000-0000-0000-0000-000000000001'
  AND status != 'ACTIVE';


-- ╔═══════════════════════════════════════════════════╗
-- ║  LANGKAH 5: Verifikasi setelah restore           ║
-- ╚═══════════════════════════════════════════════════╝

-- Cek tahun ajaran sudah ACTIVE:
SELECT id, name, status, is_active FROM academic_years WHERE is_active = true;

-- Cek jumlah enrollment ACTIVE:
SELECT COUNT(*) AS total_enrollment_active
FROM student_enrollments
WHERE academic_year_id = 'ID_TAHUN_AJARAN' AND status = 'ACTIVE';

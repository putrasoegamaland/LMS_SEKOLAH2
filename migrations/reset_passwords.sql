-- ============================================
-- SCRIPT: Reset Password untuk Guru dan Siswa
-- Password: password123
-- ============================================

-- Hash bcrypt VALID untuk 'password123'
-- Generated using bcryptjs dengan salt rounds 10

-- Reset password semua GURU
UPDATE users 
SET password_hash = '$2b$10$Lq4Yql/ljua9T6HoF07PxubgnOBH8fSwRjRkOZdLs.NmHSMhTXj.m'
WHERE role = 'GURU';

-- Reset password semua SISWA  
UPDATE users 
SET password_hash = '$2b$10$Lq4Yql/ljua9T6HoF07PxubgnOBH8fSwRjRkOZdLs.NmHSMhTXj.m'
WHERE role = 'SISWA';

-- ============================================
-- INFO LOGIN
-- ============================================
-- 
-- GURU:
--   Username: guru1, guru2, guru3, ... (sesuai data di database)
--   Password: password123
--
-- SISWA:
--   Username: siswa01, siswa02, ... siswa50
--   Password: password123
--
-- ============================================

-- Verifikasi: Tampilkan semua user untuk referensi
SELECT username, full_name, role FROM users WHERE role IN ('GURU', 'SISWA') ORDER BY role, username;

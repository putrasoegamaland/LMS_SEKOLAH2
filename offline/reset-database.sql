-- ═══════════════════════════════════════════════════════════════
--  LMS SEKOLAH FULL DATABASE RESET (START FRESH)
-- ═══════════════════════════════════════════════════════════════
--  PERINGATAN KERAS 🚨🚨🚨
--  Menjalankan script ini akan MENGHAPUS SEMUA DATA TRANSAKSIONAL!
--  Hanya jalankan jika Anda benar-benar yakin ingin memulai dari awal.
-- ═══════════════════════════════════════════════════════════════

-- Data referensi utama (users, subjects) akan tetap dipertahankan? 
-- Berdasarkan kebutuhan "start fresh", kita akan hapus semua data 
-- KECUALI admin agar Anda tetap bisa login.

-- Matikan constraint checks sementara
SET session_replication_role = 'replica';

-- 1. HAPUS DATA NILAI & SUBMISSION (Leaf nodes)
DELETE FROM grades;
DELETE FROM student_submissions;
DELETE FROM quiz_submissions;
DELETE FROM exam_submissions;

-- 2. HAPUS DATA KONTEN (Questions & Materials)
DELETE FROM exam_questions;
DELETE FROM exams;
DELETE FROM quiz_questions;
DELETE FROM quizzes;
DELETE FROM assignments;
DELETE FROM materials;

-- 3. HAPUS DATA PENUGASAN (Teaching Assignments)
DELETE FROM teaching_assignments;

-- 4. HAPUS DATA ENROLLMENT & SISWA
DELETE FROM student_enrollments;
DELETE FROM students;

-- 5. HAPUS DATA KELAS & TAHUN AJARAN
DELETE FROM classes;
DELETE FROM academic_years;

-- 6. HAPUS DATA GURU
DELETE FROM teachers;

-- 7. HAPUS DATA MATA PELAJARAN
DELETE FROM subjects;

-- 8. HAPUS SEMUA USER KECUALI ADMIN
-- (Agar Anda tetap bisa login setelah reset)
DELETE FROM users WHERE role != 'ADMIN';

-- Kembalikan constraint checks ke normal
SET session_replication_role = 'origin';

-- ═══════════════════════════════════════════════════════════════
--  HASIL AKHIR:
--  Database kembali ke kondisi kosong, HANYA berisi akun Admin.
--  Anda harus menginput ulang:
--  1. Mata Pelajaran
--  2. Tahun Ajaran (Active)
--  3. Guru
--  4. Kelas
--  5. Siswa (baru bisa di-assign ke kelas)
-- ═══════════════════════════════════════════════════════════════

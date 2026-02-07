-- ============================================
-- SCRIPT: Reset Database & Create Dummy Data
-- 50 Siswa ONLY (Admin & Guru pakai yang sudah ada)
-- ============================================

-- ⚠️ WARNING: This will DELETE existing student data!

-- ============================================
-- STEP 1: DELETE EXISTING DATA (KECUALI Admin & Guru)
-- ============================================

-- Delete in reverse dependency order
DELETE FROM grades;
DELETE FROM student_submissions;
DELETE FROM quiz_submissions;
DELETE FROM quiz_questions;
DELETE FROM exam_submissions;
DELETE FROM exam_questions;
DELETE FROM materials;
DELETE FROM assignments;
DELETE FROM quizzes;
DELETE FROM exams;
DELETE FROM teaching_assignments;
DELETE FROM student_enrollments;
DELETE FROM students;
DELETE FROM classes;
DELETE FROM academic_years;
DELETE FROM subjects;
DELETE FROM notifications;
-- TIDAK hapus: users (admin, guru), teachers

-- Delete only siswa users
DELETE FROM users WHERE role = 'SISWA';

-- ============================================
-- STEP 2: CREATE ACADEMIC YEAR
-- ============================================

INSERT INTO academic_years (id, name, start_date, end_date, status, is_active)
VALUES (
    'a1000000-0000-0000-0000-000000000001',
    '2025/2026',
    '2025-07-14',
    NULL,
    'ACTIVE',
    true
);

-- ============================================
-- STEP 3: CREATE CLASSES
-- ============================================

-- SMP Classes (6 classes)
INSERT INTO classes (id, name, grade_level, school_level, academic_year_id) VALUES
('c1000000-0000-0000-0000-000000000001', 'VII-A', 1, 'SMP', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000002', 'VII-B', 1, 'SMP', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000003', 'VIII-A', 2, 'SMP', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000004', 'VIII-B', 2, 'SMP', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000005', 'IX-A', 3, 'SMP', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000006', 'IX-B', 3, 'SMP', 'a1000000-0000-0000-0000-000000000001'),
-- SMA Classes (6 classes)
('c1000000-0000-0000-0000-000000000007', 'X-A', 1, 'SMA', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000008', 'X-B', 1, 'SMA', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000009', 'XI-A', 2, 'SMA', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000010', 'XI-B', 2, 'SMA', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000011', 'XII-A', 3, 'SMA', 'a1000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000012', 'XII-B', 3, 'SMA', 'a1000000-0000-0000-0000-000000000001');

-- ============================================
-- STEP 4: CREATE SUBJECTS
-- ============================================

INSERT INTO subjects (id, name) VALUES
('b1000000-0000-0000-0000-000000000001', 'Matematika'),
('b1000000-0000-0000-0000-000000000002', 'Bahasa Indonesia'),
('b1000000-0000-0000-0000-000000000003', 'Bahasa Inggris'),
('b1000000-0000-0000-0000-000000000004', 'IPA'),
('b1000000-0000-0000-0000-000000000005', 'IPS');

-- ============================================
-- STEP 5: CREATE 50 STUDENTS
-- ============================================

-- Student Users (50)
INSERT INTO users (id, username, password_hash, full_name, role) VALUES
-- VII-A (5 students)
('f1000000-0000-0000-0000-000000000001', 'siswa01', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Ahmad Fadillah', 'SISWA'),
('f1000000-0000-0000-0000-000000000002', 'siswa02', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Putri Amelia', 'SISWA'),
('f1000000-0000-0000-0000-000000000003', 'siswa03', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Muhammad Rizki', 'SISWA'),
('f1000000-0000-0000-0000-000000000004', 'siswa04', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Siti Nurhaliza', 'SISWA'),
('f1000000-0000-0000-0000-000000000005', 'siswa05', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Dimas Pratama', 'SISWA'),
-- VII-B (4 students)
('f1000000-0000-0000-0000-000000000006', 'siswa06', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Rina Wulandari', 'SISWA'),
('f1000000-0000-0000-0000-000000000007', 'siswa07', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Bima Setiawan', 'SISWA'),
('f1000000-0000-0000-0000-000000000008', 'siswa08', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Anisa Rahma', 'SISWA'),
('f1000000-0000-0000-0000-000000000009', 'siswa09', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Fajar Nugroho', 'SISWA'),
-- VIII-A (4 students)
('f1000000-0000-0000-0000-000000000010', 'siswa10', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Indah Permata', 'SISWA'),
('f1000000-0000-0000-0000-000000000011', 'siswa11', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Yoga Aditya', 'SISWA'),
('f1000000-0000-0000-0000-000000000012', 'siswa12', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Nadia Safitri', 'SISWA'),
('f1000000-0000-0000-0000-000000000013', 'siswa13', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Bagus Prasetyo', 'SISWA'),
-- VIII-B (4 students)
('f1000000-0000-0000-0000-000000000014', 'siswa14', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Laila Azizah', 'SISWA'),
('f1000000-0000-0000-0000-000000000015', 'siswa15', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Eko Saputra', 'SISWA'),
('f1000000-0000-0000-0000-000000000016', 'siswa16', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Maya Sari', 'SISWA'),
('f1000000-0000-0000-0000-000000000017', 'siswa17', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Rizal Firmansyah', 'SISWA'),
-- IX-A (4 students)
('f1000000-0000-0000-0000-000000000018', 'siswa18', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Dian Puspita', 'SISWA'),
('f1000000-0000-0000-0000-000000000019', 'siswa19', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Hendro Wibowo', 'SISWA'),
('f1000000-0000-0000-0000-000000000020', 'siswa20', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Fitri Handayani', 'SISWA'),
('f1000000-0000-0000-0000-000000000021', 'siswa21', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Arif Rahman', 'SISWA'),
-- IX-B (4 students)
('f1000000-0000-0000-0000-000000000022', 'siswa22', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Citra Dewi', 'SISWA'),
('f1000000-0000-0000-0000-000000000023', 'siswa23', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Galih Prakoso', 'SISWA'),
('f1000000-0000-0000-0000-000000000024', 'siswa24', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Wulan Maharani', 'SISWA'),
('f1000000-0000-0000-0000-000000000025', 'siswa25', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Bayu Anggara', 'SISWA'),
-- X-A (4 students)
('f1000000-0000-0000-0000-000000000026', 'siswa26', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Sarah Amira', 'SISWA'),
('f1000000-0000-0000-0000-000000000027', 'siswa27', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Andi Kurniawan', 'SISWA'),
('f1000000-0000-0000-0000-000000000028', 'siswa28', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Ratna Sari', 'SISWA'),
('f1000000-0000-0000-0000-000000000029', 'siswa29', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Denny Pradipta', 'SISWA'),
-- X-B (4 students)
('f1000000-0000-0000-0000-000000000030', 'siswa30', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Linda Kusuma', 'SISWA'),
('f1000000-0000-0000-0000-000000000031', 'siswa31', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Faisal Akbar', 'SISWA'),
('f1000000-0000-0000-0000-000000000032', 'siswa32', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Mega Purnama', 'SISWA'),
('f1000000-0000-0000-0000-000000000033', 'siswa33', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Hendra Gunawan', 'SISWA'),
-- XI-A (4 students)
('f1000000-0000-0000-0000-000000000034', 'siswa34', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Tika Melati', 'SISWA'),
('f1000000-0000-0000-0000-000000000035', 'siswa35', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Agus Supriyadi', 'SISWA'),
('f1000000-0000-0000-0000-000000000036', 'siswa36', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Bunga Citra', 'SISWA'),
('f1000000-0000-0000-0000-000000000037', 'siswa37', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Kevin Ramadhan', 'SISWA'),
-- XI-B (4 students)
('f1000000-0000-0000-0000-000000000038', 'siswa38', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Sinta Dewi', 'SISWA'),
('f1000000-0000-0000-0000-000000000039', 'siswa39', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Omar Fadhil', 'SISWA'),
('f1000000-0000-0000-0000-000000000040', 'siswa40', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Aulia Zahra', 'SISWA'),
('f1000000-0000-0000-0000-000000000041', 'siswa41', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Rendi Saputra', 'SISWA'),
-- XII-A (5 students)
('f1000000-0000-0000-0000-000000000042', 'siswa42', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Nabila Putri', 'SISWA'),
('f1000000-0000-0000-0000-000000000043', 'siswa43', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Joko Widodo', 'SISWA'),
('f1000000-0000-0000-0000-000000000044', 'siswa44', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Kartika Sari', 'SISWA'),
('f1000000-0000-0000-0000-000000000045', 'siswa45', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Lukman Hakim', 'SISWA'),
('f1000000-0000-0000-0000-000000000046', 'siswa46', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Yuni Astuti', 'SISWA'),
-- XII-B (4 students)
('f1000000-0000-0000-0000-000000000047', 'siswa47', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Taufik Hidayat', 'SISWA'),
('f1000000-0000-0000-0000-000000000048', 'siswa48', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Ria Novita', 'SISWA'),
('f1000000-0000-0000-0000-000000000049', 'siswa49', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Beni Santoso', 'SISWA'),
('f1000000-0000-0000-0000-000000000050', 'siswa50', '$2a$10$abcdefabcdefabcdefabce.abcdefabcdefabcdefabcdefabcdefab', 'Dewi Kartika', 'SISWA');

-- Student Records (50)
INSERT INTO students (id, user_id, nis, class_id, angkatan, entry_year, school_level, status) VALUES
-- VII-A (angkatan 2025)
('11000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '25001', 'c1000000-0000-0000-0000-000000000001', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', '25002', 'c1000000-0000-0000-0000-000000000001', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', '25003', 'c1000000-0000-0000-0000-000000000001', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000004', '25004', 'c1000000-0000-0000-0000-000000000001', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000005', '25005', 'c1000000-0000-0000-0000-000000000001', '2025', 2025, 'SMP', 'ACTIVE'),
-- VII-B (angkatan 2025)
('11000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', '25006', 'c1000000-0000-0000-0000-000000000002', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', '25007', 'c1000000-0000-0000-0000-000000000002', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', '25008', 'c1000000-0000-0000-0000-000000000002', '2025', 2025, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', '25009', 'c1000000-0000-0000-0000-000000000002', '2025', 2025, 'SMP', 'ACTIVE'),
-- VIII-A (angkatan 2024)
('11000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010', '24001', 'c1000000-0000-0000-0000-000000000003', '2024', 2024, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000011', '24002', 'c1000000-0000-0000-0000-000000000003', '2024', 2024, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000012', '24003', 'c1000000-0000-0000-0000-000000000003', '2024', 2024, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000013', 'f1000000-0000-0000-0000-000000000013', '24004', 'c1000000-0000-0000-0000-000000000003', '2024', 2024, 'SMP', 'ACTIVE'),
-- VIII-B (angkatan 2024)
('11000000-0000-0000-0000-000000000014', 'f1000000-0000-0000-0000-000000000014', '24005', 'c1000000-0000-0000-0000-000000000004', '2024', 2024, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000015', 'f1000000-0000-0000-0000-000000000015', '24006', 'c1000000-0000-0000-0000-000000000004', '2024', 2024, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000016', 'f1000000-0000-0000-0000-000000000016', '24007', 'c1000000-0000-0000-0000-000000000004', '2024', 2024, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000017', 'f1000000-0000-0000-0000-000000000017', '24008', 'c1000000-0000-0000-0000-000000000004', '2024', 2024, 'SMP', 'ACTIVE'),
-- IX-A (angkatan 2023)
('11000000-0000-0000-0000-000000000018', 'f1000000-0000-0000-0000-000000000018', '23001', 'c1000000-0000-0000-0000-000000000005', '2023', 2023, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000019', 'f1000000-0000-0000-0000-000000000019', '23002', 'c1000000-0000-0000-0000-000000000005', '2023', 2023, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000020', 'f1000000-0000-0000-0000-000000000020', '23003', 'c1000000-0000-0000-0000-000000000005', '2023', 2023, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000021', 'f1000000-0000-0000-0000-000000000021', '23004', 'c1000000-0000-0000-0000-000000000005', '2023', 2023, 'SMP', 'ACTIVE'),
-- IX-B (angkatan 2023)
('11000000-0000-0000-0000-000000000022', 'f1000000-0000-0000-0000-000000000022', '23005', 'c1000000-0000-0000-0000-000000000006', '2023', 2023, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000023', 'f1000000-0000-0000-0000-000000000023', '23006', 'c1000000-0000-0000-0000-000000000006', '2023', 2023, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000024', 'f1000000-0000-0000-0000-000000000024', '23007', 'c1000000-0000-0000-0000-000000000006', '2023', 2023, 'SMP', 'ACTIVE'),
('11000000-0000-0000-0000-000000000025', 'f1000000-0000-0000-0000-000000000025', '23008', 'c1000000-0000-0000-0000-000000000006', '2023', 2023, 'SMP', 'ACTIVE'),
-- X-A (angkatan 2025, SMA)
('11000000-0000-0000-0000-000000000026', 'f1000000-0000-0000-0000-000000000026', 'A25001', 'c1000000-0000-0000-0000-000000000007', '2025', 2025, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000027', 'f1000000-0000-0000-0000-000000000027', 'A25002', 'c1000000-0000-0000-0000-000000000007', '2025', 2025, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000028', 'f1000000-0000-0000-0000-000000000028', 'A25003', 'c1000000-0000-0000-0000-000000000007', '2025', 2025, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000029', 'f1000000-0000-0000-0000-000000000029', 'A25004', 'c1000000-0000-0000-0000-000000000007', '2025', 2025, 'SMA', 'ACTIVE'),
-- X-B (angkatan 2025)
('11000000-0000-0000-0000-000000000030', 'f1000000-0000-0000-0000-000000000030', 'A25005', 'c1000000-0000-0000-0000-000000000008', '2025', 2025, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000031', 'f1000000-0000-0000-0000-000000000031', 'A25006', 'c1000000-0000-0000-0000-000000000008', '2025', 2025, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000032', 'f1000000-0000-0000-0000-000000000032', 'A25007', 'c1000000-0000-0000-0000-000000000008', '2025', 2025, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000033', 'f1000000-0000-0000-0000-000000000033', 'A25008', 'c1000000-0000-0000-0000-000000000008', '2025', 2025, 'SMA', 'ACTIVE'),
-- XI-A (angkatan 2024)
('11000000-0000-0000-0000-000000000034', 'f1000000-0000-0000-0000-000000000034', 'A24001', 'c1000000-0000-0000-0000-000000000009', '2024', 2024, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000035', 'f1000000-0000-0000-0000-000000000035', 'A24002', 'c1000000-0000-0000-0000-000000000009', '2024', 2024, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000036', 'f1000000-0000-0000-0000-000000000036', 'A24003', 'c1000000-0000-0000-0000-000000000009', '2024', 2024, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000037', 'f1000000-0000-0000-0000-000000000037', 'A24004', 'c1000000-0000-0000-0000-000000000009', '2024', 2024, 'SMA', 'ACTIVE'),
-- XI-B (angkatan 2024)
('11000000-0000-0000-0000-000000000038', 'f1000000-0000-0000-0000-000000000038', 'A24005', 'c1000000-0000-0000-0000-000000000010', '2024', 2024, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000039', 'f1000000-0000-0000-0000-000000000039', 'A24006', 'c1000000-0000-0000-0000-000000000010', '2024', 2024, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000040', 'f1000000-0000-0000-0000-000000000040', 'A24007', 'c1000000-0000-0000-0000-000000000010', '2024', 2024, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000041', 'f1000000-0000-0000-0000-000000000041', 'A24008', 'c1000000-0000-0000-0000-000000000010', '2024', 2024, 'SMA', 'ACTIVE'),
-- XII-A (angkatan 2023)
('11000000-0000-0000-0000-000000000042', 'f1000000-0000-0000-0000-000000000042', 'A23001', 'c1000000-0000-0000-0000-000000000011', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000043', 'f1000000-0000-0000-0000-000000000043', 'A23002', 'c1000000-0000-0000-0000-000000000011', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000044', 'f1000000-0000-0000-0000-000000000044', 'A23003', 'c1000000-0000-0000-0000-000000000011', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000045', 'f1000000-0000-0000-0000-000000000045', 'A23004', 'c1000000-0000-0000-0000-000000000011', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000046', 'f1000000-0000-0000-0000-000000000046', 'A23005', 'c1000000-0000-0000-0000-000000000011', '2023', 2023, 'SMA', 'ACTIVE'),
-- XII-B (angkatan 2023)
('11000000-0000-0000-0000-000000000047', 'f1000000-0000-0000-0000-000000000047', 'A23006', 'c1000000-0000-0000-0000-000000000012', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000048', 'f1000000-0000-0000-0000-000000000048', 'A23007', 'c1000000-0000-0000-0000-000000000012', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000049', 'f1000000-0000-0000-0000-000000000049', 'A23008', 'c1000000-0000-0000-0000-000000000012', '2023', 2023, 'SMA', 'ACTIVE'),
('11000000-0000-0000-0000-000000000050', 'f1000000-0000-0000-0000-000000000050', 'A23009', 'c1000000-0000-0000-0000-000000000012', '2023', 2023, 'SMA', 'ACTIVE');

-- ============================================
-- NOTE: Teaching assignments tidak dibuat
-- karena membutuhkan ID guru yang sudah ada.
-- Buat penugasan mengajar secara manual via UI.
-- ============================================

-- ============================================
-- SUMMARY
-- ============================================
-- Admin & Guru: TETAP (tidak diubah)
-- Siswa: 50 siswa baru (password hash dummy)
-- Tahun Ajaran: 2025/2026 (Aktif)
-- Kelas: 12 kelas (6 SMP + 6 SMA)
-- Mata Pelajaran: 5 mapel
-- ============================================

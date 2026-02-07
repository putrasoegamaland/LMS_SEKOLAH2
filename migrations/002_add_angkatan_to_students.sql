-- Migration: Add angkatan (cohort) fields to students table
-- Date: 2026-02-06
-- Description: Add angkatan, entry_year, and school_level to track student cohorts

-- Step 1: Add angkatan field (e.g., "2020", "2021", "2022")
ALTER TABLE students ADD COLUMN IF NOT EXISTS angkatan VARCHAR(10);

-- Step 2: Add entry_year field (year when student entered school)
ALTER TABLE students ADD COLUMN IF NOT EXISTS entry_year INT;

-- Step 3: Add school_level field (SMP or SMA) to students
-- Note: This is the student's current school level, may change if they transition from SMP to SMA
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_level VARCHAR(10);

-- Step 4: Add check constraint for school_level
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_student_school_level'
    ) THEN
        ALTER TABLE students ADD CONSTRAINT check_student_school_level 
            CHECK (school_level IS NULL OR school_level IN ('SMP', 'SMA'));
    END IF;
END $$;

-- Step 5: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_students_angkatan ON students(angkatan);
CREATE INDEX IF NOT EXISTS idx_students_entry_year ON students(entry_year);
CREATE INDEX IF NOT EXISTS idx_students_school_level ON students(school_level);

-- Step 6: Add documentation comments
COMMENT ON COLUMN students.angkatan IS 'Angkatan siswa (tahun masuk), contoh: 2020, 2021, 2022';
COMMENT ON COLUMN students.entry_year IS 'Tahun masuk siswa (integer)';
COMMENT ON COLUMN students.school_level IS 'Level sekolah saat ini: SMP atau SMA';

-- Note: Run this migration in Supabase SQL Editor
-- After running, verify with: SELECT id, nis, angkatan, entry_year, school_level FROM students LIMIT 5;

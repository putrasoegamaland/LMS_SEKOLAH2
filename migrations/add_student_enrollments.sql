-- Migration: Create student_enrollments table for history tracking
-- Date: 2026-02-05
-- Description: Add enrollment history tracking to support student lifecycle management
--              (promotions, graduations, retentions, transfers)

-- Step 1: Create student_enrollments table
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  enrolled_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON student_enrollments(class_id);
CREATE INDEX idx_enrollments_year ON student_enrollments(academic_year_id);
CREATE INDEX idx_enrollments_status ON student_enrollments(status);

-- Step 3: Create unique constraint - one ACTIVE enrollment per student
CREATE UNIQUE INDEX idx_enrollments_active 
  ON student_enrollments(student_id) 
  WHERE status = 'ACTIVE';

-- Step 4: Add check constraint for valid status values
ALTER TABLE student_enrollments ADD CONSTRAINT check_enrollment_status 
  CHECK (status IN ('ACTIVE', 'PROMOTED', 'GRADUATED', 'RETAINED', 'TRANSFERRED_OUT'));

-- Step 5: Add comments for documentation
COMMENT ON TABLE student_enrollments IS 'Tracks student enrollment history across academic years and classes for lifecycle management';
COMMENT ON COLUMN student_enrollments.status IS 'Enrollment status: ACTIVE (currently enrolled), PROMOTED (moved to next grade), GRADUATED (completed level), RETAINED (repeated same grade), TRANSFERRED_OUT (left school)';
COMMENT ON COLUMN student_enrollments.student_id IS 'Reference to student';
COMMENT ON COLUMN student_enrollments.class_id IS 'Reference to class enrolled in';
COMMENT ON COLUMN student_enrollments.academic_year_id IS 'Reference to academic year';
COMMENT ON COLUMN student_enrollments.enrolled_at IS 'When student was enrolled in this class';
COMMENT ON COLUMN student_enrollments.ended_at IS 'When enrollment ended (for non-ACTIVE statuses)';
COMMENT ON COLUMN student_enrollments.notes IS 'Optional notes about this enrollment (reason for retention, graduation honors, etc)';

-- Step 6: Add status column to students table for quick filtering
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- Step 7: Add check constraint for student status
ALTER TABLE students ADD CONSTRAINT check_student_status 
  CHECK (status IN ('ACTIVE', 'GRADUATED', 'TRANSFERRED_OUT', 'INACTIVE'));

-- Step 8: Create index on student status
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- Step 9: Add comment
COMMENT ON COLUMN students.status IS 'Current student status: ACTIVE (enrolled), GRADUATED (completed education), TRANSFERRED_OUT (left school), INACTIVE (suspended/other)';

-- Step 10: Optional - Create initial enrollments for existing students
-- Run this manually if you want to create history for existing students
-- This will create an ACTIVE enrollment for all students who have a class_id

/*
INSERT INTO student_enrollments (student_id, class_id, academic_year_id, status, notes)
SELECT 
  s.id AS student_id,
  s.class_id,
  c.academic_year_id,
  'ACTIVE' AS status,
  'Initial enrollment created during migration' AS notes
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.class_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_enrollments se 
    WHERE se.student_id = s.id AND se.status = 'ACTIVE'
  );
*/

-- Note: After running this migration:
-- 1. All new student assignments should create an enrollment record
-- 2. Promotions should end old enrollment and create new one
-- 3. Graduations should end enrollment and update student status

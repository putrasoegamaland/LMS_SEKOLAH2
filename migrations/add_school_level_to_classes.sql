-- Migration: Add school_level to classes table
-- Date: 2026-02-05
-- Description: Add school_level column to distinguish between SMP and SMA

-- Step 1: Add column
ALTER TABLE classes ADD COLUMN school_level VARCHAR(10);

-- Step 2: Add comment
COMMENT ON COLUMN classes.school_level IS 'School level: SMP (Sekolah Menengah Pertama - Grades 7-9) or SMA (Sekolah Menengah Atas - Grades 10-12)';

-- Step 3: Create index for better query performance
CREATE INDEX idx_classes_school_level ON classes(school_level);

-- Step 4: Add constraint to ensure valid values
ALTER TABLE classes ADD CONSTRAINT check_school_level 
  CHECK (school_level IN ('SMP', 'SMA') OR school_level IS NULL);

-- Step 5: Optional - Auto-detect and update existing data based on class name patterns
-- Uncomment and run manually if you want automatic migration:

-- Auto-detect SMP classes (containing 7, 8, 9, VII, VIII, IX)
-- UPDATE classes SET school_level = 'SMP' 
-- WHERE school_level IS NULL 
--   AND (name ~* '(^|[^0-9])7([^0-9]|$)' 
--     OR name ~* '(^|[^0-9])8([^0-9]|$)' 
--     OR name ~* '(^|[^0-9])9([^0-9]|$)'
--     OR name ~* 'VII[^I]'
--     OR name ~* 'VIII'
--     OR name ~* 'IX[^I]');

-- Auto-detect SMA classes (containing 10, 11, 12, X (not XI or XII), XI, XII)
-- UPDATE classes SET school_level = 'SMA' 
-- WHERE school_level IS NULL 
--   AND (name ~* '10' 
--     OR name ~* '11' 
--     OR name ~* '12'
--     OR name ~* 'X[^I]'
--     OR name ~* 'XI[^I]'
--     OR name ~* 'XII');

-- Note: Review class names and run UPDATE manually, or set via Admin UI

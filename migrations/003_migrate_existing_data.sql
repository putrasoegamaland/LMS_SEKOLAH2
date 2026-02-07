-- Migration: Migrate existing student data to populate angkatan fields
-- Date: 2026-02-06
-- Description: Auto-populate angkatan, entry_year, and school_level for existing students

-- Run this AFTER the schema migrations (001 and 002)

-- Step 1: Update students with angkatan based on their current class info
-- Logic: 
--   - entry_year = current academic year - grade_level + 1 (estimated entry year)
--   - angkatan = entry_year as string
--   - school_level = class school_level

UPDATE students s
SET 
    school_level = c.school_level,
    entry_year = CASE 
        WHEN c.grade_level IS NOT NULL AND ay.name IS NOT NULL THEN 
            -- Extract first year from academic year name (e.g., "2024/2025" -> 2024)
            -- Then subtract grade_level and add 1 to get entry year
            CAST(SUBSTRING(ay.name FROM 1 FOR 4) AS INT) - c.grade_level + 1
        ELSE NULL
    END,
    angkatan = CASE 
        WHEN c.grade_level IS NOT NULL AND ay.name IS NOT NULL THEN 
            CAST(CAST(SUBSTRING(ay.name FROM 1 FOR 4) AS INT) - c.grade_level + 1 AS TEXT)
        ELSE NULL
    END
FROM classes c
LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
WHERE s.class_id = c.id
  AND s.angkatan IS NULL;

-- Step 2: For students without class (not enrolled), leave angkatan null
-- They will need to be manually assigned

-- Step 3: Log summary of migration
DO $$
DECLARE
    total_students INTEGER;
    migrated_students INTEGER;
    missing_students INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_students FROM students;
    SELECT COUNT(*) INTO migrated_students FROM students WHERE angkatan IS NOT NULL;
    SELECT COUNT(*) INTO missing_students FROM students WHERE angkatan IS NULL;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Total students: %', total_students;
    RAISE NOTICE '- Students with angkatan: %', migrated_students;
    RAISE NOTICE '- Students without angkatan: %', missing_students;
END $$;

-- Verification query (run manually to check results)
-- SELECT 
--     s.id,
--     u.full_name,
--     s.angkatan,
--     s.entry_year,
--     s.school_level,
--     c.name as class_name,
--     c.grade_level,
--     c.school_level as class_school_level,
--     ay.name as academic_year
-- FROM students s
-- LEFT JOIN users u ON s.user_id = u.id
-- LEFT JOIN classes c ON s.class_id = c.id
-- LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
-- ORDER BY s.angkatan, c.school_level, c.grade_level, c.name;

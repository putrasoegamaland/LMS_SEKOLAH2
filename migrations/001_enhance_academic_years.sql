-- Migration: Enhance academic_years table with dates and status
-- Date: 2026-02-06
-- Description: Add start_date, end_date, and status fields for better academic year management

-- Step 1: Add date fields
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS end_date DATE;

-- Step 2: Add status field (PLANNED, ACTIVE, COMPLETED)
-- Note: We keep is_active for backward compatibility
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PLANNED';

-- Step 3: Add check constraint for status values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_academic_year_status'
    ) THEN
        ALTER TABLE academic_years ADD CONSTRAINT check_academic_year_status 
            CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED'));
    END IF;
END $$;

-- Step 4: Create index for status column
CREATE INDEX IF NOT EXISTS idx_academic_years_status ON academic_years(status);
CREATE INDEX IF NOT EXISTS idx_academic_years_start_date ON academic_years(start_date);

-- Step 5: Add documentation comments
COMMENT ON COLUMN academic_years.start_date IS 'Tanggal mulai tahun ajaran';
COMMENT ON COLUMN academic_years.end_date IS 'Tanggal selesai tahun ajaran (diisi saat tahun ajaran diselesaikan)';
COMMENT ON COLUMN academic_years.status IS 'Status tahun ajaran: PLANNED (direncanakan), ACTIVE (sedang berjalan), COMPLETED (selesai)';

-- Step 6: Migrate existing data - sync status with is_active
UPDATE academic_years
SET status = CASE 
    WHEN is_active = true THEN 'ACTIVE'
    ELSE 'PLANNED'
END
WHERE status IS NULL OR status = 'PLANNED';

-- Note: Run this migration in Supabase SQL Editor
-- After running, verify with: SELECT * FROM academic_years;

-- Migration: Update valid_type constraint on notifications table
-- This allows new notification types for HOTS review and Auto-Publish features.

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_type;

-- Add the new constraint with additional types
ALTER TABLE notifications ADD CONSTRAINT valid_type CHECK (type IN (
    'TUGAS_BARU',
    'KUIS_BARU', 
    'ULANGAN_BARU',
    'NILAI_KELUAR',
    'SUBMISSION_BARU',
    'DEADLINE_REMINDER',
    'PENGUMUMAN',
    'HOTS_REVIEW',
    'SYSTEM'
));

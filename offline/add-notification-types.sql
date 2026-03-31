-- Migration: Add UJIAN_RESMI and EXAM_REMINDER to notifications valid_type constraint
-- These types are used when admin creates UTS/UAS and for auto-reminders.

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_type;

-- Add the new constraint with official exam notification types
ALTER TABLE notifications ADD CONSTRAINT valid_type CHECK (type IN (
    'TUGAS_BARU',
    'KUIS_BARU', 
    'ULANGAN_BARU',
    'NILAI_KELUAR',
    'SUBMISSION_BARU',
    'DEADLINE_REMINDER',
    'PENGUMUMAN',
    'HOTS_REVIEW',
    'SYSTEM',
    'UJIAN_RESMI',
    'EXAM_REMINDER'
));

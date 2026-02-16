-- Fix: Add missing status + teacher_hots_claim columns
-- Run this if add_hots_qc.sql was run BEFORE quiz_schema.sql / exam_schema.sql

ALTER TABLE question_bank 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

ALTER TABLE quiz_questions 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

ALTER TABLE exam_questions 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

-- Backfill existing questions
UPDATE question_bank SET status = 'approved' WHERE status IS NULL;
UPDATE quiz_questions SET status = 'approved' WHERE status IS NULL;
UPDATE exam_questions SET status = 'approved' WHERE status IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_status ON question_bank(status);
CREATE INDEX IF NOT EXISTS idx_qq_status ON quiz_questions(status);
CREATE INDEX IF NOT EXISTS idx_eq_status ON exam_questions(status);

-- Migration: Add passage_text to exam_questions table
-- This mirrors the same column in quiz_questions

-- Add passage_text column to exam_questions
ALTER TABLE exam_questions
ADD COLUMN IF NOT EXISTS passage_text TEXT;

-- Add comment
COMMENT ON COLUMN exam_questions.passage_text IS 'Optional passage/reading text that accompanies the question';

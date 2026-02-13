-- Migration: Add passage_text to quiz_questions table
-- This allows passage text to be stored with quiz questions
-- Run this in Supabase SQL Editor

-- Add passage_text column to quiz_questions
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS passage_text TEXT;

-- Comment
COMMENT ON COLUMN quiz_questions.passage_text IS 'Optional passage/reading text that accompanies the question';

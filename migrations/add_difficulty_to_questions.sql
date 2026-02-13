-- Migration: Add difficulty column to quiz_questions and exam_questions tables
-- Run this in Supabase SQL Editor

-- Add difficulty column to quiz_questions
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD'));

COMMENT ON COLUMN quiz_questions.difficulty IS 'Question difficulty level: EASY, MEDIUM, or HARD';

-- Add difficulty column to exam_questions
ALTER TABLE exam_questions 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD'));

COMMENT ON COLUMN exam_questions.difficulty IS 'Question difficulty level: EASY, MEDIUM, or HARD';

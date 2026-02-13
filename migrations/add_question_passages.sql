-- Migration: Add question_passages table for reading comprehension
-- Run this in Supabase SQL Editor

-- Create passages table
CREATE TABLE IF NOT EXISTS question_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    passage_text TEXT NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add passage_id to question_bank
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS passage_id UUID REFERENCES question_passages(id) ON DELETE SET NULL;

-- Add order_in_passage for maintaining question order within a passage
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS order_in_passage INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_question_bank_passage_id ON question_bank(passage_id);
CREATE INDEX IF NOT EXISTS idx_question_passages_teacher_id ON question_passages(teacher_id);

-- Enable RLS
ALTER TABLE question_passages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can manage their own passages
CREATE POLICY "Teachers can manage own passages" ON question_passages
    FOR ALL USING (
        teacher_id IN (
            SELECT id FROM teachers WHERE user_id = auth.uid()
        )
    );

-- Comment
COMMENT ON TABLE question_passages IS 'Stores passage/reading comprehension texts that can have multiple related questions';

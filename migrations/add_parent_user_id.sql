-- Migration: Add parent_user_id to students table
-- Run this in Supabase SQL Editor

-- 1. Add the column
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_parent_user_id ON students(parent_user_id);

-- 3. RLS policy: Allow WALI users to read their own children's data
-- (This is optional if you rely on API-level filtering, but recommended for defense-in-depth)

-- Migration: HOTS/Bloom QC System
-- Description: Add AI quality control tables and columns for HOTS analysis
-- Date: 2026-02-14

-- ============================================================
-- 1. ALTER existing question tables: add status + teacher_hots_claim
-- ============================================================

-- question_bank
ALTER TABLE question_bank 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

-- quiz_questions
ALTER TABLE quiz_questions 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

-- exam_questions
ALTER TABLE exam_questions 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

-- Set existing questions to 'approved' (backward compatible)
UPDATE question_bank SET status = 'approved' WHERE status IS NULL;
UPDATE quiz_questions SET status = 'approved' WHERE status IS NULL;
UPDATE exam_questions SET status = 'approved' WHERE status IS NULL;

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS idx_qb_status ON question_bank(status);
CREATE INDEX IF NOT EXISTS idx_qq_status ON quiz_questions(status);
CREATE INDEX IF NOT EXISTS idx_eq_status ON exam_questions(status);

-- ============================================================
-- 2. CREATE ai_reviews table (polymorphic, supports all 3 question tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Polymorphic reference: which table + which question
    question_source VARCHAR(20) NOT NULL,  -- 'bank', 'quiz', 'exam'
    question_id UUID NOT NULL,
    
    -- Bloom's Taxonomy (1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create)
    primary_bloom_level INTEGER CHECK (primary_bloom_level BETWEEN 1 AND 6),
    secondary_bloom_levels INTEGER[],
    
    -- HOTS Analysis
    hots_flag BOOLEAN DEFAULT FALSE,
    hots_strength VARCHAR(2) CHECK (hots_strength IN ('S0', 'S1', 'S2')),
    hots_signals TEXT[],
    
    -- Boundedness (B0=closed, B1=partially open, B2=open-ended)
    boundedness VARCHAR(2) CHECK (boundedness IN ('B0', 'B1', 'B2')),
    
    -- Difficulty (AI-computed)
    difficulty_score INTEGER CHECK (difficulty_score BETWEEN 0 AND 10),
    difficulty_label VARCHAR(10),  -- 'easy', 'medium', 'hard'
    difficulty_reasons TEXT[],
    
    -- Quality Metrics
    clarity_score INTEGER CHECK (clarity_score BETWEEN 0 AND 100),
    ambiguity_flags TEXT[],
    missing_info_flags TEXT[],
    grade_fit_flags TEXT[],
    
    -- Subject Alignment
    subject_match_score INTEGER CHECK (subject_match_score BETWEEN 0 AND 100),
    
    -- Suggested Edits
    suggested_edits JSONB,
    
    -- Confidence Scores (0.00 - 1.00)
    bloom_confidence DECIMAL(3,2),
    hots_confidence DECIMAL(3,2),
    difficulty_confidence DECIMAL(3,2),
    boundedness_confidence DECIMAL(3,2),
    
    -- Full JSON report from AI
    full_json_report JSONB,
    model_version VARCHAR(20) DEFAULT 'qc-v1',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_source ON ai_reviews(question_source, question_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_bloom ON ai_reviews(primary_bloom_level);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_hots ON ai_reviews(hots_flag);

-- ============================================================
-- 3. CREATE admin_reviews table
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Polymorphic reference
    question_source VARCHAR(20) NOT NULL,  -- 'bank', 'quiz', 'exam'
    question_id UUID NOT NULL,
    
    -- Reviewer
    reviewer_id UUID REFERENCES users(id),
    
    -- Decision
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approve', 'return', 'archive')),
    
    -- Override AI results (optional)
    override_bloom INTEGER CHECK (override_bloom IS NULL OR override_bloom BETWEEN 1 AND 6),
    override_hots_strength VARCHAR(2) CHECK (override_hots_strength IS NULL OR override_hots_strength IN ('S0', 'S1', 'S2')),
    override_difficulty VARCHAR(10),
    override_boundedness VARCHAR(2) CHECK (override_boundedness IS NULL OR override_boundedness IN ('B0', 'B1', 'B2')),
    
    -- Notes
    notes TEXT,
    return_reasons TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_reviews_source ON admin_reviews(question_source, question_id);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_reviewer ON admin_reviews(reviewer_id);

-- ============================================================
-- 4. Comments for documentation
-- ============================================================

COMMENT ON TABLE ai_reviews IS 'AI quality control reviews for questions (HOTS/Bloom analysis)';
COMMENT ON COLUMN ai_reviews.question_source IS 'Source table: bank (question_bank), quiz (quiz_questions), exam (exam_questions)';
COMMENT ON COLUMN ai_reviews.primary_bloom_level IS 'Primary Bloom level: 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create';
COMMENT ON COLUMN ai_reviews.hots_strength IS 'HOTS strength: S0=not HOTS, S1=moderate HOTS, S2=strong HOTS';
COMMENT ON COLUMN ai_reviews.boundedness IS 'Question openness: B0=closed, B1=partially open, B2=open-ended';

COMMENT ON TABLE admin_reviews IS 'Admin decisions on AI-reviewed questions';
COMMENT ON COLUMN admin_reviews.decision IS 'Admin decision: approve, return (to teacher), archive';

-- ============================================================
-- Verification queries (run after migration)
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'question_bank' AND column_name IN ('status', 'teacher_hots_claim');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_reviews';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_reviews';

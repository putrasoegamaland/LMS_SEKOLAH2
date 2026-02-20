-- Add KKM to subjects
ALTER TABLE subjects ADD COLUMN kkm INTEGER DEFAULT 75;

-- Add remedial fields to quizzes
ALTER TABLE quizzes ADD COLUMN is_remedial BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN remedial_for_id UUID REFERENCES quizzes(id) ON DELETE SET NULL;
ALTER TABLE quizzes ADD COLUMN allowed_student_ids UUID[] DEFAULT NULL;

-- Add remedial fields to exams
ALTER TABLE exams ADD COLUMN is_remedial BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN remedial_for_id UUID REFERENCES exams(id) ON DELETE SET NULL;
ALTER TABLE exams ADD COLUMN allowed_student_ids UUID[] DEFAULT NULL;

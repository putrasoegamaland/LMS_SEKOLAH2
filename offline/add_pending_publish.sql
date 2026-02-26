ALTER TABLE quizzes ADD COLUMN pending_publish BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN pending_publish BOOLEAN DEFAULT false;

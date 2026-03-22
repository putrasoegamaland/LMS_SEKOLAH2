-- Add passage_audio_url column to official_exam_questions table
-- (This was previously added to quiz_questions and exam_questions in 010_listening_audio.sql but missed for official_exam_questions)
ALTER TABLE official_exam_questions ADD COLUMN IF NOT EXISTS passage_audio_url TEXT DEFAULT NULL;

COMMENT ON COLUMN official_exam_questions.passage_audio_url IS 'URL to audio file for listening comprehension passages in UTS/UAS';

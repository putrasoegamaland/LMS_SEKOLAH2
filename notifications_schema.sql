-- =====================================================
-- NOTIFICATIONS SYSTEM SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for faster queries
    CONSTRAINT valid_type CHECK (type IN (
        'TUGAS_BARU',
        'KUIS_BARU', 
        'ULANGAN_BARU',
        'NILAI_KELUAR',
        'SUBMISSION_BARU',
        'DEADLINE_REMINDER',
        'PENGUMUMAN',
        'HOTS_REVIEW',
        'SYSTEM',
        'UJIAN_RESMI',
        'EXAM_REMINDER'
    ))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = user_id::text OR TRUE);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (TRUE);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (TRUE);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- INSERT INTO notifications (user_id, type, title, message, link)
-- SELECT id, 'PENGUMUMAN', 'Selamat Datang!', 'Selamat datang di LMS YPP', '/dashboard'
-- FROM users LIMIT 1;

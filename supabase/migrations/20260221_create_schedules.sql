-- Migration: Create schedules and schedule_entries tables
-- For the Jadwal (Schedule) feature

-- Table: schedules (version/header per class per academic year)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: schedule_entries (individual time slots)
CREATE TABLE IF NOT EXISTS schedule_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period INT NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_class ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_academic_year ON schedules(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_schedules_effective ON schedules(effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule ON schedule_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_teacher ON schedule_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_day ON schedule_entries(day_of_week);

-- RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read schedules
CREATE POLICY "schedules_select" ON schedules FOR SELECT USING (true);
CREATE POLICY "schedule_entries_select" ON schedule_entries FOR SELECT USING (true);

-- Allow all authenticated users to insert/update/delete (API handles authorization)
CREATE POLICY "schedules_insert" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "schedules_update" ON schedules FOR UPDATE USING (true);
CREATE POLICY "schedules_delete" ON schedules FOR DELETE USING (true);

CREATE POLICY "schedule_entries_insert" ON schedule_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "schedule_entries_update" ON schedule_entries FOR UPDATE USING (true);
CREATE POLICY "schedule_entries_delete" ON schedule_entries FOR DELETE USING (true);

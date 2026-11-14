ALTER TABLE cb_pending_signups ADD COLUMN role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','mentor'));

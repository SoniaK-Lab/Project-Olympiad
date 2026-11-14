-- Apply once to the existing Clinical Bridge D1 database; retain all members and learning data.
ALTER TABLE cb_accounts ADD COLUMN national_id TEXT;
ALTER TABLE cb_accounts ADD COLUMN verified_at TEXT;
CREATE UNIQUE INDEX cb_accounts_national_id_unique ON cb_accounts(national_id);
CREATE TABLE cb_pending_signups (
 token_hash TEXT PRIMARY KEY NOT NULL,
 national_id TEXT NOT NULL,
 email TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 expires INTEGER NOT NULL,
 used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX cb_pending_signups_expiry ON cb_pending_signups(expires);
CREATE INDEX IF NOT EXISTS cb_sessions_expiry ON cb_sessions(expires);

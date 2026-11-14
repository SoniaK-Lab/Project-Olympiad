CREATE TABLE IF NOT EXISTS cb_password_resets (
 token_hash TEXT PRIMARY KEY NOT NULL,
 account_id TEXT REFERENCES cb_accounts(id),
 national_id TEXT NOT NULL,
 email TEXT NOT NULL,
 credential_hash TEXT,
 expires INTEGER NOT NULL,
 verified_at INTEGER
);
CREATE INDEX IF NOT EXISTS cb_password_resets_expiry ON cb_password_resets(expires);
CREATE INDEX IF NOT EXISTS cb_password_resets_account ON cb_password_resets(account_id);

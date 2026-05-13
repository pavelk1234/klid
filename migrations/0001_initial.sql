-- Klid — initial schema (D1 / SQLite)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  timezone TEXT,
  preferred_length INTEGER,
  preferred_frequency TEXT,
  halfway_bell INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  scheduled_at INTEGER NOT NULL,
  length_minutes INTEGER NOT NULL,
  creator_id TEXT NOT NULL REFERENCES users(id),
  partner_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  jitsi_room TEXT NOT NULL,
  reminder_15m_sent_at INTEGER,
  reminder_24h_sent_at INTEGER,
  thanks_sent_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL,
  start_minute INTEGER NOT NULL,
  end_minute INTEGER NOT NULL
);

CREATE TABLE auth_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status_scheduled ON sessions(status, scheduled_at);
CREATE INDEX idx_sessions_creator ON sessions(creator_id);
CREATE INDEX idx_sessions_partner ON sessions(partner_id);
CREATE INDEX idx_availability_user ON availability(user_id);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);

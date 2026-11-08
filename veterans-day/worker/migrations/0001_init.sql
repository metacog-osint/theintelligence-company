-- Veterans Day 2026 field reports. Anonymous: see src/index.js for what is kept and for how long.
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, p TEXT NOT NULL, o TEXT NOT NULL, k TEXT NOT NULL,
  m INTEGER, v INTEGER, h TEXT
);
CREATE INDEX IF NOT EXISTS reports_ts ON reports (ts);
CREATE INDEX IF NOT EXISTS reports_dup ON reports (h, p, k, ts);
CREATE TABLE IF NOT EXISTS tips (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, name TEXT, address TEXT, offer TEXT, when_ TEXT, source TEXT, h TEXT,
  status TEXT NOT NULL DEFAULT 'new'
);
-- Set by hand on the day: status 'dead' hides an offer or place for everyone, 'caution' shows the note.
CREATE TABLE IF NOT EXISTS overrides (id TEXT PRIMARY KEY, status TEXT NOT NULL, note TEXT, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rl (h TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (h, day, kind));
CREATE TABLE IF NOT EXISTS salt (day TEXT PRIMARY KEY, s TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS blob (k TEXT PRIMARY KEY, v TEXT NOT NULL, ts INTEGER NOT NULL);

-- Emaús Vota - D1 Database Schema Migration
-- This schema migrates from better-sqlite3 to Cloudflare D1

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  photo_url TEXT,
  birthdate TEXT,
  has_password INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_member INTEGER NOT NULL DEFAULT 1,
  active_member INTEGER NOT NULL DEFAULT 1
);

-- Positions table (fixed positions for elections)
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Elections table
CREATE TABLE IF NOT EXISTS elections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

-- Election Winners table - tracks which candidate won each position
CREATE TABLE IF NOT EXISTS election_winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  candidate_id INTEGER NOT NULL,
  won_at_scrutiny INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Election Positions table - tracks each position within an election sequentially
CREATE TABLE IF NOT EXISTS election_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_scrutiny INTEGER NOT NULL DEFAULT 1,
  opened_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (position_id) REFERENCES positions(id)
);

-- Election Attendance table - tracks which members are present for voting
CREATE TABLE IF NOT EXISTS election_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  election_position_id INTEGER,
  member_id INTEGER NOT NULL,
  is_present INTEGER NOT NULL DEFAULT 0,
  marked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (election_position_id) REFERENCES election_positions(id),
  FOREIGN KEY (member_id) REFERENCES users(id)
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  user_id INTEGER NOT NULL DEFAULT 0,
  position_id INTEGER NOT NULL,
  election_id INTEGER NOT NULL,
  UNIQUE(user_id, position_id, election_id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id INTEGER NOT NULL,
  candidate_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  election_id INTEGER NOT NULL,
  scrutiny_round INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(voter_id, position_id, election_id, scrutiny_round),
  FOREIGN KEY (voter_id) REFERENCES users(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  FOREIGN KEY (election_id) REFERENCES elections(id)
);

-- Verification Codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_password_reset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PDF Verifications table
CREATE TABLE IF NOT EXISTS pdf_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  verification_hash TEXT NOT NULL UNIQUE,
  president_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (election_id) REFERENCES elections(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_election_attendance_lookup 
  ON election_attendance(election_id, member_id);

CREATE INDEX IF NOT EXISTS idx_election_attendance_position 
  ON election_attendance(election_position_id) WHERE election_position_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_election_positions_status 
  ON election_positions(election_id, status, order_index);

CREATE INDEX IF NOT EXISTS idx_votes_lookup 
  ON votes(election_id, position_id, scrutiny_round);

CREATE INDEX IF NOT EXISTS idx_votes_candidate 
  ON votes(candidate_id);

CREATE INDEX IF NOT EXISTS idx_election_winners_lookup 
  ON election_winners(election_id, position_id);

CREATE INDEX IF NOT EXISTS idx_candidates_position 
  ON candidates(position_id, election_id);

CREATE INDEX IF NOT EXISTS idx_candidates_user 
  ON candidates(user_id, election_id);

-- Initialize fixed positions
INSERT OR IGNORE INTO positions (id, name) VALUES 
  (1, 'Presidente'),
  (2, 'Vice-Presidente'),
  (3, '1º Secretário'),
  (4, '2º Secretário'),
  (5, 'Tesoureiro');

-- Note: Default admin user should be created during first deployment
-- using the Cloudflare Functions initialization endpoint

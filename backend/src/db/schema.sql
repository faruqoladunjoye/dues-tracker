-- Akoka FC Monthly Dues Tracker — Database Schema
-- Run this file once against your Neon database to initialise all tables.
-- Then run `npm run seed` to create the admin account.

CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  nickname      VARCHAR(50),
  date_of_birth DATE,
  phone_number  VARCHAR(20),
  jersey_number INT,
  position      VARCHAR(50),
  photo_url     TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Migration for existing databases (safe to re-run):
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS monthly_dues (
  id        SERIAL PRIMARY KEY,
  player_id INT  NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  month     INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
  year      INT  NOT NULL,
  paid      BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at   TIMESTAMP,
  UNIQUE(player_id, month, year)
);

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('active_year', '2026') ON CONFLICT (key) DO NOTHING;

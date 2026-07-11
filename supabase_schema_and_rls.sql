-- =====================================================================
-- OPTIMAL SUPABASE SCHEMA FOR AL-DIRAZI ELEGANCE
-- =====================================================================
-- Run this FULL script in the Supabase SQL Editor.
-- It creates all required tables with the exact schema the dashboard expects,
-- enables RLS, and sets up the correct policies.
-- IMPORTANT: Replace 'ja3fer.far7an@gmail.com' with your actual admin email.
-- =====================================================================

-- -------------------------------------------------------
-- 1. TABLE: albums
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS albums (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT        NOT NULL,
  year       INTEGER     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  category   TEXT        NOT NULL DEFAULT 'sorrow', -- 'sorrow' | 'joy' | 'supplications'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. TABLE: audios
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audios (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT        NOT NULL,
  audio_url  TEXT        NOT NULL,
  album_id   BIGINT      REFERENCES albums(id) ON DELETE SET NULL,
  duration   TEXT        NOT NULL DEFAULT '00:00',
  "order"    INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. TABLE: messages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL DEFAULT '',
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- albums
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read albums"   ON albums;
DROP POLICY IF EXISTS "Admin write albums"   ON albums;
CREATE POLICY "Public read albums"  ON albums FOR SELECT USING (true);
CREATE POLICY "Admin write albums"  ON albums FOR ALL TO authenticated
  USING      (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com');

-- audios
ALTER TABLE audios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read audios"   ON audios;
DROP POLICY IF EXISTS "Admin write audios"   ON audios;
CREATE POLICY "Public read audios"  ON audios FOR SELECT USING (true);
CREATE POLICY "Admin write audios"  ON audios FOR ALL TO authenticated
  USING      (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com');

-- messages (public INSERT so visitors can send contact forms)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert messages"     ON messages;
DROP POLICY IF EXISTS "Admin manage messages"      ON messages;
CREATE POLICY "Public insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage messages"  ON messages FOR ALL TO authenticated
  USING      (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com');

-- -------------------------------------------------------
-- 4. TABLE: videos
-- -------------------------------------------------------
-- youtube_url stores the full YouTube URL pasted by the admin.
-- The frontend extracts the video ID from it client-side.
-- category: 'new' | 'popular' | 'featured'
CREATE TABLE IF NOT EXISTS videos (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  youtube_url   TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'new',
  sub_category  TEXT        NOT NULL DEFAULT '',
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- videos (public SELECT, admin-only INSERT/UPDATE/DELETE)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read videos"  ON videos;
DROP POLICY IF EXISTS "Admin write videos"  ON videos;
CREATE POLICY "Public read videos"  ON videos FOR SELECT USING (true);
CREATE POLICY "Admin write videos"  ON videos FOR ALL TO authenticated
  USING      (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'ja3fer.far7an@gmail.com');

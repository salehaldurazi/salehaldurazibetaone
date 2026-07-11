-- =====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR AL-DIRAZI ELEGANCE
-- =====================================================================
-- Run this script in the Supabase SQL Editor to secure your database.
-- IMPORTANT: Replace 'admin@example.com' with your actual admin email address
-- configured in your Supabase Auth user list.
-- =====================================================================

-- -------------------------------------------------------------
-- 1. SECURING THE 'albums' TABLE
-- -------------------------------------------------------------
-- Enable Row Level Security (RLS) on the table
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Allow public read access on albums" ON albums;
DROP POLICY IF EXISTS "Allow admin write access on albums" ON albums;

-- Allow anyone (including anonymous visitors) to view albums
CREATE POLICY "Allow public read access on albums"
ON albums FOR SELECT
USING (true);

-- Allow only the admin authenticated user to manage albums (insert/update/delete)
CREATE POLICY "Allow admin write access on albums"
ON albums FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@example.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');


-- -------------------------------------------------------------
-- 2. SECURING THE 'audios' TABLE
-- -------------------------------------------------------------
ALTER TABLE audios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on audios" ON audios;
DROP POLICY IF EXISTS "Allow admin write access on audios" ON audios;

-- Allow anyone to listen to/view audio tracks
CREATE POLICY "Allow public read access on audios"
ON audios FOR SELECT
USING (true);

-- Allow only the admin authenticated user to manage audios (insert/update/delete)
CREATE POLICY "Allow admin write access on audios"
ON audios FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@example.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');


-- -------------------------------------------------------------
-- 3. SECURING THE 'messages' TABLE
-- -------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on messages" ON messages;
DROP POLICY IF EXISTS "Allow admin read/write on messages" ON messages;

-- Allow public users (anonymous) to send inquiries via the contact form
CREATE POLICY "Allow public insert on messages"
ON messages FOR INSERT
WITH CHECK (true);

-- Allow only the authenticated admin to read, update or delete contact inquiries
CREATE POLICY "Allow admin read/write on messages"
ON messages FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@example.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');


-- -------------------------------------------------------------
-- 4. OPTIONAL: SECURING THE 'videos' TABLE (If present in project)
-- -------------------------------------------------------------
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on videos" ON videos;
DROP POLICY IF EXISTS "Allow admin write access on videos" ON videos;

-- Allow anyone to watch videos
CREATE POLICY "Allow public read access on videos"
ON videos FOR SELECT
USING (true);

-- Allow only the admin authenticated user to manage videos
CREATE POLICY "Allow admin write access on videos"
ON videos FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@example.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');

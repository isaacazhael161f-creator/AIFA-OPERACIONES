-- Script to setup Storage for Medical Directory
-- Run this in your Supabase SQL Editor

-- 1. Create a new public bucket named 'medical-files'
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-files', 'medical-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access to Read (Select)
CREATE POLICY "Public Access Medical Files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'medical-files' );

-- 3. Allow Authenticated Users to Upload (Insert)
CREATE POLICY "Auth Upload Medical Files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'medical-files' );

-- 4. Allow Authenticated Users to Update/Delete
CREATE POLICY "Auth Update Medical Files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'medical-files' );

CREATE POLICY "Auth Delete Medical Files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'medical-files' );

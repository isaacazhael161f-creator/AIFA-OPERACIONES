-- Add pdf_url column to parte_operations table
ALTER TABLE public.parte_operations 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Note: You also need to create a storage bucket named 'parte-operaciones' in Supabase
-- and set up appropriate policies to allow authenticated users to upload/read.
-- Example policy for storage (to be run in SQL editor if bucket creation via SQL is supported, otherwise do it in dashboard):
-- insert into storage.buckets (id, name) values ('parte-operaciones', 'parte-operaciones');
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'parte-operaciones' );
-- create policy "Auth Upload" on storage.objects for insert with check ( bucket_id = 'parte-operaciones' and auth.role() = 'authenticated' );

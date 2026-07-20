-- 1. Create a public bucket for Manifiestos PDFs
insert into storage.buckets (id, name, public)
values ('manifiestos_pdfs', 'manifiestos_pdfs', true);

-- 2. Allow public access to read files in the bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'manifiestos_pdfs' );

-- 3. Allow anonymous/authenticated users to insert files into the bucket
create policy "Allow Uploads"
on storage.objects for insert
with check ( bucket_id = 'manifiestos_pdfs' );

-- 4. Add a column to store the PDF URL in the manifiestos_pasajeros table
alter table "manifiestos_pasajeros"
add column if not exists "pdf_url" text;

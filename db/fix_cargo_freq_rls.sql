-- Fix RLS for weekly_frequencies_cargo
ALTER TABLE weekly_frequencies_cargo ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public read weekly_frequencies_cargo"
ON weekly_frequencies_cargo FOR SELECT
USING (true);

-- Allow authenticated insert/update/delete
CREATE POLICY "Authenticated full access weekly_frequencies_cargo"
ON weekly_frequencies_cargo FOR ALL
USING (auth.role() = 'authenticated');

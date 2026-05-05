-- Enable RLS on the table (if not already enabled)
ALTER TABLE public.daily_operations ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows everyone to read data
CREATE POLICY "Allow public read access"
ON public.daily_operations
FOR SELECT
USING (true);

-- If you want to allow anonymous inserts/updates (BE CAREFUL with this in production)
-- CREATE POLICY "Allow public insert access" ON public.daily_operations FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update access" ON public.daily_operations FOR UPDATE USING (true);

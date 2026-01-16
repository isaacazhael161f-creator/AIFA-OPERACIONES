-- Add order_index column to medical_directory for sorting
ALTER TABLE medical_directory 
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1000;

-- Optional: Update existing records to have sequential order if needed, or just default is fine.

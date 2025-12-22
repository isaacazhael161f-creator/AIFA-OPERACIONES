CREATE TABLE IF NOT EXISTS delays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month TEXT NOT NULL,
    cause TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    description TEXT,
    incidents TEXT[], -- Array of strings for specific incidents
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_delays_year_month ON delays(year, month);

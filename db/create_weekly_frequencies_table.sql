
-- Create table for weekly frequencies
CREATE TABLE IF NOT EXISTS weekly_frequencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_label TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    route_id INTEGER,
    city TEXT,
    state TEXT,
    iata TEXT,
    airline TEXT,
    monday INTEGER DEFAULT 0,
    tuesday INTEGER DEFAULT 0,
    wednesday INTEGER DEFAULT 0,
    thursday INTEGER DEFAULT 0,
    friday INTEGER DEFAULT 0,
    saturday INTEGER DEFAULT 0,
    sunday INTEGER DEFAULT 0,
    weekly_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE weekly_frequencies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to everyone
CREATE POLICY "Allow public read access" ON weekly_frequencies FOR SELECT USING (true);

-- Create policy to allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated insert" ON weekly_frequencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON weekly_frequencies FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON weekly_frequencies FOR DELETE USING (auth.role() = 'authenticated');

-- Insert data
INSERT INTO weekly_frequencies (week_label, valid_from, valid_to, route_id, city, state, iata, airline, monday, tuesday, wednesday, thursday, friday, saturday, sunday, weekly_total) VALUES
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 1, 'Tijuana', 'Baja California', 'TIJ', 'Viva Aerobus', 3, 0, 2, 3, 2, 0, 3, 19),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 1, 'Tijuana', 'Baja California', 'TIJ', 'Volaris', 1, 0, 0, 1, 0, 1, 1, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 2, 'Hermosillo', 'Sonora', 'HMO', 'Mexicana', 1, 0, 1, 1, 1, 1, 1, 6),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 2, 'Hermosillo', 'Sonora', 'HMO', 'Viva Aerobus', 0, 0, 0, 1, 1, 0, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 3, 'Ciudad Juárez', 'Chihuahua', 'CJS', 'Viva Aerobus', 0, 0, 0, 1, 0, 0, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 4, 'Ciudad Obregón', 'Sonora', 'CEN', 'Viva Aerobus', 1, 0, 1, 0, 1, 1, 1, 4),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 4, 'Ciudad Obregón', 'Sonora', 'CEN', 'Viva Aerobus', 0, 0, 1, 0, 0, 0, 1, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 5, 'Chihuahua', 'Chihuahua', 'CUU', 'Viva Aerobus', 2, 1, 1, 1, 2, 1, 1, 9),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 6, 'Nuevo Laredo', 'Tamaulipas', 'NLD', 'Viva Aerobus', 2, 1, 1, 1, 1, 0, 1, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 7, 'Reynosa', 'Tamaulipas', 'REX', 'Viva Aerobus', 1, 0, 0, 0, 0, 0, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 7, 'Reynosa', 'Tamaulipas', 'REX', 'Viva Aerobus', 0, 0, 0, 1, 1, 1, 0, 5),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 8, 'La Paz', 'Baja California Sur', 'LAP', 'Volaris', 0, 1, 0, 1, 0, 1, 0, 3),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 9, 'Culiacán', 'Sinaloa', 'CUL', 'Viva Aerobus', 1, 1, 1, 1, 0, 1, 1, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 10, 'Durango', 'Durango', 'DGO', 'Aeroméxico', 1, 1, 1, 0, 1, 1, 1, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 11, 'Monterrey', 'Nuevo León', 'MTY', 'Viva Aerobus', 6, 5, 5, 6, 5, 5, 6, 40),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 12, 'Ciudad Victoria', 'Tamaulipas', 'CVM', 'Aeroméxico', 1, 0, 1, 0, 1, 1, 1, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 13, 'Matamoros', 'Tamaulipas', 'MAM', 'Mexicana', 2, 0, 2, 0, 2, 2, 2, 2),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 13, 'Matamoros', 'Tamaulipas', 'MAM', 'Aerus', 1, 0, 1, 0, 0, 0, 1, 11),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 13, 'Matamoros', 'Tamaulipas', 'MAM', 'Viva Aerobus', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 13, 'Matamoros', 'Tamaulipas', 'MAM', 'Viva Aerobus', 1, 0, 0, 0, 0, 1, 0, 5),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 14, 'San José del Cabo', 'Baja California Sur', 'SJD', 'Volaris', 1, 0, 0, 0, 0, 1, 0, 4),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 15, 'Mazatlán', 'Sinaloa', 'MZT', 'Mexicana', 0, 0, 0, 0, 0, 0, 0, 2),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 15, 'Mazatlán', 'Sinaloa', 'MZT', 'Viva Aerobus', 0, 0, 0, 0, 0, 0, 0, 0),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 16, 'Tepic', 'Nayarit', 'TPQ', 'Viva Aerobus', 1, 0, 0, 0, 0, 0, 0, 6),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 17, 'San Luis Potosí', 'San Luis Potosí', 'SLP', 'Aerus', 0, 0, 0, 0, 0, 0, 0, 0),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 18, 'Tampico', 'Tamaulipas', 'TAM', 'Viva Aerobus', 0, 0, 0, 0, 0, 0, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 18, 'Tampico', 'Tamaulipas', 'TAM', 'Desconocido', 0, 0, 0, 0, 0, 0, 0, 10),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 19, 'Puerto Vallarta', 'Jalisco', 'PVR', 'Mexicana', 1, 0, 0, 0, 0, 1, 0, 2),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 19, 'Puerto Vallarta', 'Jalisco', 'PVR', 'Aeroméxico', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 20, 'Guadalajara', 'Jalisco', 'GDL', 'Aeroméxico', 1, 2, 0, 0, 0, 4, 0, 29),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 20, 'Guadalajara', 'Jalisco', 'GDL', 'Volaris', 2, 0, 0, 0, 0, 3, 0, 21),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 23, 'Zihuatanejo', 'Guerrero', 'ZIH', 'Mexicana', 0, 0, 0, 0, 0, 0, 0, 2),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 23, 'Zihuatanejo', 'Guerrero', 'ZIH', 'Viva Aerobus', 0, 0, 0, 0, 0, 0, 0, 0),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 24, 'Acapulco', 'Guerrero', 'ACA', 'Viva Aerobus', 1, 0, 0, 0, 0, 0, 0, 14),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 25, 'Oaxaca', 'Oaxaca', 'OAX', 'Aeroméxico', 1, 0, 0, 0, 0, 0, 0, 6),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 26, 'Veracruz', 'Veracruz', 'VER', 'Aeroméxico', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 26, 'Veracruz', 'Veracruz', 'VER', 'Viva Aerobus', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 29, 'Mérida', 'Yucatán', 'MID', 'Mexicana', 2, 0, 0, 0, 0, 3, 0, 15),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 29, 'Mérida', 'Yucatán', 'MID', 'Mexicana', 0, 0, 0, 0, 0, 0, 0, 5),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 29, 'Mérida', 'Yucatán', 'MID', 'Aeroméxico', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 29, 'Mérida', 'Yucatán', 'MID', 'Volaris', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 29, 'Mérida', 'Yucatán', 'MID', 'Viva Aerobus', 2, 0, 0, 0, 0, 2, 0, 11),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 30, 'Tulum', 'Quintana Roo', 'TQO', 'Mexicana', 1, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 30, 'Tulum', 'Quintana Roo', 'TQO', 'Aeroméxico', 1, 0, 0, 1, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 30, 'Tulum', 'Quintana Roo', 'TQO', 'Viva Aerobus', 5, 0, 0, 0, 0, 5, 0, 33),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 31, 'Cancún', 'Quintana Roo', 'CUN', 'Aeroméxico', 0, 0, 0, 0, 0, 0, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 32, 'Puerto Escondido', 'Oaxaca', 'PXM', 'Volaris', 0, 0, 0, 0, 0, 0, 0, 5),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 32, 'Puerto Escondido', 'Oaxaca', 'PXM', 'Viva Aerobus', 0, 0, 0, 0, 0, 0, 0, 5),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 33, 'Huatulco', 'Oaxaca', 'HUX', 'Viva Aerobus', 0, 0, 0, 0, 0, 1, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 34, 'Ixtepec', 'Oaxaca', 'IZT', 'Mexicana', 0, 0, 0, 0, 0, 0, 0, 3),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 35, 'Tuxtla Gutiérrez', 'Chiapas', 'TGZ', 'Viva Aerobus', 2, 0, 0, 0, 0, 0, 0, 9),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 36, 'Saltillo', 'Coahuila', 'SLW', 'Viva Aerobus', 1, 0, 0, 0, 0, 0, 0, 7),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 37, 'Palenque', 'Chiapas', 'PQM', 'Mexicana', 1, 0, 0, 0, 0, 0, 0, 2),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 38, 'Chetumal', 'Quintana Roo', 'CTM', 'Mexicana', 1, 0, 0, 0, 0, 0, 0, 3),
('08-14 Dic 2025', '2025-12-08', '2025-12-14', 38, 'Chetumal', 'Quintana Roo', 'CTM', 'Viva Aerobus', 0, 0, 0, 0, 0, 0, 0, 4);
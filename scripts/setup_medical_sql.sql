-- Create tables
CREATE TABLE IF NOT EXISTS medical_attentions (
    id uuid default gen_random_uuid() primary key,
    year int,
    month text,
    aifa_personnel int,
    other_companies int,
    passengers int,
    visitors int,
    total int GENERATED ALWAYS AS (aifa_personnel + other_companies + passengers + visitors) STORED,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS medical_types (
    id uuid default gen_random_uuid() primary key,
    year int,
    month text,
    traslado int,
    ambulatorio int,
    total int GENERATED ALWAYS AS (traslado + ambulatorio) STORED,
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS medical_directory (
    id uuid default gen_random_uuid() primary key,
    asunto text,
    responsable text,
    estado text,
    documentos jsonb default '[]',
    created_at timestamptz default now()
);

-- Turn off RLS for initial insertion if needed, or ensure policy allows insert. 
-- Assuming admin context or open permissions for this setup script.

-- Insert data for medical_attentions
INSERT INTO medical_attentions (year, month, aifa_personnel, other_companies, passengers, visitors) VALUES
(2022, 'ABRIL', 29, 117, 36, 36),
(2022, 'MAYO', 34, 106, 23, 12),
(2022, 'JUNIO', 68, 82, 16, 5),
(2022, 'JULIO', 41, 71, 20, 7),
(2022, 'AGOSTO', 39, 80, 10, 4),
(2022, 'SEPTIEMBRE', 15, 155, 85, 0),
(2022, 'OCTUBRE', 34, 112, 77, 9),
(2022, 'NOVIEMBRE', 47, 91, 63, 8),
(2022, 'DICIEMBRE', 66, 95, 94, 9),
(2023, 'ENERO', 49, 62, 70, 9),
(2023, 'FEBRERO', 20, 56, 36, 10),
(2023, 'MARZO', 7, 17, 20, 2),
(2023, 'ABRIL', 21, 64, 54, 4),
(2023, 'MAYO', 27, 79, 72, 7),
(2023, 'JUNIO', 52, 47, 59, 2),
(2023, 'JULIO', 65, 58, 66, 2),
(2023, 'AGOSTO', 58, 69, 78, 21),
(2023, 'SEPTIEMBRE', 80, 66, 63, 17),
(2023, 'OCTUBRE', 90, 64, 106, 22),
(2023, 'NOVIEMBRE', 74, 72, 111, 10),
(2023, 'DICIEMBRE', 127, 68, 106, 15),
(2024, 'ENERO', 143, 108, 156, 18),
(2024, 'FEBRERO', 69, 111, 141, 19),
(2024, 'MARZO', 95, 128, 192, 16),
(2024, 'ABRIL', 93, 141, 261, 20),
(2024, 'MAYO', 42, 136, 296, 19),
(2024, 'JUNIO', 75, 121, 243, 37),
(2024, 'JULIO', 90, 96, 300, 22),
(2024, 'AGOSTO', 62, 102, 231, 12),
(2024, 'SEPTIEMBRE', 72, 109, 221, 12),
(2024, 'OCTUBRE', 46, 100, 209, 14),
(2024, 'NOVIEMBRE', 51, 122, 219, 18),
(2024, 'DICIEMBRE', 68, 128, 225, 15),
(2025, 'ENERO', 82, 136, 214, 12),
(2025, 'FEBRERO', 64, 145, 206, 20),
(2025, 'MARZO', 85, 141, 242, 15),
(2025, 'ABRIL', 68, 137, 240, 13),
(2025, 'MAYO', 54, 138, 223, 19),
(2025, 'JUNIO', 45, 125, 218, 32),
(2025, 'JULIO', 60, 150, 230, 25),
(2025, 'AGOSTO', 70, 130, 210, 18),
(2025, 'SEPTIEMBRE', 65, 140, 205, 15),
(2025, 'OCTUBRE', 80, 145, 220, 20),
(2025, 'NOVIEMBRE', 75, 150, 225, 22),
(2025, 'DICIEMBRE', 90, 155, 240, 25);

-- Insert data for medical_types
INSERT INTO medical_types (year, month, traslado, ambulatorio) VALUES
(2022, 'ABRIL', 7, 211),
(2022, 'MAYO', 6, 169),
(2022, 'JUNIO', 10, 161),
(2022, 'JULIO', 4, 135),
(2022, 'AGOSTO', 2, 131),
(2022, 'SEPTIEMBRE', 4, 251),
(2022, 'OCTUBRE', 4, 228),
(2022, 'NOVIEMBRE', 4, 205),
(2022, 'DICIEMBRE', 2, 262),
(2023, 'ENERO', 3, 187),
(2023, 'FEBRERO', 5, 117),
(2023, 'MARZO', 1, 45),
(2023, 'ABRIL', 6, 137),
(2023, 'MAYO', 2, 183),
(2023, 'JUNIO', 6, 154),
(2023, 'JULIO', 2, 189),
(2023, 'AGOSTO', 7, 219),
(2023, 'SEPTIEMBRE', 4, 222),
(2023, 'OCTUBRE', 6, 276),
(2023, 'NOVIEMBRE', 8, 259),
(2023, 'DICIEMBRE', 6, 310),
(2024, 'ENERO', 8, 417),
(2024, 'FEBRERO', 5, 335),
(2024, 'MARZO', 8, 423),
(2024, 'ABRIL', 13, 502),
(2024, 'MAYO', 11, 482),
(2024, 'JUNIO', 15, 461),
(2024, 'JULIO', 9, 499),
(2024, 'AGOSTO', 7, 400),
(2024, 'SEPTIEMBRE', 12, 402),
(2024, 'OCTUBRE', 7, 362),
(2024, 'NOVIEMBRE', 7, 403),
(2024, 'DICIEMBRE', 11, 425),
(2025, 'ENERO', 5, 364),
(2025, 'FEBRERO', 2, 384),
(2025, 'MARZO', 5, 490),
(2025, 'ABRIL', 1, 419),
(2025, 'MAYO', 5, 438),
(2025, 'JUNIO', 5, 420),
(2025, 'JULIO', 8, 503),
(2025, 'AGOSTO', 4, 457),
(2025, 'SEPTIEMBRE', 3, 402),
(2025, 'OCTUBRE', 3, 442),
(2025, 'NOVIEMBRE', 5, 450),
(2025, 'DICIEMBRE', 8, 460);

-- Insert data for medical_directory
INSERT INTO medical_directory (asunto, responsable, estado, documentos) VALUES
('Agenda Pral. AIFA', 'G.S.M.', '', '["Directorio 2025.pdf", "Directorio 2.pdf"]'),
('Contrato de servicio Médico', 'Lic. José Luis Garcia Mateos. Admr. Contrato.', '', '["Contrato Jet Medical.pdf", "Ficha Técnica SV Médico.pdf"]'),
('Personal Proveedor de Servicio Médico.', 'Lic. María Fernanda López Ficachi.', '', '["Listado Personal Octubre 2025.pdf"]'),
('Equipo de Radiocomunicacion y Mobiliario Médico.', '', '2025', '["Mobiliario y Equipo Médico 2025.pdf", "Resguardo inicio de contrato 2025.pdf"]'),
('Estado de Fuerza G.S.M.', '', '', '[]'),
('Red Hospitalaria.', '', '', '["Red hospitalaria 2025.pdf"]');


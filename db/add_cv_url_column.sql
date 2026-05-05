-- ============================================================
--  Añadir columna cv_url a agenda_2026
--  Ejecutar en: Supabase > SQL Editor
-- ============================================================

ALTER TABLE agenda_2026
    ADD COLUMN IF NOT EXISTS cv_url TEXT;

COMMENT ON COLUMN agenda_2026.cv_url IS
    'URL pública del CV en Supabase Storage (bucket: employee-cvs)';

-- ============================================================
--  Crear bucket employee-cvs desde el Dashboard de Supabase:
--  Storage → New bucket → nombre: employee-cvs → Public: ✓
--
--  Los archivos se nombran: {num_empleado}.pdf
--  URL pública base:
--  https://fgstncvuuhpgyzmjceyr.supabase.co/storage/v1/object/public/employee-cvs/
-- ============================================================

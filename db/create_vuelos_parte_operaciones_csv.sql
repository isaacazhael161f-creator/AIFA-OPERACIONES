-- Nueva tabla para vuelos (Parte de Operaciones) importados desde CSV
CREATE TABLE IF NOT EXISTS public.vuelos_parte_operaciones_csv (
    "Status" TEXT,
    "[Arr] Airline code" TEXT,
    "[Arr] Flight Designator" TEXT,
    "[Arr] ALDT" TEXT,
    "[Arr] SIBT" TEXT,
    "[Arr] AIBT" TEXT,
    "[Arr] Stand" TEXT,
    "[Arr] Gates" TEXT,
    "[Arr] Boarded" TEXT,
    "[Arr] Baggage Belts" TEXT,
    "[Arr] Service Type" TEXT,
    "Routing" TEXT,
    "[Dep] Service Type" TEXT,
    "Aircraft type" TEXT,
    "Registration" TEXT,
    "[Dep] Airline code" TEXT,
    "[Dep] Flight Designator" TEXT,
    "[Dep] Stand" TEXT,
    "[Dep] Gates" TEXT,
    "[Dep] Boarded" TEXT,
    "[Dep] SOBT" TEXT,
    "[Dep] AOBT" TEXT,
    "[Dep] ATOT" TEXT,
    "[Dep] ATTT" TEXT
);

ALTER TABLE public.vuelos_parte_operaciones_csv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir gestión total de vuelos CSV" ON public.vuelos_parte_operaciones_csv;

CREATE POLICY "Permitir gestión total de vuelos CSV"
ON public.vuelos_parte_operaciones_csv
FOR ALL
TO public
USING (true)
WITH CHECK (true);

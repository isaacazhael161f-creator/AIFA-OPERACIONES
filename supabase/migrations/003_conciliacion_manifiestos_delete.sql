-- Permite eliminar filas desde Conciliación > Manifiestos a usuarios autenticados.
-- La interfaz limita esta acción a editor, admin y superadmin.
ALTER TABLE "Conciliación Manifiestos" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cm_delete_authenticated ON "Conciliación Manifiestos";

CREATE POLICY cm_delete_authenticated
  ON "Conciliación Manifiestos"
  FOR DELETE
  USING (auth.role() = 'authenticated');

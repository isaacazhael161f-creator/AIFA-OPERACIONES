-- ============================================================
-- Vista: historial de cambios de plaza por colaborador
-- Filtra registros de colab_historial donde campo = 'plaza'
-- ============================================================
-- La app ya registra automáticamente los cambios de plaza en
-- la tabla colab_historial cuando un editor modifica el campo.
-- Esta vista facilita consultas directas sin necesidad de cambios
-- adicionales en la aplicación.

CREATE OR REPLACE VIEW colab_historial_plaza AS
SELECT
    h.id,
    h.num_empleado,
    h.valor_anterior  AS plaza_anterior,
    h.valor_nuevo     AS plaza_nueva,
    h.usuario_nombre  AS modificado_por,
    h.usuario_id,
    h.fecha           AS fecha_cambio
FROM colab_historial h
WHERE h.campo = 'plaza'
ORDER BY h.fecha DESC;

-- Permisos: todos los usuarios autenticados pueden leer la vista
GRANT SELECT ON colab_historial_plaza TO authenticated;

-- ============================================================
-- Consulta de ejemplo: historial de plaza de un colaborador
-- ============================================================
-- SELECT * FROM colab_historial_plaza WHERE num_empleado = '12345';

-- ============================================================
-- Consulta de ejemplo: ver quiénes han ocupado una plaza específica
-- ============================================================
-- SELECT num_empleado, plaza_anterior, plaza_nueva, fecha_cambio, modificado_por
-- FROM colab_historial_plaza
-- WHERE plaza_nueva = '001'
-- ORDER BY fecha_cambio DESC;

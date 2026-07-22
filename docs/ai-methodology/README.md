# Metodologia IA - AIFA Operaciones

Esta carpeta contiene la metodologia tecnica para trabajar AIFA Operaciones con desarrollo asistido por IA.

## Documentos

- `architecture-map.md`: mapa tecnico, modulos, dependencias, permisos, Supabase, pruebas y riesgos.
- `permissions-model.md`: modelo de permisos y reglas para cambios de seguridad.
- `module-contracts.md`: formato de contrato por modulo y modulos iniciales a inventariar.
- `change-playbook.md`: flujo recomendado para cambios asistidos por IA.
- `testing-playbook.md`: matriz de pruebas por tipo de cambio.
- `ai-prompts.md`: prompts reutilizables para analisis, cambios, RLS, refactor y cierre.

## Regla principal

Antes de que una IA modifique codigo en este repositorio, debe identificar:

- modulo afectado;
- `data-section`;
- DOM host;
- archivos JS;
- tablas Supabase;
- RPCs;
- buckets;
- permisos;
- pruebas o smoke esperado.

La UI puede ocultar acciones, pero la seguridad debe vivir en Supabase mediante RLS y RPCs controladas.


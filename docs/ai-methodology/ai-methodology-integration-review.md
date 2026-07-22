# Revision de Integracion Propuesta - Metodologia IA vs Sistema Actual

Fecha: 2026-07-22

## Objetivo del documento

Revisar la integracion propuesta de metodologia IA contra la arquitectura actual de AIFA Operaciones y listar bloqueadores antes de implementar.

## Estado actual que considera

- SPA estatica con `index.html`, `script.js`, `js/*.js`.
- Navegacion por `data-section` y `.content-section`.
- Supabase Auth, RLS, Storage, RPCs.
- Permisos `allowed_sections` y `section_levels`.
- Compuerta `usuarios_aplicaciones` para `OPERACIONES`.
- Pruebas Jest limitadas.

## Consistencia con arquitectura existente

La metodologia propuesta es consistente si se implementa como:

- nueva seccion opcional `metodologia-ia`;
- documentos en `docs/ai-methodology/`;
- tablas Supabase nuevas aisladas;
- RLS basado en helpers existentes;
- asistentes por modulo con contexto limitado.

No es consistente si:

- se expande mas `script.js` sin control;
- se mezclan permisos de IA con permisos globales sin matriz;
- se usa RAG sin ACL documental;
- se ejecutan acciones IA sin confirmacion.

## Consistencia con permisos

Debe respetar:

- `user_roles.role`;
- `permissions.allowed_sections`;
- `permissions.section_levels`;
- `permissions.area`;
- `usuarios_aplicaciones` OPERACIONES.

Bloqueador: no implementar UI, tablas o asistentes IA sin definir `data-section` y matriz de permisos.

## Consistencia con Supabase/RLS

Consistente si:

- todas las tablas IA tienen RLS;
- logs propios son visibles por usuario;
- auditoria completa solo admin/superadmin;
- documentos/chunks filtran por permiso antes de generar respuestas;
- RPCs sensibles validan rol.

Bloqueador: RLS generico `authenticated all` no es aceptable para metodologia IA.

## Experiencia de usuario

Debe:

- explicar que es guia/metodologia;
- diferenciar actual vs propuesto;
- presentar checklist y plantillas;
- no saturar pantallas operativas;
- funcionar como referencia para copilots.

Bloqueador: si la seccion se vuelve un panel tecnico confuso para usuarios operativos, debe limitarse a admins/desarrolladores.

## Seguridad y privacidad

Bloqueadores:

- almacenar prompts completos con PII;
- indexar documentos sensibles sin ACL;
- usar voz en modulos sensibles sin advertencia;
- permitir acciones admin por IA;
- publicar automaticamente en TV Wall;
- aprobar manifiestos automaticamente.

## Mantenibilidad

Consistente si:

- cada documento tiene objetivo;
- cada modulo nuevo tiene OpenSpec;
- cada asistente tiene contrato;
- cada tabla nueva tiene RLS y rollback;
- cada cambio actualiza documentacion.

Bloqueador: documentos sin proposito o desactualizados generaran mala lectura por IA.

## Pruebas

Bloqueadores:

- no hay suite suficiente para permisos/RLS;
- no hay pruebas de contratos DOM;
- no hay fixtures Supabase test;
- no hay pruebas para asistentes/RAG.

Antes de implementar metodologia IA en producto se requiere al menos:

- test de acceso OPERACIONES;
- test de contrato `data-section`;
- test de permisos por seccion;
- smoke manual admin/viewer.

## Lista de bloqueadores antes de implementar

1. Normalizar documentos con objetivo, estado actual y uso por IA.
2. Definir `data-section` oficial para Metodologia IA.
3. Definir matriz de permisos.
4. Confirmar helpers RLS disponibles en Supabase.
5. Definir tablas IA y RLS.
6. Definir politica de logs/prompts.
7. Definir clasificacion documental.
8. Definir ambiente de pruebas.
9. Separar actual/propuesto en UI.
10. Definir rollback.

## Recomendacion

Antes de implementar cualquier pieza de metodologia IA en el sistema, convertir `docs/ai-methodology/` en una guia normada con:

- README rector;
- indice por tipo de documento;
- encabezado estandar;
- OpenSpec obligatoria;
- contrato de modulo;
- checklist QA;
- matriz de permisos.


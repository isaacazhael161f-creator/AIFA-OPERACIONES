# Diseno UI - Seccion "Metodologia IA"

Fecha: 2026-07-22

## Objetivo del documento

Disenar una futura seccion UI "Metodologia IA" para AIFA Operaciones sin implementar codigo.

## Estado actual que considera

La app usa menu con `.menu-item[data-section]`, secciones `#<clave>-section.content-section`, permisos `allowed_sections`, niveles `section_levels` y administracion por `admin-usuarios`.

## Para que debe usarlo una IA

Para construir en el futuro una seccion de documentacion/metodologia sin romper navegacion ni permisos existentes.

## Propuesta de seccion

- `data-section`: `metodologia-ia`
- DOM host futuro: `#metodologia-ia-section`
- Ubicacion sugerida: grupo Administracion o Biblioteca/Documentacion, visible solo segun permisos.
- Nivel minimo sugerido:
  - lectura: `viewer` con `allowed_sections` que incluya `metodologia-ia`;
  - edicion: `editor/admin/superadmin`;
  - administracion: `admin/superadmin`.

## Contenido de la seccion

### 1. Pilares

Mostrar:

- Spec-Driven Development.
- Contratos de modulo.
- Supabase/RLS primero.
- QA/TDD.
- Seguridad/privacidad.
- Documentacion como codigo.

### 2. Specs

Vista de specs:

- lista de OpenSpecs;
- estado;
- modulo;
- riesgo;
- responsable;
- fecha;
- enlace a documento.

### 3. Biblioteca de prompts

Categorias:

- requerimientos;
- specs;
- codigo;
- debugging;
- SQL/RLS;
- frontend;
- QA;
- documentacion;
- RAG;
- asistentes.

### 4. Diagramas

Mostrar Mermaid renderizado o enlaces a:

- arquitectura general;
- Supabase/RLS;
- asistentes;
- RAG.

### 5. Estado AI-Ready por modulo

Tabla:

- modulo;
- estado;
- requisitos faltantes;
- riesgos;
- prioridad.

### 6. Checklist QA

Checklist filtrable por tipo:

- UI;
- Supabase;
- RLS;
- Storage;
- Realtime;
- asistentes IA;
- RAG.

### 7. Documentacion

Indice de documentos en `docs/ai-methodology/`.

### 8. Asistentes disponibles

Tarjetas:

- nombre;
- modulo;
- modo: lectura/borrador/accion;
- voz: si/no;
- permisos;
- estado.

### 9. Bitacora

Eventos:

- specs creadas;
- prompts usados;
- asistentes ejecutados;
- feedback;
- cambios aprobados;
- auditoria.

## Estados UI obligatorios

- cargando documentacion;
- sin specs;
- sin permiso;
- error al cargar;
- documento no encontrado;
- version obsoleta.

## Permisos

Debe respetar:

- `allowed_sections` para visibilidad;
- `section_levels` para edicion;
- RLS si se guardan specs/prompts/logs en Supabase;
- admin/superadmin para auditoria completa.

## Riesgos

- Exponer documentos internos a usuarios sin permiso.
- Confundir propuesta con implementacion actual.
- Mostrar SQL sugerido como ejecutado.
- Permitir edicion de metodologia sin revision.

## Criterios de aceptacion futuros

- [ ] Se integra con `data-section`.
- [ ] Respeta permisos.
- [ ] Separa "estado actual" de "propuesta futura".
- [ ] Permite leer documentos base.
- [ ] No ejecuta SQL.
- [ ] No expone datos sensibles.


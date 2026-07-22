# Biblioteca de Prompts Estandar - AIFA Operaciones

Fecha: 2026-07-22

## Objetivo del documento

Definir prompts estandar para que asistentes IA/copilots trabajen de forma consistente en AIFA Operaciones.

## Estado actual que considera

El repositorio es una app web JS + Supabase + RLS con modulos operativos aeroportuarios, permisos por `allowed_sections`, `section_levels`, RPCs admin y documentacion base en `docs/ai-methodology/`.

## Para que debe usarlo una IA

Para iniciar analisis, specs, codigo, SQL/RLS, QA, documentacion, RAG o asistentes con una entrada clara y salida verificable.

## Regla general

Todo prompt debe obligar a la IA a identificar modulo, `data-section`, DOM host, archivos JS, tablas, RPCs, buckets, permisos y pruebas cuando aplique.

## 1. Levantamiento de requerimientos

### Cuando usarlo

Antes de crear una funcionalidad nueva o modificar un modulo operativo.

### Entrada requerida

- Problema operativo.
- Usuario objetivo.
- Modulo o area.
- Datos disponibles.
- Resultado esperado.

### Prompt

```text
Levanta requerimientos para una funcionalidad de AIFA Operaciones. Primero identifica objetivo operativo, usuarios, flujo principal, datos requeridos, permisos por rol, tablas Supabase, RPCs, buckets, riesgos y criterios de aceptacion. No propongas implementacion todavia. Si falta informacion, lista preguntas concretas.
```

### Salida esperada

- Resumen del problema.
- Requerimientos funcionales.
- Requerimientos no funcionales.
- Riesgos.
- Preguntas abiertas.

## 2. Generacion de OpenSpec

### Cuando usarlo

Cuando el requerimiento ya esta entendido y se necesita especificacion formal.

### Entrada requerida

- Requerimientos.
- Modulo.
- `data-section`.
- Tablas/RPCs esperadas.

### Prompt

```text
Genera una OpenSpec para AIFA Operaciones usando la plantilla docs/ai-methodology/openspec-feature-template.md. Debe incluir objetivo, usuarios, flujo operativo, UI, Supabase, RLS, eventos, validaciones, pruebas, rollback, seguridad, documentacion y criterios de aceptacion. Marca todo SQL como sugerido y no ejecutable.
```

### Salida esperada

- OpenSpec completa.
- Bloqueadores.
- Checklist de aprobacion.

## 3. Revision de codigo

### Cuando usarlo

Antes de aceptar cambios en JS, HTML, CSS o SQL.

### Entrada requerida

- Archivos modificados.
- Objetivo del cambio.
- Modulo afectado.

### Prompt

```text
Haz revision de codigo de este cambio en AIFA Operaciones. Prioriza bugs, regresiones, permisos, RLS, seguridad, acoplamiento con data-section, listeners duplicados, errores de Supabase y pruebas faltantes. Entrega hallazgos por severidad con archivo/linea cuando sea posible.
```

### Salida esperada

- Hallazgos criticos/altos/medios/bajos.
- Riesgo residual.
- Pruebas recomendadas.

## 4. Debugging

### Cuando usarlo

Cuando un modulo falla en UI, Supabase, permisos o datos.

### Entrada requerida

- Error observado.
- Modulo.
- Pasos para reproducir.
- Consola/log si existe.

### Prompt

```text
Diagnostica este bug en AIFA Operaciones. Identifica modulo, data-section, DOM host, eventos, estado global, llamadas Supabase, permisos y tablas involucradas. Propón causa probable, verificacion y fix minimo. No edites hasta confirmar alcance.
```

### Salida esperada

- Hipotesis.
- Evidencia a revisar.
- Fix propuesto.
- Pruebas.

## 5. SQL/RLS

### Cuando usarlo

Antes de crear o modificar tablas, politicas o RPCs.

### Entrada requerida

- Tabla/RPC.
- Acciones esperadas.
- Roles.
- Seccion.

### Prompt

```text
Diseña SQL/RLS sugerido para AIFA Operaciones. Debe respetar user_roles, allowed_sections, section_levels, usuarios_aplicaciones OPERACIONES y helpers existentes. SQL solo como propuesta, no ejecutarlo. Incluye matriz de permisos, politicas, grants, riesgos y rollback.
```

### Salida esperada

- Matriz de permisos.
- SQL sugerido.
- Riesgos.
- Pruebas RLS.

## 6. Frontend

### Cuando usarlo

Para nuevos modulos o ajustes UI.

### Entrada requerida

- Pantalla o modulo.
- Flujo.
- Estados UI.
- Permisos.

### Prompt

```text
Diseña frontend para un modulo de AIFA Operaciones. Debe seguir el patron data-section + content-section, inicializador idempotente, estados cargando/vacio/error/sin permiso, validaciones, acciones visibles por permiso y compatibilidad con navegacion actual. No expandas script.js salvo que sea necesario.
```

### Salida esperada

- Estructura UI.
- Componentes.
- Estados.
- Integracion con permisos.

## 7. QA

### Cuando usarlo

Antes de cerrar cualquier cambio.

### Entrada requerida

- Cambio.
- Modulo.
- Riesgo.

### Prompt

```text
Genera plan QA para este cambio en AIFA Operaciones. Incluye unitarias, contrato DOM, permisos/RLS, UI critica, parsing de datos, Supabase, storage/realtime si aplica, usuarios por rol y checklist antes de despliegue.
```

### Salida esperada

- Plan de pruebas.
- Smoke manual.
- Casos borde.

## 8. Documentacion

### Cuando usarlo

Despues de crear o modificar una funcionalidad.

### Entrada requerida

- Cambio realizado o propuesto.
- Archivos.
- Tablas.
- Permisos.

### Prompt

```text
Documenta este cambio de AIFA Operaciones para futuros copilots IA. Incluye estado actual, objetivo, modulo, data-section, archivos, tablas, RPCs, buckets, permisos, pruebas, riesgos y acciones futuras. No inventes componentes inexistentes.
```

### Salida esperada

- Documento tecnico.
- Contrato de modulo.
- Riesgos.

## 9. Analisis de datos

### Cuando usarlo

Para explicar operaciones, puntualidad, demoras, reportes o manifiestos.

### Entrada requerida

- Dataset o tabla.
- Periodo.
- Filtros.
- Pregunta de negocio.

### Prompt

```text
Analiza estos datos de AIFA Operaciones. Distingue dato confirmado de inferencia, indica periodo, fuente, filtros y limites. No atribuyas causas sin evidencia. Entrega resumen ejecutivo, hallazgos, anomalias, preguntas y recomendaciones operativas.
```

### Salida esperada

- Resumen.
- Hallazgos.
- Anomalias.
- Limites.

## 10. RAG

### Cuando usarlo

Para Biblioteca Digital, PDFs, guias e itinerarios.

### Entrada requerida

- Pregunta.
- Usuario/rol/area.
- Documentos recuperados.

### Prompt

```text
Responde como asistente RAG de AIFA Operaciones. Usa solo documentos autorizados recuperados. Cita documento, ruta, pagina/seccion y fecha/version. Si no hay evidencia suficiente, dilo. No inventes procedimientos, permisos, fechas ni responsables.
```

### Salida esperada

- Respuesta breve.
- Fuentes.
- Incertidumbre.

## 11. Asistentes IA

### Cuando usarlo

Para diseñar o revisar copilots por modulo.

### Entrada requerida

- Modulo.
- Contexto permitido.
- Acciones esperadas.
- Permisos.

### Prompt

```text
Diseña un asistente IA para un modulo de AIFA Operaciones siguiendo docs/ai-methodology/ai-assistant-architecture.md. Define UI, contexto, herramientas, permisos, acciones permitidas, acciones prohibidas, logging, proteccion de datos, modo texto/voz, QA y criterios de aceptacion.
```

### Salida esperada

- Contrato de asistente.
- Matriz de acciones.
- Riesgos.


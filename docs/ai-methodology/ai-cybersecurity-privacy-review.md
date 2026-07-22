# Revision de Ciberseguridad y Privacidad para Integrar IA

Fecha: 2026-07-22

## Objetivo del documento

Definir riesgos y controles minimos antes de integrar IA en AIFA Operaciones.

## Estado actual que considera

El sistema usa Supabase Auth, RLS, Storage, RPCs, documentos PDF, modulos operativos aeroportuarios, administracion de usuarios y potenciales asistentes IA/RAG.

## Para que debe usarlo una IA

Para revisar seguridad antes de proponer asistentes, RAG, prompts, logs, voz o automatizaciones.

## Superficie de riesgo

### Supabase

Riesgos:

- RLS laxo.
- Escritura amplia a `authenticated`.
- RPC `SECURITY DEFINER` sin validacion.
- Exposicion de tablas sensibles.

Controles:

- RLS obligatorio.
- Grants minimos.
- Validar rol y seccion en RPC.
- Probar usuario permitido y denegado.

### Documentos

Riesgos:

- PDFs sensibles indexados.
- Respuestas RAG sin permisos.
- Documentos obsoletos.

Controles:

- clasificacion documental;
- ACL por documento/chunk;
- citas obligatorias;
- estado `active/archived`;
- no indexar secretos.

### Datos personales

Riesgos:

- nombres, telefonos, correos, datos medicos, manifiestos.

Controles:

- minimizacion;
- redaccion parcial;
- logs sin PII innecesaria;
- acceso por rol/area.

### Operaciones aeroportuarias

Riesgos:

- recomendaciones no validadas;
- interpretacion causal falsa;
- automatizacion de acciones criticas.

Controles:

- humano en el loop;
- separar dato de inferencia;
- no ejecutar acciones criticas sin confirmacion;
- auditoria.

### Prompts y logs

Riesgos:

- prompts con datos sensibles;
- almacenamiento de conversaciones completas;
- fuga de contexto entre modulos.

Controles:

- guardar hash/resumen;
- no guardar secretos;
- aislamiento por modulo;
- retencion definida.

### Voz

Riesgos:

- captura accidental;
- dictado de datos sensibles;
- ejecucion por comando verbal.

Controles:

- activacion explicita;
- indicador visible;
- transcript editable;
- confirmacion visual para acciones.

### Archivos

Riesgos:

- upload de archivos no validos;
- PDF con datos sensibles;
- imagenes con PII;
- enlaces publicos no deseados.

Controles:

- validar tipo/tamano;
- buckets privados cuando aplique;
- signed URLs para documentos sensibles;
- auditoria de uploads.

## Controles minimos antes de implementar IA

- [ ] Matriz de permisos por modulo.
- [ ] RLS revisado.
- [ ] Registro de acciones IA.
- [ ] Politica de datos sensibles.
- [ ] Clasificacion documental.
- [ ] Confirmacion humana para escritura.
- [ ] No almacenar prompts completos sensibles.
- [ ] Citas obligatorias en RAG.
- [ ] Voz desactivada por defecto en modulos sensibles.
- [ ] Pruebas de usuario sin permiso.

## Bloqueadores de seguridad

- No implementar IA con escritura si no hay RLS probado.
- No implementar RAG si no hay ACL por documento.
- No permitir acciones admin desde IA autonoma.
- No publicar TV Wall automaticamente.
- No aprobar manifiestos automaticamente.


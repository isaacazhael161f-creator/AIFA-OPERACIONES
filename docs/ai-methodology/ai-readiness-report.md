# Reporte de Preparacion para Incorporar IA por Modulo

Fecha: 2026-07-22

## Objetivo

Evaluar que modulos actuales de AIFA Operaciones estan listos para incorporar capacidades de IA en desarrollo, analisis, automatizacion, QA, documentacion, seguridad o productos asistidos.

La evaluacion se basa en senales existentes del repositorio: secciones en `index.html`, modulos `js/`, tablas Supabase, RLS, RPCs, Storage, Realtime y Edge Functions.

## Criterios de clasificacion

### Listo

El modulo tiene datos estructurados, flujo estable, riesgo controlado y puede incorporar IA principalmente en modo lectura, analisis, resumen o documentacion sin alterar operaciones criticas.

### Parcialmente listo

El modulo tiene base tecnica suficiente, pero requiere endurecer permisos, documentar contrato, agregar QA, limitar acciones de escritura o implementar humano en el loop.

### No listo

El modulo toca permisos, usuarios, seguridad, datos sensibles o acciones destructivas. Puede usar IA para revision/documentacion, pero no para ejecucion autonoma.

## Resumen ejecutivo

| Modulo | Estado IA | Lectura rapida |
|---|---|---|
| Agenda | Parcialmente listo | Tiene modulo funcional, asistente existente, tablas `agenda_*`, notificaciones y WhatsApp. Falta delimitar permisos y acciones del asistente. |
| Biblioteca | Parcialmente listo | Buena candidata para RAG documental. Falta indice, metadatos, permisos por documento y trazabilidad de fuente. |
| Analisis de operaciones | Listo | Datos estructurados y valor alto para resumen, tendencias, explicacion de KPIs y analisis no destructivo. |
| Manifiestos | Parcialmente listo | OCR/PDF, portal, conciliacion y storage existen. Riesgo alto por datos sensibles y formatos historicos. |
| Demoras | Parcialmente listo | Bueno para clasificacion asistida y analisis causal. Requiere validar reglas oficiales, tabla fuente y RLS. |
| Puntualidad | Parcialmente listo | Datos estructurados en `punctuality` / `punctuality_stats`. Falta contrato claro de calculo y permisos. |
| TV Wall | Parcialmente listo | Existe vista TV Wall y `tv_notas`. IA puede sugerir notas, pero publicacion debe requerir aprobacion humana. |
| Administracion | No listo | Toca usuarios, roles, permisos, RPCs admin y acceso a OPERACIONES. IA solo para revision/documentacion. |
| Reportes | Parcialmente listo | Existen reportes como `reportes_hvac`. IA puede resumir/anomalias, pero cada dominio requiere permisos y validaciones. |
| Documentacion | Listo | Bajo riesgo y alto valor para specs, Mermaid, OpenSpec, playbooks, changelogs y contratos de modulo. |

## Evaluacion por modulo

## 1. Agenda

Estado: Parcialmente listo.

### Evidencia tecnica

- `agenda-section` existe en `index.html`.
- `js/agenda.js` implementa gestion de comites, reuniones y acuerdos.
- `js/agenda-assistant.js` ya existe como asistente.
- Tablas relacionadas: `agenda_comites`, `agenda_reuniones`, `agenda_acuerdos`, `agenda_temas`, `agenda_2026`.
- Integraciones existentes: `push_subscriptions`, `whatsapp_alertas`, Edge Functions de agenda y alertas.

### Casos IA viables

- Resumir reuniones y acuerdos.
- Detectar acuerdos vencidos o sin seguimiento.
- Generar borradores de agenda.
- Explicar proximas sesiones por area.
- Asistente de consulta de calendario.

### Requisitos antes de ampliar IA

- Definir acciones permitidas del asistente.
- Separar modo consulta de modo escritura.
- Validar permisos por area y rol.
- Registrar acciones generadas por IA.
- Agregar confirmacion humana para crear, editar o cerrar acuerdos.

### Riesgos

- Envio accidental de notificaciones.
- Edicion de reuniones de otra area.
- Resumen incorrecto de acuerdos.
- Exposicion de informacion de areas no autorizadas.

## 2. Biblioteca

Estado: Parcialmente listo.

### Evidencia tecnica

- `biblioteca-section` existe en `index.html`.
- Hay uso de PDFs y recursos estaticos en `pdfs/` e `images/`.
- Existe utilidad `AIFA.openPdfLightbox` en `js/core.js`.

### Casos IA viables

- Busqueda semantica sobre documentos.
- RAG para responder preguntas de procedimientos.
- Resumen de PDFs.
- Clasificacion documental.
- Extraccion de temas y responsables.

### Requisitos antes de ampliar IA

- Crear inventario documental con metadatos.
- Definir permisos por documento.
- Implementar indice/vector store con control de acceso.
- Citar fuente, pagina o archivo en cada respuesta.
- Separar documentos publicos, internos y restringidos.

### Riesgos

- Respuestas sin fuente.
- Mezcla de documentos con permisos distintos.
- Uso de documentos desactualizados.
- Exposicion de PDFs sensibles.

## 3. Analisis de operaciones

Estado: Listo para IA de lectura y analisis.

### Evidencia tecnica

- `analisis-operaciones-section` existe en `index.html`.
- `js/analisis-operaciones.js` existe.
- Datos estructurados relacionados: `parte_operations`, `flights`, `annual_operations`, `monthly_operations`, `daily_operations`.
- Existen modulos complementarios de analisis mensual/anual y YoY.

### Casos IA viables

- Explicar KPIs operativos.
- Detectar tendencias y anomalias.
- Generar resumen diario/semanal.
- Crear narrativa ejecutiva de indicadores.
- Sugerir preguntas de analisis.

### Requisitos antes de ampliar IA

- Definir fuentes canonicas por KPI.
- Documentar reglas de calculo.
- Implementar modo solo lectura inicialmente.
- Agregar disclaimer cuando haya datos incompletos.
- Guardar prompts/resultados si se usaran para reportes oficiales.

### Riesgos

- Interpretar datos parciales como concluyentes.
- Mezclar fuentes historicas con tablas actuales.
- Alucinar causas operativas no presentes en los datos.

## 4. Manifiestos

Estado: Parcialmente listo.

### Evidencia tecnica

- Existen modulos `js/manifiestos.js`, `js/manifiestos_pax.js`, `js/manifiestos-carga.js`, `js/manifiestos-analisis.js`, `js/portal-manifiestos.js`.
- Existen flujos de upload y analisis.
- Tablas relacionadas: `manifiestos_pasajeros`, `manifiestos_carga`, `manifiestos_pdfs`, `Conciliacion Manifiestos` y tablas historicas.
- Usa PDF/OCR, Storage y portal de revision.

### Casos IA viables

- Validacion asistida de campos OCR.
- Deteccion de inconsistencias.
- Comparacion contra vuelos/slots.
- Resumen de manifiestos por aerolinea.
- Sugerencia de correcciones antes de revision humana.

### Requisitos antes de ampliar IA

- Humano en el loop obligatorio.
- Marcar cada dato como extraido, corregido o validado.
- Auditoria de cambios sugeridos por IA.
- RLS especifico por tipo de usuario.
- Validaciones contra catalogos oficiales.

### Riesgos

- Error de OCR en datos operativos.
- Aprobacion incorrecta.
- Exposicion de datos sensibles.
- Campos historicos con nombres inconsistentes.
- Mezcla de manifiestos carga/pasajeros.

## 5. Demoras

Estado: Parcialmente listo.

### Evidencia tecnica

- `demoras-section` existe en `index.html`.
- `js/demoras.js` existe.
- Hay catalogos/codigos de demora en datos maestros y logica de analisis.

### Casos IA viables

- Clasificacion sugerida de codigos de demora.
- Analisis causal por aerolinea, ruta, hora o tipo.
- Deteccion de recurrencias.
- Generacion de resumen operativo.

### Requisitos antes de ampliar IA

- Confirmar tabla fuente y reglas oficiales de codificacion.
- Validar catalogo de codigos.
- No permitir reclasificacion automatica sin aprobacion.
- Documentar criterios de imputabilidad.

### Riesgos

- Clasificacion incorrecta.
- Confundir causa operacional con causa imputable.
- Impacto en reportes oficiales.

## 6. Puntualidad

Estado: Parcialmente listo.

### Evidencia tecnica

- `puntualidad-agosto-section` existe en `index.html`.
- `js/puntualidad.js` existe.
- `data-manager.js` usa `punctuality` y `punctuality_stats`.

### Casos IA viables

- Explicar variaciones de puntualidad.
- Detectar aerolineas/rutas fuera de tendencia.
- Generar resumen mensual.
- Relacionar puntualidad con demoras.

### Requisitos antes de ampliar IA

- Documentar formula de puntualidad.
- Definir fuente oficial.
- Validar cortes de fecha.
- Prohibir conclusiones causales sin evidencia.

### Riesgos

- Interpretaciones estadisticas incorrectas.
- Comparaciones con periodos incompletos.
- Uso de datos no oficiales.

## 7. TV Wall

Estado: Parcialmente listo.

### Evidencia tecnica

- Vista TV Wall y preview existen en `index.html`.
- `tv_notas` existe en SQL (`db/create_tv_wall_assets.sql`).
- `data-management.js` gestiona notas TV Wall.
- RLS de `tv_notas` permite lectura autenticada y escritura admin/editor.

### Casos IA viables

- Sugerir notas operativas.
- Resumir indicadores para pantalla.
- Generar mensajes breves para display.
- Detectar informacion prioritaria para rotacion.

### Requisitos antes de ampliar IA

- Las notas generadas por IA deben quedar en borrador.
- Publicacion solo por admin/editor.
- Limites de longitud y tono.
- Evitar datos sensibles en pantallas publicas.

### Riesgos

- Mostrar informacion no validada.
- Publicar datos sensibles en pantalla.
- Saturar la TV con mensajes automaticos.

## 8. Administracion

Estado: No listo para IA autonoma.

### Evidencia tecnica

- `admin-usuarios-section` existe.
- Usa `user_roles`, `usuarios_aplicaciones`, `areas`, `v_usuarios_roles`.
- Usa RPCs sensibles: `admin_create_user_role`, `admin_update_user_role`, `admin_update_user_permissions`, `admin_delete_user`, `admin_assign_operaciones_access`.
- `permissions.allowed_sections` y `permissions.section_levels` controlan visibilidad y niveles.

### Casos IA viables

- Revisar configuraciones de permisos.
- Explicar diferencias entre roles.
- Generar reportes de auditoria.
- Detectar inconsistencias en permisos.

### Requisitos antes de usar IA

- IA solo lectura por defecto.
- Confirmacion humana obligatoria para cualquier cambio.
- Logs de decisiones.
- Pruebas RLS y RPC.
- Rollback por usuario.

### Riesgos

- Escalacion indebida de privilegios.
- Revocar acceso critico.
- Crear usuarios con permisos excesivos.
- Cambiar acceso a OPERACIONES por error.

## 9. Reportes

Estado: Parcialmente listo.

### Evidencia tecnica

- Existen reportes como `hvac-reportes-section`.
- `js/hvac.js` usa `reportes_hvac`.
- SQL `db/reportes_hvac.sql` define tabla, RLS, indices y realtime.
- Hay otros modulos operativos con reportes en el sistema.

### Casos IA viables

- Resumen automatico de reportes.
- Deteccion de anomalias.
- Priorizacion de incidentes.
- Clasificacion de estados.
- Generacion de borradores de informe.

### Requisitos antes de ampliar IA

- Definir reportes por dominio.
- Establecer permisos por area.
- Validar datos sensibles.
- Mantener fuente y fecha en cada resumen.
- Probar con datos incompletos.

### Riesgos

- Generalizar entre dominios distintos.
- Priorizar incorrectamente incidentes.
- Exponer reportes de areas restringidas.

## 10. Documentacion

Estado: Listo.

### Evidencia tecnica

- Ya existe carpeta `docs/ai-methodology/`.
- Se han creado documentos de metodologia, OpenSpec, diagramas Mermaid y playbooks.

### Casos IA viables

- Generar specs.
- Actualizar contratos de modulo.
- Crear diagramas Mermaid.
- Redactar changelogs.
- Crear checklist QA.
- Documentar RLS y permisos.

### Requisitos antes de ampliar IA

- Revisar que no se documenten secretos.
- Mantener referencias a archivos reales.
- Separar decision tecnica de propuesta.
- Versionar cambios documentales.

### Riesgos

- Documentacion desactualizada.
- Inventar componentes inexistentes.
- Omitir restricciones de seguridad.

## Prioridad recomendada

1. Documentacion.
2. Analisis de operaciones.
3. Agenda en modo consulta.
4. Biblioteca con RAG controlado.
5. Puntualidad, demoras y reportes como analitica asistida.
6. TV Wall con borradores aprobados por humano.
7. Manifiestos con IA de validacion, no aprobacion automatica.
8. Administracion solo como auditor/revisor, no como ejecutor.

## Reglas generales para incorporar IA

- Empezar en modo lectura.
- Requerir confirmacion para escritura.
- Respetar `allowed_sections` y `section_levels`.
- Validar RLS antes de exponer datos a IA.
- Registrar acciones sugeridas o ejecutadas.
- Citar fuente de datos o documento.
- Separar inferencia de dato confirmado.
- No automatizar aprobaciones criticas sin humano en el loop.


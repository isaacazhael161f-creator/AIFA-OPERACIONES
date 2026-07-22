# Plantilla OpenSpec - Nueva Funcionalidad AIFA Operaciones

> Usar esta plantilla antes de construir cualquier nueva funcionalidad, modulo, automatizacion o integracion en AIFA Operaciones.
>
> Regla base: ninguna especificacion debe asumir tablas, roles, RPCs, buckets o permisos inexistentes. Todo debe verificarse en el repositorio o en Supabase antes de implementar.

## 1. Identificacion

- Nombre de la funcionalidad:
- Codigo corto / slug:
- Modulo relacionado:
- `data-section` propuesto:
- DOM host propuesto:
- Responsable funcional:
- Responsable tecnico:
- Fecha:
- Estado: Propuesta / En diseno / Aprobada / En desarrollo / En QA / Liberada

## 2. Objetivo

### Problema operativo

Describir que problema aeroportuario, administrativo u operativo resuelve.

### Resultado esperado

Describir el resultado medible esperado para usuarios y operacion.

### Fuera de alcance

Listar explicitamente lo que esta funcionalidad no resolvera en esta version.

## 3. Usuarios y Roles

| Usuario / Perfil | Necesidad | Permiso esperado | Comentarios |
|---|---|---|---|
| Viewer / lector |  |  |  |
| Capturista |  |  |  |
| Editor |  |  |  |
| Admin |  |  |  |
| Superadmin |  |  |  |
| Rol especializado |  |  |  |

## 4. Flujo Operativo

### Flujo principal

1. 
2. 
3. 

### Flujos alternos

- 

### Estados operativos

- Cargando:
- Sin datos:
- Datos parciales:
- Error de red:
- Error Supabase:
- Sin permiso:
- Sesion expirada:
- Guardado exitoso:
- Validacion fallida:

## 5. Cambios UI

### Navegacion

- Menu requerido: Si / No
- `data-section`:
- Seccion HTML: `#<clave>-section`
- Ubicacion en sidebar/nav deck:
- Acceso directo por hash/parametro:

### Componentes

- Tablas:
- Formularios:
- Filtros:
- Graficas:
- Modales:
- Botones de accion:
- Estados vacios:
- Alertas/toasts:

### Reglas visuales

- Debe ser usable en desktop:
- Debe ser usable en movil:
- Debe respetar modo actual de navegacion:
- Debe mostrar acciones solo si el rol puede ejecutarlas:
- Debe mostrar mensajes claros ante errores:

## 6. Datos y Supabase

### Tablas existentes

| Tabla | Uso | Operaciones | Comentarios |
|---|---|---|---|
|  | select / insert / update / delete |  |  |

### Tablas nuevas

| Tabla | Proposito | Campos clave | Indices | Auditoria |
|---|---|---|---|---|
|  |  |  |  |  |

### Vistas

| Vista | Proposito | Fuente | Permisos |
|---|---|---|---|
|  |  |  |  |

### RPCs

| RPC | Proposito | Seguridad | Roles permitidos |
|---|---|---|---|
|  |  | SECURITY DEFINER / normal |  |

### Storage buckets

| Bucket | Tipo de archivo | Acceso | Politicas |
|---|---|---|---|
|  |  | publico / privado / firmado |  |

## 7. RLS y Permisos

### Matriz de permisos

| Accion | Viewer | Capturista | Editor | Admin | Superadmin | Rol especializado |
|---|---:|---:|---:|---:|---:|---:|
| Ver | No | No | No | Si | Si | No |
| Crear | No | No | No | Si | Si | No |
| Editar | No | No | No | Si | Si | No |
| Borrar | No | No | No | Si | Si | No |
| Exportar | No | No | No | Si | Si | No |
| Administrar | No | No | No | Si | Si | No |

### Politicas RLS requeridas

- Tabla:
- SELECT:
- INSERT:
- UPDATE:
- DELETE:
- Excepciones:
- Justificacion de cualquier acceso anonimo:

### Permisos frontend

- `allowed_sections` requerido:
- `section_levels` requerido:
- Area/gerencia requerida:
- Acciones ocultas por UI:
- Acciones bloqueadas por servidor:

## 8. Eventos y Automatizacion

### Eventos frontend

| Evento | Emisor | Consumidor | Payload |
|---|---|---|---|
|  |  |  |  |

### Realtime

- Tablas observadas:
- Funcion de recarga:
- Debounce:
- Condiciones para evitar recargas:

### Edge Functions / jobs

| Funcion | Trigger | Entrada | Salida | Riesgos |
|---|---|---|---|---|
|  |  |  |  |  |

### Notificaciones

- Push:
- WhatsApp:
- Email:
- In-app:
- Reglas de envio:

## 9. Validaciones

### Validaciones frontend

- Campos obligatorios:
- Formatos:
- Rangos:
- Fechas:
- Archivos:
- Duplicados:
- Reglas de negocio:

### Validaciones backend / Supabase

- Constraints:
- Checks:
- Foreign keys:
- RPC validations:
- RLS with check:

### Mensajes de error

| Caso | Mensaje usuario | Mensaje tecnico/log |
|---|---|---|
|  |  |  |

## 10. Pruebas

### Pruebas unitarias

- 

### Pruebas de contrato

- Cada `data-section` tiene seccion DOM.
- Cada accion visible tiene permiso correspondiente.
- Cada tabla con escritura tiene RLS.

### Smoke manual

1. Login como admin.
2. Abrir modulo.
3. Cargar datos.
4. Crear registro.
5. Editar registro.
6. Validar usuario restringido.
7. Validar error controlado.

### Pruebas de permisos

| Caso | Usuario | Resultado esperado |
|---|---|---|
| Acceso permitido |  |  |
| Acceso denegado |  |  |
| Escritura denegada por RLS |  |  |
| Accion oculta en UI |  |  |

### Pruebas de datos

- Tabla vacia:
- Datos historicos:
- Datos incompletos:
- Datos con acentos:
- Datos duplicados:
- Fechas limite:

## 11. Rollback

### Rollback frontend

- Archivos a revertir:
- Funciones a desactivar:
- Feature flag si aplica:

### Rollback Supabase

- Migraciones reversibles:
- Politicas RLS a restaurar:
- RPCs a restaurar:
- Buckets/policies:

### Rollback de datos

- Tablas afectadas:
- Backup requerido:
- Script de revert:
- Riesgo de perdida:

## 12. Seguridad

### Riesgos

- Datos personales:
- Datos medicos:
- Datos operativos sensibles:
- Archivos PDF o imagenes:
- Usuarios/roles:
- Acceso externo:

### Controles requeridos

- RLS:
- RPC con validacion de rol:
- Sanitizacion de `innerHTML`:
- Validacion de archivos:
- Limite de tamano:
- Auditoria:
- Logs sin datos sensibles:

### Revision obligatoria

- Requiere revision de seguridad: Si / No
- Requiere revision de RLS: Si / No
- Requiere aprobacion funcional: Si / No

## 13. Documentacion

Actualizar o crear:

- Contrato de modulo:
- Guia de usuario:
- Guia tecnica:
- Matriz de permisos:
- SQL/RLS documentado:
- Playbook de pruebas:
- Registro de decisiones:

## 14. Criterios de Aceptacion

La funcionalidad se considera aceptada cuando:

- [ ] Cumple el objetivo operativo.
- [ ] Tiene flujo principal funcional.
- [ ] Maneja estados de carga, vacio, error y sin permiso.
- [ ] Respeta permisos frontend.
- [ ] Respeta RLS/RPC en Supabase.
- [ ] No rompe navegacion existente.
- [ ] No introduce errores bloqueantes en consola.
- [ ] Tiene pruebas o smoke documentado.
- [ ] Tiene rollback definido.
- [ ] Tiene documentacion minima actualizada.
- [ ] Fue validada por responsable funcional.

## 15. Prompt recomendado para IA

```text
Con base en esta OpenSpec, implementa la funcionalidad con alcance minimo. Antes de editar, confirma modulo, data-section, DOM host, archivos JS, tablas Supabase, RPCs, buckets, permisos y pruebas. No cambies IDs ni permisos existentes sin justificarlo. Al finalizar, reporta archivos modificados, validaciones, pruebas y riesgos residuales.
```


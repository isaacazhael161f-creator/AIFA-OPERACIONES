# Modelo de Permisos

## Objetivo

Documentar como debe razonar una IA o desarrollador antes de cambiar vistas, roles, RLS o flujos de autenticacion en AIFA Operaciones.

## Capas de control

### Identidad

Supabase Auth es la fuente de identidad. El frontend cachea datos de sesion en `sessionStorage`, pero esa cache no debe considerarse fuente de verdad para seguridad.

### Acceso a aplicacion

La compuerta de AIFA Operaciones esta en:

- `aplicaciones`
- `usuarios_aplicaciones`
- RPC `has_operaciones_access`
- RPC `admin_list_operaciones_user_ids`
- RPC `admin_assign_operaciones_access`

Regla esperada: un usuario normal debe tener asignacion activa a `OPERACIONES`. Roles globales como `superadmin` o `superuser` pueden entrar por excepcion controlada.

### Rol global

Tabla: `user_roles`.

Roles globales:

- `superadmin`: acceso total.
- `admin`: administracion operativa.
- `editor`: edicion amplia segun RLS.
- `capturista`: captura sin administracion.
- `lector`/`viewer`: lectura o visibilidad restringida.
- roles especializados: `control_fauna`, `servicio_medico`, `colab_editor`, `colab_viewer`.

### Permisos JSON

Campo: `user_roles.permissions`.

Estructura esperada:

```json
{
  "allowed_sections": ["inicio", "parte-operaciones"],
  "section_levels": {
    "parte-operaciones": "edit",
    "agenda": "read"
  },
  "area": "DO",
  "must_change_password": false
}
```

### RLS y RPC

Toda restriccion de seguridad debe existir en Supabase:

- RLS para tablas.
- RPC `SECURITY DEFINER` solo cuando sea necesario.
- Validacion de rol dentro de RPC admin.
- Grants explicitos a `authenticated`.
- Revocar `PUBLIC` en funciones sensibles.

## Principios

- Ocultar un boton no es seguridad.
- `sessionStorage` es conveniencia, no autorizacion.
- `allowed_sections` controla navegacion; RLS controla datos.
- Los permisos deben fallar cerrados para operaciones sensibles.
- Las politicas amplias para `authenticated` deben revisarse antes de exponer nuevos datos.

## Checklist para tocar permisos

- Identificar seccion afectada.
- Identificar tablas, vistas, RPCs y buckets usados.
- Revisar si `allowed_sections` aplica.
- Revisar si `section_levels` aplica.
- Confirmar rol minimo requerido para leer, capturar, editar y borrar.
- Validar RLS para cada operacion.
- Agregar o actualizar prueba de permiso.
- Probar usuario restringido y usuario admin.


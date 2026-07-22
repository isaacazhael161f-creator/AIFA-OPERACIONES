# Playbook de Pruebas

## Pruebas existentes

Comando:

```bash
npm test
```

Pruebas actuales:

- `__tests__/operaciones-access.test.js`
- `__tests__/initFlightServiceType.test.js`

## Matriz minima por tipo de cambio

### UI local

- Abrir modulo afectado.
- Validar desktop y movil.
- Revisar consola.
- Confirmar que no cambia navegacion global.

### Navegacion

- Click en menu.
- Retorno a nav deck.
- Acceso por hash o parametro si aplica.
- Validar seccion fallback para usuario restringido.

### Datos Supabase

- Probar carga exitosa.
- Probar error controlado.
- Validar tabla vacia.
- Validar datos con formatos historicos.

### Captura/edicion

- Insert.
- Update.
- Delete si aplica.
- Undo/cancel si existe.
- Historial/auditoria si aplica.

### Permisos

- Usuario admin/superadmin.
- Usuario editor/capturista.
- Usuario viewer/restringido.
- Usuario sin aplicacion OPERACIONES.
- Validar RLS directo, no solo UI.

### Storage/PDF

- Upload.
- Public URL o signed URL.
- Reemplazo/upsert.
- Nombre de archivo con acentos/espacios.
- Visualizacion en modal/lightbox.

### Realtime/notificaciones

- Cambio en tabla observada.
- Debounce.
- No duplicar listeners.
- No recargar cuando pestaña esta oculta si aplica.

## Pruebas recomendadas a agregar

- `showSection` respeta `allowed_sections`.
- `sectionLevel` resuelve `read/capture/edit/admin`.
- `has_operaciones_access` cubre roles globales y usuarios inactivos.
- Contrato de modulo: cada `data-section` tiene `#section-section`.
- Contrato de permisos: cada seccion administrable aparece en la matriz admin.
- Validacion de payloads criticos antes de insert/update.

## Smoke manual por release

- Login correcto.
- Login sin acceso OPERACIONES.
- Navegar a Operaciones Totales.
- Navegar a Itinerario Diario.
- Abrir Parte de Operaciones.
- Abrir Conciliacion.
- Abrir Agenda.
- Abrir Admin Usuarios con admin.
- Confirmar que viewer restringido no ve admin.
- Revisar consola sin errores bloqueantes.


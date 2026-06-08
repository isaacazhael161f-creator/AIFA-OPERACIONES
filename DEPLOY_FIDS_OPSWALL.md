# Deploy de pantalla OpsWall en controlador FIDS

Esta guia explica como conectar el controlador FIDS (sistema aparte) con la vista 4 cuadrantes de Operaciones.

## 1) Que archivo decide que se proyecta

El controlador FIDS lee:
- [default.json](default.json)

Y usa esta llave:
- `http.urls`

Valor esperado:
- `defaultLayout/OpsWallLayout.html`

Referencia:
- [default.json](default.json#L42)

## 2) Archivos que deben existir en el equipo FIDS

En el controlador NG-Client, la raiz web efectiva es la carpeta `pages`.

Por eso, estos archivos deben quedar asi:
- `C:\NG-Client\pages\defaultLayout\OpsWallLayout.html`
- `C:\NG-Client\pages\defaultLayout\DefaultLayout.html`
- `C:\NG-Client\pages\defaultLayout\tv-wall.js`
- `C:\NG-Client\pages\defaultLayout\tv-wall.css`
- `C:\NG-Client\pages\js\supabase-client.js`

Si falta uno, FIDS abre la pagina pero sin datos o sin estilo.

## 3) Base de datos y storage en Supabase

Ejecuta este script una sola vez en SQL Editor:
- [db/create_tv_wall_assets.sql](db/create_tv_wall_assets.sql)

Esto crea:
- bucket `rol_catorcenal`
- tabla `tv_notas`
- politicas RLS

Tambien debe existir la tabla de calendario de rutas:
- `route_launch_calendar` (ya creada en scripts previos)

## 4) Prueba local antes de enviar a FIDS

Abre en navegador del entorno web:
- Modo admin: `defaultLayout/DefaultLayout.html?admin=1`
- Modo TV: `defaultLayout/DefaultLayout.html?tv=1`

Debes verificar:
1. En admin, aparece carga de PDF y formulario de notas.
2. En TV, NO aparecen controles de edicion.
3. Se ven datos de YoY, notas y calendario.

## 5) Copia al controlador FIDS

En el equipo/servidor donde corre FIDS:
1. Reemplaza `C:\NG-Client\configuration\default.json` con la version actual.
2. Copia la carpeta `defaultLayout` dentro de `C:\NG-Client\pages\`.
3. Copia `js\supabase-client.js` dentro de `C:\NG-Client\pages\js\`.
4. Reinicia el proceso/controlador FIDS o recarga layout.

## 6) Verificacion en controlador FIDS (5 minutos)

1. Confirma que FIDS lee `http.urls = defaultLayout/OpsWallLayout.html`.
2. Abre consola/log de FIDS y busca errores 404 de archivos locales.
3. Si hay pantalla en blanco, revisar rutas relativas de archivos.
4. Si hay pantalla con UI pero sin datos, revisar salida a internet hacia Supabase.

## 7) Operacion diaria

- Para actualizar contenido:
  - Usar modo admin: `?admin=1`
  - Subir PDF rol
  - Crear/desactivar notas
- Para proyeccion:
  - Usar modo TV: `?tv=1`

Recomendado: guardar dos favoritos en el navegador del equipo de operaciones.

## 8) Fallas comunes y solucion

1. "No carga nada"
- Causa: FIDS esta leyendo otro `default.json`.
- Solucion: validar ruta fisica del config que consume el controlador.

2. "Carga layout pero sin estilo"
- Causa: falta `tv-wall.css`.
- Solucion: copiar carpeta `defaultLayout` completa.

3. "No salen datos"
- Causa: bloqueo de red a Supabase o credenciales no disponibles en `supabase-client.js`.
- Solucion: validar conectividad HTTPS y configuracion del cliente.

4. "No aparece boton de subir PDF"
- Causa: estas en modo TV.
- Solucion: usar `?admin=1`.

## 9) Checklist final de release

1. Script ejecutado: [db/create_tv_wall_assets.sql](db/create_tv_wall_assets.sql)
2. `http.urls` correcto: [default.json](default.json#L42)
3. Archivos copiados al entorno FIDS: [defaultLayout/OpsWallLayout.html](defaultLayout/OpsWallLayout.html), [defaultLayout/tv-wall.js](defaultLayout/tv-wall.js), [defaultLayout/tv-wall.css](defaultLayout/tv-wall.css)
4. Validacion admin y TV realizada.

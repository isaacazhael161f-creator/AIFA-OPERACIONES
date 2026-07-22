# Playbook de Cambios Asistidos por IA

## Objetivo

Reducir regresiones cuando una IA haga cambios en un sistema grande, global y sensible como AIFA Operaciones.

## Flujo recomendado

1. Entender el modulo

- Ubicar `data-section`.
- Ubicar `#section-section`.
- Ubicar archivos JS relacionados.
- Buscar funciones `window.*` expuestas.
- Identificar tablas Supabase y RPCs.

2. Clasificar el cambio

- UI solamente.
- Lectura de datos.
- Captura o edicion.
- Administracion/permisos.
- Storage/PDF.
- Realtime/notificaciones.
- SQL/RLS.

3. Evaluar riesgo

- Bajo: texto, estilo acotado, bug visual local.
- Medio: cambio de modulo con datos pero sin permisos.
- Alto: auth, permisos, RLS, SQL, storage, administracion, borrados, importaciones masivas.

4. Implementar en alcance minimo

- Preferir archivos de modulo sobre `script.js`.
- Evitar renombrar IDs existentes.
- No cambiar `data-section` sin migrar permisos.
- No mover logica de permisos sin prueba.
- No ampliar politicas RLS para "hacer que funcione".

5. Verificar

- Correr pruebas disponibles.
- Validar usuario admin.
- Validar usuario restringido si toca permisos.
- Validar navegacion al modulo.
- Validar que errores de Supabase se muestran sin romper UI.

6. Documentar

- Archivos tocados.
- Tablas/RPCs/buckets afectados.
- Pruebas realizadas.
- Riesgo residual.


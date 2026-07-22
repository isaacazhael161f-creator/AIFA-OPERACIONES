# Estrategia TDD y Cobertura de Pruebas - AIFA Operaciones

Fecha: 2026-07-22

## Objetivo del documento

Revisar la cobertura actual de pruebas y proponer una estrategia TDD para AIFA Operaciones.

## Estado actual observado

`package.json` define `npm test` con Jest. Las pruebas detectadas son:

- `__tests__/operaciones-access.test.js`
- `__tests__/initFlightServiceType.test.js`

Hay scripts auxiliares de diagnostico en `scripts/`, pero no constituyen una suite TDD completa.

## Para que debe usarlo una IA

Para proponer pruebas antes de implementar modulos, cambios Supabase/RLS, parsing de datos, asistentes IA o UI critica.

## Diagnostico de cobertura

Cobertura actual: baja.

Cubierto:

- regla basica de acceso a aplicacion OPERACIONES;
- inicializacion de catalogo `flightServiceType`.

No cubierto:

- navegacion `data-section` / `.content-section`;
- permisos `allowed_sections`;
- niveles `section_levels`;
- RLS real;
- RPCs admin;
- carga Supabase por modulo;
- parsing de manifiestos;
- operaciones/itinerarios;
- agenda;
- reportes;
- asistentes IA;
- RAG;
- UI critica.

## Estrategia TDD

### Regla base

Todo modulo nuevo debe comenzar con:

1. OpenSpec.
2. Contrato de modulo.
3. Matriz de permisos.
4. Prueba o checklist QA.
5. Implementacion.

## Capas de prueba

### 1. Unitarias JS

Objetivo: funciones puras, parsing, calculos, normalizacion.

Casos:

- normalizacion de fechas;
- clasificacion de vuelos;
- calculo de KPIs;
- parsing de manifiestos;
- codigos de demora;
- filtros de tablas;
- transformaciones para graficas.

### 2. Contrato DOM/navegacion

Objetivo: proteger convenciones centrales.

Pruebas recomendadas:

- cada `.menu-item[data-section]` tiene `#<section>-section`;
- no hay `data-section` duplicados;
- secciones sensibles estan en matriz de permisos;
- `showSection` no activa secciones sin permiso.

### 3. Permisos/RLS

Objetivo: validar modelo `user_roles`, `allowed_sections`, `section_levels`, `usuarios_aplicaciones`.

Pruebas recomendadas:

- usuario sin OPERACIONES no entra;
- viewer con secciones limitadas ve solo lo permitido;
- editor puede escribir solo donde corresponde;
- admin/superadmin gestionan permisos;
- RLS deniega escritura no autorizada.

Nota: las pruebas RLS deben ejecutarse contra ambiente controlado, nunca contra produccion sin dataset aislado.

### 4. UI critica

Objetivo: smoke de flujos principales.

Flujos:

- login;
- operaciones totales;
- itinerario diario;
- parte de operaciones;
- agenda;
- manifiestos;
- administracion de usuarios;
- biblioteca;
- reportes.

### 5. Parsing de datos

Objetivo: proteger importaciones y datos historicos.

Casos:

- Excel manifiestos;
- PDF/OCR manifiestos;
- itinerarios;
- catalogos maestros;
- fechas con acentos/meses;
- nombres de aerolineas;
- codigos IATA/ICAO;
- datos incompletos.

### 6. Asistentes IA

Objetivo: validar que los asistentes respeten permisos y no ejecuten acciones indebidas.

Casos:

- contexto minimo;
- usuario sin permiso;
- accion de lectura;
- accion de escritura requiere confirmacion;
- log generado;
- datos sensibles no incluidos;
- respuesta con fuente.

### 7. RAG

Objetivo: validar busqueda documental segura.

Casos:

- documento permitido;
- documento restringido;
- documento archivado;
- pregunta sin evidencia;
- cita correcta;
- pagina correcta;
- chunk con metadatos.

## Checklist antes de despliegue

- [ ] `npm test` ejecutado.
- [ ] Pruebas del modulo agregadas o justificadas.
- [ ] Smoke manual documentado.
- [ ] Permisos/RLS revisados.
- [ ] SQL no ejecutado sin revision.
- [ ] No hay secretos en prompts/logs.
- [ ] Documentacion actualizada.
- [ ] Rollback definido.

## Comandos sugeridos

```bash
npm test
npm run dev
```

Si se agregan futuras herramientas:

```bash
npm run lint
npm run test:ui
npm run test:rls
```

Estos comandos futuros no existen actualmente y no deben asumirse sin actualizar `package.json`.

## Bloqueadores antes de una estrategia TDD completa

- Falta runner UI automatizado documentado.
- Falta ambiente Supabase local/test documentado.
- Falta suite de contratos DOM.
- Falta estrategia de fixtures para datos aeroportuarios.
- Falta separacion de funciones puras para testear sin DOM.


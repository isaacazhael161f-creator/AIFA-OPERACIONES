# Especificacion Interna de Uso de IA - AIFA Operaciones

Fecha: 2026-07-22

## 1. Proposito

Esta especificacion define como usar IA en AIFA Operaciones para desarrollo, analisis, automatizacion, QA, documentacion, seguridad y construccion de productos con IA.

Esta guia esta adaptada a una aplicacion web JavaScript con Supabase, RLS, Storage, Realtime, Edge Functions y modulos operativos aeroportuarios. Su objetivo es mejorar velocidad y calidad sin comprometer seguridad, trazabilidad ni continuidad operativa.

## 2. Principios rectores

- La IA apoya decisiones tecnicas, no reemplaza revision humana en cambios sensibles.
- Todo cambio debe iniciar con contexto: modulo, `data-section`, DOM host, archivos JS, tablas, RPCs, buckets, permisos y pruebas.
- La UI puede ocultar acciones, pero la seguridad debe vivir en Supabase mediante RLS y RPCs controladas.
- Ninguna ampliacion de permisos debe hacerse para "desbloquear rapido" sin documentar impacto.
- Los cambios deben ser pequenos, verificables y reversibles.
- Los modulos aeroportuarios deben privilegiar continuidad operativa, claridad visual, auditoria y datos confiables.
- La IA no debe inventar tablas, roles, endpoints, rutas ni politicas RLS: debe verificarlos en el repositorio o pedir confirmacion.

## 3. Alcance de uso de IA

La IA puede utilizarse en:

- Analisis de arquitectura y dependencias.
- Diseno de nuevos modulos.
- Programacion frontend.
- Integracion Supabase.
- SQL, RLS y RPCs, con revision humana.
- Automatizaciones internas.
- QA manual y automatizado.
- Refactorizacion controlada.
- Documentacion tecnica.
- Generacion de especificaciones y user stories.
- Prototipos de productos con IA.

La IA no debe ejecutar ni proponer cambios destructivos sin aprobacion explicita cuando involucren:

- Borrado masivo de datos.
- Cambios RLS en tablas productivas.
- Eliminacion de usuarios, roles o buckets.
- Rotacion o exposicion de llaves.
- Modificaciones de login o acceso a aplicaciones.
- Importaciones masivas sin plan de rollback.

## 4. Pilares del desarrollo asistido por IA

### 4.1 Spec-Driven Development

Todo modulo nuevo debe iniciar con una especificacion breve:

- problema operativo que resuelve;
- usuarios objetivo;
- flujo principal;
- datos requeridos;
- permisos por rol;
- tablas, RPCs y buckets;
- reglas de negocio;
- estados vacio, carga, error y sin permiso;
- pruebas esperadas.

La IA debe generar primero la especificacion y despues implementar. Si el modulo toca RLS, usuarios o datos sensibles, la especificacion debe revisarse antes de escribir codigo.

### 4.2 Contexto y prompting tecnico

Antes de pedir implementacion a IA, proporcionar:

- nombre del modulo;
- `data-section`;
- archivos relacionados;
- tablas Supabase;
- permisos esperados;
- ejemplo de datos;
- comportamiento actual;
- comportamiento deseado;
- restricciones de no romper compatibilidad.

Prompt recomendado:

```text
Trabaja en el modulo <modulo>. Antes de editar, identifica data-section, DOM host, archivos JS, tablas Supabase, RPCs, buckets, permisos y pruebas. Implementa con alcance minimo, sin renombrar IDs ni cambiar permisos salvo que sea necesario.
```

### 4.3 Proyectos AI-Ready

Para que el repositorio sea mas facil de modificar con IA, cada modulo debe tener:

- contrato tecnico documentado;
- nombres consistentes;
- inicializador idempotente;
- funciones globales documentadas si existen;
- validaciones de entrada;
- errores visibles al usuario;
- pruebas o smoke checklist;
- permisos declarados.

### 4.4 Subagentes y automatizacion

Se recomienda usar agentes especializados solo cuando el trabajo sea separable:

- agente de arquitectura: identifica impacto y dependencias;
- agente de RLS: revisa politicas, roles y RPCs;
- agente de QA: propone pruebas y smoke plan;
- agente de documentacion: actualiza contratos y guias;
- agente de frontend: revisa responsividad y accesibilidad.

Ningun subagente debe tomar decisiones finales sobre permisos o datos productivos sin revision principal.

## 5. Reglas para desarrollo frontend

### 5.1 Modulos JS

Nuevas funcionalidades deben vivir preferentemente en `js/<modulo>.js`. Evitar crecer `script.js` salvo que el cambio pertenezca a una funcion central ya existente.

Cada modulo debe exponer un inicializador claro:

```js
window.initNombreModulo = async function initNombreModulo() {
  // idempotente
};
```

Reglas:

- No depender de que el usuario visite otro modulo primero.
- No registrar listeners duplicados.
- No crear multiples intervalos o subscripciones sin cleanup.
- No romper funciones `window.*` usadas por HTML existente.
- No renombrar IDs, clases clave o `data-section` sin migracion.

### 5.2 Navegacion

Cada modulo debe cumplir:

- menu con `.menu-item[data-section="clave"]`;
- seccion con `#clave-section.content-section`;
- inicializacion desde `showSection` o evento equivalente;
- fallback si el modulo no tiene permiso o no tiene datos.

### 5.3 Estados obligatorios

Cada pantalla operativa debe contemplar:

- cargando;
- sin datos;
- error Supabase;
- sin permiso;
- datos parciales;
- modo solo lectura;
- guardado exitoso;
- validacion fallida.

## 6. Reglas para Supabase

### 6.1 Cliente

El cliente Supabase anon puede estar en frontend, pero no debe conceder poder por si mismo. Toda autorizacion sensible debe resolverse en RLS o RPC.

Buenas practicas:

- Centralizar inicializacion con `ensureSupabaseClient`.
- Validar existencia de sesion antes de escribir.
- Mostrar errores de Supabase con mensajes operables.
- No confiar en `sessionStorage` para autorizacion.
- Evitar queries sin limites en tablas grandes.

### 6.2 Tablas

Toda tabla nueva debe documentar:

- proposito;
- propietario funcional;
- campos obligatorios;
- indices;
- relacion con modulo;
- RLS;
- operaciones permitidas por rol.

### 6.3 RPCs

Usar RPC cuando:

- se requiere operacion atomica;
- se modifica informacion sensible;
- se necesita validar rol en servidor;
- se evitan multiples escrituras desde cliente;
- se requiere auditoria.

RPC sensible debe:

- usar `SECURITY DEFINER` solo si es necesario;
- declarar `set search_path`;
- revocar `PUBLIC`;
- conceder solo a `authenticated`;
- validar rol llamador;
- fallar cerrado;
- devolver errores claros.

## 7. Reglas para RLS y seguridad

### 7.1 Principios RLS

- RLS es obligatorio para tablas nuevas.
- Lectura publica solo si el dato es realmente publico.
- Escritura amplia para `authenticated` debe considerarse riesgo alto.
- Admin/superadmin no deben ser la unica proteccion si hay areas o niveles por modulo.
- Las politicas deben probarse con usuarios reales o tests de permiso.

### 7.2 Matriz minima de permisos

Cada modulo debe declarar:

| Accion | Viewer | Capturista | Editor | Admin | Superadmin |
|---|---:|---:|---:|---:|---:|
| Ver | Si/No | Si/No | Si/No | Si | Si |
| Crear | No | Si/No | Si/No | Si | Si |
| Editar | No | Si/No | Si/No | Si | Si |
| Borrar | No | No | Si/No | Si | Si |
| Administrar permisos | No | No | No | Si | Si |

### 7.3 Datos sensibles

Requieren revision especial:

- usuarios y roles;
- datos medicos;
- manifiestos;
- PDFs firmados;
- informacion personal de colaboradores;
- alertas y telefonos WhatsApp;
- bitacoras operativas;
- datos de seguridad o emergencias.

## 8. QA con IA

La IA debe generar pruebas antes o junto con el cambio cuando sea posible.

### 8.1 Pruebas minimas por cambio

- UI: smoke manual y revision responsive.
- Datos: prueba de carga, vacio y error.
- Captura: insert/update/delete segun aplique.
- Permisos: admin y usuario restringido.
- RLS: intento permitido y denegado.
- Storage: upload, URL y visualizacion.
- Realtime: no duplicar recargas ni listeners.

### 8.2 QA asistido por IA

La IA puede crear:

- checklist de pruebas manuales;
- pruebas Jest;
- pruebas de contrato DOM;
- pruebas de permisos;
- matriz de casos borde;
- escenarios de regresion.

Para modulos criticos, la IA debe incluir casos de:

- datos incompletos;
- fechas en formato historico;
- acentos y caracteres especiales;
- tablas vacias;
- sesion expirada;
- conexion lenta o fallida;
- usuario sin permisos.

## 9. Documentacion tecnica

Cada cambio relevante debe actualizar o crear documentacion en `docs/ai-methodology/` o una carpeta funcional equivalente.

Documentacion esperada:

- contrato de modulo;
- decisiones tecnicas;
- tablas/RPCs/buckets usados;
- permisos;
- pruebas;
- riesgos residuales;
- instrucciones de operacion si aplica.

Regla: si una IA necesita descubrir el mismo contexto dos veces, ese contexto debe documentarse.

## 10. Automatizacion con IA

Casos recomendados:

- generacion de SQL desde especificacion;
- revision de RLS;
- generacion de pruebas;
- analisis de logs;
- extraccion y normalizacion de datos;
- documentacion de modulos;
- checklist de despliegue;
- resumen de cambios para PR.

Toda automatizacion debe tener:

- entrada definida;
- salida validable;
- log o reporte;
- modo dry-run cuando afecte datos;
- rollback o forma de repetir de manera segura.

## 11. Productos con IA

AIFA Operaciones puede incorporar productos con IA si respetan seguridad y trazabilidad.

### 11.1 Chatbots de texto o voz

Permitidos para:

- consulta de procedimientos;
- ayuda dentro del sistema;
- busqueda de informacion operativa;
- explicacion de reportes;
- asistencia a captura.

Reglas:

- no deben exponer datos fuera del permiso del usuario;
- deben citar fuente interna o modulo;
- deben distinguir dato confirmado vs inferencia;
- deben registrar consultas sensibles si aplica;
- no deben ejecutar acciones destructivas sin confirmacion.

### 11.2 RAG y bases vectoriales

Uso recomendado para:

- manuales internos;
- procedimientos;
- actas;
- directorios;
- guias operativas;
- historico documental.

Requisitos:

- control de acceso por documento;
- metadatos de fuente;
- versionado;
- trazabilidad de respuesta;
- no mezclar documentos publicos y restringidos sin filtro por permisos.

### 11.3 Agentes

Agentes permitidos:

- agente de agenda;
- agente de analisis operativo;
- agente de QA;
- agente de soporte documental;
- agente de revision RLS;
- agente de conciliacion asistida.

Reglas:

- un agente debe tener alcance limitado;
- debe pedir confirmacion para acciones de escritura;
- debe registrar acciones;
- debe respetar permisos del usuario;
- debe evitar cambios masivos sin vista previa.

### 11.4 Arquitecturas multiagente

Usar multiagente solo cuando haya separacion real de responsabilidades:

- planificador;
- analista de datos;
- ejecutor tecnico;
- auditor de seguridad;
- QA;
- documentador.

La decision final debe quedar en un orquestador humano o en un flujo aprobado.

## 12. DevOps y despliegue

La IA puede ayudar a:

- revisar cambios antes de deploy;
- generar checklist;
- detectar dependencias CDN;
- revisar migraciones;
- comparar schema esperado vs SQL;
- preparar notas de version.

Checklist minimo antes de despliegue:

- pruebas ejecutadas;
- permisos revisados;
- migraciones ordenadas;
- variables de entorno revisadas;
- storage buckets confirmados;
- rollback documentado;
- smoke de login y navegacion.

## 13. Ciberseguridad

La IA debe revisar explicitamente:

- exposicion de llaves;
- RLS ausente o laxo;
- RPC con `SECURITY DEFINER` sin validacion;
- uploads sin control de tipo/tamano;
- XSS por `innerHTML`;
- datos personales visibles para roles incorrectos;
- endpoints Express sin auth;
- dependencia CDN no confiable;
- logs con informacion sensible.

Regla: cualquier hallazgo de seguridad debe reportarse primero como riesgo, no corregirse a ciegas.

## 14. Formato de especificacion para nuevos modulos

```md
# Especificacion de Modulo: <Nombre>

## Objetivo operativo

## Usuarios y roles

## Flujo principal

## Navegacion

- data-section:
- DOM host:
- menu:

## Datos

- tablas:
- vistas:
- RPCs:
- buckets:

## Permisos

| Accion | Roles permitidos | Control UI | Control RLS/RPC |
|---|---|---|---|

## Estados UI

- cargando:
- vacio:
- error:
- sin permiso:
- exito:

## Automatizaciones

## QA

## Riesgos

## Criterios de aceptacion
```

## 15. Reglas de oro

- Primero especificar, despues construir.
- Primero entender permisos, despues escribir queries.
- Primero validar RLS, despues confiar en UI.
- Primero contrato de modulo, despues codigo.
- Primero pruebas minimas, despues refactor.
- Primero documentar decisiones, despues repetir patrones.


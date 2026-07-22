# Prompts para Desarrollo Asistido por IA

## Analisis de modulo

```text
Analiza el modulo <NOMBRE> en este repositorio. Identifica data-section, DOM host, archivos JS, funciones globales, tablas Supabase, RPCs, buckets, permisos, pruebas existentes y riesgos. No modifiques archivos.
```

## Cambio pequeno seguro

```text
Implementa el cambio <CAMBIO> con el menor alcance posible. Antes de editar, confirma el modulo y archivos afectados. No cambies IDs, data-section ni permisos salvo que sea estrictamente necesario. Al final reporta pruebas ejecutadas.
```

## Nuevo modulo

```text
Crea un nuevo modulo para <FUNCION>. Debe incluir data-section, content-section, inicializador idempotente, permisos documentados, tablas/RPCs/buckets identificados y prueba o checklist de validacion. Sigue patrones existentes.
```

## Revision de permisos

```text
Revisa permisos para <MODULO/TABLA>. Distingue UI, user_roles.permissions, usuarios_aplicaciones, RPC y RLS. Identifica huecos donde el frontend oculte acciones pero la base permita escritura.
```

## Endurecimiento RLS

```text
Propón SQL RLS para <TABLA>. Debe fallar cerrado, documentar roles permitidos por operacion, revocar acceso innecesario y no romper los flujos actuales. No ejecutes SQL.
```

## Refactor seguro

```text
Refactoriza <AREA> sin cambiar comportamiento. Mantén compatibilidad con funciones window.* existentes, conserva IDs y data-section, y agrega una prueba de contrato si es posible.
```

## Diagnostico de bug

```text
Investiga el bug <BUG>. Primero identifica flujo, modulo, eventos, estado global, llamadas Supabase y permisos. Despues implementa un fix minimo y valida con prueba o smoke manual.
```

## Cierre de cambio

```text
Entrega resumen corto con: archivos modificados, comportamiento cambiado, tablas/RPCs/buckets afectados, permisos afectados, pruebas ejecutadas y riesgo residual.
```


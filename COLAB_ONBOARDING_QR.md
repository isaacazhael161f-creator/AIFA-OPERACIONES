# Onboarding por QR para nuevos colaboradores

## Archivos implementados

- [colaborador-registro.html](colaborador-registro.html)
- [db/create_colab_onboarding_portal.sql](db/create_colab_onboarding_portal.sql)

## Que hace

1. El colaborador escanea QR y abre una vista publica con token.
2. Llena datos personales.
3. Sube INE frente, INE reverso y TIA.
4. Guarda avance parcial o final.
5. Si le falta algo, regresa con el mismo QR y continua.
6. Todo se guarda en `agenda_2026` via funcion segura por token.

## Paso 1: ejecutar SQL en Supabase

Ejecuta completo:
- [db/create_colab_onboarding_portal.sql](db/create_colab_onboarding_portal.sql)

## Paso 2: crear token para un colaborador

Como admin/editor autenticado en SQL Editor:

```sql
select public.create_colab_onboarding_link('1299-2', 30, '{"area":"Direccion de Operacion"}'::jsonb);
```

La salida trae:
- `token`
- `url_suffix` (ejemplo: `colaborador-registro.html?token=...`)

## Paso 3: construir URL final para QR

Usa tu dominio del sistema + `url_suffix`, por ejemplo:

```text
https://tu-dominio-aifa/colaborador-registro.html?token=TOKEN_GENERADO
```

Con esa URL generas el QR (impreso o digital).

## Paso 4: reingreso para completar fotos faltantes

El colaborador vuelve a abrir la misma URL del QR.
El portal carga lo ya guardado y permite subir lo faltante.

## Campos que actualiza

El backend detecta columnas reales de `agenda_2026` y actualiza:
- numero de empleado
- nombre
- puesto
- curp
- celular
- correo institucional
- correo personal
- fecha de ingreso
- onomastico
- foto_ine
- foto_ine_rev
- foto_cred
- onboarding_actualizado_en
- onboarding_estado

## Estado de completitud

- `onboarding_estado = 'completo'` cuando ya existen INE frente + INE reverso + TIA.
- Si falta alguno queda `pendiente`.

## Notas tecnicas

- El portal guarda las fotos como Data URL en las columnas de onboarding para evitar bloqueos por politicas de Storage en acceso publico anonimo.
- El acceso esta controlado por token y fecha de expiracion.

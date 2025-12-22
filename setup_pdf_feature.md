# Configuración de la Funcionalidad de PDF para Parte de Operaciones

Para habilitar la subida de archivos PDF en el "Parte de Operaciones", sigue estos pasos:

## 1. Actualizar la Base de Datos

Ejecuta el siguiente comando SQL en el Editor SQL de Supabase para agregar la columna necesaria a la tabla `daily_operations`:

```sql
ALTER TABLE daily_operations ADD COLUMN IF NOT EXISTS pdf_file TEXT;
```

## 2. Configurar el Almacenamiento (Storage)

1.  Ve a la sección **Storage** en tu panel de Supabase.
2.  Crea un nuevo "Bucket" llamado **`operations_files`**.
3.  Asegúrate de que el bucket sea **Público** (Public).
4.  (Opcional) Configura las políticas de seguridad (RLS) para permitir la subida de archivos solo a usuarios autenticados, pero lectura pública.

### Políticas de Storage Recomendadas:

Si habilitas RLS en el bucket `operations_files`, agrega estas políticas:

*   **SELECT (Lectura):** Permitir a todos (`anon` y `authenticated`).
*   **INSERT (Escritura):** Permitir solo a `authenticated`.
*   **UPDATE (Actualización):** Permitir solo a `authenticated`.
*   **DELETE (Borrado):** Permitir solo a `authenticated`.

## 3. Verificar

Una vez realizados estos pasos, recarga la aplicación. Ahora deberías ver:
1.  Un campo de archivo "Parte de Operaciones (PDF)" al editar o agregar un registro en "Operaciones Diarias".
2.  Un icono de PDF en la tabla de "Operaciones Diarias" si el registro tiene un archivo adjunto.

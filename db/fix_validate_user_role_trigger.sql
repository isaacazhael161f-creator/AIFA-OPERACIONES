-- ============================================================
-- PARCHE: agregar control_fauna y servicio_medico a la lista
-- de roles globales válidos en el trigger de validación.
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public._validate_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _global_roles TEXT[] := ARRAY[
        'admin', 'superadmin', 'editor', 'viewer',
        'colab_viewer', 'colab_editor',
        'control_fauna', 'servicio_medico'
    ];
BEGIN
    -- Roles globales: siempre válidos
    IF NEW.role = ANY(_global_roles) THEN
        RETURN NEW;
    END IF;

    -- Roles de área: debe existir en la tabla areas como clave activa
    IF EXISTS (
        SELECT 1 FROM public.areas
        WHERE clave = NEW.role
          AND estado = 'ACTIVO'
    ) THEN
        RETURN NEW;
    END IF;

    -- También aceptar claves legacy de nombre-rol por compatibilidad
    IF NEW.role IN (
        'operacion', 'administracion', 'planeacion',
        'comercial', 'seguridad_op', 'transparencia', 'calidad'
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION
        'Rol inválido: "%". Debe ser un rol global (admin/editor/viewer…) '
        'o la clave exacta de un área activa del organigrama (DO, GSO, SD-SO, etc.).',
        NEW.role;
END;
$$;

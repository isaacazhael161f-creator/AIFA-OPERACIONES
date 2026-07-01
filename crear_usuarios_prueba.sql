-- ============================================================
--  USUARIOS DE PRUEBA — PORTAL DE MANIFIESTOS AIFA
--  Ejecutar en Supabase SQL Editor (una sola vez).
--
--  Crea 4 usuarios con contraseña para probar el flujo completo
--  de captura y DOBLE APROBACIÓN (AIFA + AFAC).
--
--  ┌─────────────────────────────┬────────────┬────────────┐
--  │ Usuario / correo            │ Contraseña │ Rol        │
--  ├─────────────────────────────┼────────────┼────────────┤
--  │ aerolinea@aifa.operaciones  │ demo1234   │ aerolinea  │
--  │ aifa@aifa.operaciones       │ aifa1234   │ aifa       │
--  │ afac@aifa.operaciones       │ afac1234   │ afac       │
--  │ admin@aifa.operaciones      │ admin1234  │ admin      │
--  └─────────────────────────────┴────────────┴────────────┘
--
--  En el portal pueden entrar escribiendo solo el usuario
--  (ej. "aifa") — el sistema completa "@aifa.operaciones".
-- ============================================================

-- pgcrypto ya viene habilitado en Supabase (para crypt()/gen_salt())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función auxiliar temporal para crear/actualizar un usuario con rol
CREATE OR REPLACE FUNCTION public._crear_usuario_prueba(
    p_email text,
    p_password text,
    p_meta jsonb
) RETURNS void AS $$
DECLARE
    v_uid uuid;
BEGIN
    SELECT id INTO v_uid FROM auth.users WHERE email = p_email;

    IF v_uid IS NULL THEN
        v_uid := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            raw_app_meta_data, raw_user_meta_data,
            confirmation_token, recovery_token,
            email_change_token_new, email_change
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid, 'authenticated', 'authenticated', p_email,
            crypt(p_password, gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            p_meta,
            '', '', '', ''
        );

        INSERT INTO auth.identities (
            provider_id, user_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', p_email),
            'email', now(), now(), now()
        );
    ELSE
        -- Ya existe: actualiza contraseña y rol/metadata
        UPDATE auth.users
           SET encrypted_password = crypt(p_password, gen_salt('bf')),
               raw_user_meta_data  = COALESCE(raw_user_meta_data, '{}'::jsonb) || p_meta,
               email_confirmed_at  = COALESCE(email_confirmed_at, now()),
               updated_at          = now()
         WHERE id = v_uid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear los 4 usuarios de prueba
SELECT public._crear_usuario_prueba(
    'aerolinea@aifa.operaciones', 'demo1234',
    '{"role":"aerolinea","company":"Aerolínea Demo","full_name":"Aerolínea Demo"}'::jsonb);

SELECT public._crear_usuario_prueba(
    'aifa@aifa.operaciones', 'aifa1234',
    '{"role":"aifa","full_name":"Operaciones AIFA"}'::jsonb);

SELECT public._crear_usuario_prueba(
    'afac@aifa.operaciones', 'afac1234',
    '{"role":"afac","full_name":"Autoridad AFAC"}'::jsonb);

SELECT public._crear_usuario_prueba(
    'admin@aifa.operaciones', 'admin1234',
    '{"role":"admin","full_name":"Administrador AIFA"}'::jsonb);

-- Limpiar la función auxiliar
DROP FUNCTION public._crear_usuario_prueba(text, text, jsonb);

-- Verificación
SELECT email,
       raw_user_meta_data->>'role' AS rol,
       raw_user_meta_data->>'full_name' AS nombre,
       email_confirmed_at IS NOT NULL AS confirmado
FROM auth.users
WHERE email IN (
    'aerolinea@aifa.operaciones',
    'aifa@aifa.operaciones',
    'afac@aifa.operaciones',
    'admin@aifa.operaciones'
)
ORDER BY email;

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    // --- Lógica para alternar entre formularios ---
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', () => {
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', () => {
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    }

    // --- Lógica para el REGISTRO ---
    if (registerForm) {
        // Asegurar que el input sea de tipo texto para permitir usernames
        const emailInput = document.getElementById('register-email');
        if (emailInput) emailInput.type = 'text';

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const nombre = document.getElementById('register-name').value;
            let email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            try {
                if (!window.supabaseClient) throw new Error('Supabase no inicializado');

                // Limpiar espacios
                email = email.trim();

                // Convertir usuario a email falso si es necesario
                if (email && !email.includes('@')) {
                    // Normalizar: quitar espacios, acentos y convertir a minúsculas
                    const normalized = email
                        .trim()
                        .toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/\s+/g, '.');
                    
                    email = `${normalized}@aifa.operaciones`;
                }

                const { data, error } = await window.supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: nombre,
                        }
                    }
                });
                
                if (error) throw error;

                // Verificar si el usuario fue creado pero requiere confirmación
                if (data.user && !data.session) {
                    alert('⚠️ Usuario creado, pero Supabase requiere confirmación de email.\n\nIMPORTANTE: Ve a tu panel de Supabase > Authentication > Providers > Email y desactiva "Confirm email" para usar correos falsos.');
                } else {
                    alert('✅ ¡Usuario registrado con éxito! Ahora inicia sesión.');
                }
                
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            } catch (error) {
                console.error('Error registro:', error);
                alert(`❌ Error: ${error.message || error.error_description || JSON.stringify(error)}`);
            }
        });
    }

    // --- Lógica para el LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email') || document.getElementById('username');
            const passwordInput = document.getElementById('login-password') || document.getElementById('password');
            
            let email = emailInput ? emailInput.value : '';
            const password = passwordInput ? passwordInput.value : '';

            try {
                if (!window.supabaseClient) throw new Error('Supabase no inicializado');

                // Convertir usuario a email falso si es necesario
                if (email && !email.includes('@')) {
                    // Normalizar: quitar espacios, acentos y convertir a minúsculas
                    const normalized = email
                        .trim()
                        .toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/\s+/g, '.');
                    
                    email = `${normalized}@aifa.operaciones`;
                }

                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Store session
                sessionStorage.setItem('user', JSON.stringify(data.user));
                sessionStorage.setItem('token', data.session.access_token);

                // Obtener rol
                let role = 'viewer';
                try {
                    const { data: roleData } = await window.supabaseClient
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', data.user.id)
                        .single();
                    if (roleData && roleData.role) role = roleData.role;
                } catch (_) {}
                sessionStorage.setItem('user_role', role);

                alert('✅ Inicio de sesión exitoso');
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    // --- Lógica para alternar entre formularios ---
    showRegisterLink.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // --- Lógica para el REGISTRO ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const nombre = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            await axios.post('http://localhost:5000/api/auth/register', {
                nombre,
                email,
                password
            });
            alert('✅ ¡Usuario registrado con éxito! Ahora inicia sesión.');
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        } catch (error) {
            alert(`❌ Error: ${error.response.data.msg}`);
        }
    });

    // --- Lógica para el LOGIN ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });
            localStorage.setItem('aifa-token', response.data.token);
            alert('✅ ¡Inicio de sesión exitoso!');
            window.location.href = './index.html'; 
        } catch (error) {
            alert(`❌ Error: ${error.response.data.msg}`);
        }
    });
});
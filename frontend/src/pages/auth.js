/**
 * Pagina Auth — Login e Registrazione.
 */
import { login, register, isLoggedIn } from '../api.js';
import { navigate } from '../router.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../toast.js';

export async function renderAuth(container) {
  if (isLoggedIn()) {
    navigate('home');
    return;
  }

  container.innerHTML = `
    <div class="auth-container">
      <div class="page-header">
        <h1>🎨 QuickSketch</h1>
        <p>Accedi o registrati per iniziare a giocare</p>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-login">Accedi</button>
        <button class="auth-tab" id="tab-register">Registrati</button>
      </div>

      <div class="card" id="auth-form-container">
        <!-- Login form -->
        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-username">Username o Email</label>
            <input class="form-input" type="text" id="login-username" placeholder="Il tuo username" required autocomplete="username" />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" type="password" id="login-password" placeholder="La tua password" required autocomplete="current-password" />
          </div>
          <div id="login-error" class="form-error"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg mt-2" id="login-submit">
            Accedi
          </button>
        </form>

        <!-- Register form (hidden) -->
        <form id="register-form" style="display:none">
          <div class="form-group">
            <label class="form-label" for="reg-username">Username</label>
            <input class="form-input" type="text" id="reg-username" placeholder="Scegli un username" required minlength="3" maxlength="30" autocomplete="username" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input class="form-input" type="email" id="reg-email" placeholder="La tua email" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Password</label>
            <input class="form-input" type="password" id="reg-password" placeholder="Minimo 6 caratteri" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password-confirm">Conferma Password</label>
            <input class="form-input" type="password" id="reg-password-confirm" placeholder="Ripeti la password" required autocomplete="new-password" />
          </div>
          <div id="register-error" class="form-error"></div>
          <button type="submit" class="btn btn-accent btn-block btn-lg mt-2" id="register-submit">
            Registrati
          </button>
        </form>
      </div>
    </div>
  `;

  // Tab switching
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Accesso in corso...';

    try {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      await login(username, password);
      showToast('Login effettuato con successo!', 'success');
      renderNavbar();
      navigate('home');
    } catch (err) {
      errorEl.textContent = err.error || 'Errore durante il login';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Accedi';
    }
  });

  // Register handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    const submitBtn = document.getElementById('register-submit');
    errorEl.textContent = '';

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
      errorEl.textContent = 'Le password non coincidono';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrazione...';

    try {
      await register(username, email, password);
      showToast('Registrazione completata! Benvenuto! 🎉', 'success');
      renderNavbar();
      navigate('home');
    } catch (err) {
      errorEl.textContent = err.error || 'Errore durante la registrazione';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Registrati';
    }
  });
}

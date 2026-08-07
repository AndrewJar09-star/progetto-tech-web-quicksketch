import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { login as apiLogin, register as apiRegister } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ApiError } from '../types';

export default function Auth() {
  const { loggedIn, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (loggedIn) navigate('/home');
  }, [loggedIn, navigate]);

  return (
    <div className="auth-container">
      <div className="page-header">
        <h1>🎨 QuickSketch</h1>
        <p>Accedi o registrati per iniziare a giocare</p>
      </div>

      <div className="auth-tabs">
        <button
          className={`auth-tab${tab === 'login' ? ' active' : ''}`}
          id="tab-login"
          onClick={() => setTab('login')}
        >
          Accedi
        </button>
        <button
          className={`auth-tab${tab === 'register' ? ' active' : ''}`}
          id="tab-register"
          onClick={() => setTab('register')}
        >
          Registrati
        </button>
      </div>

      <div className="card" id="auth-form-container">
        {tab === 'login' ? (
          <LoginForm refreshAuth={refreshAuth} showToast={showToast} navigate={navigate} />
        ) : (
          <RegisterForm refreshAuth={refreshAuth} showToast={showToast} navigate={navigate} />
        )}
      </div>
    </div>
  );
}

interface FormProps {
  refreshAuth: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  navigate: NavigateFunction;
}

function LoginForm({ refreshAuth, showToast, navigate }: FormProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiLogin(username, password);
      refreshAuth();
      showToast('Login effettuato con successo!', 'success');
      navigate('/home');
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Errore durante il login');
      setLoading(false);
    }
  };

  return (
    <form id="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="login-username">Username o Email</label>
        <input
          className="form-input"
          type="text"
          id="login-username"
          placeholder="Il tuo username"
          required
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="login-password">Password</label>
        <input
          className="form-input"
          type="password"
          id="login-password"
          placeholder="La tua password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <div id="login-error" className="form-error">{error}</div>
      <button
        type="submit"
        className="btn btn-primary btn-block btn-lg mt-2"
        id="login-submit"
        disabled={loading}
      >
        {loading ? 'Accesso in corso...' : 'Accedi'}
      </button>
    </form>
  );
}

function RegisterForm({ refreshAuth, showToast, navigate }: FormProps) {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Le password non coincidono');
      return;
    }

    setLoading(true);

    try {
      await apiRegister(username, email, password);
      refreshAuth();
      showToast('Registrazione completata! Benvenuto! 🎉', 'success');
      navigate('/home');
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Errore durante la registrazione');
      setLoading(false);
    }
  };

  return (
    <form id="register-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-username">Username</label>
        <input
          className="form-input"
          type="text"
          id="reg-username"
          placeholder="Scegli un username"
          required
          minLength={3}
          maxLength={30}
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-email">Email</label>
        <input
          className="form-input"
          type="email"
          id="reg-email"
          placeholder="La tua email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-password">Password</label>
        <input
          className="form-input"
          type="password"
          id="reg-password"
          placeholder="Minimo 6 caratteri"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="reg-password-confirm">Conferma Password</label>
        <input
          className="form-input"
          type="password"
          id="reg-password-confirm"
          placeholder="Ripeti la password"
          required
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
        />
      </div>
      <div id="register-error" className="form-error">{error}</div>
      <button
        type="submit"
        className="btn btn-accent btn-block btn-lg mt-2"
        id="register-submit"
        disabled={loading}
      >
        {loading ? 'Registrazione...' : 'Registrati'}
      </button>
    </form>
  );
}

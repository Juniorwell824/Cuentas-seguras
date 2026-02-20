import React, { useState } from 'react';
import { supabase } from '../supabase/config';

const Login = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">⚡</div>
      <h2 className="auth-title">Iniciar Sesión</h2>
      <p className="auth-sub">Accede de forma segura a tus cuentas</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo Electrónico</label>
          <input id="email" type="email" className="form-input"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required placeholder="example@gmail.com" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="form-input"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required placeholder="••••••••••" />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="text-center mt-20">
        <p>¿No tienes una cuenta?{' '}
          <span className="link" onClick={() => setView('register')}>Regístrate aquí</span>
        </p>
        <p className="mt-20">
          <span className="link" onClick={() => setView('forgotPassword')}>¿Olvidaste tu contraseña?</span>
        </p>
      </div>
    </div>
  );
};

export default Login;

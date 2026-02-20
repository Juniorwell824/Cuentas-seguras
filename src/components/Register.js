import React, { useState } from 'react';
import { supabase } from '../supabase/config';

const Register = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccess('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
      setTimeout(() => setView('login'), 3000);
    } catch (err) {
      setError('Error al registrar. El correo puede ya estar en uso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">⚡</div>
      <h2 className="auth-title">Crear Cuenta</h2>
      <p className="auth-sub">Protege tus cuentas con cifrado AES-256</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label className="form-label">Correo Electrónico</label>
          <input type="email" className="form-input" value={email}
            onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-input" value={password}
            onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar Contraseña</label>
          <input type="password" className="form-input" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repite tu contraseña" />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Registrando...' : 'Crear Cuenta'}
        </button>
      </form>

      <div className="text-center mt-20">
        <p>¿Ya tienes cuenta?{' '}
          <span className="link" onClick={() => setView('login')}>Inicia sesión aquí</span>
        </p>
      </div>
    </div>
  );
};

export default Register;

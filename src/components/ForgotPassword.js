import React, { useState } from 'react';
import { supabase } from '../supabase/config';

const ForgotPassword = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setSuccess('Se ha enviado un correo para restablecer tu contraseña.');
    } catch (err) {
      setError('Error al enviar el correo. Verifica que sea un correo válido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">⚡</div>
      <h2 className="auth-title">Recuperar Contraseña</h2>
      <p className="auth-sub">Te enviaremos un link para restablecer tu contraseña</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleReset}>
        <div className="form-group">
          <label className="form-label">Correo Electrónico</label>
          <input type="email" className="form-input" value={email}
            onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Correo de Recuperación'}
        </button>
      </form>

      <div className="text-center mt-20">
        <span className="link" onClick={() => setView('login')}>← Volver al inicio de sesión</span>
      </div>
    </div>
  );
};

export default ForgotPassword;

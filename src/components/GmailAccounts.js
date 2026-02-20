import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';
import useEncryption from '../hooks/useEncryption';

const GmailAccounts = ({ user }) => {
  const [accounts, setAccounts] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordsList, setShowPasswordsList] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const { encryptObject, decryptObject } = useEncryption(user?.uid || user?.id);

  const loadAccounts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('gmail_accounts')
        .select('*')
        .eq('user_id', user.uid || user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const decrypted = (data || []).map(acc => ({
        ...decryptObject(acc, ['username', 'password']),
        id: acc.id
      }));
      setAccounts(decrypted);
    } catch (err) {
      console.error('Error cargando cuentas:', err);
      setMessage('Error al cargar las cuentas');
    }
  };

  useEffect(() => { loadAccounts(); }, [user]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!username || !password) { setMessage('Por favor, completa todos los campos'); return; }
    setLoading(true); setMessage('');
    try {
      const accountData = {
        user_id: user.uid || user.id,
        username,
        password,
      };
      const encrypted = encryptObject(accountData, ['username', 'password']);

      if (isEditing && editingId) {
        const { error } = await supabase
          .from('gmail_accounts')
          .update({ ...encrypted, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        setMessage('Cuenta actualizada y encriptada exitosamente');
      } else {
        const { error } = await supabase.from('gmail_accounts').insert({ ...encrypted, created_at: new Date().toISOString() });
        if (error) throw error;
        setMessage('Cuenta de Gmail guardada y encriptada exitosamente');
      }
      await loadAccounts();
      resetForm();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error guardando cuenta:', err);
      setMessage(`Error al ${isEditing ? 'actualizar' : 'guardar'} la cuenta`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    setUsername(account.username); setPassword(account.password);
    setEditingId(account.id); setIsEditing(true); setMessage('');
    document.getElementById('accountForm')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => resetForm();

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cuenta?')) return;
    try {
      const { error } = await supabase.from('gmail_accounts').delete().eq('id', id);
      if (error) throw error;
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (editingId === id) resetForm();
      setMessage('Cuenta eliminada exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error al eliminar la cuenta');
    }
  };

  const togglePasswordVisibility = (id) => setShowPasswordsList(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleAllPasswords = () => {
    const allVisible = accounts.every(a => showPasswordsList[a.id]);
    const newState = {};
    accounts.forEach(a => { newState[a.id] = !allVisible; });
    setShowPasswordsList(newState);
  };
  const resetForm = () => { setUsername(''); setPassword(''); setEditingId(null); setIsEditing(false); setShowPassword(false); };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('es-EC') : 'Fecha no disponible';

  return (
    <div>
      <h2 className="section-title">Cuentas de Gmail</h2>

      {message && <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

      <div className="data-card" id="accountForm">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>{isEditing ? 'Editar Cuenta de Gmail' : 'Agregar Nueva Cuenta de Gmail'}</h3>
          <span style={{ marginLeft: '10px', background: 'rgba(0,214,143,0.12)', border: '1px solid rgba(0,214,143,0.3)', color: '#00D68F', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>🔒 ENCRIPTADO</span>
          {isEditing && <button type="button" className="btn btn-secondary btn-small" onClick={handleCancelEdit} style={{ marginLeft: '15px' }}>Cancelar Edición</button>}
        </div>
        <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '15px' }}>
          {isEditing ? 'Los datos actualizados se encriptarán antes de guardarse' : 'Todos los datos se encriptan antes de guardarse en la base de datos'}
        </p>
        <form onSubmit={handleAddAccount}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="gmailUsername">Usuario/Correo</label>
              <input id="gmailUsername" type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required placeholder="ejemplo@gmail.com" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gmailPassword">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input id="gmailPassword" type={showPassword ? 'text' : 'password'} className="form-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Contraseña de Gmail" />
                <button type="button" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#00E5FF', fontSize: '13px', fontWeight: '500' }} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
            </div>
          </div>
          <button type="submit" className={`btn ${isEditing ? 'btn-success' : 'btn-primary'} btn-small`} disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Cuenta (Encriptada)' : 'Guardar Cuenta (Encriptada)'}
          </button>
        </form>
      </div>

      <div className="accounts-header-section">
        <div className="accounts-title-wrapper"><h3 className="accounts-title">Mis Cuentas de Gmail ({accounts.length})</h3></div>
        <div className="accounts-badge-wrapper"><span className="security-badge decrypted-badge">🔓 DATOS DESENCRIPTADOS</span></div>
        {accounts.length > 0 && (
          <div className="accounts-toggle-wrapper">
            <button type="button" className="btn btn-secondary btn-small toggle-all-btn" onClick={toggleAllPasswords}>
              {accounts.every(a => showPasswordsList[a.id]) ? '🙈 Ocultar Todas las Contraseñas' : '👁️ Mostrar Todas las Contraseñas'}
            </button>
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="data-card"><p style={{ textAlign: 'center', color: '#7A99B8', padding: '20px 0' }}>No tienes cuentas de Gmail guardadas. Agrega una arriba.</p></div>
      ) : (
        <div className="data-grid">
          {accounts.map(account => (
            <div key={account.id} className="data-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, color: '#E8F4FF', fontFamily: "'Inter',sans-serif", fontSize: '14px', fontWeight: '600', wordBreak: 'break-all' }}>
                  {account.username}
                  {editingId === account.id && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#00D68F' }}>(Editando)</span>}
                </h4>
                <span style={{ background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)', color: '#FFB800', padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '800', letterSpacing: '.8px', flexShrink: 0 }}>SEGURO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#7A99B8', fontSize: '12px', marginRight: '8px', flexShrink: 0 }}>Contraseña:</span>
                <span style={{ fontFamily: 'monospace', color: showPasswordsList[account.id] ? '#E8F4FF' : '#4A6580', fontSize: '13px', letterSpacing: showPasswordsList[account.id] ? '0' : '2px', flex: 1 }}>
                  {showPasswordsList[account.id] ? account.password : '••••••••'}
                </span>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00E5FF', fontSize: '12px', fontWeight: '500', flexShrink: 0 }} onClick={() => togglePasswordVisibility(account.id)}>
                  {showPasswordsList[account.id] ? '🙈 Ocultar' : '👁 Mostrar'}
                </button>
              </div>
              <p style={{ color: '#7A99B8', fontSize: '12px', margin: '4px 0' }}><span style={{ color: '#4A6580' }}>Agregado:</span> {formatDate(account.created_at)}</p>
              {account.updated_at && <p style={{ color: '#7A99B8', fontSize: '12px', margin: '4px 0' }}><span style={{ color: '#4A6580' }}>Actualizado:</span> {formatDate(account.updated_at)}</p>}
              <div className="btn-group">
                <button className="btn btn-primary btn-small" onClick={() => handleEditAccount(account)}>{editingId === account.id ? 'Editando...' : 'Editar'}</button>
                <button className="btn btn-danger btn-small" onClick={() => handleDeleteAccount(account.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GmailAccounts;

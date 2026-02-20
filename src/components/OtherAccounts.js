import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';
import useEncryption from '../hooks/useEncryption';

const OtherAccounts = ({ user }) => {
  const [accounts, setAccounts] = useState([]);
  const [platform, setPlatform] = useState('');
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
        .from('other_accounts')
        .select('*')
        .eq('user_id', user.uid || user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const decrypted = (data || []).map(acc => ({ ...decryptObject(acc, ['username', 'password']), id: acc.id }));
      setAccounts(decrypted);
    } catch (err) {
      setMessage('Error al cargar las cuentas');
    }
  };

  useEffect(() => { loadAccounts(); }, [user]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!platform || !username || !password) { setMessage('Por favor, completa todos los campos'); return; }
    setLoading(true); setMessage('');
    try {
      const accountData = { user_id: user.uid || user.id, platform, username, password };
      const encrypted = encryptObject(accountData, ['username', 'password']);
      if (isEditing && editingId) {
        const { error } = await supabase.from('other_accounts').update({ ...encrypted, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
        setMessage('Cuenta actualizada y encriptada exitosamente');
      } else {
        const { error } = await supabase.from('other_accounts').insert({ ...encrypted, created_at: new Date().toISOString() });
        if (error) throw error;
        setMessage('Cuenta guardada y encriptada exitosamente');
      }
      await loadAccounts(); resetForm();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error al ${isEditing ? 'actualizar' : 'guardar'} la cuenta`);
    } finally { setLoading(false); }
  };

  const handleEditAccount = (account) => {
    setPlatform(account.platform); setUsername(account.username); setPassword(account.password);
    setEditingId(account.id); setIsEditing(true); setMessage('');
    document.getElementById('otherAccountsForm')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cuenta?')) return;
    try {
      const { error } = await supabase.from('other_accounts').delete().eq('id', id);
      if (error) throw error;
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (editingId === id) resetForm();
      setMessage('Cuenta eliminada exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Error al eliminar la cuenta'); }
  };

  const togglePasswordVisibility = (id) => setShowPasswordsList(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleAllPasswords = () => {
    const allVisible = accounts.every(a => showPasswordsList[a.id]);
    const ns = {}; accounts.forEach(a => { ns[a.id] = !allVisible; }); setShowPasswordsList(ns);
  };
  const resetForm = () => { setPlatform(''); setUsername(''); setPassword(''); setEditingId(null); setIsEditing(false); setShowPassword(false); };
  const handleCancelEdit = () => resetForm();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-EC') : 'Fecha no disponible';

  return (
    <div>
      <h2 className="section-title">Otras Cuentas</h2>
      {message && <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

      <div className="data-card" id="otherAccountsForm">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>{isEditing ? 'Editar Cuenta' : 'Agregar Nueva Cuenta'}</h3>
          <span style={{ marginLeft: '10px', background: 'rgba(0,214,143,0.12)', border: '1px solid rgba(0,214,143,0.3)', color: '#00D68F', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>🔒 ENCRIPTADO</span>
          {isEditing && <button type="button" className="btn btn-secondary btn-small" onClick={handleCancelEdit} style={{ marginLeft: '15px' }}>Cancelar Edición</button>}
        </div>
        <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '15px' }}>
          {isEditing ? 'Los datos se actualizarán y volverán a encriptar con AES-256' : 'Todos los datos se encriptan con AES-256 antes de guardarse'}
        </p>
        <form onSubmit={handleAddAccount}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Plataforma/Red Social</label>
              <input type="text" className="form-input" value={platform} onChange={e => setPlatform(e.target.value)} required placeholder="Facebook, Instagram, Netflix, etc." />
            </div>
            <div className="form-group">
              <label className="form-label">Usuario/Correo</label>
              <input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} required placeholder="usuario@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} className="form-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Contraseña" />
                <button type="button" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#00E5FF', fontSize: '13px' }} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
            </div>
          </div>
          <button type="submit" className={`btn ${isEditing ? 'btn-success' : 'btn-primary'} btn-small`} disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Cuenta (Encriptar)' : 'Guardar Cuenta (Encriptar)'}
          </button>
        </form>
      </div>

      <div className="accounts-header-section">
        <div className="accounts-title-wrapper"><h3 className="accounts-title">Mis Cuentas ({accounts.length})</h3></div>
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
        <div className="data-card"><p style={{ textAlign: 'center', color: '#7A99B8', padding: '20px 0' }}>No tienes cuentas guardadas. Agrega una arriba.</p></div>
      ) : (
        <div className="data-grid">
          {accounts.map(account => (
            <div key={account.id} className="data-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, color: '#E8F4FF', fontSize: '14px', fontWeight: '700' }}>
                  {account.platform}
                  {editingId === account.id && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#00D68F' }}>(Editando)</span>}
                </h4>
                <span style={{ background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)', color: '#FFB800', padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '800' }}>SEGURO</span>
              </div>
              <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '8px' }}><span style={{ color: '#4A6580' }}>Usuario:</span> {account.username}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                <span style={{ color: '#7A99B8', fontSize: '12px', marginRight: '8px' }}>Contraseña:</span>
                <span style={{ fontFamily: 'monospace', color: showPasswordsList[account.id] ? '#E8F4FF' : '#4A6580', fontSize: '13px', letterSpacing: showPasswordsList[account.id] ? '0' : '2px', flex: 1 }}>
                  {showPasswordsList[account.id] ? account.password : '••••••••'}
                </span>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00E5FF', fontSize: '12px', fontWeight: '500' }} onClick={() => togglePasswordVisibility(account.id)}>
                  {showPasswordsList[account.id] ? '🙈' : '👁'}
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

export default OtherAccounts;

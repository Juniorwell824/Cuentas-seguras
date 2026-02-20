import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';
import useEncryption from '../hooks/useEncryption';

const SENSITIVE = ['bank_name', 'first_name', 'last_name', 'id_number', 'account_type', 'account_number'];

const BankData = ({ user }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankName, setBankName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState({});
  const { encryptObject, decryptObject } = useEncryption(user?.uid || user?.id);

  const loadBankAccounts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bank_data')
        .select('*')
        .eq('user_id', user.uid || user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const decrypted = (data || []).map(acc => ({ ...decryptObject(acc, SENSITIVE), id: acc.id }));
      setBankAccounts(decrypted);
    } catch (err) {
      setMessage('Error al cargar los datos bancarios');
    }
  };

  useEffect(() => { loadBankAccounts(); }, [user]);

  const generateShareText = (a) =>
    `Datos Bancarios:\nBanco: ${a.bank_name}\nTitular: ${a.first_name} ${a.last_name}\nCédula: ${a.id_number}\nTipo: ${a.account_type}\nNúmero: ${a.account_number}\n\nCompartido desde Mi Gestor Seguro`;

  const shareToWhatsApp = (a) => { window.open(`https://wa.me/?text=${encodeURIComponent(generateShareText(a))}`, '_blank'); setShowShareOptions(p => ({ ...p, [a.id]: false })); };
  const shareToFacebook = (a) => { window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(generateShareText(a))}`, '_blank', 'width=600,height=400'); setShowShareOptions(p => ({ ...p, [a.id]: false })); };
  const copyToClipboard = (a) => { navigator.clipboard.writeText(generateShareText(a)); setMessage('Datos copiados al portapapeles'); setTimeout(() => setMessage(''), 3000); setShowShareOptions(p => ({ ...p, [a.id]: false })); };
  const toggleShareOptions = (id) => setShowShareOptions(p => ({ ...p, [id]: !p[id] }));

  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    if (!bankName || !firstName || !lastName || !idNumber || !accountType || !accountNumber) { setMessage('Por favor, completa todos los campos'); return; }
    setLoading(true); setMessage('');
    try {
      const accountData = { user_id: user.uid || user.id, bank_name: bankName, first_name: firstName, last_name: lastName, id_number: idNumber, account_type: accountType, account_number: accountNumber };
      const encrypted = encryptObject(accountData, SENSITIVE);
      if (isEditing && editingId) {
        const { error } = await supabase.from('bank_data').update({ ...encrypted, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
        setMessage('Datos bancarios actualizados y encriptados');
      } else {
        const { error } = await supabase.from('bank_data').insert({ ...encrypted, created_at: new Date().toISOString() });
        if (error) throw error;
        setMessage('Datos bancarios guardados y encriptados');
      }
      await loadBankAccounts(); resetForm();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('Error al guardar los datos bancarios'); }
    finally { setLoading(false); }
  };

  const handleEditAccount = (a) => {
    setBankName(a.bank_name); setFirstName(a.first_name); setLastName(a.last_name);
    setIdNumber(a.id_number); setAccountType(a.account_type); setAccountNumber(a.account_number);
    setEditingId(a.id); setIsEditing(true); setMessage('');
    document.getElementById('bankDataForm')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleCancelEdit = () => resetForm();
  const handleDeleteBankAccount = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar estos datos bancarios?')) return;
    try {
      const { error } = await supabase.from('bank_data').delete().eq('id', id);
      if (error) throw error;
      setBankAccounts(prev => prev.filter(a => a.id !== id));
      if (editingId === id) resetForm();
      setMessage('Datos eliminados'); setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Error al eliminar'); }
  };
  const resetForm = () => { setBankName(''); setFirstName(''); setLastName(''); setIdNumber(''); setAccountType(''); setAccountNumber(''); setEditingId(null); setIsEditing(false); };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-EC') : 'Fecha no disponible';

  const badgeStyle = { background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)', color: '#FFB800', padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '800', letterSpacing: '.8px' };

  return (
    <div>
      <h2 className="section-title">Datos Bancarios</h2>
      {message && <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

      <div className="data-card" id="bankDataForm">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>{isEditing ? 'Editar Datos Bancarios' : 'Agregar Nuevos Datos Bancarios'}</h3>
          <span style={{ marginLeft: '10px', background: isEditing ? 'rgba(0,229,255,0.12)' : 'rgba(0,214,143,0.12)', border: `1px solid ${isEditing ? 'rgba(0,229,255,0.3)' : 'rgba(0,214,143,0.3)'}`, color: isEditing ? '#00E5FF' : '#00D68F', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
            {isEditing ? '✏️ EDITANDO' : '🔒 ENCRIPTADO'}
          </span>
          {isEditing && <button type="button" className="btn btn-secondary btn-small" onClick={handleCancelEdit} style={{ marginLeft: '15px' }}>Cancelar Edición</button>}
        </div>
        <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '15px' }}>
          {isEditing ? 'Edita los datos bancarios. Los cambios se guardarán encriptados.' : 'Todos los datos bancarios se encriptan con AES-256 para máxima seguridad'}
        </p>
        <form onSubmit={handleAddBankAccount}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre del Banco</label>
              <input type="text" className="form-input" value={bankName} onChange={e => setBankName(e.target.value)} required placeholder="Ej: Banco Pichincha" />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Tu nombre" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Apellido</label>
              <input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Tu apellido" />
            </div>
            <div className="form-group">
              <label className="form-label">Cédula/Identificación</label>
              <input type="text" className="form-input" value={idNumber} onChange={e => setIdNumber(e.target.value)} required placeholder="Número de identificación" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de Cuenta</label>
              <select className="form-input" value={accountType} onChange={e => setAccountType(e.target.value)} required>
                <option value="">Selecciona un tipo</option>
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
                <option value="Nómina">Nómina</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Número de Cuenta</label>
              <input type="text" className="form-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required placeholder="Número de cuenta bancaria" />
            </div>
          </div>
          <button type="submit" className={`btn ${isEditing ? 'btn-success' : 'btn-primary'} btn-small`} disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Datos (Encriptados)' : 'Guardar Datos (Encriptados)'}
          </button>
        </form>
      </div>

      <div className="accounts-header-section">
        <div className="accounts-title-wrapper"><h3 className="accounts-title">Mis Datos Bancarios ({bankAccounts.length})</h3></div>
        <div className="accounts-badge-wrapper"><span className="security-badge decrypted-badge">🔓 DATOS DESENCRIPTADOS</span></div>
        {bankAccounts.length > 0 && (
          <div className="accounts-toggle-wrapper"><span style={{ color: '#7A99B8', fontSize: '14px' }}>{bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''} guardada{bankAccounts.length !== 1 ? 's' : ''}</span></div>
        )}
      </div>

      {bankAccounts.length === 0 ? (
        <div className="data-card"><p style={{ textAlign: 'center', color: '#7A99B8', padding: '20px 0' }}>No tienes datos bancarios guardados. Agrega unos arriba.</p></div>
      ) : (
        <div className="data-grid">
          {bankAccounts.map(account => (
            <div key={account.id} className="data-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                <h4 style={{ margin: 0, color: '#E8F4FF', fontSize: '15px', fontWeight: '700' }}>
                  🏦 {account.bank_name}
                  {editingId === account.id && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#00D68F' }}>(Editando)</span>}
                </h4>
                <span style={badgeStyle}>SEGURO</span>
              </div>
              {[
                { label: 'Titular', val: `${account.first_name} ${account.last_name}` },
                { label: 'Cédula', val: account.id_number },
                { label: 'Tipo', val: account.account_type },
                { label: 'Nro. Cuenta', val: account.account_number },
              ].map(({ label, val }) => (
                <p key={label} style={{ color: '#7A99B8', fontSize: '13px', margin: '4px 0' }}>
                  <span style={{ color: '#4A6580' }}>{label}:</span> {val}
                </p>
              ))}
              <p style={{ color: '#7A99B8', fontSize: '12px', margin: '6px 0 2px' }}><span style={{ color: '#4A6580' }}>Agregado:</span> {formatDate(account.created_at)}</p>
              {account.updated_at && <p style={{ color: '#7A99B8', fontSize: '12px', margin: '2px 0' }}><span style={{ color: '#4A6580' }}>Actualizado:</span> {formatDate(account.updated_at)}</p>}

              {/* Compartir */}
              <div style={{ marginTop: '10px', marginBottom: '8px' }}>
                <button onClick={() => toggleShareOptions(account.id)}
                  style={{ padding: '7px 14px', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', color: '#00E5FF', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  📤 Compartir Datos
                </button>
                {showShareOptions[account.id] && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <button onClick={() => shareToWhatsApp(account)} style={{ padding: '6px 12px', background: '#25D366', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>WhatsApp</button>
                    <button onClick={() => shareToFacebook(account)} style={{ padding: '6px 12px', background: '#4267B2', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Facebook</button>
                    <button onClick={() => copyToClipboard(account)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#E8F4FF', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>📋 Copiar</button>
                  </div>
                )}
              </div>

              <div className="btn-group">
                <button className="btn btn-primary btn-small" onClick={() => handleEditAccount(account)} disabled={editingId === account.id}>{editingId === account.id ? 'Editando...' : 'Editar'}</button>
                <button className="btn btn-danger btn-small" onClick={() => handleDeleteBankAccount(account.id)} disabled={editingId === account.id}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankData;

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  doc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
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
  const { encryptObject, decryptObject } = useEncryption(user?.uid);

  // Cargar otras cuentas del usuario
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, 'otherAccounts'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const loadedAccounts = [];
        
        querySnapshot.forEach((doc) => {
          const accountData = doc.data();
          // Desencriptar los campos sensibles al cargar
          const decryptedAccount = decryptObject(accountData, ['platform', 'username', 'password']);
          loadedAccounts.push({
            id: doc.id,
            ...decryptedAccount,
            createdAt: accountData.createdAt, // Mantener fecha original
            updatedAt: accountData.updatedAt // Mantener fecha original
          });
        });
        
        setAccounts(loadedAccounts);
      } catch (error) {
        console.error('Error al cargar cuentas:', error);
        setMessage('Error al cargar las cuentas');
      }
    };
    
    loadAccounts();
  }, [user, decryptObject]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    
    if (!platform || !username || !password) {
      setMessage('Por favor, completa todos los campos');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      let accountData;
      
      if (isEditing && editingId) {
        // Modo edición: actualizar documento existente
        accountData = {
          platform,
          username,
          password,
          updatedAt: new Date()
        };
        
        // Encriptar los campos sensibles antes de actualizar
        const encryptedAccountData = encryptObject(accountData, ['platform', 'username', 'password']);
        
        const accountRef = doc(db, 'otherAccounts', editingId);
        await updateDoc(accountRef, encryptedAccountData);
        
        setMessage('Cuenta actualizada y encriptada exitosamente');
      } else {
        // Modo creación: agregar nuevo documento
        accountData = {
          userId: user.uid,
          platform,
          username,
          password,
          createdAt: new Date()
        };
        
        // Encriptar los campos sensibles antes de enviar a Firebase
        const encryptedAccountData = encryptObject(accountData, ['platform', 'username', 'password']);
        
        await addDoc(collection(db, 'otherAccounts'), encryptedAccountData);
        
        setMessage('Cuenta guardada y encriptada exitosamente');
      }
      
      // Actualizar la lista
      const q = query(
        collection(db, 'otherAccounts'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const updatedAccounts = [];
      
      querySnapshot.forEach((doc) => {
        const accountData = doc.data();
        const decryptedAccount = decryptObject(accountData, ['platform', 'username', 'password']);
        updatedAccounts.push({
          id: doc.id,
          ...decryptedAccount,
          createdAt: accountData.createdAt,
          updatedAt: accountData.updatedAt
        });
      });
      
      setAccounts(updatedAccounts);
      resetForm();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al guardar cuenta:', error);
      setMessage(`Error al ${isEditing ? 'actualizar' : 'guardar'} la cuenta`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    setPlatform(account.platform);
    setUsername(account.username);
    setPassword(account.password);
    setEditingId(account.id);
    setIsEditing(true);
    setMessage('');
    // Hacer scroll suave al formulario
    document.getElementById('otherAccountsForm')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDeleteAccount = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      try {
        await deleteDoc(doc(db, 'otherAccounts', id));
        setAccounts(accounts.filter(account => account.id !== id));
        
        // Si estamos editando la cuenta que se elimina, resetear el formulario
        if (editingId === id) {
          resetForm();
        }
        
        setMessage('Cuenta eliminada exitosamente');
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        setMessage('Error al eliminar la cuenta');
      }
    }
  };

  const togglePasswordVisibility = (accountId) => {
    setShowPasswordsList(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const toggleAllPasswords = () => {
    // Verificar si todas las contraseñas están visibles
    const allVisible = accounts.every(account => showPasswordsList[account.id]);
    
    const newState = {};
    accounts.forEach(account => {
      newState[account.id] = !allVisible;
    });
    
    setShowPasswordsList(newState);
  };

  const resetForm = () => {
    setPlatform('');
    setUsername('');
    setPassword('');
    setEditingId(null);
    setIsEditing(false);
  };

  return (
    <div>
      <h2 className="section-title">Otras Cuentas</h2>
      
      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}
      
      <div className="data-card" id="otherAccountsForm">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>
            {isEditing ? 'Editar Cuenta' : 'Agregar Nueva Cuenta'}
          </h3>
          <span style={{
            marginLeft: '10px',
            backgroundColor: '#48bb78',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            ENCRIPTADO
          </span>
          {isEditing && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleCancelEdit}
              style={{ marginLeft: '15px' }}
            >
              Cancelar Edición
            </button>
          )}
        </div>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          {isEditing 
            ? 'Los datos se actualizarán y volverán a encriptar con AES-256'
            : 'Todos los datos se encriptan con AES-256 antes de guardarse'
          }
        </p>
        <form onSubmit={handleAddAccount}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="platform">Plataforma/Red Social</label>
              <input
                id="platform"
                type="text"
                className="form-input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                required
                placeholder="Facebook, Instagram, Twitter, etc."
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="otherUsername">Usuario/Correo</label>
              <input
                id="otherUsername"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="usuario@email.com"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="otherPassword">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="otherPassword"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Contraseña"
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#667eea',
                    fontSize: '14px'
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            className={`btn ${isEditing ? 'btn-success' : 'btn-primary'} btn-small`}
            disabled={loading}
          >
            {loading ? (
              'Guardando...'
            ) : isEditing ? (
              'Actualizar Cuenta (Encriptar)'
            ) : (
              'Guardar Cuenta (Encriptar)'
            )}
          </button>
        </form>
      </div>
      
      {/* ENCABEZADO ACTUALIZADO CON EL MISMO ESTILO */}
      <div className="accounts-header-section">
        {/* Título principal centrado */}
        <div className="accounts-title-wrapper">
          <h3 className="accounts-title">
            Mis Cuentas ({accounts.length})
          </h3>
        </div>
        
        {/* Badge "DATOS DESENCRIPTADOS" centrado */}
        <div className="accounts-badge-wrapper">
          <span className="security-badge decrypted-badge">
            🔓 DATOS DESENCRIPTADOS
          </span>
        </div>
        
        {/* Botón "Mostrar Todas/Ocultar Todas" centrado */}
        {accounts.length > 0 && (
          <div className="accounts-toggle-wrapper">
            <button
              type="button"
              className="btn btn-secondary btn-small toggle-all-btn"
              onClick={toggleAllPasswords}
            >
              {accounts.every(account => showPasswordsList[account.id]) 
                ? '🙈 Ocultar Todas las Contraseñas' 
                : '👁️ Mostrar Todas las Contraseñas'}
            </button>
          </div>
        )}
      </div>
      
      {accounts.length === 0 ? (
        <div className="data-card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            No tienes cuentas guardadas. Agrega una arriba.
          </p>
        </div>
      ) : (
        <div className="data-grid">
          {accounts.map((account) => (
            <div key={account.id} className="data-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>
                  {account.platform}
                  {editingId === account.id && (
                    <span style={{ 
                      marginLeft: '10px', 
                      fontSize: '12px', 
                      color: '#38a169',
                      fontWeight: 'normal'
                    }}>
                      (Editando)
                    </span>
                  )}
                </h4>
                <span style={{
                  marginLeft: '10px',
                  backgroundColor: '#ed8936',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  SEGURO
                </span>
              </div>
              
              <p><strong>Usuario:</strong> {account.username}</p>
              
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <p style={{ margin: 0 }}>
                  <strong>Contraseña:</strong>{' '}
                  <span style={{ 
                    fontFamily: 'monospace',
                    backgroundColor: '#f7fafc',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {showPasswordsList[account.id] ? account.password : '••••••••'}
                  </span>
                </p>
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#667eea',
                    fontSize: '14px'
                  }}
                  onClick={() => togglePasswordVisibility(account.id)}
                >
                  {showPasswordsList[account.id] ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
              
              <p>
                <strong>Agregado:</strong>{' '}
                {account.createdAt?.toDate ? account.createdAt.toDate().toLocaleDateString() : 'Fecha no disponible'}
              </p>
              {account.updatedAt && (
                <p>
                  <strong>Actualizado:</strong>{' '}
                  {account.updatedAt?.toDate ? account.updatedAt.toDate().toLocaleDateString() : 'Fecha no disponible'}
                </p>
              )}
              
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleEditAccount(account)}
                >
                  {editingId === account.id ? 'Editando...' : 'Editar'}
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleDeleteAccount(account.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OtherAccounts;
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
  const { encryptObject, decryptObject } = useEncryption(user?.uid);

  // Cargar cuentas de Gmail del usuario
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, 'gmailAccounts'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const loadedAccounts = [];
        
        querySnapshot.forEach((doc) => {
          const accountData = doc.data();
          // Desencriptar los campos sensibles al cargar
          const decryptedAccount = decryptObject(accountData, ['username', 'password']);
          loadedAccounts.push({
            id: doc.id,
            ...decryptedAccount
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
    
    if (!username || !password) {
      setMessage('Por favor, completa todos los campos');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Crear objeto con los datos
      const accountData = {
        userId: user.uid,
        username,
        password,
        ...(isEditing && editingId ? { updatedAt: new Date() } : { createdAt: new Date() })
      };
      
      // Encriptar los campos sensibles antes de enviar a Firebase
      const encryptedAccountData = encryptObject(accountData, ['username', 'password']);
      
      if (isEditing && editingId) {
        // Modo edición: actualizar documento existente
        const accountRef = doc(db, 'gmailAccounts', editingId);
        await updateDoc(accountRef, encryptedAccountData);
        
        setMessage('Cuenta actualizada y encriptada exitosamente');
      } else {
        // Modo creación: agregar nuevo documento
        await addDoc(collection(db, 'gmailAccounts'), encryptedAccountData);
        
        setMessage('Cuenta de Gmail guardada y encriptada exitosamente');
      }
      
      // Recargar las cuentas desde Firebase
      const q = query(
        collection(db, 'gmailAccounts'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const updatedAccounts = [];
      
      querySnapshot.forEach((doc) => {
        const accountData = doc.data();
        const decryptedAccount = decryptObject(accountData, ['username', 'password']);
        updatedAccounts.push({
          id: doc.id,
          ...decryptedAccount
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
    setUsername(account.username);
    setPassword(account.password);
    setEditingId(account.id);
    setIsEditing(true);
    setMessage('');
    // Hacer scroll suave al formulario
    document.getElementById('accountForm')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDeleteAccount = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      try {
        await deleteDoc(doc(db, 'gmailAccounts', id));
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
    setUsername('');
    setPassword('');
    setEditingId(null);
    setIsEditing(false);
    setShowPassword(false);
  };

  return (
    <div>
      <h2 className="section-title">Cuentas de Gmail</h2>
      
      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}
      
      <div className="data-card" id="accountForm">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>
            {isEditing ? 'Editar Cuenta de Gmail' : 'Agregar Nueva Cuenta de Gmail'}
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
            ? 'Los datos actualizados se encriptarán antes de guardarse'
            : 'Todos los datos se encriptan antes de guardarse en la base de datos'
          }
        </p>
        <form onSubmit={handleAddAccount}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="gmailUsername">Usuario/Correo</label>
              <input
                id="gmailUsername"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="ejemplo@gmail.com"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="gmailPassword">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="gmailPassword"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Contraseña de Gmail"
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
              'Actualizar Cuenta (Encriptada)'
            ) : (
              'Guardar Cuenta (Encriptada)'
            )}
          </button>
        </form>
      </div>
      
      <div className="accounts-header-section">
  {/* Título principal centrado */}
  <div className="accounts-title-wrapper">
    <h3 className="accounts-title">
      Mis Cuentas de Gmail ({accounts.length})
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
            No tienes cuentas de Gmail guardadas. Agrega una arriba.
          </p>
        </div>
      ) : (
        <div className="data-grid">
          {accounts.map((account) => (
            <div key={account.id} className="data-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>
                  {account.username}
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
                {account.createdAt?.toDate ? 
                  account.createdAt.toDate().toLocaleDateString() : 
                  'Fecha no disponible'
                }
              </p>
              {account.updatedAt && (
                <p>
                  <strong>Actualizado:</strong>{' '}
                  {account.updatedAt?.toDate ? 
                    account.updatedAt.toDate().toLocaleDateString() : 
                    'Fecha no disponible'
                  }
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

export default GmailAccounts;
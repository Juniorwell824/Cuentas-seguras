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
import CryptoJS from 'crypto-js';

const GmailAccounts = ({ user }) => {
  const [accounts, setAccounts] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [decryptedPasswords, setDecryptedPasswords] = useState({});
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKeyInput, setShowMasterKeyInput] = useState(false);

  // Generar o recuperar la clave maestra del usuario
  useEffect(() => {
    const initializeMasterKey = () => {
      if (!user) return;
      
      // Intentar recuperar la clave maestra de localStorage
      const storedKey = localStorage.getItem(`master_key_${user.uid}`);
      
      if (storedKey) {
        setMasterKey(storedKey);
      } else {
        // Si no existe, pedir al usuario que cree una
        setShowMasterKeyInput(true);
      }
    };
    
    initializeMasterKey();
  }, [user]);

  // Función para cifrar contraseña
  const encryptPassword = (password, key) => {
    if (!password || !key) return password;
    
    try {
      return CryptoJS.AES.encrypt(password, key).toString();
    } catch (error) {
      console.error('Error cifrando contraseña:', error);
      return password;
    }
  };

  // Función para descifrar contraseña
  const decryptPassword = (encryptedPassword, key) => {
    if (!encryptedPassword || !key) return '';
    
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPassword, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error descifrando contraseña:', error);
      return 'Error al descifrar';
    }
  };

  // Establecer clave maestra
  const handleSetMasterKey = (key) => {
    if (!key || key.length < 8) {
      setMessage('La clave debe tener al menos 8 caracteres');
      return;
    }
    
    setMasterKey(key);
    localStorage.setItem(`master_key_${user.uid}`, key);
    setShowMasterKeyInput(false);
    setMessage('Clave maestra establecida exitosamente');
    
    // Recargar cuentas con la nueva clave
    if (accounts.length > 0) {
      reloadAccounts(key);
    }
  };

  // Cargar cuentas de Gmail del usuario
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user || !masterKey) return;
      
      try {
        const q = query(
          collection(db, 'gmailAccounts'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const loadedAccounts = [];
        
        querySnapshot.forEach((doc) => {
          loadedAccounts.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setAccounts(loadedAccounts);
        
        // Inicializar todas las contraseñas como cifradas
        const initialDecryptedState = {};
        loadedAccounts.forEach(account => {
          initialDecryptedState[account.id] = false; // No mostrar contraseñas por defecto
        });
        setDecryptedPasswords(initialDecryptedState);
        
      } catch (error) {
        console.error('Error al cargar cuentas:', error);
        setMessage('Error al cargar las cuentas');
      }
    };
    
    loadAccounts();
  }, [user, masterKey]);

  const reloadAccounts = async (key = masterKey) => {
    try {
      const q = query(
        collection(db, 'gmailAccounts'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const loadedAccounts = [];
      
      querySnapshot.forEach((doc) => {
        loadedAccounts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setAccounts(loadedAccounts);
    } catch (error) {
      console.error('Error al recargar cuentas:', error);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    
    if (!masterKey) {
      setMessage('Primero debes establecer una clave maestra');
      setShowMasterKeyInput(true);
      return;
    }
    
    if (!username || !password) {
      setMessage('Por favor, completa todos los campos');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Cifrar la contraseña antes de guardarla
      const encryptedPassword = encryptPassword(password, masterKey);
      
      if (isEditing && editingId) {
        // Modo edición: actualizar documento existente
        const accountRef = doc(db, 'gmailAccounts', editingId);
        await updateDoc(accountRef, {
          username,
          password: encryptedPassword,
          updatedAt: new Date()
        });
        
        setMessage('Cuenta actualizada exitosamente');
      } else {
        // Modo creación: agregar nuevo documento
        await addDoc(collection(db, 'gmailAccounts'), {
          userId: user.uid,
          username,
          password: encryptedPassword,
          createdAt: new Date(),
          isEncrypted: true // Marcar que está cifrado
        });
        
        setMessage('Cuenta de Gmail guardada exitosamente');
      }
      
      // Recargar la lista
      await reloadAccounts();
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
    
    // Si la contraseña está descifrada, mostrar la versión descifrada
    if (decryptedPasswords[account.id]) {
      setPassword(decryptPassword(account.password, masterKey));
    } else {
      setPassword(''); // Dejar en blanco por seguridad
    }
    
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
        
        // Limpiar del estado de contraseñas descifradas
        setDecryptedPasswords(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
        
        setMessage('Cuenta eliminada exitosamente');
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        setMessage('Error al eliminar la cuenta');
      }
    }
  };

  // Mostrar/ocultar contraseña específica
  const togglePasswordVisibility = (accountId, encryptedPassword) => {
    if (!masterKey) {
      setMessage('Necesitas la clave maestra para ver contraseñas');
      setShowMasterKeyInput(true);
      return;
    }
    
    setDecryptedPasswords(prev => {
      const newState = { ...prev };
      
      if (newState[accountId]) {
        // Ocultar contraseña
        newState[accountId] = false;
      } else {
        // Descifrar y mostrar contraseña
        try {
          const decrypted = decryptPassword(encryptedPassword, masterKey);
          if (decrypted && !decrypted.includes('Error')) {
            newState[accountId] = true;
          } else {
            setMessage('Error al descifrar la contraseña. Verifica tu clave maestra.');
          }
        } catch (error) {
          setMessage('Error al descifrar la contraseña');
        }
      }
      
      return newState;
    });
  };

  // Mostrar/ocultar todas las contraseñas
  const toggleAllPasswords = () => {
    if (!masterKey) {
      setMessage('Necesitas la clave maestra para ver contraseñas');
      setShowMasterKeyInput(true);
      return;
    }
    
    setDecryptedPasswords(prev => {
      // Verificar si todas las contraseñas están visibles
      const allVisible = accounts.every(account => prev[account.id]);
      
      const newState = { ...prev };
      
      accounts.forEach(account => {
        if (allVisible) {
          // Ocultar todas
          newState[account.id] = false;
        } else {
          // Intentar descifrar cada una
          try {
            const decrypted = decryptPassword(account.password, masterKey);
            if (decrypted && !decrypted.includes('Error')) {
              newState[account.id] = true;
            }
          } catch (error) {
            console.error(`Error descifrando cuenta ${account.id}:`, error);
          }
        }
      });
      
      return newState;
    });
  };

  // Restablecer clave maestra (en caso de olvido)
  const handleResetMasterKey = () => {
    if (window.confirm(
      '⚠️ ADVERTENCIA: Si restableces la clave maestra, NO podrás recuperar las contraseñas existentes. ' +
      'Solo deberías hacer esto si has perdido tu clave actual. ' +
      '¿Estás seguro de continuar?'
    )) {
      localStorage.removeItem(`master_key_${user.uid}`);
      setMasterKey('');
      setShowMasterKeyInput(true);
      setDecryptedPasswords({});
      setMessage('Clave maestra restablecida. Establece una nueva clave.');
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEditingId(null);
    setIsEditing(false);
    setShowPassword(false);
  };

  // Obtener contraseña para mostrar (cifrada o descifrada)
  const getDisplayPassword = (account) => {
    if (decryptedPasswords[account.id]) {
      return decryptPassword(account.password, masterKey);
    }
    return '••••••••';
  };

  return (
    <div>
      <h2 className="section-title">Cuentas de Gmail (Cifradas)</h2>
      
      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('ADVERTENCIA') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}
      
      {/* Input para clave maestra */}
      {showMasterKeyInput && (
        <div className="data-card" style={{ borderColor: '#667eea', marginBottom: '20px' }}>
          <h3 style={{ color: '#667eea' }}>🔐 Establecer Clave Maestra</h3>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Esta clave cifrará y descifrará tus contraseñas. <strong>No la pierdas</strong>, 
            ya que sin ella no podrás recuperar tus contraseñas.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="masterKey">Clave Maestra (mínimo 8 caracteres)</label>
            <input
              id="masterKey"
              type="password"
              className="form-input"
              placeholder="Ingresa una clave segura"
              onChange={(e) => setMasterKey(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
          </div>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => handleSetMasterKey(masterKey)}
            >
              Establecer Clave
            </button>
            {localStorage.getItem(`master_key_${user?.uid}`) && (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setShowMasterKeyInput(false);
                  setMasterKey(localStorage.getItem(`master_key_${user.uid}`));
                }}
              >
                Usar Clave Existente
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Botón para restablecer clave */}
      {!showMasterKeyInput && masterKey && (
        <div style={{ marginBottom: '15px', textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-warning btn-small"
            onClick={handleResetMasterKey}
            style={{ fontSize: '12px' }}
          >
            🔄 Restablecer Clave Maestra
          </button>
        </div>
      )}
      
      {/* Formulario de cuenta */}
      {masterKey && !showMasterKeyInput && (
        <>
          <div className="data-card" id="accountForm">
            <h3>
              {isEditing ? 'Editar Cuenta de Gmail' : 'Agregar Nueva Cuenta de Gmail'}
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
            </h3>
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
                      required={!isEditing || decryptedPasswords[editingId]}
                      placeholder={
                        isEditing && !decryptedPasswords[editingId] 
                          ? "Ingresa la nueva contraseña" 
                          : "Contraseña de Gmail"
                      }
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
                  {isEditing && !decryptedPasswords[editingId] && (
                    <p style={{ fontSize: '12px', color: '#e53e3e', marginTop: '5px' }}>
                      ⚠️ Por seguridad, debes ingresar la contraseña nuevamente para editar
                    </p>
                  )}
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
                  'Actualizar Cuenta'
                ) : (
                  'Guardar Cuenta'
                )}
              </button>
            </form>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>
              Mis Cuentas de Gmail ({accounts.length})
              <span style={{ fontSize: '14px', color: '#667eea', marginLeft: '10px' }}>
                🔒 Cifrado activo
              </span>
            </h3>
            {accounts.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={toggleAllPasswords}
                style={{ marginLeft: '15px' }}
              >
                {accounts.every(account => decryptedPasswords[account.id]) 
                  ? '🙈 Ocultar Todas' 
                  : '👁️ Mostrar Todas'}
              </button>
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
                <div key={account.id} className="data-card" style={{
                  borderColor: decryptedPasswords[account.id] ? '#38a169' : '#cbd5e0'
                }}>
                  <h4>
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
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <p style={{ margin: 0 }}>
                      <strong>Contraseña:</strong>{' '}
                      <span style={{ 
                        fontFamily: 'monospace',
                        backgroundColor: decryptedPasswords[account.id] ? '#c6f6d5' : '#f7fafc',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        border: decryptedPasswords[account.id] ? '1px solid #9ae6b4' : 'none'
                      }}>
                        {getDisplayPassword(account)}
                      </span>
                      {decryptedPasswords[account.id] && (
                        <span style={{ 
                          marginLeft: '5px', 
                          fontSize: '10px', 
                          color: '#38a169',
                          fontWeight: 'bold'
                        }}>
                          ✓ DESCIFRADA
                        </span>
                      )}
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
                        color: decryptedPasswords[account.id] ? '#e53e3e' : '#667eea',
                        fontSize: '14px'
                      }}
                      onClick={() => togglePasswordVisibility(account.id, account.password)}
                    >
                      {decryptedPasswords[account.id] ? '🙈 Ocultar' : '👁️ Mostrar'}
                    </button>
                  </div>
                  <p>
                    <strong>Agregado:</strong>{' '}
                    {account.createdAt?.toDate().toLocaleDateString()}
                  </p>
                  {account.updatedAt && (
                    <p>
                      <strong>Actualizado:</strong>{' '}
                      {account.updatedAt?.toDate().toLocaleDateString()}
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
        </>
      )}
    </div>
  );
};

export default GmailAccounts;

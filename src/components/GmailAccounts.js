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
          loadedAccounts.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setAccounts(loadedAccounts);
      } catch (error) {
        console.error('Error al cargar cuentas:', error);
        setMessage('Error al cargar las cuentas');
      }
    };
    
    loadAccounts();
  }, [user]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setMessage('Por favor, completa todos los campos');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      if (isEditing && editingId) {
        // Modo edición: actualizar documento existente
        const accountRef = doc(db, 'gmailAccounts', editingId);
        await updateDoc(accountRef, {
          username,
          password,
          updatedAt: new Date()
        });
        
        setMessage('Cuenta actualizada exitosamente');
      } else {
        // Modo creación: agregar nuevo documento
        await addDoc(collection(db, 'gmailAccounts'), {
          userId: user.uid,
          username,
          password,
          createdAt: new Date()
        });
        
        setMessage('Cuenta de Gmail guardada exitosamente');
      }
      
      // Actualizar la lista
      const q = query(
        collection(db, 'gmailAccounts'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const updatedAccounts = [];
      
      querySnapshot.forEach((doc) => {
        updatedAccounts.push({
          id: doc.id,
          ...doc.data()
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
        </h3>
        {accounts.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={toggleAllPasswords}
            style={{ marginLeft: '15px' }}
          >
            {accounts.every(account => showPasswordsList[account.id]) 
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
            <div key={account.id} className="data-card">
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
    </div>
  );
};

export default GmailAccounts;
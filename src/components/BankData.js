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
  
  const { encryptObject, decryptObject } = useEncryption(user?.uid);

  // Cargar datos bancarios del usuario
  useEffect(() => {
    const loadBankAccounts = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, 'bankData'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const loadedAccounts = [];
        
        querySnapshot.forEach((doc) => {
          const accountData = doc.data();
          // Desencriptar todos los campos sensibles
          const decryptedAccount = decryptObject(accountData, [
            'bankName', 'firstName', 'lastName', 'idNumber', 'accountType', 'accountNumber'
          ]);
          loadedAccounts.push({
            id: doc.id,
            ...decryptedAccount
          });
        });
        
        setBankAccounts(loadedAccounts);
        
        // Inicializar el estado de opciones de compartir
        const initialShareState = {};
        loadedAccounts.forEach(account => {
          initialShareState[account.id] = false;
        });
        setShowShareOptions(initialShareState);
      } catch (error) {
        console.error('Error al cargar datos bancarios:', error);
        setMessage('Error al cargar los datos bancarios');
      }
    };
    
    loadBankAccounts();
  }, [user, decryptObject]);

  // Función para generar el texto a compartir
  const generateShareText = (account) => {
    return `Datos Bancarios:\n` +
           `Banco: ${account.bankName}\n` +
           `Titular: ${account.firstName} ${account.lastName}\n` +
           `Cédula: ${account.idNumber}\n` +
           `Tipo de cuenta: ${account.accountType}\n` +
           `Número de cuenta: ${account.accountNumber}\n\n` +
           `Compartido desde MiApp Bancaria`;
  };

  // Función para compartir en WhatsApp
  const shareToWhatsApp = (account) => {
    const text = encodeURIComponent(generateShareText(account));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareOptions({...showShareOptions, [account.id]: false});
  };

  // Función para compartir en Facebook
  const shareToFacebook = (account) => {
    const text = generateShareText(account);
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowShareOptions({...showShareOptions, [account.id]: false});
  };

  // Función para compartir en Messenger
  const shareToMessenger = (account) => {
    const text = encodeURIComponent(generateShareText(account));
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(window.location.href)}&quote=${text}`, '_blank', 'width=600,height=400');
    setShowShareOptions({...showShareOptions, [account.id]: false});
  };

  // Función para compartir en Instagram
  const shareToInstagram = (account) => {
    navigator.clipboard.writeText(generateShareText(account))
      .then(() => {
        alert('Texto copiado al portapapeles. Puedes pegarlo en Instagram.');
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err);
      });
    setShowShareOptions({...showShareOptions, [account.id]: false});
  };

  // Función para copiar al portapapeles
  const copyToClipboard = (account) => {
    navigator.clipboard.writeText(generateShareText(account))
      .then(() => {
        setMessage('Datos copiados al portapapeles');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err);
        setMessage('Error al copiar los datos');
      });
    setShowShareOptions({...showShareOptions, [account.id]: false});
  };

  // Función para alternar las opciones de compartir
  const toggleShareOptions = (accountId) => {
    setShowShareOptions({
      ...showShareOptions,
      [accountId]: !showShareOptions[accountId]
    });
  };

  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    
    if (!bankName || !firstName || !lastName || !idNumber || !accountType || !accountNumber) {
      setMessage('Por favor, completa todos los campos');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Crear objeto con los datos
      const accountData = {
        userId: user.uid,
        bankName,
        firstName,
        lastName,
        idNumber,
        accountType,
        accountNumber,
        createdAt: new Date()
      };

      if (isEditing && editingId) {
        // Modo edición: actualizar documento existente
        accountData.updatedAt = new Date();
        
        // Encriptar todos los campos antes de enviar a Firebase
        const encryptedAccountData = encryptObject(accountData, [
          'bankName', 'firstName', 'lastName', 'idNumber', 'accountType', 'accountNumber'
        ]);
        
        const accountRef = doc(db, 'bankData', editingId);
        await updateDoc(accountRef, encryptedAccountData);
        
        setMessage('Datos bancarios actualizados y encriptados exitosamente');
      } else {
        // Modo creación: agregar nuevo documento
        // Encriptar todos los campos antes de enviar a Firebase
        const encryptedAccountData = encryptObject(accountData, [
          'bankName', 'firstName', 'lastName', 'idNumber', 'accountType', 'accountNumber'
        ]);
        
        await addDoc(collection(db, 'bankData'), encryptedAccountData);
        
        setMessage('Datos bancarios guardados y encriptados exitosamente');
      }
      
      // Actualizar la lista desde Firebase
      const q = query(
        collection(db, 'bankData'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const updatedAccounts = [];
      
      querySnapshot.forEach((doc) => {
        const accountData = doc.data();
        const decryptedAccount = decryptObject(accountData, [
          'bankName', 'firstName', 'lastName', 'idNumber', 'accountType', 'accountNumber'
        ]);
        updatedAccounts.push({
          id: doc.id,
          ...decryptedAccount
        });
      });
      
      setBankAccounts(updatedAccounts);
      
      // Actualizar el estado de compartir para las nuevas cuentas
      const updatedShareState = {};
      updatedAccounts.forEach(account => {
        updatedShareState[account.id] = false;
      });
      setShowShareOptions(updatedShareState);
      
      resetForm();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al guardar datos bancarios:', error);
      setMessage(`Error al ${isEditing ? 'actualizar' : 'guardar'} los datos bancarios`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    setBankName(account.bankName);
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setIdNumber(account.idNumber);
    setAccountType(account.accountType);
    setAccountNumber(account.accountNumber);
    setEditingId(account.id);
    setIsEditing(true);
    setMessage('');
    // Cerrar cualquier opción de compartir abierta
    setShowShareOptions({...showShareOptions, [account.id]: false});
    // Hacer scroll suave al formulario
    document.getElementById('bankDataForm')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDeleteBankAccount = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar estos datos bancarios?')) {
      try {
        await deleteDoc(doc(db, 'bankData', id));
        setBankAccounts(bankAccounts.filter(account => account.id !== id));
        
        // Actualizar el estado de compartir
        const newShareOptions = {...showShareOptions};
        delete newShareOptions[id];
        setShowShareOptions(newShareOptions);
        
        // Si estamos editando la cuenta que se elimina, resetear el formulario
        if (editingId === id) {
          resetForm();
        }
        
        setMessage('Datos bancarios eliminados exitosamente');
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Error al eliminar datos bancarios:', error);
        setMessage('Error al eliminar los datos bancarios');
      }
    }
  };

  const resetForm = () => {
    setBankName('');
    setFirstName('');
    setLastName('');
    setIdNumber('');
    setAccountType('');
    setAccountNumber('');
    setEditingId(null);
    setIsEditing(false);
  };

  // SVG Icons para los botones de compartir
  const ShareIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7 0-.24-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
    </svg>
  );

  const WhatsAppIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.52 3.49C18.18 1.13 15.19 0 12 0 5.48 0 0 5.48 0 12c0 2.19.58 4.32 1.68 6.21L0 24l5.9-1.54c1.79.98 3.8 1.5 5.9 1.5 6.52 0 12-5.48 12-12 0-3.19-1.13-6.18-3.48-8.51zM12 21.5c-1.72 0-3.41-.45-4.91-1.3l-.35-.21-3.76.98.99-3.67-.24-.37C2.97 15.21 2.5 13.62 2.5 12c0-5.24 4.26-9.5 9.5-9.5 2.53 0 4.91.98 6.7 2.77 1.78 1.78 2.76 4.17 2.76 6.7 0 5.24-4.26 9.5-9.5 9.5z"/>
    </svg>
  );

  const FacebookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/>
    </svg>
  );

  const MessengerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 4.974 0 11.11c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.11C24 4.974 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/>
    </svg>
  );

  const InstagramIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.25-1.69 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.26 1.7-4.77 4.92-4.92 1.27-.05 1.65-.07 4.85-.07zm0-2.16c-3.27 0-3.68.01-4.96.07-4.09.2-5.79 1.9-5.99 5.99C1.01 8.32 1 8.73 1 12s.01 3.68.05 4.96c.2 4.09 1.9 5.79 5.99 5.99 1.28.04 1.69.05 4.96.05s3.68-.01 4.96-.05c4.09-.2 5.79-1.9 5.99-5.99.04-1.28.05-1.69.05-4.96s-.01-3.68-.05-4.96c-.2-4.09-1.9-5.79-5.99-5.99C15.68 1.01 15.27 1 12 1z"/>
      <path d="M12 5.84c-3.4 0-6.16 2.76-6.16 6.16 0 3.4 2.76 6.16 6.16 6.16 3.4 0 6.16-2.76 6.16-6.16 0-3.4-2.76-6.16-6.16-6.16zm0 10.15c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
      <circle cx="18.37" cy="5.63" r="1.53"/>
    </svg>
  );

  // Estilos CSS para los botones de compartir
  const shareButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)',
    border: '1px solid #ddd',
    padding: '8px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#E8F4FF',
    transition: 'all 0.3s ease',
    marginBottom: '10px',
    width: '100%',
    justifyContent: 'center'
  };

  const shareOptionStyle = {
    background: '#141D2E',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px',
    marginBottom: '15px'
  };

  const socialButtonStyle = (bgColor) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: bgColor,
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'white',
    transition: 'opacity 0.3s',
    justifyContent: 'flex-start'
  });

  return (
    <div>
      <h2 className="section-title">Datos Bancarios</h2>
      
      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}
      
      <div className="data-card" id="bankDataForm">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>
            {isEditing ? 'Editar Datos Bancarios' : 'Agregar Nuevos Datos Bancarios'}
          </h3>
          <span style={{
            marginLeft: '10px',
            backgroundColor: isEditing ? '#38a169' : '#48bb78',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {isEditing ? 'EDITANDO' : 'ENCRIPTADO'}
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
        
        <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '15px' }}>
          {isEditing 
            ? 'Edita los datos bancarios. Los cambios se guardarán encriptados.'
            : 'Todos los datos bancarios se encriptan con AES-256 para máxima seguridad'
          }
        </p>
        
        <form onSubmit={handleAddBankAccount}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="bankName">Nombre del Banco</label>
              <input
                id="bankName"
                type="text"
                className="form-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                placeholder="Ej: Banco Nacional"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">Nombre</label>
              <input
                id="firstName"
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Tu nombre"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Apellido</label>
              <input
                id="lastName"
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Tu apellido"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="idNumber">Cédula/Identificación</label>
              <input
                id="idNumber"
                type="text"
                className="form-input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                required
                placeholder="Número de identificación"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="accountType">Tipo de Cuenta</label>
              <select
                id="accountType"
                className="form-input"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                required
              >
                <option value="">Selecciona un tipo</option>
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
                <option value="Nómina">Nómina</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="accountNumber">Número de Cuenta</label>
              <input
                id="accountNumber"
                type="text"
                className="form-input"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                placeholder="Número de cuenta bancaria"
              />
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
              'Actualizar Datos (Encriptados)'
            ) : (
              'Guardar Datos (Encriptados)'
            )}
          </button>
        </form>
      </div>
      
      {/* ENCABEZADO ACTUALIZADO CON EL MISMO ESTILO */}
      <div className="accounts-header-section">
        {/* Título principal centrado */}
        <div className="accounts-title-wrapper">
          <h3 className="accounts-title">
            Mis Datos Bancarios ({bankAccounts.length})
          </h3>
        </div>
        
        {/* Badge "DATOS DESENCRIPTADOS" centrado */}
        <div className="accounts-badge-wrapper">
          <span className="security-badge decrypted-badge">
            🔓 DATOS DESENCRIPTADOS
          </span>
        </div>
        
        {/* Botón "Compartir Todos" podría ir aquí si lo necesitas */}
        {bankAccounts.length > 0 && (
          <div className="accounts-toggle-wrapper">
            <span style={{
              color: '#7A99B8',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''} guardada{bankAccounts.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      {bankAccounts.length === 0 ? (
        <div className="data-card">
          <p style={{ textAlign: 'center', color: '#7A99B8', padding: '20px 0' }}>
            No tienes datos bancarios guardados. Agrega unos arriba.
          </p>
        </div>
      ) : (
        <div className="data-grid">
          {bankAccounts.map((account) => (
            <div key={account.id} className="data-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>
                  {account.bankName}
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
              
              <p><strong>Titular:</strong> {account.firstName} {account.lastName}</p>
              <p><strong>Cédula:</strong> {account.idNumber}</p>
              <p><strong>Tipo de cuenta:</strong> {account.accountType}</p>
              <p><strong>Número de cuenta:</strong> {account.accountNumber}</p>
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
              
              {/* Botón para compartir */}
              <div>
                <button
                  style={shareButtonStyle}
                  onClick={() => toggleShareOptions(account.id)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                >
                  <ShareIcon /> Compartir Datos
                </button>
                
                {/* Opciones de compartir (se muestran/ocultan) */}
                {showShareOptions[account.id] && (
                  <div style={shareOptionStyle}>
                    <button
                      style={socialButtonStyle('#25D366')}
                      onClick={() => shareToWhatsApp(account)}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <WhatsAppIcon /> WhatsApp
                    </button>
                    
                    <button
                      style={socialButtonStyle('#4267B2')}
                      onClick={() => shareToFacebook(account)}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <FacebookIcon /> Facebook
                    </button>
                    
                    <button
                      style={socialButtonStyle('#006AFF')}
                      onClick={() => shareToMessenger(account)}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <MessengerIcon /> Messenger
                    </button>
                    
                    <button
                      style={socialButtonStyle('#E4405F')}
                      onClick={() => shareToInstagram(account)}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <InstagramIcon /> Instagram
                    </button>
                    
                    <button
                      style={{
                        ...shareButtonStyle,
                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                        border: '1px solid #6c757d',
                        color: '#6c757d'
                      }}
                      onClick={() => copyToClipboard(account)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    >
                      📋 Copiar Texto
                    </button>
                  </div>
                )}
              </div>
              
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleEditAccount(account)}
                  disabled={editingId === account.id}
                >
                  {editingId === account.id ? 'Editando...' : 'Editar'}
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleDeleteBankAccount(account.id)}
                  disabled={editingId === account.id}
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

export default BankData;
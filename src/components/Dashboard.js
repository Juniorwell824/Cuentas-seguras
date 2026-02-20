import React, { useState, useRef, useEffect } from 'react';
import GmailAccounts from './GmailAccounts';
import OtherAccounts from './OtherAccounts';
import BankData from './BankData';

// Importa Firebase (descomenta cuando tengas configurado)
import { auth, db, storage } from './firebaseConfig';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const Dashboard = ({ user, handleLogout }) => {
  const [activeSection, setActiveSection] = useState('gmail');
  const [currentUser, setCurrentUser] = useState(user);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(60); // 60 segundos de advertencia
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  const [userConfig, setUserConfig] = useState({
    username: '',
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    profilePicture: null,
  });
  
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const fileInputRef = useRef(null);
  
  // Timeouts para el cierre automático
  const inactivityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Configurar el tiempo de inactividad (2 minutos = 120000 ms)
  const INACTIVITY_TIMEOUT = 120000; // 2 minutos
  const WARNING_TIME = 60000; // 1 minuto de advertencia

  // Función para resetear el timer de inactividad
  const resetInactivityTimer = () => {
    setLastActivity(Date.now());
    
    // Limpiar timeouts anteriores
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Ocultar advertencia si está visible
    if (showTimeoutWarning) {
      setShowTimeoutWarning(false);
      setTimeoutCountdown(60);
    }
    
    // Configurar nuevo timeout para mostrar advertencia (1 minuto)
    warningTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setTimeoutCountdown(60);
      
      // Iniciar cuenta regresiva
      countdownIntervalRef.current = setInterval(() => {
        setTimeoutCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Configurar timeout para logout automático después de la advertencia
      inactivityTimeoutRef.current = setTimeout(() => {
        handleAutoLogout();
      }, WARNING_TIME);
      
    }, INACTIVITY_TIMEOUT - WARNING_TIME); // Mostrar advertencia después de 1 minuto
  };

  // Función para manejar logout automático
  const handleAutoLogout = () => {
    if (showTimeoutWarning) {
      // Mostrar mensaje de timeout automático
      alert('Tu sesión ha expirado por inactividad. Por seguridad, se ha cerrado la sesión automáticamente.');
    }
    handleLogout();
  };

  // Función para extender la sesión
  const extendSession = () => {
    resetInactivityTimer();
  };

  // Configurar event listeners para detectar actividad
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };
    
    // Agregar listeners de eventos
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Iniciar el timer por primera vez
    resetInactivityTimer();
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Cargar datos del usuario desde Firestore
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setCurrentUser(prev => ({
            ...prev,
            username: userData.username || '',
            profilePicture: userData.profilePicture || null
          }));
          setUserConfig(prev => ({
            ...prev,
            username: userData.username || '',
            profilePicture: userData.profilePicture || null
          }));
        } else {
          // Crear documento del usuario si no existe
          await setDoc(userRef, {
            email: user.email,
            username: '',
            profilePicture: null,
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
      } finally {
        setInitialLoad(false);
      }
    };

    if (user.uid) {
      loadUserData();
    }
  }, [user]);

  // Función para confirmar logout
  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Función para cancelar logout
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Función para ejecutar logout después de confirmación
  const executeLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  // Validación mejorada de campos
  const validateForm = () => {
    const newErrors = {};
    
    // Validación de nombre de usuario
    if (userConfig.username.trim().length < 3) {
      newErrors.username = 'El nombre debe tener al menos 3 caracteres.';
    }
    
    if (userConfig.username.trim().length > 30) {
      newErrors.username = 'El nombre no puede exceder 30 caracteres.';
    }
    
    // Validación solo si se quiere cambiar la contraseña
    if (userConfig.newPassword || userConfig.currentPassword || userConfig.confirmPassword) {
      if (userConfig.newPassword) {
        if (userConfig.newPassword.length < 8) {
          newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres.';
        }
        
        // Validar fortaleza de contraseña
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(userConfig.newPassword)) {
          newErrors.newPassword = 'La contraseña debe contener mayúsculas, minúsculas, números y símbolos.';
        }
        
        if (userConfig.newPassword !== userConfig.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden.';
        }
        
        if (!userConfig.currentPassword) {
          newErrors.currentPassword = 'Ingrese su contraseña actual para cambiarla.';
        }
      } else {
        if (userConfig.currentPassword) {
          newErrors.newPassword = 'Ingrese la nueva contraseña.';
        }
        if (userConfig.confirmPassword) {
          newErrors.confirmPassword = 'Confirme la nueva contraseña.';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    
    // Validación en tiempo real
    let error = '';
    
    if (name === 'username') {
      if (value.trim().length > 0 && value.trim().length < 3) {
        error = 'El nombre debe tener al menos 3 caracteres.';
      }
      if (value.trim().length > 30) {
        error = 'El nombre no puede exceder 30 caracteres.';
      }
    }
    
    if (name === 'newPassword' && value.length > 0) {
      if (value.length < 8) {
        error = 'La contraseña debe tener al menos 8 caracteres.';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value)) {
        error = 'Debe contener mayúsculas, minúsculas, números y símbolos.';
      }
    }
    
    if (name === 'confirmPassword' && value.length > 0) {
      if (userConfig.newPassword !== value) {
        error = 'Las contraseñas no coinciden.';
      }
    }
    
    setUserConfig({
      ...userConfig,
      [name]: value
    });
    
    setErrors({
      ...errors,
      [name]: error
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors({
          ...errors,
          profilePicture: 'Formato no válido. Use JPG, PNG, GIF o WebP.'
        });
        return;
      }
      
      // Validar tamaño
      if (file.size > 5 * 1024 * 1024) {
        setErrors({
          ...errors,
          profilePicture: 'La imagen no debe superar los 5MB.'
        });
        return;
      }
      
      // Crear preview local
      const imageUrl = URL.createObjectURL(file);
      
      setUserConfig({
        ...userConfig,
        profilePicture: imageUrl,
        profilePictureFile: file
      });
      
      setErrors({
        ...errors,
        profilePicture: ''
      });
    }
  };

  const handleSelectImage = () => {
    fileInputRef.current.click();
  };

  const handleRemoveImage = () => {
    setUserConfig({
      ...userConfig,
      profilePicture: null,
      profilePictureFile: null,
      removePicture: true
    });
  };

  // Subir imagen a Firebase Storage
  const uploadProfilePicture = async (file, userId) => {
    if (!file) return null;
    
    try {
      // Eliminar imagen anterior si existe
      if (currentUser.profilePicture && currentUser.profilePicture.includes('firebasestorage')) {
        try {
          const oldImageRef = ref(storage, currentUser.profilePicture);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.log('No se pudo eliminar la imagen anterior:', error);
        }
      }
      
      // Crear referencia única
      const timestamp = Date.now();
      const fileName = `profile_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
      
      // Subir archivo
      await uploadBytes(storageRef, file);
      
      // Obtener URL permanente
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw new Error('No se pudo subir la imagen. Intente nuevamente.');
    }
  };

  // Actualizar perfil en Firebase
  const updateUserProfile = async (userId, updates) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Preparar datos para Firestore
      const firestoreUpdates = {};
      if (updates.username !== undefined) {
        firestoreUpdates.username = updates.username;
      }
      if (updates.profilePicture !== undefined) {
        firestoreUpdates.profilePicture = updates.profilePicture;
      }
      
      // Actualizar Firestore
      await updateDoc(userRef, firestoreUpdates);
      
      // Actualizar Firebase Auth (displayName y photoURL)
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser) {
        await updateProfile(currentAuthUser, {
          displayName: updates.username || currentAuthUser.displayName,
          photoURL: updates.profilePicture || currentAuthUser.photoURL
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw new Error('No se pudo actualizar el perfil. Intente nuevamente.');
    }
  };

  // Cambiar contraseña
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      
      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Cambiar contraseña
      await updatePassword(user, newPassword);
      return true;
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('La contraseña actual es incorrecta.');
      }
      throw new Error('No se pudo cambiar la contraseña. Intente nuevamente.');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const updates = {};
      let passwordChanged = false;
      
      // 1. Subir imagen si hay una nueva
      if (userConfig.profilePictureFile) {
        const imageUrl = await uploadProfilePicture(userConfig.profilePictureFile, user.uid);
        if (imageUrl) {
          updates.profilePicture = imageUrl;
          // Limpiar URL temporal
          if (userConfig.profilePicture && userConfig.profilePicture.startsWith('blob:')) {
            URL.revokeObjectURL(userConfig.profilePicture);
          }
        }
      } else if (userConfig.removePicture && currentUser.profilePicture) {
        // Eliminar imagen existente
        updates.profilePicture = null;
        if (currentUser.profilePicture.includes('firebasestorage')) {
          const oldImageRef = ref(storage, currentUser.profilePicture);
          await deleteObject(oldImageRef);
        }
      }
      
      // 2. Actualizar nombre de usuario si cambió
      if (userConfig.username !== currentUser.username) {
        updates.username = userConfig.username.trim();
      }
      
      // 3. Actualizar en Firebase
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(user.uid, updates);
        // Actualizar estado local
        setCurrentUser(prev => ({ ...prev, ...updates }));
      }
      
      // 4. Cambiar contraseña si se solicitó
      if (userConfig.newPassword && userConfig.currentPassword) {
        await changePassword(userConfig.currentPassword, userConfig.newPassword);
        passwordChanged = true;
      }
      
      // Mostrar mensaje de éxito
      let message = 'Configuración actualizada correctamente.';
      if (passwordChanged) {
        message += ' La contraseña ha sido cambiada.';
      }
      setSuccessMessage(message);
      
      // Resetear campos
      setUserConfig(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        profilePictureFile: null,
        removePicture: false
      }));
      
    } catch (error) {
      console.error('Error completo:', error);
      setErrors({ 
        submit: error.message || 'Error al actualizar la configuración. Intente nuevamente.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Componente de configuración
  const UserConfigSection = () => {
    if (initialLoad) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ color: '#7A99B8', fontSize: '15px' }}>Cargando configuración...</p>
        </div>
      );
    }

    return (
      <div style={{
        background: '#141D2E',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: '18px',
        padding: '30px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '30px', 
          color: '#E8F4FF',
          fontFamily: "'Exo 2', 'Inter', sans-serif",
          fontSize: '22px',
          fontWeight: '700',
          paddingBottom: '18px',
          borderBottom: '1px solid rgba(0,229,255,0.12)'
        }}>
          <span>⚙️</span> Configuración de Usuario
        </h2>
        
        <form onSubmit={handleSaveConfig} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '25px' 
        }}>
          {successMessage && (
            <div style={{ 
              background: 'rgba(0,214,143,0.1)',
              color: '#00D68F', 
              padding: '14px 18px', 
              borderRadius: '10px',
              border: '1px solid rgba(0,214,143,0.25)',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              ✅ {successMessage}
            </div>
          )}
          
          {errors.submit && (
            <div style={{ 
              background: 'rgba(255,77,103,0.1)',
              color: '#FF4D67', 
              padding: '14px 18px', 
              borderRadius: '10px',
              border: '1px solid rgba(255,77,103,0.25)',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              ❌ {errors.submit}
            </div>
          )}
          
          {/* Foto de perfil */}
          <div style={{ 
            marginBottom: '30px', 
            paddingBottom: '30px', 
            borderBottom: '1px solid rgba(0,229,255,0.1)' 
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#E8F4FF',
              fontSize: '16px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontSize: '12px',
              color: '#7A99B8'
            }}>Foto de Perfil</h3>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px' 
            }}>
              <div style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(0,229,255,0.4)',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.05))',
                boxShadow: '0 0 20px rgba(0,229,255,0.15)',
              }}>
                {userConfig.profilePicture ? (
                  <img 
                    src={userConfig.profilePicture} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.05))', 
                    color: '#00E5FF', 
                    fontSize: '55px' 
                  }}>
                    👤
                  </div>
                )}
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                flexWrap: 'wrap', 
                justifyContent: 'center' 
              }}>
                <button 
                  type="button" 
                  style={{
                    padding: '10px 22px',
                    border: '1.5px solid rgba(0,229,255,0.35)',
                    borderRadius: '10px',
                    background: 'rgba(0,229,255,0.08)',
                    color: '#00E5FF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.25s',
                    opacity: loading ? 0.5 : 1,
                    pointerEvents: loading ? 'none' : 'auto'
                  }}
                  onClick={handleSelectImage}
                  onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'rgba(0,229,255,0.15)')}
                  onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'rgba(0,229,255,0.08)')}
                >
                  <span>📤</span> Elegir Foto
                </button>
                
                {(userConfig.profilePicture || currentUser.profilePicture) && (
                  <button 
                    type="button" 
                    style={{
                      padding: '10px 22px',
                      border: '1.5px solid rgba(255,77,103,0.35)',
                      borderRadius: '10px',
                      background: 'rgba(255,77,103,0.08)',
                      color: '#FF4D67',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: "'Inter', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.25s',
                      opacity: loading ? 0.5 : 1,
                      pointerEvents: loading ? 'none' : 'auto'
                    }}
                    onClick={handleRemoveImage}
                    onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,77,103,0.16)')}
                    onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,77,103,0.08)')}
                  >
                    <span>🗑️</span> Eliminar
                  </button>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </div>
              
              {errors.profilePicture && (
                <p style={{ 
                  color: '#FF4D67', 
                  fontSize: '13px', 
                  margin: '0',
                  textAlign: 'center'
                }}>
                  ❌ {errors.profilePicture}
                </p>
              )}
              
              <p style={{ 
                color: '#4A6580', 
                fontSize: '12px', 
                textAlign: 'center',
                maxWidth: '400px',
                margin: '0'
              }}>
                Formatos permitidos: JPG, PNG, GIF, WebP (Máx. 5MB)
              </p>
            </div>
          </div>
          
          {/* Campo de nombre de usuario */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            marginBottom: '20px'
          }}>
            <label htmlFor="username" style={{ 
              fontWeight: '700', 
              color: '#7A99B8',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              Nombre de Usuario <span style={{color: '#FF4D67'}}>*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={userConfig.username}
              onChange={handleConfigChange}
              style={{
                padding: '12px 15px',
                border: errors.username ? '1px solid #dc3545' : '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.3s'
              }}
              placeholder="Ingrese su nombre de usuario (3-30 caracteres)"
              disabled={loading}
              maxLength="30"
            />
            {errors.username && (
              <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                ❌ {errors.username}
              </p>
            )}
            <p style={{ color: '#4A6580', fontSize: '11px', margin: '5px 0 0 0' }}>
              {userConfig.username.length}/30 caracteres
            </p>
          </div>
          
          {/* Campo de email (deshabilitado) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            marginBottom: '20px'
          }}>
            <label htmlFor="email" style={{ 
              fontWeight: '700', 
              color: '#7A99B8',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>Correo Electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              value={userConfig.email}
              disabled
              style={{
                padding: '13px 16px',
                border: '1.5px solid rgba(255,255,255,0.05)',
                borderRadius: '10px',
                fontSize: '15px',
                background: 'rgba(255,255,255,0.03)',
                color: '#4A6580',
                cursor: 'not-allowed',
                fontFamily: "'Inter', sans-serif"
              }}
              title="El correo no se puede cambiar"
            />
            <p style={{ color: '#4A6580', fontSize: '12px', margin: '5px 0 0 0' }}>
              ⚠️ El correo electrónico no se puede modificar por ser único.
            </p>
          </div>
          
          {/* Sección de cambio de contraseña */}
          <div style={{ 
            marginTop: '20px', 
            paddingTop: '20px', 
            borderTop: '1px solid rgba(0,229,255,0.1)' 
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#7A99B8',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>Cambiar Contraseña</h3>
            
            <p style={{ 
              color: '#7A99B8', 
              fontSize: '13px', 
              marginBottom: '20px',
              padding: '12px 16px',
              background: 'rgba(0,229,255,0.05)',
              border: '1px solid rgba(0,229,255,0.12)',
              borderRadius: '10px'
            }}>
              🔒 Deja estos campos vacíos si no quieres cambiar la contraseña.
            </p>
            
            {/* Contraseña actual */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              marginBottom: '20px'
            }}>
              <label htmlFor="currentPassword" style={{ 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>Contraseña Actual</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={userConfig.currentPassword}
                onChange={handleConfigChange}
                style={{
                  padding: '12px 15px',
                  border: errors.currentPassword ? '1px solid #dc3545' : '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s'
                }}
                placeholder="Ingrese su contraseña actual"
                disabled={loading}
              />
              {errors.currentPassword && (
                <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                  ❌ {errors.currentPassword}
                </p>
              )}
            </div>
            
            {/* Nueva contraseña */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              marginBottom: '20px'
            }}>
              <label htmlFor="newPassword" style={{ 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>Nueva Contraseña</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={userConfig.newPassword}
                onChange={handleConfigChange}
                style={{
                  padding: '12px 15px',
                  border: errors.newPassword ? '1px solid #dc3545' : '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s'
                }}
                placeholder="Mín. 8 caracteres con mayúsculas, minúsculas, números y símbolos"
                disabled={loading}
              />
              {errors.newPassword && (
                <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                  ❌ {errors.newPassword}
                </p>
              )}
              {userConfig.newPassword && !errors.newPassword && (
                <p style={{ color: '#00D68F', fontSize: '12px', margin: '5px 0 0 0' }}>
                  ✅ Contraseña válida
                </p>
              )}
            </div>
            
            {/* Confirmar contraseña */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              marginBottom: '20px'
            }}>
              <label htmlFor="confirmPassword" style={{ 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={userConfig.confirmPassword}
                onChange={handleConfigChange}
                style={{
                  padding: '12px 15px',
                  border: errors.confirmPassword ? '1px solid #dc3545' : '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s'
                }}
                placeholder="Confirme la nueva contraseña"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                  ❌ {errors.confirmPassword}
                </p>
              )}
              {userConfig.confirmPassword && !errors.confirmPassword && (
                <p style={{ color: '#00D68F', fontSize: '12px', margin: '5px 0 0 0' }}>
                  ✅ Contraseñas coinciden
                </p>
              )}
            </div>
          </div>
          
          {/* Botones de acción */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px', 
            marginTop: '30px', 
            paddingTop: '24px', 
            borderTop: '1px solid rgba(0,229,255,0.1)' 
          }}>
            <button 
              type="button" 
              style={{
                padding: '12px 24px',
                border: '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                background: 'transparent',
                color: '#7A99B8',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.25s',
                opacity: loading ? 0.5 : 1,
                pointerEvents: loading ? 'none' : 'auto'
              }}
              onClick={() => setActiveSection('gmail')}
              onMouseOver={(e) => !loading && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={{
                padding: '12px 28px',
                border: 'none',
                borderRadius: '10px',
                background: loading ? 'rgba(0,229,255,0.4)' : '#00E5FF',
                color: loading ? '#7A99B8' : '#05111F',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.25s',
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,229,255,0.4)',
                position: 'relative'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={{ marginRight: '10px' }}>⏳</span>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Modal de confirmación para logout
  const LogoutConfirmModal = () => {
    if (!showLogoutConfirm) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-in-out',
          pointerEvents: 'auto',
        }}
        onClick={cancelLogout}
      >
        <div 
          style={{
            background: '#141D2E',
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: '18px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            animation: 'slideIn 0.3s ease-in-out',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{
              fontSize: '60px',
              marginBottom: '15px',
              color: '#ff6b6b'
            }}>
              ❓
            </div>
            <h2 style={{
              margin: 0,
              marginBottom: '10px',
              color: '#E8F4FF',
              fontFamily: "'Exo 2', 'Inter', sans-serif",
              fontSize: '22px',
              fontWeight: '700'
            }}>
              ¿Estás seguro?
            </h2>
            <p style={{
              color: '#7A99B8',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: 0
            }}>
              Estás a punto de cerrar sesión de tu cuenta.<br />
              ¿Deseas continuar?
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
            marginTop: '25px'
          }}>
            <button
              onClick={cancelLogout}
              style={{
                padding: '12px 30px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#6c757d',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.3s',
                flex: 1,
                maxWidth: '150px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#5a6268';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#6c757d';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Cancelar
            </button>
            <button
              onClick={executeLogout}
              style={{
                padding: '12px 30px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.3s',
                flex: 1,
                maxWidth: '150px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#c82333';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc3545';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Sí, cerrar sesión
            </button>
          </div>
          
          <p style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '14px',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #eee'
          }}>
            Tu información se guardará automáticamente
          </p>
        </div>
      </div>
    );
  };

  // Modal de advertencia de timeout
  const TimeoutWarningModal = () => {
    if (!showTimeoutWarning) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-in-out',
          pointerEvents: 'auto',
        }}
      >
        <div 
          style={{
            background: '#141D2E',
            border: '1px solid rgba(255,184,0,0.2)',
            borderRadius: '18px',
            padding: '28px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.3s ease-in-out',
            textAlign: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            fontSize: '60px',
            marginBottom: '20px',
            color: '#ff9800'
          }}>
            ⏰
          </div>
          
          <h2 style={{
            margin: 0,
            marginBottom: '15px',
            color: '#333',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            Sesión por expirar
          </h2>
          
          <p style={{
            color: '#666',
            fontSize: '16px',
            lineHeight: '1.5',
            marginBottom: '25px'
          }}>
            Tu sesión se cerrará automáticamente por inactividad en:
          </p>
          
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#dc3545',
            margin: '20px 0',
            fontFamily: 'monospace',
          }}>
            {timeoutCountdown}s
          </div>
          
          <p style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '30px',
            padding: '15px',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            border: '1px solid #ffeaa7'
          }}>
            ⚠️ Por seguridad, tu sesión se cerrará automáticamente después de 2 minutos de inactividad.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center'
          }}>
            <button
              onClick={extendSession}
              style={{
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#28a745',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#218838';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#28a745';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>↻</span> Continuar sesión
            </button>
            
            <button
              onClick={handleAutoLogout}
              style={{
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#6c757d',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#5a6268';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#6c757d';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>🚪</span> Cerrar ahora
            </button>
          </div>
          
          <p style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '12px',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #eee'
          }}>
            Última actividad: {new Date(lastActivity).toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

  // Agregar estilos de animación
  useEffect(() => {
    // Solo agregar los estilos si no existen
    if (!document.querySelector('#dashboard-animations')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'dashboard-animations';
      styleTag.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulseWarning {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .timeout-warning {
          animation: pulseWarning 1s infinite;
        }
        
        .dashboard-content-wrapper {
          position: relative;
          z-index: 1;
          transition: opacity 0.3s;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
        }
      `;
      document.head.appendChild(styleTag);
    }
  }, []);

  // Estilos principales del dashboard
  const dashboardStyles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    btnGroup: {
      display: 'flex',
      gap: '6px',
      marginBottom: '30px',
      flexWrap: 'wrap',
      background: '#141D2E',
      border: '1px solid rgba(0,229,255,0.12)',
      borderRadius: '18px',
      padding: '5px',
      width: 'fit-content',
    },
    btn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
  };

  // Estilos específicos del header — Tema EV Dark Cyan
  const headerStyles = {
    dashboardHeader: {
      background: 'linear-gradient(135deg, #0A0F1A 0%, #101827 60%, #0D1A2A 100%)',
      borderRadius: '16px',
      padding: '24px 30px',
      marginBottom: '28px',
      boxShadow: '0 4px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.08)',
      color: '#E8F4FF',
      borderTop: '2px solid',
      borderImage: 'linear-gradient(90deg, transparent, #00E5FF, transparent) 1',
      position: 'relative',
      overflow: 'hidden',
    },
    headerContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      zIndex: 1,
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    avatar: {
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      overflow: 'hidden',
      border: '2px solid rgba(0,229,255,0.4)',
      background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.05))',
      boxShadow: '0 0 16px rgba(0,229,255,0.2)',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '30px',
      color: '#00E5FF',
    },
    userText: {
      display: 'flex',
      flexDirection: 'column',
    },
    email: {
      fontSize: '13px',
      color: '#7A99B8',
      marginTop: '5px',
      display: 'inline-block',
      background: 'rgba(0,229,255,0.07)',
      border: '1px solid rgba(0,229,255,0.15)',
      padding: '4px 12px',
      borderRadius: '20px',
    },
    logoutBtn: {
      marginTop: '10px',
      padding: '8px 18px',
      background: 'rgba(255,77,103,0.1)',
      border: '1.5px solid rgba(255,77,103,0.35)',
      borderRadius: '10px',
      color: '#FF4D67',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.25s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      maxWidth: '160px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    settingsBtn: {
      background: 'rgba(0,229,255,0.07)',
      border: '1.5px solid rgba(0,229,255,0.25)',
      borderRadius: '50%',
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '20px',
      color: '#00E5FF',
      transition: 'all 0.3s',
    },
  };

  return (
    <>
      {/* MODALES - Renderizados completamente independientes con z-index máximo */}
      {showLogoutConfirm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            pointerEvents: 'auto',
          }}
          onClick={cancelLogout}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1000000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{
                fontSize: '60px',
                marginBottom: '15px',
                color: '#ff6b6b'
              }}>
                ❓
              </div>
              <h2 style={{
                margin: 0,
                marginBottom: '10px',
                color: '#333',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                ¿Estás seguro?
              </h2>
              <p style={{
                color: '#666',
                fontSize: '16px',
                lineHeight: '1.5',
                margin: 0
              }}>
                Estás a punto de cerrar sesión de tu cuenta.<br />
                ¿Deseas continuar?
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginTop: '25px'
            }}>
              <button
                onClick={cancelLogout}
                style={{
                  padding: '12px 30px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  flex: 1,
                  maxWidth: '150px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a6268';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6c757d';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executeLogout}
                style={{
                  padding: '12px 30px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  flex: 1,
                  maxWidth: '150px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#c82333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc3545';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Sí, cerrar sesión
              </button>
            </div>
            
            <p style={{
              textAlign: 'center',
              color: '#999',
              fontSize: '14px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #eee'
            }}>
              Tu información se guardará automáticamente
            </p>
          </div>
        </div>
      )}

      {showTimeoutWarning && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            pointerEvents: 'auto',
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1000000,
            }}
          >
            <div style={{
              fontSize: '60px',
              marginBottom: '20px',
              color: '#ff9800'
            }}>
              ⏰
            </div>
            
            <h2 style={{
              margin: 0,
              marginBottom: '15px',
              color: '#333',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Sesión por expirar
            </h2>
            
            <p style={{
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.5',
              marginBottom: '25px'
            }}>
              Tu sesión se cerrará automáticamente por inactividad en:
            </p>
            
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#dc3545',
              margin: '20px 0',
              fontFamily: 'monospace',
            }}>
              {timeoutCountdown}s
            </div>
            
            <p style={{
              color: '#666',
              fontSize: '14px',
              marginBottom: '30px',
              padding: '15px',
              backgroundColor: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffeaa7'
            }}>
              ⚠️ Por seguridad, tu sesión se cerrará automáticamente después de 2 minutos de inactividad.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={extendSession}
                style={{
                  padding: '15px 30px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#218838';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>↻</span> Continuar sesión
              </button>
              
              <button
                onClick={handleAutoLogout}
                style={{
                  padding: '15px 30px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a6268';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6c757d';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>🚪</span> Cerrar ahora
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="dashboard-layout">
        {/* Indicador de inactividad (solo visible cuando está cerca el timeout) */}
        {showTimeoutWarning && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#ff9800',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '8px',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'pulseWarning 1s infinite'
          }}>
            <span>⏰</span>
            <span>Sesión expira en: {timeoutCountdown}s</span>
          </div>
        )}
        
        {/* 2. CONTENIDO PRINCIPAL - Con efecto de deshabilitado cuando los modales están abiertos */}
        <div className="dashboard-content-wrapper" style={{ 
          position: 'relative',
          zIndex: 1,
          pointerEvents: (showLogoutConfirm || showTimeoutWarning) ? 'none' : 'auto',
          opacity: (showLogoutConfirm || showTimeoutWarning) ? 0.5 : 1,
          transition: 'opacity 0.3s'
        }}>
          {/* Header del dashboard */}
          <div className="dashboard-header-wrapper">
            <header className="dashboard-header" style={headerStyles.dashboardHeader}>
              <div className="header-content" style={headerStyles.headerContent}>
                <div className="user-info" style={headerStyles.userInfo}>
                  <div className="avatar" style={headerStyles.avatar}>
                    {currentUser.profilePicture ? (
                      <img 
                        src={currentUser.profilePicture} 
                        alt="Usuario" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={headerStyles.avatarPlaceholder}>👤</div>
                    )}
                  </div>

                  <div className="user-text" style={headerStyles.userText}>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', fontFamily: "'Exo 2', 'Inter', sans-serif", color: '#E8F4FF', letterSpacing: '-0.3px' }}>Mi Gestor Seguro</h1>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#4A6580' }}>Bienvenido,</p>
                    <span className="email" style={headerStyles.email}>
                      {currentUser.username || user.email}
                    </span>
                    
                    <button 
                      className="logout-btn" 
                      style={headerStyles.logoutBtn}
                      onClick={confirmLogout}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255,77,103,0.2)';
                        e.currentTarget.style.borderColor = '#FF4D67';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,77,103,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255,77,103,0.35)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <span>🚪</span> Cerrar sesión
                    </button>
                  </div>
                </div>

                <button 
                  className="settings-btn" 
                  style={headerStyles.settingsBtn}
                  onClick={() => setActiveSection('config')}
                  title="Configuración"
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0,229,255,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)';
                    e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0,229,255,0.07)';
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)';
                    e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                  }}
                >
                  ⚙️
                </button>
              </div>
            </header>
          </div>

          {/* Botones de navegación */}
          <div className="nav-buttons-container">
            <div style={dashboardStyles.btnGroup} className="nav-btn-group">
              <button 
                style={{
                  ...dashboardStyles.btn,
                  backgroundColor: activeSection === 'gmail' ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: activeSection === 'gmail' ? '#00E5FF' : '#7A99B8',
                  boxShadow: activeSection === 'gmail' ? '0 0 12px rgba(0,229,255,0.18)' : 'none',
                }}
                onClick={() => setActiveSection('gmail')}
                onMouseOver={(e) => {
                  if (activeSection !== 'gmail') {
                    e.currentTarget.style.backgroundColor = 'rgba(0,229,255,0.07)';
                    e.currentTarget.style.color = '#00E5FF';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeSection !== 'gmail') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#7A99B8';
                  }
                }}
              >
                <span>📧</span> Cuentas de Gmail
              </button>
              <button 
                style={{
                  ...dashboardStyles.btn,
                  backgroundColor: activeSection === 'other' ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: activeSection === 'other' ? '#00E5FF' : '#7A99B8',
                  boxShadow: activeSection === 'other' ? '0 0 12px rgba(0,229,255,0.18)' : 'none',
                }}
                onClick={() => setActiveSection('other')}
                onMouseOver={(e) => {
                  if (activeSection !== 'other') {
                    e.currentTarget.style.backgroundColor = 'rgba(0,229,255,0.07)';
                    e.currentTarget.style.color = '#00E5FF';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeSection !== 'other') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#7A99B8';
                  }
                }}
              >
                <span>👥</span> Otras Cuentas
              </button>
              <button 
                style={{
                  ...dashboardStyles.btn,
                  backgroundColor: activeSection === 'bank' ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: activeSection === 'bank' ? '#00E5FF' : '#7A99B8',
                  boxShadow: activeSection === 'bank' ? '0 0 12px rgba(0,229,255,0.18)' : 'none',
                }}
                onClick={() => setActiveSection('bank')}
                onMouseOver={(e) => {
                  if (activeSection !== 'bank') {
                    e.currentTarget.style.backgroundColor = 'rgba(0,229,255,0.07)';
                    e.currentTarget.style.color = '#00E5FF';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeSection !== 'bank') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#7A99B8';
                  }
                }}
              >
                <span>🏦</span> Datos Bancarios
              </button>
            </div>
          </div>
          
          {/* Contenido principal */}
          <div className="section-content-wrapper">
            <div className="section-content" style={{ minHeight: '400px' }}>
              {activeSection === 'gmail' && <GmailAccounts user={currentUser} />}
              {activeSection === 'other' && <OtherAccounts user={currentUser} />}
              {activeSection === 'bank' && <BankData user={currentUser} />}
              {activeSection === 'config' && <UserConfigSection />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
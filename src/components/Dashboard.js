import React, { useState, useRef, useEffect } from 'react';
import GmailAccounts from './GmailAccounts';
import OtherAccounts from './OtherAccounts';
import BankData from './BankData';
import LogoutButton from './LogoutButton';

// Importa Firebase (descomenta cuando tengas configurado)
import { auth, db, storage } from './firebaseConfig';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const Dashboard = ({ user, handleLogout }) => {
  const [activeSection, setActiveSection] = useState('gmail');
  const [currentUser, setCurrentUser] = useState(user);
  
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
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ color: '#666', fontSize: '16px' }}>Cargando configuración...</p>
        </div>
      );
    }

    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '30px', 
          color: '#333',
          fontSize: '24px'
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
              backgroundColor: '#d4edda', 
              color: '#155724', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #c3e6cb',
              marginBottom: '20px'
            }}>
              ✅ {successMessage}
            </div>
          )}
          
          {errors.submit && (
            <div style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #f5c6cb',
              marginBottom: '20px'
            }}>
              ❌ {errors.submit}
            </div>
          )}
          
          {/* Foto de perfil */}
          <div style={{ 
            marginBottom: '30px', 
            paddingBottom: '30px', 
            borderBottom: '1px solid #eee' 
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#333',
              fontSize: '18px'
            }}>Foto de Perfil</h3>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px' 
            }}>
              <div style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '5px solid #f0f0f0',
                backgroundColor: '#f9f9f9',
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
                    background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', 
                    color: 'white', 
                    fontSize: '60px' 
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
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background-color 0.3s',
                    opacity: loading ? 0.5 : 1,
                    pointerEvents: loading ? 'none' : 'auto'
                  }}
                  onClick={handleSelectImage}
                  onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#5a6268')}
                  onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#6c757d')}
                >
                  <span>📤</span> Elegir Foto
                </button>
                
                {(userConfig.profilePicture || currentUser.profilePicture) && (
                  <button 
                    type="button" 
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.3s',
                      opacity: loading ? 0.5 : 1,
                      pointerEvents: loading ? 'none' : 'auto'
                    }}
                    onClick={handleRemoveImage}
                    onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#c82333')}
                    onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#dc3545')}
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
                  color: '#dc3545', 
                  fontSize: '14px', 
                  margin: '0',
                  textAlign: 'center'
                }}>
                  ❌ {errors.profilePicture}
                </p>
              )}
              
              <p style={{ 
                color: '#666', 
                fontSize: '14px', 
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
              fontWeight: '600', 
              color: '#333',
              fontSize: '14px'
            }}>
              Nombre de Usuario <span style={{color: '#dc3545'}}>*</span>
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
            <p style={{ color: '#666', fontSize: '12px', margin: '5px 0 0 0' }}>
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
              fontWeight: '600', 
              color: '#333',
              fontSize: '14px'
            }}>Correo Electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              value={userConfig.email}
              disabled
              style={{
                padding: '12px 15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#f5f5f5',
                color: '#999',
                cursor: 'not-allowed'
              }}
              title="El correo no se puede cambiar"
            />
            <p style={{ color: '#666', fontSize: '14px', margin: '5px 0 0 0' }}>
              ⚠️ El correo electrónico no se puede modificar por ser único.
            </p>
          </div>
          
          {/* Sección de cambio de contraseña */}
          <div style={{ 
            marginTop: '20px', 
            paddingTop: '20px', 
            borderTop: '1px solid #eee' 
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#333',
              fontSize: '18px'
            }}>Cambiar Contraseña</h3>
            
            <p style={{ 
              color: '#666', 
              fontSize: '14px', 
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
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
                <p style={{ color: '#28a745', fontSize: '14px', margin: '5px 0 0 0' }}>
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
                <p style={{ color: '#28a745', fontSize: '14px', margin: '5px 0 0 0' }}>
                  ✅ Contraseñas coinciden
                </p>
              )}
            </div>
          </div>
          
          {/* Botones de acción */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '15px', 
            marginTop: '30px', 
            paddingTop: '30px', 
            borderTop: '1px solid #eee' 
          }}>
            <button 
              type="button" 
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#6c757d',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.3s',
                opacity: loading ? 0.5 : 1,
                pointerEvents: loading ? 'none' : 'auto'
              }}
              onClick={() => setActiveSection('gmail')}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#5a6268')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#6c757d')}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: loading ? '#6c757d' : '#007bff',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.3s',
                opacity: loading ? 0.8 : 1,
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

  // Estilos principales del dashboard
  const dashboardStyles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    dashboardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 0',
      marginBottom: '30px',
      borderBottom: '1px solid #e0e0e0',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    userAvatar: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      overflow: 'hidden',
      border: '3px solid #007bff',
    },
    avatar: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '24px',
    },
    configButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      color: '#666',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '50%',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '44px',
      height: '44px',
    },
    btnGroup: {
      display: 'flex',
      gap: '10px',
      marginBottom: '30px',
      flexWrap: 'wrap',
    },
    btn: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      transition: 'background-color 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  };

  return (
    <div style={dashboardStyles.container}>
      {/* Header del dashboard */}
      <header style={dashboardStyles.dashboardHeader}>
        <div style={dashboardStyles.userInfo}>
          <div style={dashboardStyles.userAvatar}>
            {currentUser.profilePicture ? (
              <img src={currentUser.profilePicture} alt="Usuario" style={dashboardStyles.avatar} />
            ) : (
              <div style={dashboardStyles.avatarPlaceholder}>
                <span>👤</span>
              </div>
            )}
          </div>
          
          <div>
            <h1 style={{ margin: 0, color: '#333', fontSize: '28px' }}>Mi Gestor Seguro</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '16px' }}>
              Bienvenido, <span style={{ fontWeight: '600', color: '#333' }}>
                {currentUser.username || currentUser.email}
              </span>
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            style={dashboardStyles.configButton}
            onClick={() => setActiveSection('config')}
            title="Configuración de usuario"
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.color = '#007bff';
              e.currentTarget.style.transform = 'rotate(30deg)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <span>⚙️</span>
          </button>
          <LogoutButton handleLogout={handleLogout} />
        </div>
      </header>
      
      {/* Botones de navegación */}
      <div style={dashboardStyles.btnGroup}>
        <button 
          style={{
            ...dashboardStyles.btn,
            backgroundColor: activeSection === 'gmail' ? '#007bff' : '#f5f5f5',
            color: activeSection === 'gmail' ? 'white' : '#666',
          }}
          onClick={() => setActiveSection('gmail')}
          onMouseOver={(e) => {
            if (activeSection !== 'gmail') {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }
          }}
          onMouseOut={(e) => {
            if (activeSection !== 'gmail') {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
        >
          <span>📧</span> Cuentas de Gmail
        </button>
        <button 
          style={{
            ...dashboardStyles.btn,
            backgroundColor: activeSection === 'other' ? '#007bff' : '#f5f5f5',
            color: activeSection === 'other' ? 'white' : '#666',
          }}
          onClick={() => setActiveSection('other')}
          onMouseOver={(e) => {
            if (activeSection !== 'other') {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }
          }}
          onMouseOut={(e) => {
            if (activeSection !== 'other') {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
        >
          <span>👥</span> Otras Cuentas
        </button>
        <button 
          style={{
            ...dashboardStyles.btn,
            backgroundColor: activeSection === 'bank' ? '#007bff' : '#f5f5f5',
            color: activeSection === 'bank' ? 'white' : '#666',
          }}
          onClick={() => setActiveSection('bank')}
          onMouseOver={(e) => {
            if (activeSection !== 'bank') {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }
          }}
          onMouseOut={(e) => {
            if (activeSection !== 'bank') {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
        >
          <span>🏦</span> Datos Bancarios
        </button>
      </div>
      
      {/* Contenido principal */}
      <div style={{ minHeight: '400px' }}>
        {activeSection === 'gmail' && <GmailAccounts user={currentUser} />}
        {activeSection === 'other' && <OtherAccounts user={currentUser} />}
        {activeSection === 'bank' && <BankData user={currentUser} />}
        {activeSection === 'config' && <UserConfigSection />}
      </div>
    </div>
  );
};

export default Dashboard;
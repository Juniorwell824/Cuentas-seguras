import React, { useState, useRef, useEffect } from 'react';
import GmailAccounts from './GmailAccounts';
import OtherAccounts from './OtherAccounts';
import BankData from './BankData';
import { supabase } from '../supabase/config';

// ── UserConfigSection definido FUERA de Dashboard para evitar re-mount en cada render ──
const UserConfigSection = ({
  initialLoad, userConfig, errors, successMessage, loading,
  handleConfigChange, handleSaveConfig, handleSelectImage, handleRemoveImage,
  handleImageChange, fileInputRef, currentUser, setActiveSection
}) => {
  if (initialLoad) {
    return (
      <div style={{ background: '#141D2E', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '18px', padding: '30px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
        <p style={{ color: '#7A99B8' }}>Cargando configuración...</p>
      </div>
    );
  }
  return (
    <div style={{ background: '#141D2E', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '18px', padding: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '800px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00E5FF, transparent)' }}></div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', color: '#E8F4FF', fontFamily: "'Exo 2','Inter',sans-serif", fontSize: '22px', fontWeight: '700', paddingBottom: '18px', borderBottom: '1px solid rgba(0,229,255,0.1)' }}>
        ⚙️ Configuración de Usuario
      </h2>
      <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {successMessage && (
          <div style={{ background: 'rgba(0,214,143,0.1)', color: '#00D68F', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(0,214,143,0.25)', fontSize: '14px' }}>✅ {successMessage}</div>
        )}
        {errors.submit && (
          <div style={{ background: 'rgba(255,77,103,0.1)', color: '#FF4D67', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(255,77,103,0.25)', fontSize: '14px' }}>❌ {errors.submit}</div>
        )}

        {/* Foto de Perfil */}
        <div style={{ marginBottom: '10px', paddingBottom: '24px', borderBottom: '1px solid rgba(0,229,255,0.1)' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#7A99B8', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '18px' }}>Foto de Perfil</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,229,255,0.4)', background: 'linear-gradient(135deg,rgba(0,229,255,0.18),rgba(0,229,255,0.05))', boxShadow: '0 0 20px rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '55px', color: '#00E5FF' }}>
              {userConfig.profilePicture
                ? <img src={userConfig.profilePicture} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '👤'}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" onClick={handleSelectImage} disabled={loading}
                style={{ padding: '10px 22px', border: '1.5px solid rgba(0,229,255,0.35)', borderRadius: '10px', background: 'rgba(0,229,255,0.08)', color: '#00E5FF', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.5 : 1 }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = 'rgba(0,229,255,0.15)')}
                onMouseOut={e => !loading && (e.currentTarget.style.background = 'rgba(0,229,255,0.08)')}>
                📤 Elegir Foto
              </button>
              {(userConfig.profilePicture || currentUser.profilePicture) && (
                <button type="button" onClick={handleRemoveImage} disabled={loading}
                  style={{ padding: '10px 22px', border: '1.5px solid rgba(255,77,103,0.35)', borderRadius: '10px', background: 'rgba(255,77,103,0.08)', color: '#FF4D67', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter',sans-serif", display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.5 : 1 }}
                  onMouseOver={e => !loading && (e.currentTarget.style.background = 'rgba(255,77,103,0.16)')}
                  onMouseOut={e => !loading && (e.currentTarget.style.background = 'rgba(255,77,103,0.08)')}>
                  🗑️ Eliminar
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept=".jpg,.jpeg,.png,.gif,.webp" style={{ display: 'none' }} disabled={loading} />
            </div>
            {errors.profilePicture && <p style={{ color: '#FF4D67', fontSize: '13px', textAlign: 'center' }}>❌ {errors.profilePicture}</p>}
            <p style={{ color: '#4A6580', fontSize: '12px', textAlign: 'center' }}>Formatos permitidos: JPG, PNG, GIF, WebP (Máx. 5MB)</p>
          </div>
        </div>

        {/* Nombre de usuario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <label style={{ fontWeight: '700', color: '#7A99B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px' }}>
            Nombre de Usuario <span style={{ color: '#FF4D67' }}>*</span>
          </label>
          <input type="text" name="username" value={userConfig.username} onChange={handleConfigChange} disabled={loading} maxLength="30"
            placeholder="Ingrese su nombre de usuario (3-30 caracteres)"
            style={{ padding: '13px 16px', border: errors.username ? '1.5px solid rgba(255,77,103,0.6)' : '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '15px', background: '#0E1625', color: '#E8F4FF', fontFamily: "'Inter',sans-serif", outline: 'none' }} />
          {errors.username && <p style={{ color: '#FF4D67', fontSize: '12px' }}>❌ {errors.username}</p>}
          <p style={{ color: '#4A6580', fontSize: '11px' }}>{userConfig.username.length}/30 caracteres</p>
        </div>

        {/* Email (solo lectura) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <label style={{ fontWeight: '700', color: '#7A99B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px' }}>Correo Electrónico</label>
          <input type="email" value={userConfig.email} disabled
            style={{ padding: '13px 16px', border: '1.5px solid rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '15px', background: 'rgba(255,255,255,0.03)', color: '#4A6580', fontFamily: "'Inter',sans-serif", cursor: 'not-allowed' }} />
          <p style={{ color: '#4A6580', fontSize: '12px' }}>⚠️ El correo electrónico no se puede modificar.</p>
        </div>

        {/* Cambiar contraseña */}
        <div style={{ paddingTop: '18px', borderTop: '1px solid rgba(0,229,255,0.1)' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#7A99B8', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '14px' }}>Cambiar Contraseña</p>
          <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '18px', padding: '12px 16px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '10px' }}>
            🔒 Deja estos campos vacíos si no quieres cambiar la contraseña.
          </p>
          {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
              <label style={{ fontWeight: '700', color: '#7A99B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px' }}>
                {field === 'currentPassword' ? 'Contraseña Actual' : field === 'newPassword' ? 'Nueva Contraseña' : 'Confirmar Contraseña'}
              </label>
              <input type="password" name={field} value={userConfig[field]} onChange={handleConfigChange} disabled={loading}
                placeholder={field === 'currentPassword' ? 'Ingrese su contraseña actual' : field === 'newPassword' ? 'Mín. 5 caracteres, al menos una letra' : 'Confirme la nueva contraseña'}
                style={{ padding: '13px 16px', border: errors[field] ? '1.5px solid rgba(255,77,103,0.6)' : '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '15px', background: '#0E1625', color: '#E8F4FF', fontFamily: "'Inter',sans-serif", outline: 'none' }} />
              {errors[field] && <p style={{ color: '#FF4D67', fontSize: '12px' }}>❌ {errors[field]}</p>}
              {field === 'newPassword' && userConfig.newPassword && !errors.newPassword && (
                <p style={{ color: '#00D68F', fontSize: '12px' }}>✅ Contraseña válida</p>
              )}
              {field === 'confirmPassword' && userConfig.confirmPassword && !errors.confirmPassword && (
                <p style={{ color: '#00D68F', fontSize: '12px' }}>✅ Contraseñas coinciden</p>
              )}
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid rgba(0,229,255,0.1)' }}>
          <button type="button" onClick={() => setActiveSection('gmail')} disabled={loading}
            style={{ padding: '12px 22px', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', color: '#7A99B8', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter',sans-serif" }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: '12px 28px', border: 'none', borderRadius: '10px', background: loading ? 'rgba(0,229,255,0.4)' : '#00E5FF', color: loading ? '#7A99B8' : '#05111F', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: "'Inter',sans-serif", boxShadow: loading ? 'none' : '0 4px 20px rgba(0,229,255,0.4)' }}>
            {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Dashboard = ({ user, handleLogout }) => {
  const [activeSection, setActiveSection] = useState('gmail');
  const [currentUser, setCurrentUser] = useState(user);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(60);
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

  const inactivityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const INACTIVITY_TIMEOUT = 120000;
  const WARNING_TIME = 60000;

  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (showTimeoutWarning) { setShowTimeoutWarning(false); setTimeoutCountdown(60); }
    warningTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true); setTimeoutCountdown(60);
      countdownIntervalRef.current = setInterval(() => {
        setTimeoutCountdown(prev => { if (prev <= 1) { clearInterval(countdownIntervalRef.current); return 0; } return prev - 1; });
      }, 1000);
      inactivityTimeoutRef.current = setTimeout(() => { handleLogout(); }, WARNING_TIME);
    }, INACTIVITY_TIMEOUT - WARNING_TIME);
  };

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();
    activityEvents.forEach(event => window.addEventListener(event, handleActivity));
    resetInactivityTimer();
    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // ── Cargar perfil desde Supabase ──────────────────────────────────
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setCurrentUser(prev => ({ ...prev, username: data.username || '', profilePicture: data.avatar_url || null }));
          setUserConfig(prev => ({ ...prev, username: data.username || '', profilePicture: data.avatar_url || null }));
        } else {
          // Crear perfil si no existe
          await supabase.from('profiles').insert({ id: user.id, email: user.email, username: '', avatar_url: null });
        }
      } catch (err) {
        console.error('Error cargando perfil:', err);
      } finally {
        setInitialLoad(false);
      }
    };
    if (user.id) loadUserProfile();
  }, [user]);

  const confirmLogout = () => setShowLogoutConfirm(true);
  const cancelLogout = () => setShowLogoutConfirm(false);
  const executeLogout = () => { setShowLogoutConfirm(false); handleLogout(); };

  const validateForm = () => {
    const newErrors = {};
    if (userConfig.username.trim().length < 3) newErrors.username = 'El nombre debe tener al menos 3 caracteres.';
    if (userConfig.username.trim().length > 30) newErrors.username = 'El nombre no puede exceder 30 caracteres.';
    if (userConfig.newPassword || userConfig.currentPassword || userConfig.confirmPassword) {
      if (userConfig.newPassword) {
        if (userConfig.newPassword.length < 5) newErrors.newPassword = 'La contraseña debe tener al menos 5 caracteres.';
        else if (!/[a-zA-Z]/.test(userConfig.newPassword)) newErrors.newPassword = 'Debe contener al menos una letra (mayúscula o minúscula).';
        if (userConfig.newPassword !== userConfig.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden.';
        if (!userConfig.currentPassword) newErrors.currentPassword = 'Ingrese su contraseña actual para cambiarla.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    if (name === 'username') {
      if (value.trim().length > 0 && value.trim().length < 3) newErrors.username = 'El nombre debe tener al menos 3 caracteres.';
      else if (value.trim().length > 30) newErrors.username = 'El nombre no puede exceder 30 caracteres.';
      else newErrors.username = '';
    }

    if (name === 'newPassword') {
      if (value.length === 0) {
        newErrors.newPassword = '';
      } else if (value.length < 5) {
        newErrors.newPassword = 'La contraseña debe tener al menos 5 caracteres.';
      } else if (!/[a-zA-Z]/.test(value)) {
        newErrors.newPassword = 'Debe contener al menos una letra (mayúscula o minúscula).';
      } else {
        newErrors.newPassword = '';
      }
      if (userConfig.confirmPassword.length > 0) {
        newErrors.confirmPassword = value !== userConfig.confirmPassword ? 'Las contraseñas no coinciden.' : '';
      }
    }

    if (name === 'confirmPassword') {
      if (value.length === 0) {
        newErrors.confirmPassword = '';
      } else {
        newErrors.confirmPassword = userConfig.newPassword !== value ? 'Las contraseñas no coinciden.' : '';
      }
    }

    setUserConfig(prev => ({ ...prev, [name]: value }));
    setErrors(newErrors);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) { setErrors({ ...errors, profilePicture: 'Formato no válido. Use JPG, PNG, GIF o WebP.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors({ ...errors, profilePicture: 'La imagen no debe superar los 5MB.' }); return; }
    const imageUrl = URL.createObjectURL(file);
    setUserConfig({ ...userConfig, profilePicture: imageUrl, profilePictureFile: file });
    setErrors({ ...errors, profilePicture: '' });
  };

  const handleSelectImage = () => fileInputRef.current.click();
  const handleRemoveImage = () => setUserConfig({ ...userConfig, profilePicture: null, profilePictureFile: null, removePicture: true });

  // ── Subir foto a Supabase Storage ─────────────────────────────────
  const uploadProfilePicture = async (file, userId) => {
    if (!file) return null;
    try {
      // Borrar foto anterior si existe
      if (currentUser.profilePicture && currentUser.profilePicture.includes('supabase')) {
        const oldPath = currentUser.profilePicture.split('/storage/v1/object/public/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }
      const ext = file.name.split('.').pop();
      const filePath = `${userId}/avatar_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      throw new Error('No se pudo subir la imagen. Intente nuevamente.');
    }
  };

  // ── Guardar perfil en Supabase ────────────────────────────────────
  const updateUserProfile = async (userId, updates) => {
    try {
      const profileUpdates = {};
      if (updates.username !== undefined) profileUpdates.username = updates.username;
      if (updates.profilePicture !== undefined) profileUpdates.avatar_url = updates.profilePicture;
      profileUpdates.updated_at = new Date().toISOString();
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', userId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      throw new Error('No se pudo actualizar el perfil. Intente nuevamente.');
    }
  };

  // ── Cambiar contraseña con Supabase ───────────────────────────────
  const changePassword = async (currentPassword, newPassword) => {
    try {
      // Re-autenticar con contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) throw new Error('La contraseña actual es incorrecta.');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    } catch (err) {
      throw new Error(err.message || 'No se pudo cambiar la contraseña.');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSuccessMessage(''); setErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      const updates = {};
      let passwordChanged = false;
      if (userConfig.profilePictureFile) {
        const imageUrl = await uploadProfilePicture(userConfig.profilePictureFile, user.id);
        if (imageUrl) {
          updates.profilePicture = imageUrl;
          if (userConfig.profilePicture && userConfig.profilePicture.startsWith('blob:')) URL.revokeObjectURL(userConfig.profilePicture);
        }
      } else if (userConfig.removePicture && currentUser.profilePicture) {
        updates.profilePicture = null;
        if (currentUser.profilePicture.includes('supabase')) {
          const oldPath = currentUser.profilePicture.split('/storage/v1/object/public/avatars/')[1];
          if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
        }
      }
      if (userConfig.username !== currentUser.username) updates.username = userConfig.username.trim();
      if (Object.keys(updates).length > 0) {
        await updateUserProfile(user.id, updates);
        setCurrentUser(prev => ({ ...prev, ...updates }));
      }
      if (userConfig.newPassword && userConfig.currentPassword) {
        await changePassword(userConfig.currentPassword, userConfig.newPassword);
        passwordChanged = true;
      }
      let message = 'Configuración actualizada correctamente.';
      if (passwordChanged) message += ' La contraseña ha sido cambiada.';
      setSuccessMessage(message);
      setUserConfig(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '', profilePictureFile: null, removePicture: false }));
    } catch (err) {
      console.error('Error:', err);
      setErrors({ submit: err.message || 'Error al actualizar. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };


  const LogoutConfirmModal = () => {
    if (!showLogoutConfirm) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }} onClick={cancelLogout}>
        <div style={{ background: '#141D2E', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '18px', padding: '32px', maxWidth: '420px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚪</div>
            <h2 style={{ color: '#E8F4FF', fontFamily: "'Exo 2',sans-serif", fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>¿Cerrar sesión?</h2>
            <p style={{ color: '#7A99B8', fontSize: '14px' }}>Estás a punto de cerrar sesión de tu cuenta.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={cancelLogout}
              style={{ padding: '11px 22px', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', color: '#7A99B8', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: "'Inter',sans-serif" }}>
              Cancelar
            </button>
            <button onClick={executeLogout}
              style={{ padding: '11px 22px', border: 'none', borderRadius: '10px', background: 'rgba(255,77,103,0.9)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: "'Inter',sans-serif" }}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TimeoutWarning = () => {
    if (!showTimeoutWarning) return null;
    return (
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#141D2E', border: '1px solid rgba(255,184,0,0.3)', borderRadius: '16px', padding: '20px 24px', zIndex: 999, maxWidth: '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
        <p style={{ color: '#FFB800', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>⚠️ Sesión por expirar</p>
        <p style={{ color: '#7A99B8', fontSize: '13px', marginBottom: '16px' }}>Tu sesión expirará en <strong style={{ color: '#FFB800' }}>{timeoutCountdown}s</strong></p>
        <button onClick={resetInactivityTimer}
          style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '8px', background: '#00E5FF', color: '#05111F', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
          Continuar sesión
        </button>
      </div>
    );
  };

  // ── Estilos del header ─────────────────────────────────────────────
  const dashboardStyles = {
    btnGroup: { display: 'flex', gap: '6px', marginBottom: '30px', flexWrap: 'wrap', background: '#141D2E', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '18px', padding: '5px', width: 'fit-content' },
    btn: { padding: '10px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Inter','Segoe UI',sans-serif" },
  };

  const headerStyles = {
    dashboardHeader: { background: 'linear-gradient(135deg, #0A0F1A 0%, #101827 60%, #0D1A2A 100%)', borderRadius: '16px', padding: '24px 30px', marginBottom: '28px', boxShadow: '0 4px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.08)', color: '#E8F4FF', position: 'relative', overflow: 'hidden' },
    headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 },
    userInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
    avatar: { width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,229,255,0.4)', background: 'linear-gradient(135deg,rgba(0,229,255,0.18),rgba(0,229,255,0.05))', boxShadow: '0 0 16px rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#00E5FF', flexShrink: 0 },
    avatarPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#00E5FF' },
    userText: { display: 'flex', flexDirection: 'column' },
    email: { fontSize: '13px', color: '#7A99B8', marginTop: '5px', display: 'inline-block', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)', padding: '4px 12px', borderRadius: '20px' },
    logoutBtn: { marginTop: '10px', padding: '8px 18px', background: 'rgba(255,77,103,0.1)', border: '1.5px solid rgba(255,77,103,0.35)', borderRadius: '10px', color: '#FF4D67', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.25s', display: 'inline-flex', alignItems: 'center', gap: '8px', maxWidth: '160px', fontFamily: "'Inter',sans-serif" },
    settingsBtn: { background: 'rgba(0,229,255,0.07)', border: '1.5px solid rgba(0,229,255,0.25)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', color: '#00E5FF', transition: 'all 0.3s' },
  };

  return (
    <>
      <LogoutConfirmModal />
      <TimeoutWarning />
      <div style={{ minHeight: '100vh', background: '#0A0F1A', pointerEvents: (showLogoutConfirm || showTimeoutWarning) ? 'none' : 'auto', opacity: (showLogoutConfirm || showTimeoutWarning) ? 0.5 : 1, transition: 'opacity 0.3s' }}>

        {/* Header */}
        <div className="dashboard-header-wrapper">
          <header className="dashboard-header" style={headerStyles.dashboardHeader}>
            {/* Grid overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.025) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }}></div>
            {/* Top border line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,#00E5FF 40%,#00E5FF 60%,transparent)' }}></div>
            <div style={headerStyles.headerContent}>
              <div style={headerStyles.userInfo}>
                {/* Avatar — muestra foto de perfil si existe */}
                <div style={headerStyles.avatar}>
                  {currentUser.profilePicture
                    ? <img src={currentUser.profilePicture} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <div style={headerStyles.avatarPlaceholder}>👤</div>
                  }
                </div>
                <div style={headerStyles.userText}>
                  <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', fontFamily: "'Exo 2','Inter',sans-serif", color: '#E8F4FF' }}>Mi Gestor Seguro</h1>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#4A6580' }}>
                    Bienvenido{currentUser.username ? `, ${currentUser.username}` : ''}
                  </p>
                  <span style={headerStyles.email}>{user.email}</span>
                  <button style={headerStyles.logoutBtn} onClick={confirmLogout}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,77,103,0.2)'; e.currentTarget.style.borderColor = '#FF4D67'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,77,103,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,77,103,0.35)'; e.currentTarget.style.transform = 'none'; }}>
                    🚪 Cerrar sesión
                  </button>
                </div>
              </div>
              <button style={headerStyles.settingsBtn} onClick={() => setActiveSection('config')} title="Configuración"
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.55)'; e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'; e.currentTarget.style.transform = 'none'; }}>
                ⚙️
              </button>
            </div>
          </header>
        </div>

        {/* Navegación */}
        <div className="nav-buttons-container">
          <div style={dashboardStyles.btnGroup} className="nav-btn-group">
            {[
              { key: 'gmail', label: '📧 Cuentas de Gmail' },
              { key: 'other', label: '👥 Otras Cuentas' },
              { key: 'bank', label: '🏦 Datos Bancarios' },
            ].map(({ key, label }) => (
              <button key={key}
                style={{ ...dashboardStyles.btn, backgroundColor: activeSection === key ? 'rgba(0,229,255,0.12)' : 'transparent', color: activeSection === key ? '#00E5FF' : '#7A99B8', boxShadow: activeSection === key ? '0 0 12px rgba(0,229,255,0.18)' : 'none' }}
                onClick={() => setActiveSection(key)}
                onMouseOver={e => { if (activeSection !== key) { e.currentTarget.style.backgroundColor = 'rgba(0,229,255,0.07)'; e.currentTarget.style.color = '#00E5FF'; } }}
                onMouseOut={e => { if (activeSection !== key) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7A99B8'; } }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="section-content-wrapper">
          <div className="section-content" style={{ minHeight: '400px' }}>
            {activeSection === 'gmail' && <GmailAccounts user={{ ...currentUser, id: user.id, uid: user.id }} />}
            {activeSection === 'other' && <OtherAccounts user={{ ...currentUser, id: user.id, uid: user.id }} />}
            {activeSection === 'bank' && <BankData user={{ ...currentUser, id: user.id, uid: user.id }} />}
            {activeSection === 'config' && (
              <UserConfigSection
                initialLoad={initialLoad}
                userConfig={userConfig}
                errors={errors}
                successMessage={successMessage}
                loading={loading}
                handleConfigChange={handleConfigChange}
                handleSaveConfig={handleSaveConfig}
                handleSelectImage={handleSelectImage}
                handleRemoveImage={handleRemoveImage}
                handleImageChange={handleImageChange}
                fileInputRef={fileInputRef}
                currentUser={currentUser}
                setActiveSection={setActiveSection}
              />
            )}
          </div>
        </div>

      </div>
    </>
  );
};

export default Dashboard;
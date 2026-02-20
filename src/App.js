import React, { useState, useEffect } from 'react';
import { supabase } from './supabase/config';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) setView('dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setView('dashboard');
      } else {
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setView('login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p style={{ color: '#7A99B8', marginTop: '16px' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {!user ? (
        <div className="auth-container">
          {view === 'login' && <Login setView={setView} />}
          {view === 'register' && <Register setView={setView} />}
          {view === 'forgotPassword' && <ForgotPassword setView={setView} />}
        </div>
      ) : (
        <Dashboard user={user} handleLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

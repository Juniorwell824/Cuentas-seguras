import React from 'react';

const LogoutButton = ({ handleLogout }) => {
  return (
    <button
      className="btn btn-danger"
      onClick={handleLogout}
    >
      Cerrar Sesión
    </button>
  );
};

export default LogoutButton;
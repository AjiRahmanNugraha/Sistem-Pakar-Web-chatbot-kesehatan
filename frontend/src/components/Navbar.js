import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: '#007bff',
      color: 'white',
      flexWrap: 'wrap'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
        Health Chatbot
      </div>
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <Link to="/user" style={{ color: 'white', textDecoration: 'none' }}>User Dashboard</Link>
        <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>Admin Dashboard</Link>
        <button onClick={handleLogout} style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem'
        }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

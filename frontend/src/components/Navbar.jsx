import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, loggedIn, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => {
    const hash = location.pathname;
    return hash === path || (path === '/home' && hash === '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  return (
    <nav id="navbar">
      <div className="navbar">
        <div className="navbar-inner">
          <Link className="navbar-brand" to="/home">
            🎨 <span>QuickSketch</span>
          </Link>

          <button
            className="navbar-toggle"
            id="nav-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          <ul className={`navbar-links${menuOpen ? ' open' : ''}`} id="nav-links">
            <li>
              <Link
                to="/home"
                className={isActive('/home') ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                🏠 Home
              </Link>
            </li>
            <li>
              <Link
                to="/leaderboard"
                className={isActive('/leaderboard') ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                🏆 Classifiche
              </Link>
            </li>
            {loggedIn && (
              <li>
                <Link
                  to="/create"
                  className={`nav-btn-create${isActive('/create') ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  ✏️ Crea Sketch
                </Link>
              </li>
            )}
          </ul>

          <div className="navbar-user">
            {loggedIn ? (
              <>
                <div className="navbar-avatar" style={{ overflow: 'hidden' }}>
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    user?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <Link className="navbar-username" to="/profile">
                  {user?.username}
                </Link>
                <button className="btn-logout" id="btn-logout" onClick={handleLogout}>
                  Esci
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm">
                Accedi
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

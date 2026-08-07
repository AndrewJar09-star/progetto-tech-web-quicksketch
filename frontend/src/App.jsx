import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import Create from './pages/Create.jsx';
import Play from './pages/Play.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/create" element={<Create />} />
          <Route path="/sketch/:id" element={<Play />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>Pagina non trovata</h3>
              <p>La pagina che cerchi non esiste.</p>
              <a href="#/home" className="btn btn-primary">Torna alla Home</a>
            </div>
          } />
        </Routes>
      </main>
      <div id="toast-container"></div>
    </>
  );
}

import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Create from './pages/Create';
import Play from './pages/Play';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

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
              <Link to="/home" className="btn btn-primary">Torna alla Home</Link>
            </div>
          } />
        </Routes>
      </main>
      <div id="toast-container"></div>
    </>
  );
}

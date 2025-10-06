import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Runs from './pages/Runs';
import Coverage from './pages/Coverage';
import Onboarding from './pages/Onboarding';
import './App.css';

function Nav() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="logo">📚</span>
        <span className="brand-text">Intent</span>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>Dashboard</Link>
        <Link to="/runs" className={isActive('/runs') ? 'active' : ''}>Runs</Link>
        <Link to="/coverage" className={isActive('/coverage') ? 'active' : ''}>Coverage</Link>
        <Link to="/onboard" className={isActive('/onboard') ? 'active' : ''}>Onboard</Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Nav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/coverage" element={<Coverage />} />
            <Route path="/onboard" element={<Onboarding />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;


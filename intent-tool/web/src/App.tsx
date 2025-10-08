import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Generate from './pages/Generate';
import Dashboard from './pages/Dashboard';
import Runs from './pages/Runs';
import Coverage from './pages/Coverage';
import Onboarding from './pages/Onboarding';
import Review from './pages/Review';
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
        <Link to="/" className={isActive('/') ? 'active' : ''}>Generate</Link>
        <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>Dashboard</Link>
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
            <Route path="/" element={<Generate />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/coverage" element={<Coverage />} />
            <Route path="/onboard" element={<Onboarding />} />
            <Route path="/review" element={<Review />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;


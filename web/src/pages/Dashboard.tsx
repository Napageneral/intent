import { useState, useEffect } from 'react';

interface StatusData {
  project: { name: string; root: string } | null;
  last_run: {
    id: number;
    status: string;
    scope: string;
    started_at: string;
    guides_updated: number;
    guides_nochange: number;
    guides_failed: number;
  } | null;
  guides: {
    total: number;
    active: number;
  };
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  
  useEffect(() => {
    fetchStatus();
  }, []);
  
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const startRun = async (scope: string) => {
    setRunning(true);
    try {
      const res = await fetch(`/api/run?scope=${scope}&layered=true`, { method: 'POST' });
      const { runId } = await res.json();
      
      // TODO: Navigate to run detail page or show live progress
      alert(`Run ${runId} started! Check /runs page for progress.`);
      
      // Refresh status after a moment
      setTimeout(fetchStatus, 2000);
    } catch (error) {
      console.error('Failed to start run:', error);
      alert('Failed to start run');
    } finally {
      setRunning(false);
    }
  };
  
  if (loading) {
    return <div className="container">Loading...</div>;
  }
  
  const lastRun = status?.last_run;
  const coveragePercent = status?.guides.total 
    ? ((status.guides.active / status.guides.total) * 100).toFixed(1)
    : '0';
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Engineering guide automation for {status?.project?.name || 'your project'}</p>
      </div>
      
      <div className="grid grid-3">
        {/* Coverage Card */}
        <div className="stat-card">
          <div className="stat-label">Guide Coverage</div>
          <div className="stat-value">{coveragePercent}%</div>
          <div className="stat-subtext">
            {status?.guides.active} active / {status?.guides.total} total guides
          </div>
        </div>
        
        {/* Last Run Card */}
        <div className="stat-card">
          <div className="stat-label">Last Run</div>
          <div className="stat-value">
            {lastRun ? (
              <span className={`badge badge-${lastRun.status === 'success' ? 'success' : lastRun.status === 'failed' ? 'error' : 'warning'}`}>
                {lastRun.status}
              </span>
            ) : (
              <span className="badge badge-info">No runs yet</span>
            )}
          </div>
          <div className="stat-subtext">
            {lastRun ? `${lastRun.scope} • ${lastRun.guides_updated} updated` : 'Run your first update'}
          </div>
        </div>
        
        {/* Updates Card */}
        <div className="stat-card">
          <div className="stat-label">Recent Activity</div>
          <div className="stat-value">
            {lastRun ? lastRun.guides_updated : 0}
          </div>
          <div className="stat-subtext">
            {lastRun ? `${lastRun.guides_nochange} unchanged, ${lastRun.guides_failed} failed` : 'guides updated'}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Quick Actions</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Update Guides</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Run layered update for staged changes
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => startRun('staged')}
                disabled={running}
              >
                {running ? 'Running...' : 'Run Staged'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => startRun('head')}
                disabled={running}
              >
                Last Commit
              </button>
            </div>
          </div>
          
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Onboard Project</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Scan for missing guides and generate question packs
            </p>
            <a href="/onboard" className="btn btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Start Onboarding
            </a>
          </div>
        </div>
      </div>
      
      {lastRun && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Last Run Details</h2>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Scope</div>
                <div style={{ fontWeight: 500 }}>{lastRun.scope}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Started</div>
                <div style={{ fontWeight: 500 }}>{new Date(lastRun.started_at).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Updated</div>
                <div style={{ fontWeight: 500, color: 'var(--success)' }}>{lastRun.guides_updated}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No Change</div>
                <div style={{ fontWeight: 500, color: 'var(--text-dim)' }}>{lastRun.guides_nochange}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Failed</div>
                <div style={{ fontWeight: 500, color: 'var(--error)' }}>{lastRun.guides_failed}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


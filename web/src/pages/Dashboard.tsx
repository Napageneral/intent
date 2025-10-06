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

interface ContextData {
  project: {
    name: string;
    root: string;
    has_intent: boolean;
  };
  changes: {
    staged: string[];
    unstaged: string[];
    total: number;
  };
  affected_guides: {
    path: string;
    stale: boolean;
    last_updated: string | null;
  }[];
  quick_actions: {
    can_update: boolean;
    has_staged: boolean;
    has_unstaged: boolean;
    guide_count: number;
  };
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [context, setContext] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);
  
  const fetchData = async () => {
    try {
      const [statusRes, contextRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/context')
      ]);
      setStatus(await statusRes.json());
      setContext(await contextRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
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
  
  const hasChanges = (context?.changes.total || 0) > 0;
  const affectedCount = context?.affected_guides.length || 0;
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Engineering guide automation for {context?.project.name || status?.project?.name || 'your project'}</p>
      </div>
      
      {/* Smart Context Panel - shows current changes */}
      {hasChanges && (
        <div className="card" style={{ marginBottom: '2rem', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--accent)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>📝 Active Changes Detected</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Staged Files</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>
                {context?.changes.staged.length || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unstaged Files</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--warning)' }}>
                {context?.changes.unstaged.length || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Affected Guides</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)' }}>
                {affectedCount}
              </div>
            </div>
          </div>
          
          {affectedCount > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Potentially Stale Guides:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {context?.affected_guides.map(g => (
                  <span key={g.path} className="badge badge-warning" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {g.path}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => startRun('staged')}
              disabled={running || !context?.quick_actions.has_staged}
              style={{ flex: 1 }}
            >
              {running ? '🤖 Running...' : '🚀 Update All Guides (Layered)'}
            </button>
            <button 
              className="btn btn-secondary"
              disabled={!hasChanges}
            >
              Review Changes
            </button>
          </div>
        </div>
      )}
      
      {!hasChanges && context?.project.has_intent && (
        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2rem', background: 'var(--bg-tertiary)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>✨ No changes detected</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            Make code changes and they'll appear here automatically
          </p>
        </div>
      )}
      
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


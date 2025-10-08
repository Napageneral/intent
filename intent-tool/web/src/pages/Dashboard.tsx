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
    untracked: string[];
    total: number;
  };
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [context, setContext] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
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
  
  if (loading) {
    return <div className="container">Loading...</div>;
  }
  
  const lastRun = status?.last_run;
  const coveragePercent = status?.guides.total 
    ? ((status.guides.active / status.guides.total) * 100).toFixed(1)
    : '0';
  
  const hasChanges = (context?.changes.total || 0) > 0;
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview for {context?.project.name || status?.project?.name || 'your project'}</p>
      </div>
      
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Guide Coverage</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--accent)' }}>{coveragePercent}%</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            {status?.guides.active || 0} active / {status?.guides.total || 0} total guides
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Run</h3>
          {lastRun ? (
            <>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {lastRun.status}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                {lastRun.guides_updated} updated, {lastRun.guides_nochange} unchanged
              </p>
            </>
          ) : (
            <div style={{ fontSize: '1rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
              No runs yet
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Run your first update</p>
            </div>
          )}
        </div>
        
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Staged Changes</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: hasChanges ? 'var(--success)' : 'var(--text-dim)' }}>
            {context?.changes.staged.length || 0}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            files ready to document
          </p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Update Guides</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Run layered update for staged changes
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a href="/" className="btn btn-primary">Run Staged</a>
              <button className="btn btn-secondary" disabled style={{ opacity: 0.5 }}>Last Commit</button>
            </div>
          </div>
          
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Onboard Project</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Scan for missing guides and generate question packs
            </p>
            <a href="/onboard" className="btn btn-primary">Start Onboarding</a>
          </div>
        </div>
      </div>
    </div>
  );
}

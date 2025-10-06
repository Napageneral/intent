import { useState, useEffect } from 'react';

interface Run {
  id: number;
  started_at: string;
  finished_at: string | null;
  scope: string;
  layered: number;
  status: string;
  model: string;
  guides_updated: number;
  guides_nochange: number;
  guides_failed: number;
  duration_ms: number | null;
}

export default function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRuns();
  }, []);
  
  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/runs');
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="container">Loading...</div>;
  }
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Update Runs</h1>
        <p>History of guide update runs</p>
      </div>
      
      {runs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No runs yet</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            Make code changes and run "intent update --auto --layered"
          </p>
        </div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Scope</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Started</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Updated</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>#{run.id}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge badge-${run.status === 'success' ? 'success' : run.status === 'failed' ? 'error' : 'warning'}`}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{run.scope}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <span style={{ color: 'var(--success)' }}>{run.guides_updated}</span>
                    {' / '}
                    <span style={{ color: 'var(--text-dim)' }}>{run.guides_nochange}</span>
                    {run.guides_failed > 0 && (
                      <> {' / '}<span style={{ color: 'var(--error)' }}>{run.guides_failed}</span></>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


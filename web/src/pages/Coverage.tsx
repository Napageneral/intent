import { useState, useEffect } from 'react';

interface TreeNode {
  path: string;
  parent_path: string | null;
  children: string[];
  status: string;
  last_updated: string | null;
}

interface TreeData {
  nodes: TreeNode[];
  coverage: {
    total: number;
    active: number;
    draft: number;
  };
}

export default function Coverage() {
  const [tree, setTree] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTree();
  }, []);
  
  const fetchTree = async () => {
    try {
      const res = await fetch('/api/tree');
      const data = await res.json();
      setTree(data);
    } catch (error) {
      console.error('Failed to fetch tree:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="container">Loading...</div>;
  }
  
  const coveragePercent = tree && tree.coverage.total > 0
    ? ((tree.coverage.active / tree.coverage.total) * 100).toFixed(1)
    : '0';
  
  // Group nodes by depth for better visualization
  const roots = tree?.nodes.filter(n => !n.parent_path) || [];
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Guide Coverage</h1>
        <p>Explore your guide tree and identify gaps</p>
      </div>
      
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Guides</div>
          <div className="stat-value">{tree?.coverage.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {tree?.coverage.active || 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Coverage</div>
          <div className="stat-value">{coveragePercent}%</div>
        </div>
      </div>
      
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Guide Tree</h2>
        
        {roots.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No guides found. Run "intent init" to get started.</p>
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {roots.map(node => (
              <div key={node.path} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📄</span>
                  <span>{node.path}</span>
                  <span className={`badge badge-${node.status === 'active' ? 'success' : 'info'}`}>
                    {node.status}
                  </span>
                </div>
                {node.children.map(child => (
                  <div key={child} style={{ marginLeft: '2rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    <span>└─ {child}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <a href="/onboard" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Scan for Missing Guides
        </a>
      </div>
    </div>
  );
}


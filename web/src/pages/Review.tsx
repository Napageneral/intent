import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  is_guide: boolean;
  diff?: string;
}

export default function Review() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run');
  
  const [files, setFiles] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [adrContent, setAdrContent] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [showGenerated, setShowGenerated] = useState(false);
  
  useEffect(() => {
    fetchChanges();
  }, []);
  
  const fetchChanges = async () => {
    try {
      // Get list of changed files
      const res = await fetch('/api/changes');
      const data = await res.json();
      
      // For each guide file, fetch its diff
      const filesWithDiffs = await Promise.all(
        data.files.map(async (file: FileChange) => {
          if (file.is_guide) {
            const diffRes = await fetch(`/api/diff?path=${file.path}`);
            file.diff = await diffRes.text();
          }
          return file;
        })
      );
      
      setFiles(filesWithDiffs);
    } catch (error) {
      console.error('Failed to fetch changes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateDocsAndCommit = async () => {
    setGenerating(true);
    try {
      // Trigger layered update + ADR generation
      const res = await fetch('/api/generate-intent', { method: 'POST' });
      const data = await res.json();
      
      setAdrContent(data.adr);
      setCommitMessage(data.commit_message);
      setShowGenerated(true);
    } catch (error) {
      console.error('Failed to generate:', error);
      alert('Generation failed');
    } finally {
      setGenerating(false);
    }
  };
  
  const acceptAndCommit = async () => {
    try {
      const res = await fetch('/api/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          adr: adrContent
        })
      });
      
      if (res.ok) {
        alert('✅ Committed successfully!');
        window.location.href = '/';
      } else {
        alert('❌ Commit failed');
      }
    } catch (error) {
      alert('❌ Commit failed: ' + error);
    }
  };
  
  if (loading) {
    return <div className="container">Loading changes...</div>;
  }
  
  const guideFiles = files.filter(f => f.is_guide);
  const codeFiles = files.filter(f => !f.is_guide);
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Review Intent Documentation</h1>
        <p>Review guide updates, ADR, and commit message</p>
      </div>
      
      {!showGenerated && (
        <>
          {/* Code Changes Summary */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📝 Code Changes</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {codeFiles.length} file(s) modified
            </div>
            <div style={{ maxHeight: '200px', overflow: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {codeFiles.map(file => (
                <div key={file.path} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{file.path}</span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    <span style={{ color: 'var(--success)' }}>+{file.additions}</span>
                    {' '}
                    <span style={{ color: 'var(--error)' }}>-{file.deletions}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Guide Diffs */}
          {guideFiles.map(file => (
            <div key={file.path} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontFamily: 'monospace' }}>
                📄 {file.path}
              </h3>
              <div style={{ 
                background: 'var(--bg-primary)', 
                padding: '1rem', 
                borderRadius: '6px', 
                overflow: 'auto',
                maxHeight: '400px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}>
                {file.diff ? (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {file.diff.split('\n').map((line, i) => (
                      <div key={i} style={{
                        background: line.startsWith('+') ? 'rgba(16, 185, 129, 0.1)' :
                                   line.startsWith('-') ? 'rgba(239, 68, 68, 0.1)' :
                                   'transparent',
                        color: line.startsWith('+') ? 'var(--success)' :
                               line.startsWith('-') ? 'var(--error)' :
                               line.startsWith('@@') ? 'var(--accent)' :
                               'var(--text-secondary)'
                      }}>
                        {line}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <div style={{ color: 'var(--text-dim)' }}>No changes</div>
                )}
              </div>
            </div>
          ))}
          
          <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-primary)', padding: '1.5rem 0', borderTop: '1px solid var(--border)' }}>
            <button 
              className="btn btn-primary"
              onClick={generateDocsAndCommit}
              disabled={generating}
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              {generating ? '🤖 Generating...' : '✨ Update Docs & Generate ADR'}
            </button>
          </div>
        </>
      )}
      
      {showGenerated && (
        <>
          {/* Generated ADR */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📋 Generated ADR</h2>
            <div style={{ 
              background: 'var(--bg-primary)', 
              padding: '1rem', 
              borderRadius: '6px',
              maxHeight: '400px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap'
            }}>
              {adrContent}
            </div>
          </div>
          
          {/* Proposed Commit Message */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>💬 Proposed Commit Message</h2>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-primary"
              onClick={acceptAndCommit}
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              ✅ Accept & Commit
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowGenerated(false)}
            >
              ← Back to Review
            </button>
          </div>
        </>
      )}
    </div>
  );
}


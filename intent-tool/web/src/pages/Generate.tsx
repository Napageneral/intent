import { useState, useEffect } from 'react';
import FileTree from '../components/FileTree';

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

interface FileTreeData {
  tree: any;
  changes_summary: {
    added: number;
    modified: number;
    deleted: number;
  };
}

export default function Generate() {
  const [context, setContext] = useState<ContextData | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [treeWidth, setTreeWidth] = useState(380);
  const [isDragging, setIsDragging] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [agentQueue, setAgentQueue] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<{
    guideDiffs: { path: string; diff: string }[];
    adr: string;
    commitMessage: string;
  } | null>(null);
  const [previewTab, setPreviewTab] = useState(0);
  const [commitMsg, setCommitMsg] = useState('');
  const [tabProgress, setTabProgress] = useState({
    guideDiffs: false,
    adr: false,
    commitMessage: false
  });
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchData = async () => {
    try {
      const [contextRes, treeRes] = await Promise.all([
        fetch('/api/context'),
        fetch('/api/filetree')
      ]);
      setContext(await contextRes.json());
      setFileTree(await treeRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const startWorkflow = async () => {
    setWorkflowRunning(true);
    setWorkflowComplete(false);
    setAgentQueue([]);
    setPreviewData(null);
    setTabProgress({ guideDiffs: false, adr: false, commitMessage: false });
    
    try {
      const res = await fetch('/api/workflow', { method: 'POST' });
      
      if (!res.ok) {
        throw new Error('Workflow failed to start');
      }
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response stream');
      }
      
      // Read SSE stream with proper buffering
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              console.log('SSE data received:', jsonStr.substring(0, 100));
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'queue') {
                console.log('Queue update:', data.queue);
                setAgentQueue(data.queue);
                // Mark guide diffs as in progress
                if (data.queue.some((q: any) => q.status === 'in_progress')) {
                  setTabProgress(prev => ({ ...prev, guideDiffs: false }));
                } else if (data.queue.every((q: any) => q.status === 'completed')) {
                  setTabProgress(prev => ({ ...prev, guideDiffs: true }));
                }
              } else if (data.type === 'status') {
                // Track ADR and commit message generation
                if (data.message.includes('ADR')) {
                  setTabProgress(prev => ({ ...prev, adr: false }));
                } else if (data.message.includes('commit')) {
                  setTabProgress(prev => ({ ...prev, adr: true, commitMessage: false }));
                }
              } else if (data.type === 'complete') {
                console.log('Workflow complete!', data.result);
                setPreviewData(data.result);
                setCommitMsg(data.result.commitMessage || '');
                setTabProgress({ guideDiffs: true, adr: true, commitMessage: true });
                setWorkflowComplete(true);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Workflow error:', error);
      alert('Workflow failed. Check console for details.');
    } finally {
      setWorkflowRunning(false);
    }
  };
  
  const acceptAndCommit = async () => {
    if (!previewData) return;
    
    try {
      const res = await fetch('/api/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMsg,
          adr: previewData.adr
        })
      });
      
      if (!res.ok) {
        throw new Error('Commit failed');
      }
      
      alert('✓ Changes committed successfully!');
      setWorkflowComplete(false);
      setPreviewData(null);
      await fetchData();
    } catch (error) {
      console.error('Commit error:', error);
      alert('Failed to commit. Check console for details.');
    }
  };
  
  // Draggable divider
  const handleMouseDown = () => {
    setIsDragging(true);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = e.clientX - 32;
        if (newWidth > 250 && newWidth < 600) {
          setTreeWidth(newWidth);
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);
  
  if (loading) {
    return <div className="container">Loading...</div>;
  }
  
  const hasChanges = (context?.changes.total || 0) > 0;
  const affectedCount = context?.affected_guides.length || 0;
  
  // Helper to get all changed files from tree
  const getAllChangedFiles = (node: any, status: string): string[] => {
    const files: string[] = [];
    if (node.type === 'file' && node.change_status === status) {
      files.push(node.path);
    }
    if (node.children) {
      for (const child of node.children) {
        files.push(...getAllChangedFiles(child, status));
      }
    }
    return files;
  };
  
  return (
    <div className="container">
      <div className="page-header">
        <h1>Generate Intent Documentation</h1>
        <p>Review changes and generate documentation for {context?.project.name || 'your project'}</p>
      </div>
      
      {/* Two-Panel Layout */}
      {hasChanges ? (
        <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', position: 'relative' }}>
          {/* Left: File Tree */}
          <div style={{ width: `${treeWidth}px`, height: '75vh', flexShrink: 0 }}>
            {fileTree && <FileTree tree={fileTree.tree} rootName={context?.project.name} />}
          </div>
          
          {/* Draggable Divider */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: isDragging ? 'var(--accent)' : 'var(--border)',
              transition: isDragging ? 'none' : 'background 0.2s',
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '-2px',
              width: '8px',
              height: '40px',
              transform: 'translateY(-50%)',
              cursor: 'col-resize'
            }} />
          </div>
          
          {/* Right: Preview & Changes */}
          <div style={{ flex: 1, paddingLeft: '1.5rem', minWidth: 0, height: '75vh', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            
            {/* Preview Panel - shows at top after workflow completes */}
            {workflowComplete && previewData && (
              <div className="card" style={{ flexShrink: 0 }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>📋 Review Generated Documentation</h2>
                
                {/* Tab Navigation with Progress */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { name: 'Guide Diffs', key: 'guideDiffs' },
                    { name: 'ADR Preview', key: 'adr' },
                    { name: 'Commit Message', key: 'commitMessage' }
                  ].map((tab, idx) => {
                    const isComplete = tabProgress[tab.key as keyof typeof tabProgress];
                    return (
                      <button
                        key={tab.name}
                        onClick={() => setPreviewTab(idx)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: previewTab === idx ? 'var(--accent)' : 'transparent',
                          color: previewTab === idx ? '#000' : 'var(--text-secondary)',
                          border: 'none',
                          borderBottom: previewTab === idx ? `2px solid var(--accent)` : '2px solid transparent',
                          cursor: 'pointer',
                          fontWeight: previewTab === idx ? 600 : 400,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        {tab.name}
                        {!isComplete && <span style={{ fontSize: '0.8rem' }}>⏳</span>}
                        {isComplete && <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                
                {/* Tab Content */}
                <div style={{ minHeight: '200px', maxHeight: '350px', overflowY: 'auto', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                  {previewTab === 0 && (
                    <div>
                      {previewData.guideDiffs.length === 0 ? (
                        <div>
                          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            ℹ️ No agents.md files were modified in this session
                          </p>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                            <strong>Why no changes?</strong><br/>
                            • No agents.md files exist yet in changed directories<br/>
                            • Or agents determined existing guides are up-to-date<br/>
                            • Use the onboarding flow to create initial guides
                          </div>
                        </div>
                      ) : (
                        previewData.guideDiffs.map(({ path, diff }) => (
                          <div key={path} style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent)' }}>
                              {path}
                            </div>
                            <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                              {diff}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {previewTab === 1 && (
                    <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                      {previewData.adr}
                    </pre>
                  )}
                  
                  {previewTab === 2 && (
                    <textarea
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '150px',
                        padding: '0.75rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        resize: 'vertical'
                      }}
                    />
                  )}
                </div>
                
                {/* Accept & Commit Button */}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { 
                      setWorkflowComplete(false); 
                      setPreviewData(null);
                      setAgentQueue([]);
                      setTabProgress({ guideDiffs: false, adr: false, commitMessage: false });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={acceptAndCommit}
                    style={{ background: 'var(--success)', color: '#000' }}
                  >
                    ✓ Accept & Commit
                  </button>
                </div>
              </div>
            )}
            
            {/* Active Changes Card */}
            <div className="card" style={{ background: 'rgba(212, 165, 116, 0.08)', borderColor: 'var(--accent)', flexShrink: 0 }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--accent)' }}>📝 Staged Changes</h2>
              
              {/* Warning about unstaged changes */}
              {context && (context.changes.unstaged.length > 0 || context.changes.untracked.length > 0) && (
                <div style={{ 
                  marginBottom: '0.75rem', 
                  padding: '0.75rem', 
                  background: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: 'var(--warning)'
                }}>
                  ⚠️ <strong>{context.changes.unstaged.length + context.changes.untracked.length} unstaged file(s)</strong> - Stage with <code style={{background: 'var(--bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '3px'}}>git add .</code> for best results
                </div>
              )}
              
              {/* Primary Action Button */}
              <button
                className="btn btn-primary"
                onClick={startWorkflow}
                disabled={workflowRunning || workflowComplete || !hasChanges}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  background: workflowRunning || workflowComplete ? 'var(--text-dim)' : 'var(--accent)',
                  cursor: workflowRunning || workflowComplete || !hasChanges ? 'not-allowed' : 'pointer',
                  opacity: workflowRunning || workflowComplete ? 0.6 : 1
                }}
              >
                {workflowRunning ? '⏳ Generating Documentation...' : workflowComplete ? '✓ Documentation Generated' : '🚀 Generate Intent Documentation'}
              </button>
              
              {/* Agent Queue - shows during workflow */}
              {workflowRunning && agentQueue.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Agent Queue
                  </div>
                  <div style={{ fontSize: '0.75rem', maxHeight: '120px', overflowY: 'auto' }}>
                    {agentQueue.map((agent, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Layer {agent.layer}:</span>
                        <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{agent.path}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          background: agent.status === 'completed' ? 'var(--success)' : agent.status === 'in_progress' ? 'var(--accent)' : agent.status === 'failed' ? 'var(--error)' : 'var(--text-dim)',
                          color: '#000'
                        }}>
                          {agent.status === 'completed' ? '✓' : agent.status === 'in_progress' ? '⏳' : agent.status === 'failed' ? '✗' : '○'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Compact File Lists - Always show all 4 groups */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                {/* Added */}
                <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Added</span>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{fileTree?.changes_summary.added || 0}</span>
                  </div>
                  {fileTree && fileTree.changes_summary.added > 0 && (
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--success)', maxHeight: '100px', overflowY: 'auto' }}>
                      {getAllChangedFiles(fileTree.tree, 'added').map(path => (
                        <div key={path} style={{ padding: '0.1rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>+ {path}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Modified */}
                <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Modified</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{fileTree?.changes_summary.modified || 0}</span>
                  </div>
                  {fileTree && fileTree.changes_summary.modified > 0 && (
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--warning)', maxHeight: '100px', overflowY: 'auto' }}>
                      {getAllChangedFiles(fileTree.tree, 'modified').map(path => (
                        <div key={path} style={{ padding: '0.1rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>M {path}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Deleted - Always show even if empty */}
                <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Deleted</span>
                    <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>{fileTree?.changes_summary.deleted || 0}</span>
                  </div>
                  {fileTree && fileTree.changes_summary.deleted > 0 && (
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--error)', maxHeight: '100px', overflowY: 'auto' }}>
                      {getAllChangedFiles(fileTree.tree, 'deleted').map(path => (
                        <div key={path} style={{ padding: '0.1rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>D {path}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Stale Guides - Always show */}
                <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Stale Guides</span>
                    <span className="badge" style={{ background: 'rgba(212, 165, 116, 0.2)', color: 'var(--accent)', fontSize: '0.7rem' }}>{affectedCount}</span>
                  </div>
                  {affectedCount > 0 && (
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent)', maxHeight: '100px', overflowY: 'auto' }}>
                      {context?.affected_guides.map(g => (
                        <div key={g.path} style={{ padding: '0.1rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📋 {g.path}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-tertiary)' }}>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            ✨ No staged changes detected
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
            Stage your changes with <code style={{background: 'var(--bg-primary)', padding: '0.2rem 0.5rem', borderRadius: '3px'}}>git add .</code> then refresh
          </p>
        </div>
      )}
    </div>
  );
}


import { useState } from 'react';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  change_status?: 'added' | 'modified' | 'deleted';
  is_guide?: boolean;
  children?: TreeNode[];
}

interface FileTreeProps {
  node: TreeNode;
  level?: number;
  onFileSelect?: (path: string) => void;
}

function FileTreeNode({ node, level = 0, onFileSelect }: FileTreeProps) {
  // Auto-expand directories that have changes (so you can see what's changed)
  const hasChanges = node.change_status || node.children?.some(c => hasChangesRecursive(c));
  const [collapsed, setCollapsed] = useState(!hasChanges);
  
  const indent = level * 16;
  
  if (node.type === 'directory') {
    const childCount = node.children?.length || 0;
    
    return (
      <div>
        <div
          style={{
            paddingTop: '0.35rem',
            paddingBottom: '0.35rem',
            paddingLeft: `${indent + 8}px`,
            paddingRight: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.15s',
          }}
          className="tree-row"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: '10px' }}>
            {childCount > 0 ? (collapsed ? '▶' : '▼') : ''}
          </span>
          <span style={{ fontSize: '0.8rem' }}>📁</span>
          <span style={{
            fontSize: '0.875rem',
            color: hasChanges ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: hasChanges ? 500 : 400
          }}>
            {node.name}
          </span>
        </div>
        {!collapsed && node.children && (
          <div>
            {node.children.map((child, i) => (
              <FileTreeNode key={i} node={child} level={level + 1} onFileSelect={onFileSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // File node
  const statusBadge = node.change_status ? {
    'added': { text: 'A', color: 'var(--success)' },
    'modified': { text: 'M', color: 'var(--warning)' },
    'deleted': { text: 'D', color: 'var(--error)' }
  }[node.change_status] : null;
  
  return (
    <div
      style={{
        paddingTop: '0.35rem',
        paddingBottom: '0.35rem',
        paddingLeft: `${indent + 8}px`,
        paddingRight: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: onFileSelect ? 'pointer' : 'default',
        transition: 'background 0.15s'
      }}
      className="tree-row"
      onClick={() => onFileSelect?.(node.path)}
    >
      <span style={{ width: '10px' }}></span>
      <span style={{ fontSize: '0.8rem' }}>
        {node.is_guide ? '📋' : '📄'}
      </span>
      <span style={{
        fontSize: '0.875rem',
        color: node.is_guide ? 'var(--accent)' : (node.change_status ? 'var(--text-primary)' : 'var(--text-secondary)'),
        fontWeight: node.is_guide ? 500 : 400
      }}>
        {node.name}
      </span>
      {statusBadge && (
        <span style={{
          fontSize: '0.65rem',
          padding: '0.15rem 0.35rem',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          color: statusBadge.color,
          fontWeight: 700,
          fontFamily: 'monospace',
          border: `1px solid ${statusBadge.color}`,
          marginLeft: '0.5rem'
        }}>
          {statusBadge.text}
        </span>
      )}
    </div>
  );
}

function hasChangesRecursive(node: TreeNode): boolean {
  if (node.change_status) return true;
  if (node.children) {
    return node.children.some(c => hasChangesRecursive(c));
  }
  return false;
}

export default function FileTree({ tree, rootName, onFileSelect }: { tree: TreeNode; rootName?: string; onFileSelect?: (path: string) => void }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      overflow: 'hidden',
      height: '100%'
    }}>
      {/* Header with root folder name */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {rootName || 'PROJECT FILES'}
      </div>
      
      {/* Tree */}
      <div style={{
        paddingTop: '0.5rem',
        paddingBottom: '2rem',
        overflowY: 'auto',
        height: 'calc(100% - 50px)',
        fontSize: '0.875rem'
      }}>
        <style>{`
          .tree-row:hover {
            background: var(--bg-tertiary);
          }
        `}</style>
        <FileTreeNode node={tree} onFileSelect={onFileSelect} />
      </div>
    </div>
  );
}


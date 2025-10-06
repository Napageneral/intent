/**
 * File Tree Service
 * Builds a visual file tree with change decorations
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.npm',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.gradle',
  '.nuget',
  '.cargo',
  '.stack-work',
  '.ccache',
  '.idea',
  '.vscode',
  '.swp',
  '~',
  '.tmp',
  '.temp',
  '.bak',
  '.meta',
  'package-lock.json',
  '.git',
  'dist',
  'build',
  '.next',
  'bun.lock',
  '.proposed-intent'
];

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  change_status?: 'added' | 'modified' | 'deleted';
  is_guide?: boolean;
  children?: TreeNode[];
}

export interface FileTreeResponse {
  tree: TreeNode;
  changes_summary: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
}

/**
 * Check if path or filename should be ignored
 */
function shouldIgnore(pathOrName: string, patterns: string[]): boolean {
  // Check both the full path and just the filename
  for (const pattern of patterns) {
    // Simple string matching for exact names
    if (pathOrName === pattern || pathOrName.endsWith('/' + pattern)) {
      return true;
    }
    // Check if any part of the path matches
    if (pathOrName.includes('/' + pattern + '/') || pathOrName.startsWith(pattern + '/')) {
      return true;
    }
    // Check filename
    const fileName = pathOrName.split('/').pop() || '';
    if (fileName === pattern || fileName.endsWith(pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Get git status for all files
 */
function getGitStatus(workingDir: string): Map<string, 'added' | 'modified' | 'deleted'> {
  const statusMap = new Map<string, 'added' | 'modified' | 'deleted'>();
  
  try {
    // Get ONLY staged changes
    const staged = execSync('git diff --staged --name-status', {
      cwd: workingDir,
      encoding: 'utf-8'
    }).trim();
    
    // Parse staged and unstaged
    const parseStatus = (output: string) => {
      for (const line of output.split('\n')) {
        if (!line.trim()) continue;
        const [status, file] = line.split('\t');
        if (status === 'A') statusMap.set(file, 'added');
        else if (status === 'M') statusMap.set(file, 'modified');
        else if (status === 'D') statusMap.set(file, 'deleted');
      }
    };
    
    // Only parse staged changes
    parseStatus(staged);
  } catch {}
  
  return statusMap;
}

/**
 * Build file tree recursively
 */
function buildTree(
  dirPath: string,
  rootPath: string,
  statusMap: Map<string, 'added' | 'modified' | 'deleted'>,
  ignorePatterns: string[],
  maxDepth: number,
  currentDepth: number = 0
): TreeNode | null {
  if (currentDepth > maxDepth) return null;
  
  const relPath = relative(rootPath, dirPath) || '.';
  
  // Check if should ignore
  if (relPath !== '.' && shouldIgnore(relPath, ignorePatterns)) {
    return null;
  }
  
  // Use actual directory name, not '.'
  const name = relPath === '.' ? (rootPath.split('/').pop() || '.') : (dirPath.split('/').pop() || '');
  
  try {
    const stat = statSync(dirPath);
    
    if (stat.isDirectory()) {
      const entries = readdirSync(dirPath);
      const children: TreeNode[] = [];
      
      for (const entry of entries) {
        const childPath = join(dirPath, entry);
        const childNode = buildTree(childPath, rootPath, statusMap, ignorePatterns, maxDepth, currentDepth + 1);
        if (childNode) {
          children.push(childNode);
        }
      }
      
      // Sort: directories first, then files, alphabetically
      children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      return {
        name,
        path: relPath,
        type: 'directory',
        children
      };
    } else {
      const status = statusMap.get(relPath);
      const isGuide = name === 'agents.md' || name === 'CLAUDE.md';
      
      return {
        name,
        path: relPath,
        type: 'file',
        change_status: status,
        is_guide: isGuide
      };
    }
  } catch {
    return null;
  }
}

/**
 * Get file tree with change decorations
 */
export function getFileTree(customIgnorePatterns?: string[]): FileTreeResponse {
  const workingDir = process.env.USER_CWD || process.cwd();
  const ignorePatterns = customIgnorePatterns || DEFAULT_IGNORE_PATTERNS;
  const statusMap = getGitStatus(workingDir);
  
  const tree = buildTree(workingDir, workingDir, statusMap, ignorePatterns, 4);
  
  if (!tree) {
    return {
      tree: { name: '.', path: '.', type: 'directory', children: [] },
      changes_summary: { added: 0, modified: 0, deleted: 0, total: 0 }
    };
  }
  
  // Count changes
  let added = 0, modified = 0, deleted = 0;
  for (const [_, status] of statusMap) {
    if (status === 'added') added++;
    else if (status === 'modified') modified++;
    else if (status === 'deleted') deleted++;
  }
  
  return {
    tree,
    changes_summary: {
      added,
      modified,
      deleted,
      total: added + modified + deleted
    }
  };
}


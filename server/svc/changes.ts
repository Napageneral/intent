/**
 * Changes Service
 * Gets list of changed files with line counts
 */

import { execSync } from 'child_process';

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  is_guide: boolean;
}

export async function getChanges(): Promise<{ files: FileChange[] }> {
  const workingDir = process.env.USER_CWD || process.cwd();
  
  try {
    // Get all changed files (staged + unstaged)
    const staged = execSync('git diff --staged --name-only', { cwd: workingDir, encoding: 'utf-8' })
      .trim().split('\n').filter(Boolean);
    const unstaged = execSync('git diff --name-only', { cwd: workingDir, encoding: 'utf-8' })
      .trim().split('\n').filter(Boolean);
    
    const allFiles = [...new Set([...staged, ...unstaged])];
    
    // Get line counts for each file
    const files: FileChange[] = [];
    
    for (const file of allFiles) {
      try {
        const stat = execSync(`git diff --numstat -- "${file}"`, { cwd: workingDir, encoding: 'utf-8' }).trim();
        const [adds, dels] = stat.split('\t').map(n => parseInt(n) || 0);
        
        files.push({
          path: file,
          additions: adds,
          deletions: dels,
          is_guide: file.endsWith('agents.md') || file.endsWith('CLAUDE.md') || file.includes('/decisions/')
        });
      } catch {}
    }
    
    return { files: files.sort((a, b) => {
      // Guides first
      if (a.is_guide && !b.is_guide) return -1;
      if (!a.is_guide && b.is_guide) return 1;
      return a.path.localeCompare(b.path);
    }) };
  } catch {
    return { files: [] };
  }
}


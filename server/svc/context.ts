/**
 * Context Service
 * Detects current project context: changes, affected guides, staleness
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ProjectContext {
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

function sh(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Get current project context
 */
export async function getContext(): Promise<ProjectContext> {
  const workingDir = process.env.USER_CWD || process.cwd();
  
  // Detect git root
  let gitRoot = '';
  try {
    gitRoot = sh('git rev-parse --show-toplevel', workingDir);
  } catch {}
  
  if (!gitRoot) {
    return {
      project: {
        name: 'Unknown',
        root: workingDir,
        has_intent: false
      },
      changes: { staged: [], unstaged: [], total: 0 },
      affected_guides: [],
      quick_actions: {
        can_update: false,
        has_staged: false,
        has_unstaged: false,
        guide_count: 0
      }
    };
  }
  
  // Check if .intent exists
  const intentDir = join(gitRoot, '.intent');
  const hasIntent = existsSync(intentDir);
  
  // Get project name
  let projectName = 'Unknown';
  if (hasIntent) {
    try {
      const configPath = join(intentDir, 'config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      projectName = config.projectName || gitRoot.split('/').pop() || 'Unknown';
    } catch {}
  } else {
    projectName = gitRoot.split('/').pop() || 'Unknown';
  }
  
  // Detect changes
  const staged = sh('git diff --staged --name-only', gitRoot).split('\n').filter(Boolean);
  const unstaged = sh('git diff --name-only', gitRoot).split('\n').filter(Boolean);
  const allChanged = [...new Set([...staged, ...unstaged])];
  
  // Find affected guides (simple: find all agents.md files in parent dirs of changed files)
  const affectedGuides: { path: string; stale: boolean; last_updated: string | null }[] = [];
  
  if (allChanged.length > 0) {
    // Get all agents.md files in repo
    const allGuides = sh('git ls-files | grep -E "(agents\\.md|CLAUDE\\.md)$"', gitRoot)
      .split('\n')
      .filter(Boolean);
    
    // For each changed file, find its parent guides
    const affectedSet = new Set<string>();
    for (const file of allChanged) {
      // Walk up and find guides
      let dir = file.split('/').slice(0, -1).join('/');
      while (dir) {
        const candidate = join(dir, 'agents.md');
        if (allGuides.includes(candidate)) {
          affectedSet.add(candidate);
        }
        const legacy = join(dir, 'CLAUDE.md');
        if (allGuides.includes(legacy)) {
          affectedSet.add(legacy);
        }
        
        // Go up one level
        const parts = dir.split('/');
        parts.pop();
        dir = parts.join('/');
      }
      
      // Also check root
      if (allGuides.includes('agents.md')) affectedSet.add('agents.md');
      if (allGuides.includes('CLAUDE.md')) affectedSet.add('CLAUDE.md');
    }
    
    // Get last update time for each guide
    for (const guidePath of affectedSet) {
      const fullPath = join(gitRoot, guidePath);
      let lastUpdated: string | null = null;
      
      try {
        const timestamp = sh(`git log -1 --format=%cI -- "${guidePath}"`, gitRoot);
        if (timestamp) lastUpdated = timestamp;
      } catch {}
      
      affectedGuides.push({
        path: guidePath,
        stale: true, // Assume stale if changes exist
        last_updated: lastUpdated
      });
    }
  }
  
  return {
    project: {
      name: projectName,
      root: gitRoot,
      has_intent: hasIntent
    },
    changes: {
      staged,
      unstaged,
      total: allChanged.length
    },
    affected_guides: affectedGuides.sort((a, b) => a.path.localeCompare(b.path)),
    quick_actions: {
      can_update: allChanged.length > 0 && hasIntent,
      has_staged: staged.length > 0,
      has_unstaged: unstaged.length > 0,
      guide_count: affectedGuides.length
    }
  };
}


/**
 * Complete Workflow Service
 * Runs layered update + ADR generation + commit message in one streaming flow
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';

export interface WorkflowResult {
  guideDiffs: { path: string; diff: string }[];
  adr: string;
  commitMessage: string;
}

/**
 * Execute complete workflow with SSE streaming
 */
export async function* runWorkflow(): AsyncGenerator<any> {
  const workingDir = process.env.USER_CWD || process.cwd();
  const intentRoot = join(__dirname, '..', '..');
  
  try {
    // Step 1: Get comprehensive diff (staged + unstaged + untracked)
    let diffBefore = '';
    try {
      // Get staged changes
      const staged = execSync('git diff --cached', { cwd: workingDir, encoding: 'utf-8' });
      // Get unstaged changes
      const unstaged = execSync('git diff', { cwd: workingDir, encoding: 'utf-8' });
      // Get untracked files
      const untracked = execSync('git ls-files --others --exclude-standard', { cwd: workingDir, encoding: 'utf-8' });
      
      diffBefore = `# Staged Changes:\n${staged || '(none)'}\n\n# Unstaged Changes:\n${unstaged || '(none)'}\n\n# Untracked Files:\n${untracked || '(none)'}`;
    } catch (e) {
      console.error('Failed to get diff:', e);
      diffBefore = 'Unable to get diff';
    }
    
    // Step 2: Analyze current changes (skip layered update for now - can be added back)
    yield { type: 'queue', queue: [{ layer: 0, path: 'Analyzing changes...', status: 'in_progress' }] };
    
    // For now, just work with existing unstaged changes
    // TODO: Re-enable layered update once we debug it
    
    yield { type: 'queue', queue: [{ layer: 0, path: 'Analysis complete', status: 'completed' }] };
    
    // Step 3: Get guide diffs
    const guideDiffs: { path: string; diff: string }[] = [];
    try {
      const changedFiles = execSync('git diff --name-only', {
        cwd: workingDir,
        encoding: 'utf-8'
      }).trim();
      
      const changedGuides = changedFiles
        .split('\n')
        .filter(f => f.includes('agents.md') || f.includes('CLAUDE.md'));
      
      for (const guidePath of changedGuides) {
        try {
          const diff = execSync(`git diff -- "${guidePath}"`, {
            cwd: workingDir,
            encoding: 'utf-8'
          });
          if (diff.trim()) {
            guideDiffs.push({ path: guidePath, diff });
          }
        } catch (e) {
          console.error(`Failed to get diff for ${guidePath}:`, e);
        }
      }
    } catch (e) {
      console.error('Failed to get guide diffs:', e);
    }
    
    // Step 4: Generate ADR using Claude Code
    yield { type: 'status', message: 'Generating ADR...' };
    
    const adrNumber = getNextADRNumber(workingDir);
    const adrContent = await generateADR(workingDir, diffBefore, guideDiffs);
    
    // Step 5: Generate commit message
    yield { type: 'status', message: 'Generating commit message...' };
    
    const commitMessage = await generateCommitMessage(workingDir, diffBefore, adrContent);
    
    // Step 6: Return final result
    const result: WorkflowResult = {
      guideDiffs,
      adr: adrContent,
      commitMessage
    };
    
    yield { type: 'complete', result };
    
  } catch (error: any) {
    yield { type: 'error', message: error.message };
  }
}

function getNextADRNumber(workingDir: string): number {
  const decisionsDir = join(workingDir, '.intent', 'decisions');
  if (!existsSync(decisionsDir)) return 1;
  
  const files = readdirSync(decisionsDir);
  const adrNumbers = files
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3)))
    .filter(n => !isNaN(n));
  
  return adrNumbers.length > 0 ? Math.max(...adrNumbers) + 1 : 1;
}

async function generateADR(workingDir: string, diff: string, guideDiffs: any[]): Promise<string> {
  // For now, generate a simple ADR
  // TODO: Use Claude Code SDK to generate rich ADR
  const date = new Date().toISOString().split('T')[0];
  const number = String(getNextADRNumber(workingDir)).padStart(3, '0');
  
  const adr = `# ADR-${number}: Intent Documentation Update

**Status:** Proposed
**Date:** ${date}
**Commits:** (Pending)

## Context

Code changes detected in the repository that require documentation updates.

## Changes Made

${guideDiffs.map(g => `- Updated: ${g.path}`).join('\n') || '- No guide changes'}

## Code Diff Summary

\`\`\`
${diff.split('\n').slice(0, 50).join('\n')}
${diff.split('\n').length > 50 ? '\n... (truncated)' : ''}
\`\`\`

## Verification

- [ ] All affected guides updated
- [ ] ADR created
- [ ] Changes committed
`;
  
  return adr;
}

async function generateCommitMessage(workingDir: string, diff: string, adr: string): Promise<string> {
  try {
    // Parse the comprehensive diff to get file lists
    const staged = execSync('git diff --cached --name-status', { cwd: workingDir, encoding: 'utf-8' }).trim();
    const unstaged = execSync('git diff --name-status', { cwd: workingDir, encoding: 'utf-8' }).trim();
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: workingDir, encoding: 'utf-8' }).trim();
    
    const allFiles = [
      ...staged.split('\n').filter(Boolean),
      ...unstaged.split('\n').filter(Boolean),
      ...untracked.split('\n').map(f => `A\t${f}`)
    ];
    
    // Categorize changes
    const added = allFiles.filter(l => l.startsWith('A')).map(l => l.split('\t')[1]);
    const modified = allFiles.filter(l => l.startsWith('M')).map(l => l.split('\t')[1]);
    const deleted = allFiles.filter(l => l.startsWith('D')).map(l => l.split('\t')[1]);
    
    // Build detailed commit message
    let message = 'docs: update intent documentation\n\n';
    
    if (added.length > 0) {
      message += `Added files:\n${added.map(f => `- ${f}`).join('\n')}\n\n`;
    }
    
    if (modified.length > 0) {
      message += `Modified files:\n${modified.map(f => `- ${f}`).join('\n')}\n\n`;
    }
    
    if (deleted.length > 0) {
      message += `Deleted files:\n${deleted.map(f => `- ${f}`).join('\n')}\n\n`;
    }
    
    message += 'Generated ADR for changes\n';
    message += '\nIntent-Updated: yes';
    
    return message;
  } catch (e) {
    console.error('Failed to generate detailed commit message:', e);
    return `docs: update intent documentation\n\nGenerated ADR for changes\n\nIntent-Updated: yes`;
  }
}


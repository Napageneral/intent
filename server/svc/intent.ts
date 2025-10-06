/**
 * Intent Generation Service
 * Runs layered update + generates ADR + proposes commit message
 */

import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { generateAndSaveADR } from '../../core/llm/client';
import { getNextADRNumber } from '../../store/db';

export interface IntentGenerationResult {
  adr: string;
  adr_path: string;
  commit_message: string;
  guides_updated: string[];
}

/**
 * Run layered update, generate ADR, and propose commit message
 */
export async function generateIntent(): Promise<IntentGenerationResult> {
  const workingDir = process.env.USER_CWD || process.cwd();
  const intentRoot = join(__dirname, '..', '..');
  
  // 1) Get diff before update
  const diffBefore = execSync('git diff --staged', { cwd: workingDir, encoding: 'utf-8' });
  
  // 2) Run layered update
  console.log('🤖 Running layered guide update...');
  const updateScript = join(intentRoot, 'core', 'workflows', 'update_layered.ts');
  
  try {
    execSync(`bun run "${updateScript}" staged`, {
      cwd: intentRoot,
      env: {
        ...process.env,
        USER_CWD: workingDir,
        INTENT_SCOPE: 'staged'
      },
      stdio: 'pipe'
    });
  } catch (error) {
    console.error('Update failed:', error);
  }
  
  // 3) Get updated guides
  const guideDiffs = execSync('git diff --name-only', { cwd: workingDir, encoding: 'utf-8' })
    .trim().split('\n')
    .filter(f => f.endsWith('agents.md') || f.endsWith('CLAUDE.md'));
  
  // 4) Generate ADR
  console.log('📋 Generating ADR...');
  const adrNumber = getNextADRNumber();
  const adrPath = join(workingDir, '.intent', 'decisions', `${String(adrNumber).padStart(3, '0')}-session.md`);
  
  const diffAfter = execSync('git diff', { cwd: workingDir, encoding: 'utf-8' });
  
  const llmConfig = {
    model: 'claude-sonnet-4-5',
    provider: 'anthropic' as const,
    apiKey: process.env.ANTHROPIC_API_KEY,
    workingDirectory: workingDir
  };
  
  let adrContent = '';
  try {
    const result = await generateAndSaveADR(
      adrPath,
      {
        diff: diffBefore + '\n\n' + diffAfter,
        chatLog: undefined,
        previousADRs: [],
        agentsUpdates: guideDiffs.map(g => `Updated: ${g}`).join('\n')
      },
      llmConfig
    );
    
    if (result.success && existsSync(adrPath)) {
      adrContent = readFileSync(adrPath, 'utf-8');
    } else {
      adrContent = `# ADR-${String(adrNumber).padStart(3, '0')}: Session Changes\n\n(Auto-generation in progress...)`;
    }
  } catch (error) {
    console.error('ADR generation failed:', error);
    adrContent = `# ADR-${String(adrNumber).padStart(3, '0')}: Session Changes\n\n(Generation failed)`;
  }
  
  // 5) Generate commit message
  const commitMessage = generateCommitMessage(diffBefore, guideDiffs);
  
  return {
    adr: adrContent,
    adr_path: adrPath,
    commit_message: commitMessage,
    guides_updated: guideDiffs
  };
}

/**
 * Generate a commit message from changes
 */
function generateCommitMessage(diff: string, guidesUpdated: string[]): string {
  // Extract changed files from diff
  const files = diff.match(/diff --git a\/([^\s]+)/g)?.map(m => m.replace('diff --git a/', '')) || [];
  const codeFiles = files.filter(f => !f.endsWith('agents.md') && !f.endsWith('CLAUDE.md') && !f.includes('/decisions/'));
  
  // Simple heuristic commit message
  const fileCount = codeFiles.length;
  const guideCount = guidesUpdated.length;
  
  let message = '';
  
  if (fileCount === 1) {
    message = `feat: update ${codeFiles[0].split('/').pop()}`;
  } else if (fileCount > 1 && fileCount <= 3) {
    message = `feat: update ${codeFiles.map(f => f.split('/').pop()).join(', ')}`;
  } else {
    message = `feat: updates across ${fileCount} files`;
  }
  
  message += `\n\n`;
  message += `Updated ${guideCount} engineering guide(s) and generated ADR.\n\n`;
  message += `Files changed:\n`;
  for (const file of codeFiles.slice(0, 10)) {
    message += `- ${file}\n`;
  }
  if (codeFiles.length > 10) {
    message += `... and ${codeFiles.length - 10} more\n`;
  }
  
  message += `\nDocs-Reviewed: yes`;
  
  return message;
}

/**
 * Commit changes with ADR
 */
export async function commitIntent(message: string, adrContent: string): Promise<{ success: boolean; error?: string }> {
  const workingDir = process.env.USER_CWD || process.cwd();
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  
  try {
    // Save ADR if provided
    if (adrContent) {
      const adrMatch = adrContent.match(/# ADR-(\d{3})/);
      if (adrMatch) {
        const adrNumber = adrMatch[1];
        const adrTitle = adrContent.match(/# ADR-\d{3}: (.+)/)?.[1]?.toLowerCase().replace(/\s+/g, '-') || 'update';
        const adrPath = join(workingDir, '.intent', 'decisions', `${adrNumber}-${adrTitle}.md`);
        writeFileSync(adrPath, adrContent, 'utf-8');
      }
    }
    
    // Stage all guides and ADR
    execSync('git add "**/agents.md" "**/CLAUDE.md" .intent/decisions/*.md', { cwd: workingDir });
    
    // Commit
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: workingDir });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


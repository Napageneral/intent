/**
 * Complete Workflow Service V2
 * Properly integrates layered update + ADR generation + commit message with SSE streaming
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
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
  const scope = process.env.INTENT_SCOPE || 'staged';
  const model = process.env.INTENT_MODEL || 'claude-sonnet-4-5';
  
  try {
    // Step 1: Detect changes and build layers
    yield { type: 'status', message: 'Detecting changes...' };
    
    const changesJson = execSync(`INTENT_SCOPE=${scope} bun ${join(intentRoot, 'core', 'detect_changes.ts')}`, {
      cwd: workingDir,
      encoding: 'utf-8'
    });
    
    const changes = JSON.parse(changesJson);
    
    if (!changes.affected_docs || changes.affected_docs.length === 0) {
      yield { type: 'status', message: 'No guides affected by these changes' };
      yield { type: 'complete', result: { guideDiffs: [], adr: '', commitMessage: '' } };
      return;
    }
    
    yield { type: 'status', message: `Found ${changes.affected_docs.length} affected guide(s)` };
    
    // Step 2: Build guide layers (bottom-up)
    yield { type: 'status', message: 'Building guide tree...' };
    
    const layersInput = JSON.stringify(changes);
    const layersJson = execSync(
      `echo '${layersInput.replace(/'/g, "'\\''")}' | bun ${join(intentRoot, 'core', 'workflows', 'build_tree.ts')}`,
      { cwd: workingDir, encoding: 'utf-8' }
    );
    
    const { layers } = JSON.parse(layersJson) as { layers: string[][] };
    
    if (!layers || layers.length === 0) {
      yield { type: 'status', message: 'No layers to process' };
      yield { type: 'complete', result: { guideDiffs: [], adr: '', commitMessage: '' } };
      return;
    }
    
    yield { type: 'status', message: `Processing ${layers.length} layer(s)...` };
    
    // Step 3: Process each layer with progress updates
    const intentDir = join(workingDir, '.intent');
    const stateDir = join(intentDir, 'state');
    const promptsDir = join(intentDir, '.proposed-intent');
    
    // Create state dir if it doesn't exist
    if (!existsSync(stateDir)) {
      execSync(`mkdir -p "${stateDir}"`, { cwd: workingDir });
    }
    
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layerDocs = layers[layerIndex];
      if (layerDocs.length === 0) continue;
      
      // Update queue to show current layer
      const queue = layerDocs.map(doc => ({
        layer: layerIndex,
        path: doc,
        status: 'in_progress' as const
      }));
      
      yield { type: 'queue', queue };
      yield { type: 'status', message: `Processing layer ${layerIndex} (${layerDocs.length} guides)...` };
      
      // 3a) Build contexts for this layer only
      const layerPayload = JSON.stringify({
        ...changes,
        affected_docs: layerDocs
      });
      
      try {
        const contexts = execSync(
          `echo '${layerPayload.replace(/'/g, "'\\''")}' | bun ${join(intentRoot, 'core', 'build_context.ts')}`,
          { cwd: workingDir, encoding: 'utf-8' }
        );
        
        if (!contexts || !contexts.trim()) {
          yield { type: 'status', message: `Layer ${layerIndex}: No diffs for this layer` };
          
          // Mark as completed
          const completedQueue = layerDocs.map(doc => ({
            layer: layerIndex,
            path: doc,
            status: 'completed' as const
          }));
          yield { type: 'queue', queue: completedQueue };
          continue;
        }
        
        // 3b) Generate prompts
        yield { type: 'status', message: `Layer ${layerIndex}: Generating prompts...` };
        
        const prompts = execSync(
          `echo '${contexts.replace(/'/g, "'\\''")}' | bun ${join(intentRoot, 'core', 'make_prompts.ts')}`,
          { cwd: workingDir, encoding: 'utf-8' }
        );
        
        if (!prompts || !prompts.trim()) {
          yield { type: 'status', message: `Layer ${layerIndex}: No prompts generated` };
          
          const completedQueue = layerDocs.map(doc => ({
            layer: layerIndex,
            path: doc,
            status: 'completed' as const
          }));
          yield { type: 'queue', queue: completedQueue };
          continue;
        }
        
        // 3c) Augment prompts with child-layer summaries (if not first layer)
        if (layerIndex > 0) {
          const childSummaryPath = join(stateDir, `layer-${layerIndex - 1}-summary.json`);
          if (existsSync(childSummaryPath)) {
            yield { type: 'status', message: `Layer ${layerIndex}: Adding child-layer context...` };
            
            const childSummary = JSON.parse(readFileSync(childSummaryPath, 'utf-8')) as Record<string, string>;
            
            for (const promptPath of prompts.split('\n').filter(Boolean)) {
              if (!existsSync(promptPath)) continue;
              
              const currentPrompt = readFileSync(promptPath, 'utf-8');
              const guidePath = promptPath.split('/').pop()!.replace('.prompt.md', '').replace(/__/g, '/');
              
              // Build summary block for relevant child guides
              const relevantSummaries: string[] = [];
              for (const [childPath, diff] of Object.entries(childSummary)) {
                if (childPath.startsWith(guidePath.replace('/agents.md', ''))) {
                  relevantSummaries.push(`### ${childPath}\n\`\`\`diff\n${diff}\n\`\`\``);
                }
              }
              
              if (relevantSummaries.length > 0) {
                const summaryBlock = `\n\n---\n\n# CHILD GUIDE UPDATES\n\nThe following child guides were updated in the layer below:\n\n${relevantSummaries.join('\n\n')}\n`;
                writeFileSync(promptPath, currentPrompt + summaryBlock);
              }
            }
          }
        }
        
        // 3d) Process prompts with Claude Code
        yield { type: 'status', message: `Layer ${layerIndex}: Updating guides with AI...` };
        
        try {
          // Run process_prompts and capture output
          execSync(
            `bun ${join(intentRoot, 'core', 'workflows', 'process_prompts.ts')} "${promptsDir}" "${model}"`,
            { 
              cwd: workingDir,
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe']
            }
          );
          
          yield { type: 'status', message: `Layer ${layerIndex}: Guides updated successfully` };
        } catch (error: any) {
          yield { type: 'status', message: `Layer ${layerIndex}: Some guides failed to update (${error.message})` };
        }
        
        // 3e) Record layer summary (guide diffs for parent context)
        const summary: Record<string, string> = {};
        for (const doc of layerDocs) {
          try {
            const diff = execSync(`git --no-pager diff --unified=3 -- "${doc}"`, {
              cwd: workingDir,
              encoding: 'utf-8'
            });
            if (diff && diff.trim()) {
              summary[doc] = diff;
            }
          } catch (e) {
            // No diff for this file
          }
        }
        
        const summaryPath = join(stateDir, `layer-${layerIndex}-summary.json`);
        writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        // Mark all guides in this layer as completed
        const completedQueue = layerDocs.map(doc => ({
          layer: layerIndex,
          path: doc,
          status: 'completed' as const
        }));
        yield { type: 'queue', queue: completedQueue };
        yield { type: 'status', message: `Layer ${layerIndex}: Complete` };
        
      } catch (error: any) {
        yield { type: 'status', message: `Layer ${layerIndex}: Error - ${error.message}` };
        
        // Mark as failed
        const failedQueue = layerDocs.map(doc => ({
          layer: layerIndex,
          path: doc,
          status: 'failed' as const
        }));
        yield { type: 'queue', queue: failedQueue };
      }
    }
    
    // Step 4: Collect guide diffs for ADR/commit message
    yield { type: 'status', message: 'Collecting guide updates...' };
    
    const guideDiffs: { path: string; diff: string }[] = [];
    for (const layer of layers) {
      for (const doc of layer) {
        try {
          const diff = execSync(`git diff -- "${doc}"`, {
            cwd: workingDir,
            encoding: 'utf-8'
          });
          if (diff.trim()) {
            guideDiffs.push({ path: doc, diff });
          }
        } catch (e) {
          // No diff
        }
      }
    }
    
    yield { type: 'status', message: `Collected ${guideDiffs.length} guide updates` };
    
    // Step 5: Get comprehensive diff for ADR context
    let comprehensiveDiff = '';
    try {
      const staged = execSync('git diff --cached', { cwd: workingDir, encoding: 'utf-8' });
      const unstaged = execSync('git diff', { cwd: workingDir, encoding: 'utf-8' });
      comprehensiveDiff = `# Staged Changes:\n${staged || '(none)'}\n\n# Unstaged Changes:\n${unstaged || '(none)'}`;
    } catch (e) {
      comprehensiveDiff = 'Unable to get diff';
    }
    
    // Step 6: Generate ADR
    yield { type: 'status', message: 'Generating ADR...' };
    
    const adrNumber = getNextADRNumber(workingDir);
    const adrContent = await generateADR(workingDir, comprehensiveDiff, guideDiffs, adrNumber);
    
    // Step 7: Generate commit message
    yield { type: 'status', message: 'Generating commit message...' };
    
    const commitMessage = await generateCommitMessage(workingDir, comprehensiveDiff, guideDiffs, adrNumber);
    
    // Step 8: Return final result
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

async function generateADR(
  workingDir: string,
  diff: string,
  guideDiffs: any[],
  adrNumber: number
): Promise<string> {
  // TODO: Use Claude Code SDK to generate rich ADR
  // For now, use improved template with actual guide changes
  const date = new Date().toISOString().split('T')[0];
  const number = String(adrNumber).padStart(3, '0');
  
  const guidesList = guideDiffs.length > 0
    ? guideDiffs.map(g => `- ${g.path}`).join('\n')
    : '- No guide changes detected';
  
  const adr = `# ADR-${number}: Documentation Update

**Status:** Proposed
**Date:** ${date}
**Commits:** (Pending)

## Context

Code changes detected that require documentation updates. This ADR captures the changes made to engineering guides.

## Guides Updated

${guidesList}

## Changes Overview

${guideDiffs.length > 0 ? 'The following guides were updated to reflect code changes:' : 'No guides were updated in this session.'}

${guideDiffs.slice(0, 3).map(g => {
  const lines = g.diff.split('\n');
  const summary = lines.slice(0, 20).join('\n');
  return `### ${g.path}\n\`\`\`diff\n${summary}\n${lines.length > 20 ? '... (truncated)' : ''}\n\`\`\``;
}).join('\n\n')}

${guideDiffs.length > 3 ? `\n... and ${guideDiffs.length - 3} more guides` : ''}

## Code Changes Summary

\`\`\`
${diff.split('\n').slice(0, 50).join('\n')}
${diff.split('\n').length > 50 ? '\n... (truncated)' : ''}
\`\`\`

## Verification

- [${guideDiffs.length > 0 ? 'x' : ' '}] Guides updated
- [ ] Changes reviewed
- [ ] Ready to commit
`;
  
  return adr;
}

async function generateCommitMessage(
  workingDir: string,
  diff: string,
  guideDiffs: any[],
  adrNumber: number
): Promise<string> {
  // TODO: Use Claude Code SDK for semantic commit messages
  // For now, generate improved mechanical message
  try {
    const staged = execSync('git diff --cached --name-status', { cwd: workingDir, encoding: 'utf-8' }).trim();
    const unstaged = execSync('git diff --name-status', { cwd: workingDir, encoding: 'utf-8' }).trim();
    
    const allFiles = [
      ...staged.split('\n').filter(Boolean),
      ...unstaged.split('\n').filter(Boolean)
    ];
    
    // Separate guides from code files
    const guideFiles = allFiles.filter(l => {
      const file = l.split('\t')[1];
      return file?.includes('agents.md') || file?.includes('CLAUDE.md') || file?.includes('.intent/decisions/');
    });
    
    const codeFiles = allFiles.filter(l => {
      const file = l.split('\t')[1];
      return file && !guideFiles.some(g => g.includes(file));
    });
    
    // Categorize
    const addedCode = codeFiles.filter(l => l.startsWith('A')).map(l => l.split('\t')[1]);
    const modifiedCode = codeFiles.filter(l => l.startsWith('M')).map(l => l.split('\t')[1]);
    const deletedCode = codeFiles.filter(l => l.startsWith('D')).map(l => l.split('\t')[1]);
    
    // Build commit message
    let message = '';
    
    if (guideDiffs.length > 0) {
      message = 'docs: update engineering guides\n\n';
      message += `Updated ${guideDiffs.length} guide(s) to reflect code changes.\n\n`;
      message += `Guides updated:\n${guideDiffs.map(g => `- ${g.path}`).join('\n')}\n\n`;
    } else {
      message = 'feat: code changes\n\n';
    }
    
    if (addedCode.length > 0) {
      message += `Added:\n${addedCode.slice(0, 5).map(f => `- ${f}`).join('\n')}`;
      if (addedCode.length > 5) message += `\n... and ${addedCode.length - 5} more`;
      message += '\n\n';
    }
    
    if (modifiedCode.length > 0) {
      message += `Modified:\n${modifiedCode.slice(0, 5).map(f => `- ${f}`).join('\n')}`;
      if (modifiedCode.length > 5) message += `\n... and ${modifiedCode.length - 5} more`;
      message += '\n\n';
    }
    
    if (deletedCode.length > 0) {
      message += `Deleted:\n${deletedCode.slice(0, 5).map(f => `- ${f}`).join('\n')}`;
      if (deletedCode.length > 5) message += `\n... and ${deletedCode.length - 5} more`;
      message += '\n\n';
    }
    
    message += `See: ADR-${String(adrNumber).padStart(3, '0')}\n`;
    message += 'Intent-Updated: yes';
    
    return message;
  } catch (e) {
    console.error('Failed to generate detailed commit message:', e);
    return `docs: update documentation\n\nSee: ADR-${String(adrNumber).padStart(3, '0')}\n\nIntent-Updated: yes`;
  }
}



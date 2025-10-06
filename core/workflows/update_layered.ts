#!/usr/bin/env bun
/**
 * Layer-by-Layer Guide Updater
 * 
 * Bottom-up workflow:
 * 1. Detect changes and affected guides
 * 2. Build guide tree and compute layers (leaves → root)
 * 3. For each layer:
 *    - Build context bundles for that layer's guides
 *    - Augment prompts with child-update summaries from previous layer
 *    - Process prompts in parallel (Claude Code direct editing)
 *    - Record layer summary (diffs) for parent context
 * 4. Report final status
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const WORKING_DIR = process.env.USER_CWD || process.cwd();
const MODEL = process.env.INTENT_MODEL || 'claude-sonnet-4-5';

// Color output
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function sh(cmd: string, opts?: {cwd?: string}): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: opts?.cwd || WORKING_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/bash'
    }).trim();
  } catch (error: any) {
    if (error.stdout) return error.stdout.trim();
    throw error;
  }
}

function log(...args: any[]) {
  console.log(...args);
}

/**
 * Get git diff for a specific file
 */
function diffFile(path: string): string {
  try {
    return sh(`git --no-pager diff --unified=3 -- "${path}"`);
  } catch {
    return '';
  }
}

/**
 * Main orchestrator
 */
async function run() {
  const scope = process.env.INTENT_SCOPE || 'staged';
  const intentToolRoot = join(__dirname, '..', '..');
  
  log(`${BOLD}📚 Intent - Layered Guide Updater${RESET}`);
  log(`${BLUE}Scope: ${scope}${RESET}\n`);
  
  // 1) Detect changes
  log('🔍 Detecting changed files and affected guides...');
  const changesJson = sh(`INTENT_SCOPE=${scope} bun ${join(intentToolRoot, 'core', 'detect_changes.ts')}`);
  const changes = JSON.parse(changesJson);
  
  if (!changes.affected_docs || changes.affected_docs.length === 0) {
    log(`${GREEN}✓ No guides affected by these changes${RESET}`);
    return;
  }
  
  log(`${YELLOW}Found ${changes.affected_docs.length} affected guide(s)${RESET}\n`);
  
  // 2) Build guide layers
  log('📊 Building guide tree (bottom-up layers)...');
  const layersInput = JSON.stringify(changes);
  const layersJson = sh(`echo '${layersInput.replace(/'/g, "'\\''")}' | bun ${join(intentToolRoot, 'core', 'workflows', 'build_tree.ts')}`);
  const { layers } = JSON.parse(layersJson) as { layers: string[][] };
  
  if (!layers || layers.length === 0) {
    log(`${GREEN}✓ No layers to process${RESET}`);
    return;
  }
  
  log(`${YELLOW}Computed ${layers.length} layer(s)${RESET}`);
  for (let i = 0; i < layers.length; i++) {
    log(`  Layer ${i}: ${layers[i].length} guide(s) - ${layers[i].join(', ')}`);
  }
  log('');
  
  // 3) Set up state directory for layer summaries
  const intentDir = join(WORKING_DIR, '.intent');
  const stateDir = join(intentDir, 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  
  // 4) Process each layer
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layerDocs = layers[layerIndex];
    if (layerDocs.length === 0) continue;
    
    log(`${BOLD}🔶 Layer ${layerIndex}${RESET} (${layerDocs.length} guide(s))`);
    
    // 4a) Build contexts for this layer only
    const layerPayload = JSON.stringify({
      ...changes,
      affected_docs: layerDocs
    });
    
    const contexts = sh(`echo '${layerPayload.replace(/'/g, "'\\''")}' | bun ${join(intentToolRoot, 'core', 'build_context.ts')}`);
    
    if (!contexts || !contexts.trim()) {
      log(`  ${BLUE}ℹ️  No directory-scoped diffs for this layer${RESET}\n`);
      continue;
    }
    
    // 4b) Generate prompts
    const prompts = sh(`echo '${contexts.replace(/'/g, "'\\''")}' | bun ${join(intentToolRoot, 'core', 'make_prompts.ts')}`);
    
    if (!prompts || !prompts.trim()) {
      log(`  ${BLUE}ℹ️  No prompts generated${RESET}\n`);
      continue;
    }
    
    // 4c) Augment prompts with child-update summaries (if not the first layer)
    if (layerIndex > 0) {
      const childSummaryPath = join(stateDir, `layer-${layerIndex - 1}-summary.json`);
      if (existsSync(childSummaryPath)) {
        log(`  📝 Adding child-layer summaries to prompts...`);
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
    
    // 4d) Process prompts with Claude Code (direct editing, parallel per layer)
    log(`  🤖 Updating guides with Claude Code...\n`);
    const promptsDir = join(WORKING_DIR, '.proposed-intent');
    
    try {
      sh(`bun ${join(intentToolRoot, 'core', 'workflows', 'process_prompts.ts')} "${promptsDir}" "${MODEL}"`);
    } catch (error: any) {
      log(`  ${YELLOW}⚠️  Some guides in this layer failed to update${RESET}`);
      log(`     ${error.message}\n`);
    }
    
    // 4e) Record layer summary (guide diffs for parent context)
    const summary: Record<string, string> = {};
    for (const doc of layerDocs) {
      const diff = diffFile(doc);
      if (diff && diff.trim()) {
        summary[doc] = diff;
      }
    }
    
    const summaryPath = join(stateDir, `layer-${layerIndex}-summary.json`);
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    log(`  ${GREEN}✓ Layer ${layerIndex} complete${RESET}\n`);
  }
  
  // 5) Final summary
  log(`${GREEN}${BOLD}✅ Layered update complete!${RESET}`);
  log('');
  log('Review changes:');
  log(`  ${BLUE}git diff${RESET}`);
  log('');
  log('Commit when ready:');
  log(`  ${BLUE}git add .${RESET}`);
  log(`  ${BLUE}git commit -m "docs: update guides"${RESET}`);
}

// Run if called directly
if (import.meta.main) {
  run().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { run };


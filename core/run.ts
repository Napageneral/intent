#!/usr/bin/env bun
/**
 * Intent Orchestrator - Updates Engineering Guides based on code changes
 * 
 * Usage:
 *   bun run.ts                    # staged changes (default)
 *   INTENT_SCOPE=head bun run.ts  # last commit
 *   INTENT_SCOPE=pr bun run.ts    # against origin/main
 * 
 * Environment:
 *   INTENT_SCOPE    - "staged" (default), "head", or "against_origin_main"
 *   INTENT_QUIET    - Set to "1" to suppress verbose output
 */
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKING_DIR = process.env.USER_CWD || process.cwd();
const REPO_ROOT = execSync('git rev-parse --show-toplevel', { 
  encoding: 'utf-8',
  cwd: WORKING_DIR 
}).trim();

// Determine scope
const SCOPE = process.env.INTENT_SCOPE || 'staged';
const QUIET = process.env.INTENT_QUIET === '1';

// Color output (if terminal)
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(...args: any[]) {
  if (!QUIET) {
    console.log(...args);
  }
}

// Header
log(`${BOLD}📚 Intent - Engineering Guide Updater${RESET}`);
log(`${BLUE}Scope: ${SCOPE}${RESET}`);
log('');

// 1. Detect changes and affected guides
log('🔍 Detecting changed files and affected guides...');
const changesJson = execSync(`INTENT_SCOPE=${SCOPE} bun ${join(__dirname, 'detect_changes.ts')}`, {
  encoding: 'utf-8',
  cwd: REPO_ROOT,
});

const changes = JSON.parse(changesJson);
const affectedCount = changes.affected_docs.length;

if (affectedCount === 0) {
  log(`${GREEN}✓ No guides affected by these changes${RESET}`);
  process.exit(0);
}

log(`${YELLOW}Found ${affectedCount} affected guide(s)${RESET}`);

// 2. Build context bundles
log('');
log('📦 Building context bundles...');
const contextFiles = execSync(`echo '${changesJson}' | bun ${join(__dirname, 'build_context.ts')}`, {
  encoding: 'utf-8',
  cwd: REPO_ROOT,
  shell: '/bin/bash',
}).trim();

if (!contextFiles) {
  log(`${GREEN}✓ No directory-scoped diffs to process${RESET}`);
  process.exit(0);
}

const contextCount = contextFiles.split('\n').length;
log(`${YELLOW}Created ${contextCount} context bundle(s)${RESET}`);

// 3. Generate LLM prompts
log('');
log('✍️  Generating LLM prompts...');
const promptFiles = execSync(`echo '${contextFiles}' | bun ${join(__dirname, 'make_prompts.ts')}`, {
  encoding: 'utf-8',
  cwd: REPO_ROOT,
  shell: '/bin/bash',
}).trim();

const promptCount = promptFiles.split('\n').length;
log(`${GREEN}✓ Generated ${promptCount} prompt(s)${RESET}`);

// 4. Summary
log('');
log(`${BOLD}📝 Prompts ready!${RESET}`);
log('');
log('Generated prompts:');
for (const prompt of promptFiles.split('\n')) {
  log(`  ${BLUE}→${RESET} ${prompt}`);
}

log('');
log(`${BOLD}Next steps:${RESET}`);
log('1. Open each .prompt.md file in Cursor');
log('2. Paste into an LLM chat (or let Cursor\'s agent process it)');
log('3. Save the returned patch as .patch (same directory, same stem)');
log(`4. Apply patches: ${YELLOW}git apply --index .proposed-intent/*.patch${RESET}`);
log('');
log('Or use Cursor commands:');
log(`  ${YELLOW}/intent${RESET}        - Process all prompts automatically`);
log(`  ${YELLOW}/intent verify${RESET}  - Verify guide accuracy after applying`);
log(`  ${YELLOW}/intent commit${RESET}  - Commit with 'Docs-Reviewed: yes' footer`);


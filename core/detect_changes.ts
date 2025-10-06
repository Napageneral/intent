#!/usr/bin/env bun
/**
 * Detects changed files and finds all affected Engineering Guides (agents.md).
 * 
 * Walks up from each changed file's directory to repo root, collecting all
 * agents.md files (and legacy CLAUDE.md files during transition).
 * 
 * Usage:
 *   bun detect_changes.ts
 *   INTENT_SCOPE=head bun detect_changes.ts
 *   INTENT_SCOPE=against_origin_main bun detect_changes.ts
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

// Primary guide filename (new standard)
const DOC_FILENAMES = ['agents.md'];

// Legacy guide filenames (keep for transition period)
const LEGACY_DOC_FILENAMES = ['CLAUDE.md'];

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

function getChangedFiles(scope: string): string[] {
  let cmd: string;
  
  if (scope === 'staged') {
    cmd = 'git diff --cached --name-only --diff-filter=ACMR';
  } else if (scope === 'head') {
    cmd = 'git diff HEAD~1..HEAD --name-only --diff-filter=ACMR';
  } else if (scope === 'against_origin_main') {
    cmd = 'git diff origin/main...HEAD --name-only --diff-filter=ACMR';
  } else {
    throw new Error(`Unknown scope: ${scope}`);
  }
  
  const output = execSync(cmd, { encoding: 'utf-8', cwd: REPO_ROOT }).trim();
  // Ignore all Markdown files except our Guide files
  return output.split('\n').filter(f => f && !f.endsWith('.md'));
}

function hasDoc(dirPath: string): string | null {
  for (const name of [...DOC_FILENAMES, ...LEGACY_DOC_FILENAMES]) {
    const candidate = join(dirPath, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function ancestorsWithDoc(path: string): string[] {
  const docs: string[] = [];
  let cur = existsSync(path) && !path.endsWith('.md') ? dirname(join(REPO_ROOT, path)) : join(REPO_ROOT, path);
  
  while (true) {
    const candidate = hasDoc(cur);
    if (candidate) {
      const relative = candidate.substring(REPO_ROOT.length + 1);
      docs.push(relative);
    }
    if (cur === REPO_ROOT) {
      break;
    }
    cur = dirname(cur);
  }
  
  return docs;
}

function main() {
  const scope = process.env.INTENT_SCOPE || 'staged';
  const changed = getChangedFiles(scope);
  const affectedDocs = new Set<string>();
  
  for (const file of changed) {
    const fullPath = join(REPO_ROOT, file);
    if (existsSync(fullPath)) {
      for (const doc of ancestorsWithDoc(file)) {
        affectedDocs.add(doc);
      }
    }
  }
  
  const result = {
    scope,
    changed_files: changed,
    affected_docs: Array.from(affectedDocs).sort(),
    repo_root: REPO_ROOT,
  };
  
  console.log(JSON.stringify(result));
}

main();


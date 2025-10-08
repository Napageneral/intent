#!/usr/bin/env bun
/**
 * Builds context bundles for each affected Engineering Guide.
 * 
 * For each guide, creates a JSON bundle containing:
 * - Directory-scoped diff (only changes under that guide's directory)
 * - Current guide content
 * - Git metadata (branch, sha, remote URL)
 * - List of changed files
 * 
 * Output: .intent/.proposed-intent/<guide-path-sanitized>.context.json
 * 
 * Usage:
 *   bun detect_changes.ts | bun build_context.ts
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

function dirForDoc(docPath: string): string {
  return dirname(join(REPO_ROOT, docPath));
}

function diffForDir(dirPath: string, scope: string): string {
  const rel = dirPath.substring(REPO_ROOT.length + 1) || '.';
  let cmd: string;
  
  if (scope === 'staged') {
    cmd = `git diff --cached --patch -- ${rel}`;
  } else if (scope === 'head') {
    cmd = `git diff HEAD~1..HEAD --patch -- ${rel}`;
  } else {
    cmd = `git diff origin/main...HEAD --patch -- ${rel}`;
  }
  
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: REPO_ROOT });
  } catch {
    return '';
  }
}

function gitMeta() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    let url = process.env.GIT_REMOTE_HTTP || '';
    if (!url) {
      try {
        url = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
      } catch {
        url = '';
      }
    }
    return { branch, sha, remote: url };
  } catch {
    return { branch: 'unknown', sha: 'unknown', remote: '' };
  }
}

function main() {
  // Read payload from detect_changes.ts
  const input = readFileSync(0, 'utf-8'); // Read from stdin
  const payload = JSON.parse(input);
  
  const outDir = join(REPO_ROOT, '.intent/.proposed-intent');
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  
  const meta = gitMeta();
  
  for (const docRel of payload.affected_docs) {
    const docAbs = join(REPO_ROOT, docRel);
    if (!existsSync(docAbs)) {
      console.error(`Warning: ${docRel} does not exist, skipping`);
      continue;
    }
    
    const dirAbs = dirForDoc(docRel);
    const diff = diffForDir(dirAbs, payload.scope);
    
    // Skip if no actual diff for this directory
    if (!diff.trim()) {
      continue;
    }
    
    const guide = readFileSync(docAbs, 'utf-8');
    
    const bundle = {
      doc_path: docRel,
      dir_path: dirAbs.substring(REPO_ROOT.length + 1) || '.',
      scope: payload.scope,
      diff,
      current_guide: guide,
      changed_files: payload.changed_files,
      git: meta,
    };
    
    // Sanitize path for filename (replace / with __)
    const outFile = join(outDir, docRel.replace(/\//g, '__') + '.context.json');
    writeFileSync(outFile, JSON.stringify(bundle, null, 2), 'utf-8');
    
    // Output path for next stage
    console.log(outFile);
  }
}

main();


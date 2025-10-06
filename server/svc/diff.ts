/**
 * Diff Service
 * Returns git diff for a specific guide file
 */

import { execSync } from 'child_process';

export async function diffGuide(path: string): Promise<string> {
  try {
    const workingDir = process.env.USER_CWD || process.cwd();
    const diff = execSync(`git --no-pager diff --unified=3 -- "${path}"`, {
      cwd: workingDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    });
    return diff.trim();
  } catch {
    // No diff (file unchanged or doesn't exist)
    return '';
  }
}


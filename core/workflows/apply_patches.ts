#!/usr/bin/env bun
/**
 * Apply Patches Workflow
 * 
 * Applies .patch files to the repository
 */

import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export function applyPatches(patchesDir: string) {
  const patches = readdirSync(patchesDir)
    .filter(f => f.endsWith('.patch'))
    .map(f => join(patchesDir, f));
  
  if (patches.length === 0) {
    console.log('⚠️  No patches to apply');
    return;
  }
  
  console.log(`\n📦 Applying ${patches.length} patch(es)...\n`);
  
  let appliedCount = 0;
  let failedCount = 0;
  
  patches.forEach((patchFile, index) => {
    const patchName = patchFile.split('/').pop();
    
    try {
      // Try to apply the patch
      execSync(`git apply --index "${patchFile}"`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      
      console.log(`  ✓ [${index + 1}/${patches.length}] Applied: ${patchName}`);
      appliedCount++;
    } catch (error: any) {
      console.error(`  ✗ [${index + 1}/${patches.length}] Failed: ${patchName}`);
      console.error(`     ${error.message}`);
      failedCount++;
    }
  });
  
  console.log(`\n✅ Applied ${appliedCount} patch(es)`);
  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} patch(es) failed to apply`);
    console.log('\nTip: Re-run "intent update" to regenerate failed patches');
  }
}

// CLI entry point
if (import.meta.main) {
  const workingDir = process.env.USER_CWD || process.cwd();
  const patchesDir = process.argv[2] || join(workingDir, '.intent/.proposed-intent');
  
  if (!existsSync(patchesDir)) {
    console.error('❌ Directory not found:', patchesDir);
    process.exit(1);
  }
  
  try {
    applyPatches(patchesDir);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}


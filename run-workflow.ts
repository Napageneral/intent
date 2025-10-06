#!/usr/bin/env bun
/**
 * Temporary script to run the intent workflow programmatically
 */
import { runWorkflow } from './server/svc/workflow';
import { commitIntent } from './server/svc/intent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔄 Running intent workflow...\n');
  
  try {
    // Step 1: Run workflow to generate ADR and commit message
    console.log('1️⃣ Analyzing changes and generating documentation...\n');
    
    let result: any = null;
    
    for await (const event of runWorkflow()) {
      if (event.type === 'status') {
        console.log(`   ${event.message}`);
      } else if (event.type === 'queue') {
        // Skip queue updates for now
      } else if (event.type === 'complete') {
        result = event.result;
      } else if (event.type === 'error') {
        console.error('❌ Error:', event.message);
        process.exit(1);
      }
    }
    
    if (!result) {
      console.error('❌ No result from workflow');
      process.exit(1);
    }
    
    console.log('\n✅ Documentation generated!');
    console.log('   Guides analyzed:', result.guideDiffs.length);
    console.log('   ADR length:', result.adr.length, 'bytes');
    console.log('   Commit message preview:', result.commitMessage.split('\n')[0]);
    
    // Step 2: Save ADR to file
    const adrMatch = result.adr.match(/# ADR-(\d{3}): (.+)/);
    if (adrMatch) {
      const adrNumber = adrMatch[1];
      const adrTitle = adrMatch[2].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const adrPath = join(process.cwd(), '.intent', 'decisions', `${adrNumber}-${adrTitle}.md`);
      
      console.log(`\n2️⃣ Saving ADR to ${adrPath}...`);
      writeFileSync(adrPath, result.adr, 'utf-8');
      console.log('✅ ADR saved!');
    }
    
    // Step 3: Commit everything
    console.log('\n3️⃣ Committing changes...');
    const commitResult = await commitIntent(result.commitMessage, result.adr);
    
    if (!commitResult.success) {
      console.error('❌ Commit failed:', commitResult.error);
      process.exit(1);
    }
    
    console.log('✅ Changes committed successfully!');
    console.log('\n🎉 Workflow complete!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


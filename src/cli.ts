#!/usr/bin/env node
/**
 * Intent CLI - Engineering Guide & ADR Automation
 * 
 * A user-installed tool for maintaining agents.md and decision records
 * across any codebase in any language.
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

const VERSION = '0.1.0';

const command = process.argv[2];
const args = process.argv.slice(3);

// Helper to run core scripts
function runCore(script: string, args: string[] = []) {
  const corePath = join(__dirname, '../core', script);
  return new Promise((resolve, reject) => {
    const proc = spawn('bun', ['run', corePath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    
    proc.on('close', (code) => {
      if (code === 0) resolve(code);
      else reject(new Error(`Script ${script} exited with code ${code}`));
    });
  });
}

// Initialize .intent/ directory in current project
function initProject() {
  const intentDir = join(process.cwd(), '.intent');
  const decisionsDir = join(intentDir, 'decisions');
  
  if (existsSync(intentDir)) {
    console.log('✓ .intent/ already exists');
    return;
  }
  
  console.log('🚀 Initializing Intent in this project...\n');
  
  // Create directories
  mkdirSync(intentDir);
  mkdirSync(decisionsDir);
  
  // Copy ADR templates
  const templates = ['adr-readme.md', 'adr-template.md'];
  templates.forEach(template => {
    const src = join(__dirname, '../templates', template);
    const dest = join(decisionsDir, template.replace('adr-', '').toUpperCase());
    
    if (existsSync(src)) {
      const content = readFileSync(src, 'utf-8');
      writeFileSync(dest, content);
    }
  });
  
  // Create config
  const config = {
    projectName: process.cwd().split('/').pop(),
    adrDirectory: '.intent/decisions',
    agentsFiles: ['agents.md', 'CLAUDE.md'],
    autoGenerateADRs: false,
    llm: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022'
    }
  };
  
  writeFileSync(
    join(intentDir, 'config.json'),
    JSON.stringify(config, null, 2)
  );
  
  // Create .gitignore entry
  const gitignorePath = join(process.cwd(), '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.proposed-intent/')) {
      writeFileSync(
        gitignorePath,
        gitignore + '\n# Intent working files\n.proposed-intent/\n'
      );
    }
  }
  
  console.log('✅ Created .intent/');
  console.log('  ├── config.json          # Project settings');
  console.log('  └── decisions/');
  console.log('      ├── README.md        # ADR documentation');
  console.log('      └── TEMPLATE.md      # Copy this for new ADRs\n');
  console.log('Next steps:');
  console.log('  1. Make code changes');
  console.log('  2. git add <files>');
  console.log('  3. intent update         # Generate agents.md updates');
  console.log('  4. Review and commit\n');
}

// Update guides (and optionally ADRs)
async function update() {
  console.log('🔍 Detecting changes...\n');
  
  const scope = args[0] || 'staged';
  
  try {
    // Run the core workflow
    await runCore('run.ts', [scope]);
    
    console.log('\n✅ Done! Check .proposed-intent/ for generated prompts.');
    console.log('   Open them in Cursor to review and apply changes.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  console.log(`
Intent v${VERSION} - Engineering Guide & ADR Automation

USAGE
  intent <command> [options]

COMMANDS
  init                Initialize Intent in current project
  update [scope]      Update guides for changed files
    scope: staged (default) | head | pr

  help                Show this message
  version             Show version

EXAMPLES
  # Initialize in new project
  intent init

  # Update guides for staged changes
  git add .
  intent update

  # Update guides for last commit
  intent update head

  # Update guides for PR (against origin/main)
  intent update pr

CONFIGURATION
  Edit .intent/config.json to customize:
  - ADR directory location
  - Guide file names (agents.md, CLAUDE.md, etc.)
  - LLM model and provider

LEARN MORE
  https://github.com/tylerhoecker/intent
`);
}

// Main
async function main() {
  switch (command) {
    case 'init':
      initProject();
      break;
    
    case 'update':
      await update();
      break;
    
    case 'version':
      console.log(`v${VERSION}`);
      break;
    
    case 'help':
    case undefined:
      showHelp();
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "intent help" for usage.');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


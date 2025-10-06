#!/usr/bin/env node
/**
 * Intent CLI - Engineering Guide & ADR Automation
 * 
 * A user-installed tool for maintaining agents.md and decision records
 * across any codebase in any language.
 */

import { spawn, execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

const VERSION = '0.1.0';

const command = process.argv[2];
const args = process.argv.slice(3);

// Helper to run core scripts
function runCore(script: string, scriptArgs: string[] = []) {
  const intentToolRoot = join(__dirname, '..');
  const corePath = join(intentToolRoot, 'core', script);
  const userCwd = process.cwd();
  // Load project config to propagate API keys if present
  let projectAnthropicKey: string | undefined;
  try {
    const cfgPath = join(userCwd, '.intent', 'config.json');
    if (existsSync(cfgPath)) {
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
      projectAnthropicKey = cfg.llm?.apiKey || cfg.ANTHROPIC_API_KEY;
    }
  } catch {}
  
  return new Promise((resolve, reject) => {
    // Run from intent-tool directory so modules resolve correctly
    // Pass user's cwd as environment variable for scripts that need it
    const envVars: NodeJS.ProcessEnv = {
      ...process.env,
      USER_CWD: userCwd,
    };
    if (process.env.ANTHROPIC_API_KEY) {
      envVars.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    } else if (projectAnthropicKey) {
      envVars.ANTHROPIC_API_KEY = projectAnthropicKey;
    } else {
      // As a last resort, try to read from user's login shell without persisting
      try {
        const shellKey = execSync('/bin/zsh -lic "printenv ANTHROPIC_API_KEY"', {
          encoding: 'utf-8'
        }).trim();
        if (shellKey) {
          envVars.ANTHROPIC_API_KEY = shellKey;
        }
      } catch {}
    }

    const proc = spawn('bun', ['run', corePath, ...scriptArgs], {
      stdio: 'inherit',
      cwd: intentToolRoot, // Run from intent-tool directory
      env: envVars
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
  
  // Copy ADR guide/template
  const templateSrc = join(__dirname, '../templates/decisions-agents.md');
  const templateDest = join(decisionsDir, 'agents.md');
  
  if (existsSync(templateSrc)) {
    const content = readFileSync(templateSrc, 'utf-8');
    writeFileSync(templateDest, content);
  }
  
  // Create config
  const config = {
    projectName: process.cwd().split('/').pop(),
    adrDirectory: '.intent/decisions',
    agentsFiles: ['agents.md', 'CLAUDE.md'],
    autoGenerateADRs: false,
    llm: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5'
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
  console.log('      └── agents.md        # ADR guide + template + index\n');
  console.log('Next steps:');
  console.log('  1. Make code changes');
  console.log('  2. git add <files>');
  console.log('  3. intent update         # Generate agents.md updates');
  console.log('  4. Review and commit\n');
}

// Update guides (and optionally ADRs)
async function update() {
  console.log('🔍 Detecting changes...\n');
  
  const scope = args.find(a => ['staged', 'head', 'pr'].includes(a)) || 'staged';
  const autoApply = args.includes('--auto');
  const skipApply = args.includes('--skip-apply');
  
  try {
    // Step 1: Generate prompts
    await runCore('run.ts', [scope]);
    
    if (!autoApply) {
      console.log('\n✅ Done! Check .proposed-intent/ for generated prompts.');
      console.log('   Open them in Cursor to review and apply changes.');
      console.log('\n   Or run with --auto to generate and apply patches automatically:');
      console.log('   intent update --auto');
      return;
    }
    
    // Step 2: Let Claude Code update files directly (no patches!)
    const promptsDir = join(process.cwd(), '.proposed-intent');
    const configPath = join(process.cwd(), '.intent/config.json');
    
    let model = 'claude-sonnet-4-5';
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        model = config.llm?.model || model;
      } catch {}
    }
    
    console.log('\n🤖 Updating guides with Claude Code...\n');
    await runCore('workflows/process_prompts.ts', [promptsDir, model]);
    
    console.log('\n🎉 All done! Your guides have been updated.');
    console.log('   Review changes: git diff');
    console.log('   Commit: git commit -m "docs: update guides"');
    
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
    --auto              Let Claude Code update files automatically

  help                Show this message
  version             Show version

EXAMPLES
  # Initialize in new project
  intent init

  # Generate prompts only (manual review in Cursor)
  git add .
  intent update

  # Let Claude Code update files automatically
  git add .
  intent update --auto

  # Update for last commit
  intent update head --auto

  # Update for PR (against origin/main)
  intent update pr --auto

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


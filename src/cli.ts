#!/usr/bin/env bun
/**
 * Intent CLI - Engineering Guide & ADR Automation
 * 
 * A user-installed tool for maintaining agents.md and decision records
 * across any codebase in any language.
 * 
 * Requires: Bun (https://bun.sh)
 */

import { spawn, execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

const VERSION = '0.1.0';

const command = process.argv[2];
const args = process.argv.slice(3);

// Helper to run core scripts
function runCore(script: string, scriptArgs: string[] = []) {
  // Check Bun is available
  try {
    execSync('bun --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Bun is required to run Intent. Install from https://bun.sh');
    process.exit(1);
  }

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
    
    // Set INTENT_SCOPE from first script arg if it's a valid scope
    const scopeArg = scriptArgs[0];
    if (scopeArg === 'pr') {
      envVars.INTENT_SCOPE = 'against_origin_main';
    } else if (scopeArg === 'staged' || scopeArg === 'head') {
      envVars.INTENT_SCOPE = scopeArg;
    }
    
    // Propagate API key
    if (process.env.ANTHROPIC_API_KEY) {
      envVars.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    } else if (projectAnthropicKey) {
      envVars.ANTHROPIC_API_KEY = projectAnthropicKey;
    } else {
      // As a last resort, try to read from user's login shell
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
  const stateDir = join(intentDir, 'state');
  const runsDir = join(intentDir, 'runs');
  const questionsDir = join(intentDir, 'questions');
  const draftsDir = join(intentDir, 'drafts');
  
  if (existsSync(intentDir)) {
    console.log('✓ .intent/ already exists');
    return;
  }
  
  console.log('🚀 Initializing Intent in this project...\n');
  
  // Create directory structure
  mkdirSync(intentDir);
  mkdirSync(decisionsDir);
  mkdirSync(stateDir);
  mkdirSync(runsDir);
  mkdirSync(questionsDir);
  mkdirSync(draftsDir);
  
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
  console.log('  ├── decisions/           # ADRs');
  console.log('  │   └── agents.md        # ADR guide + template');
  console.log('  ├── state/               # Layer summaries');
  console.log('  ├── runs/                # Run manifests');
  console.log('  ├── questions/           # Onboarding question packs');
  console.log('  └── drafts/              # Draft guides\n');
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
  const layered = args.includes('layered') || args.includes('--layered');
  
  try {
    // Use layered workflow if requested (bottom-up, layer-by-layer)
    if (layered && autoApply) {
      await runCore('workflows/update_layered.ts', [scope]);
      return;
    }
    
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

// Onboard command - scan and generate question packs
async function onboard() {
  const { scanProject, generateQuestionPack } = await import('../svc/onboard');
  const { insertQuestionPack, insertCoverageCandidate } = await import('../store/db');
  const { writeFileSync, mkdirSync, existsSync } = await import('fs');
  const { join } = await import('path');
  
  console.log('🔍 Scanning project for guide candidates...\n');
  
  const projectRoot = process.cwd();
  const summary = scanProject(projectRoot, 4);
  
  console.log(`📊 Coverage Summary:`);
  console.log(`  Total candidate directories: ${summary.total_dirs}`);
  console.log(`  Strong candidates (score > 0.4): ${summary.candidates.length}`);
  console.log(`  Existing guides: ${summary.existing_guides.length}`);
  console.log(`  Coverage: ${summary.coverage_percent}%\n`);
  
  // Save coverage summary
  const intentDir = join(projectRoot, '.intent');
  const coveragePath = join(intentDir, 'coverage.json');
  writeFileSync(coveragePath, JSON.stringify(summary, null, 2));
  console.log(`✅ Saved coverage report: ${coveragePath}\n`);
  
  // Store candidates in database
  for (const candidate of summary.candidates) {
    try {
      insertCoverageCandidate({
        path: candidate.path,
        score: candidate.score,
        reason_tags: JSON.stringify(candidate.reasons),
        has_guide: candidate.has_guide ? 1 : 0,
        status: candidate.has_guide ? 'applied' : 'pending',
      });
    } catch {}
  }
  
  // Generate question packs for candidates without guides
  const needsGuides = summary.candidates.filter(c => !c.has_guide);
  
  if (needsGuides.length === 0) {
    console.log('✨ All strong candidates already have guides!');
    return;
  }
  
  console.log(`📝 Generating question packs for ${needsGuides.length} candidate(s)...\n`);
  
  const questionsDir = join(intentDir, 'questions');
  if (!existsSync(questionsDir)) {
    mkdirSync(questionsDir, { recursive: true });
  }
  
  for (const candidate of needsGuides) {
    const questionPack = generateQuestionPack(candidate, projectRoot);
    const fileName = `${candidate.path.replace(/\//g, '__')}.md`;
    const filePath = join(questionsDir, fileName);
    
    writeFileSync(filePath, questionPack);
    console.log(`  ✓ ${candidate.path} (score: ${candidate.score.toFixed(2)})`);
    
    // Store in database
    try {
      insertQuestionPack({
        guide_path: candidate.path,
        status: 'draft',
        content_md: questionPack,
      });
    } catch {}
  }
  
  console.log(`\n✅ Generated ${needsGuides.length} question pack(s) in .intent/questions/\n`);
  console.log('Next steps:');
  console.log('  1. Review and answer questions in .intent/questions/*.md');
  console.log('  2. Run: intent synthesize');
  console.log('  3. Review generated draft guides in .intent/drafts/');
  console.log('  4. Move drafts to target directories and commit\n');
}

// Synthesize drafts from answered question packs
async function synthesize() {
  const { parseQuestionPackAnswers, buildSynthesisPrompt } = await import('../svc/onboard');
  const { updateGuideFile } = await import('../core/llm/client');
  const { updateQuestionPack, getQuestionPacksByStatus } = await import('../store/db');
  
  type LLMConfig = { model: string; provider: string; apiKey?: string; workingDirectory?: string };
  const { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } = await import('fs');
  const { join, dirname } = await import('path');
  
  console.log('🔍 Finding answered question packs...\n');
  
  const projectRoot = process.cwd();
  const intentDir = join(projectRoot, '.intent');
  const questionsDir = join(intentDir, 'questions');
  const draftsDir = join(intentDir, 'drafts');
  
  if (!existsSync(questionsDir)) {
    console.error('❌ No .intent/questions/ directory found. Run "intent onboard" first.');
    return;
  }
  
  // Find answered question packs (look for "→" with non-empty answers)
  const questionFiles = readdirSync(questionsDir).filter(f => f.endsWith('.md'));
  const answered: Array<{ file: string; answers: any }> = [];
  
  for (const file of questionFiles) {
    const content = readFileSync(join(questionsDir, file), 'utf-8');
    const parsed = parseQuestionPackAnswers(content);
    
    if (parsed && parsed.intent && parsed.intent.length > 5) { // At least some answer
      answered.push({ file, answers: parsed });
    }
  }
  
  if (answered.length === 0) {
    console.log('⚠️  No answered question packs found.');
    console.log('   Edit files in .intent/questions/ and add answers after "→" markers.\n');
    return;
  }
  
  console.log(`📝 Found ${answered.length} answered question pack(s)\n`);
  console.log('🤖 Synthesizing draft guides with Claude...\n');
  
  if (!existsSync(draftsDir)) {
    mkdirSync(draftsDir, { recursive: true });
  }
  
  // Read config for model
  const configPath = join(intentDir, 'config.json');
  let model = 'claude-sonnet-4-5';
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    model = config.llm?.model || model;
  } catch {}
  
  const llmConfig: LLMConfig = {
    model,
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    workingDirectory: projectRoot
  };
  
  if (!llmConfig.apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set. Export it or add to .intent/config.json');
    return;
  }
  
  // Generate drafts (parallel!)
  for (let i = 0; i < answered.length; i++) {
    const { file, answers } = answered[i];
    console.log(`  [${i + 1}/${answered.length}] Synthesizing guide for ${answers.path}...`);
    
    const prompt = buildSynthesisPrompt(answers);
    const draftPath = join(draftsDir, `${answers.path.replace(/\//g, '__')}.md`);
    
    try {
      // Use Claude Code to generate the draft
      const result = await updateGuideFile(draftPath, prompt, llmConfig);
      
      if (result.success) {
        console.log(`  ✓ [${i + 1}/${answered.length}] Draft created: ${draftPath}`);
        
        // Update question pack status in DB
        try {
          const qpId = parseInt(file.split('__')[0]) || 0;
          if (qpId > 0) {
            const draft = readFileSync(draftPath, 'utf-8');
            updateQuestionPack(qpId, {
              status: 'synthesized',
              synthesized_draft: draft
            });
          }
        } catch {}
      } else {
        console.error(`  ✗ [${i + 1}/${answered.length}] Failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error(`  ✗ [${i + 1}/${answered.length}] Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Generated ${answered.length} draft guide(s) in .intent/drafts/\n`);
  console.log('Next steps:');
  console.log('  1. Review drafts in .intent/drafts/');
  console.log('  2. Move accepted drafts to target directories:');
  console.log('     mv .intent/drafts/app__backend__db.md app/backend/db/agents.md');
  console.log('  3. git add and commit\n');
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
    --layered           Use bottom-up layer-by-layer workflow (recommended)
  
  onboard             Scan project and generate question packs for missing guides
  synthesize          Generate draft guides from answered question packs
  serve               Start local HTTP server for GUI

  help                Show this message
  version             Show version

EXAMPLES
  # Smart start (no args) - opens GUI, detects changes
  intent

  # Initialize in new project
  intent init

  # Onboard a new/legacy codebase
  intent onboard
  # Generates question packs in .intent/questions/
  # Answer questions, then synthesize draft guides

  # Generate prompts only (manual review in Cursor)
  git add .
  intent update

  # Let Claude Code update files automatically
  git add .
  intent update --auto --layered

  # Start server in foreground
  intent serve

CONFIGURATION
  Edit .intent/config.json to customize:
  - ADR directory location
  - Guide file names (agents.md, CLAUDE.md, etc.)
  - LLM model and provider

LEARN MORE
  https://github.com/tylerhoecker/intent
`);
}

// Smart default: no args → start server and open browser
async function smartStart() {
  const { spawn, execSync } = await import('child_process');
  
  // Check for unstaged changes and warn user
  try {
    const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' }).trim();
    const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8' }).trim();
    
    const unstagedFiles = unstaged.split('\n').filter(Boolean);
    const untrackedFiles = untracked.split('\n').filter(Boolean);
    const totalUnstaged = unstagedFiles.length + untrackedFiles.length;
    
    if (totalUnstaged > 0) {
      console.log('\n⚠️  \x1b[33mWarning:\x1b[0m Unstaged changes detected\n');
      console.log(`   ${totalUnstaged} file(s) are not staged for commit`);
      console.log('   Intent works best with staged changes for better context\n');
      
      if (unstagedFiles.length > 0) {
        console.log(`   \x1b[33mModified:\x1b[0m ${unstagedFiles.length} file(s)`);
      }
      if (untrackedFiles.length > 0) {
        console.log(`   \x1b[32mUntracked:\x1b[0m ${untrackedFiles.length} file(s)`);
      }
      
      console.log('\n   \x1b[36mTip:\x1b[0m Stage changes with: \x1b[1mgit add .\x1b[0m');
      console.log('   Then run \x1b[1mintent\x1b[0m again for optimal results\n');
    }
  } catch {
    // Not in a git repo or git not available, continue silently
  }
  
  // Check if server is already running
  let serverRunning = false;
  try {
    const res = await fetch('http://localhost:5174/api/health');
    serverRunning = res.ok;
  } catch {}
  
  if (!serverRunning) {
    console.log('🚀 Starting Intent server...\n');
    const serverPath = join(__dirname, '../server/index.ts');
    const serverProc = spawn('bun', ['run', serverPath], {
      stdio: 'ignore',
      detached: true,
      cwd: join(__dirname, '..'),
      env: {
        ...process.env,
        USER_CWD: process.cwd()
      }
    });
    serverProc.unref(); // Detach so CLI can exit but server keeps running
    
    // Wait for server to actually start
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const res = await fetch('http://localhost:5174/api/health');
        if (res.ok) break;
      } catch {}
      attempts++;
    }
    
    if (attempts >= 20) {
      console.error('⚠️  Server may not have started. Try: intent serve');
    }
  }
  
  // Open browser
  const url = 'http://localhost:5174';
  console.log(`✨ Opening Intent at ${url}\n`);
  
  try {
    // macOS
    execSync(`open ${url}`, { stdio: 'ignore' });
  } catch {
    console.log(`   Open your browser to: ${url}`);
  }
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
    
    case 'onboard':
      await onboard();
      break;
    
    case 'synthesize':
      await synthesize();
      break;
    
    case 'serve':
      // Start the HTTP server in foreground
      const { spawn } = await import('child_process');
      const serverPath = join(__dirname, '../server/index.ts');
      console.log('🚀 Starting Intent server...\n');
      spawn('bun', ['run', serverPath], {
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
        env: {
          ...process.env,
          USER_CWD: process.cwd()
        }
      });
      break;
    
    case 'version':
      console.log(`v${VERSION}`);
      break;
    
    case 'help':
      showHelp();
      break;
    
    case undefined:
      // No command → smart start (server + browser)
      await smartStart();
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


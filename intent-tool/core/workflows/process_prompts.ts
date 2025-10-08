#!/usr/bin/env bun
/**
 * Process Prompts Workflow
 * 
 * Uses Claude Code to directly edit agents.md files (no patches!)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { updateGuidesParallel, type LLMConfig } from '../llm/client';

interface ProcessOptions {
  promptsDir: string;
  model: string;
}

export async function processPrompts(options: ProcessOptions) {
  const { promptsDir, model } = options;
  const workingDir = process.env.USER_CWD || process.cwd();
  const intentDir = join(workingDir, '.intent');
  const configPath = join(intentDir, 'config.json');
  const secretsPath = join(intentDir, 'secrets.local.json');
  
  // Resolve API key with precedence: ENV > secrets.local.json > config.json
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      let apiKeyFromFile: string | undefined;
      if (existsSync(secretsPath)) {
        try {
          const secrets = JSON.parse(readFileSync(secretsPath, 'utf-8'));
          apiKeyFromFile = secrets.anthropicApiKey || secrets.ANTHROPIC_API_KEY;
        } catch {}
      }
      if (!apiKeyFromFile && existsSync(configPath)) {
        try {
          const cfg = JSON.parse(readFileSync(configPath, 'utf-8'));
          apiKeyFromFile = cfg.llm?.apiKey || cfg.ANTHROPIC_API_KEY;
        } catch {}
      }
      if (apiKeyFromFile) {
        process.env.ANTHROPIC_API_KEY = apiKeyFromFile;
      }
    }
  } catch {}
  
  // Find all .prompt.md files (but skip .context.prompt.md - those are old format)
  const files = readdirSync(promptsDir)
    .filter(f => f.endsWith('.prompt.md') && !f.includes('.context.'));
  
  if (files.length === 0) {
    console.log('⚠️  No prompts found in', promptsDir);
    return [];
  }
  
  console.log(`📝 Found ${files.length} prompt(s) to process\n`);
  
  // Map prompts to actual file paths
  const tasks = files.map(filename => {
    const fullPath = join(promptsDir, filename);
    const content = readFileSync(fullPath, 'utf-8');
    const stem = basename(filename, '.prompt.md');
    
    // Convert stem back to RELATIVE file path (e.g., app__frontend__agents.md -> app/frontend/agents.md)
    // Claude Code SDK might need relative paths from workingDirectory
    const relativePath = stem.replace(/__/g, '/');
    
    return {
      filePath: relativePath,
      prompt: content
    };
  });
  
  // Get LLM config
  const config: LLMConfig = {
    model,
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    workingDirectory: workingDir
  };
  
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }
  
  // Let Claude Code agents update files directly (in parallel!)
  const results = await updateGuidesParallel(tasks, config);
  
  return results;
}

// CLI entry point
if (import.meta.main) {
  const workingDir = process.env.USER_CWD || process.cwd();
  const promptsDir = process.argv[2] || join(workingDir, '.intent/.proposed-intent');
  const model = process.argv[3] || 'claude-sonnet-4-5';
  
  processPrompts({ promptsDir, model })
    .then((results) => {
      const updatedCount = results.filter(r => r.success && r.changes).length;
      const failedCount = results.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        console.log('\n⚠️  Some guides failed to update. Check errors above.');
        process.exit(1);
      }
      
      console.log('\n🎉 All guides updated successfully!');
      console.log('Review changes: git diff');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}


/**
 * Claude Code LLM Client
 * 
 * Direct file editing using Claude Code's agentic capabilities
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

export interface LLMConfig {
  model: string;
  provider: string;
  apiKey?: string;
  workingDirectory?: string;
}

/**
 * Update a single agents.md file using Claude Code's direct editing
 * Claude Code can read and write files directly - no patch generation needed!
 */
export async function updateGuideFile(
  filePath: string,
  prompt: string,
  config: LLMConfig
): Promise<{ success: boolean; changes: boolean; error?: string }> {
  let errorDetails = '';
  let hadChanges = false;
  
  // Map model names to Claude Code format
  let modelName = config.model;
  if (modelName.includes('sonnet')) {
    modelName = 'claude-sonnet-4-5-20250929';
  }
  
  try {
    // Let Claude Code agent read and edit the file directly
    for await (const message of query({
      prompt: `${prompt}

## YOUR TASK

You MUST read the guide file at: ${filePath}

Then UPDATE IT based on the DIFF above. The diff shows code changes that make parts of the guide inaccurate or incomplete.

Requirements:
1. Use read_file to load ${filePath}
2. Identify sections that reference changed code
3. Use edit_file or write_file to update those sections
4. Keep edits minimal and targeted

If the guide is already 100% accurate (rare), you may skip editing. Otherwise, you MUST edit the file.`,
      options: {
        model: modelName,
        maxTurns: 20, // Allow enough turns for read -> think -> write workflow
        settingSources: ['user', 'project', 'local'],
        systemPrompt: `You are a documentation maintenance agent. 

CRITICAL: You MUST use read_file and edit_file tools to update documentation.

Process:
1. read_file: Load the guide file
2. Analyze: Compare guide content against the code diff
3. edit_file: Update outdated/inaccurate sections
4. Confirm: The file has been updated

Do NOT just describe changes - you must actually edit the file using tools.`,
        stderr: (data: string) => {
          errorDetails += data;
        }
      }
    })) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          const result = message.result?.toLowerCase() || '';
          if (result.includes('no-changes') || result.includes('no changes')) {
            return { success: true, changes: false };
          }
          return { success: true, changes: hadChanges };
        } else if (message.subtype === 'error_during_execution' || message.subtype === 'error_max_turns') {
          throw new Error(`${message.subtype}${errorDetails ? ': ' + errorDetails : ''}`);
        }
      } else if (message.type === 'assistant') {
        const content = message.message.content;
        if (Array.isArray(content)) {
          content.forEach(block => {
            if (block.type === 'text') {
              const text = block.text.toLowerCase();
              if (text.includes('no-changes') || text.includes('no changes')) {
                hadChanges = false;
              }
            }
          });
        }
      }
    }
    
    return { success: true, changes: hadChanges };
  } catch (error: any) {
    const fullError = error.message + (errorDetails ? '\n' + errorDetails : '');
    return { success: false, changes: false, error: fullError };
  }
}

/**
 * Update multiple guide files in parallel using Claude Code
 * Each agent reads, analyzes, and edits its assigned file directly
 */
export async function updateGuidesParallel(
  tasks: Array<{ filePath: string; prompt: string }>,
  config: LLMConfig
): Promise<Array<{ filePath: string; success: boolean; changes: boolean; error?: string }>> {
  console.log(`🔄 Updating ${tasks.length} guide(s) in parallel...`);
  
  const startTime = Date.now();
  
  // Fire all Claude Code agents in parallel
  const results = await Promise.all(
    tasks.map(async ({ filePath, prompt }, index) => {
      console.log(`  [${index + 1}/${tasks.length}] Updating ${filePath}...`);
      
      try {
        const result = await updateGuideFile(filePath, prompt, config);
        
        if (result.success && result.changes) {
          console.log(`  ✓ [${index + 1}/${tasks.length}] Updated ${filePath}`);
        } else if (result.success && !result.changes) {
          console.log(`  ℹ️  [${index + 1}/${tasks.length}] No changes needed for ${filePath}`);
        } else {
          console.error(`  ✗ [${index + 1}/${tasks.length}] Failed: ${result.error}`);
        }
        
        return { filePath, ...result };
      } catch (error: any) {
        console.error(`  ✗ [${index + 1}/${tasks.length}] Failed: ${error.message}`);
        return { filePath, success: false, changes: false, error: error.message };
      }
    })
  );
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const updatedCount = results.filter(r => r.success && r.changes).length;
  const noChangeCount = results.filter(r => r.success && !r.changes).length;
  const failedCount = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Updated ${updatedCount} guide(s) in ${duration}s`);
  if (noChangeCount > 0) {
    console.log(`ℹ️  ${noChangeCount} guide(s) needed no changes`);
  }
  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} guide(s) failed to update`);
  }
  
  return results;
}

/**
 * Generate and save an ADR document using Claude Code
 * Agent will create the file directly in the decisions/ directory
 */
export async function generateAndSaveADR(
  adrPath: string,
  context: {
    diff: string;
    chatLog?: string;
    previousADRs: string[];
    agentsUpdates: string;
  },
  config: LLMConfig
): Promise<{ success: boolean; error?: string }> {
  const previousADRContext = context.previousADRs.length > 0
    ? `## Recent ADRs (for context)\n\n${context.previousADRs.slice(-3).join('\n\n---\n\n')}`
    : '';
  
  const chatLogContext = context.chatLog 
    ? `## Development Conversation\n\n${context.chatLog}\n\n`
    : '';
  
  const prompt = `You are generating an Architecture Decision Record (ADR).

${chatLogContext}${previousADRContext}

## Changes Made (Git Diff)
\`\`\`diff
${context.diff}
\`\`\`

## Documentation Updates
${context.agentsUpdates}

## Task

Create a new ADR file at: ${adrPath}

The ADR should follow this structure:

# ADR-NNN: [Title]

**Status:** Accepted
**Date:** ${new Date().toISOString().split('T')[0]}
**Commits:** (Pending)

## Context
[Why was this change needed?]

## Decision  
[What did we decide to do?]

### Changes Made
[Bullet list of specific changes]

## Consequences

### Positive
✅ [Benefits]

### Negative
❌ [Trade-offs]

### Neutral
ℹ️ [Things to monitor]

## Alternatives Considered
[What else was evaluated and why rejected?]

## Implementation Notes
[Key files, patterns]

## Related Decisions
[Links to other ADRs]

## Notes
[Philosophy, rationale]

Write the file and confirm completion.`;

  let modelName = config.model;
  if (modelName.includes('sonnet')) {
    modelName = 'claude-sonnet-4-5-20250929';
  }

  let errorDetails = '';
  
  try {
    for await (const message of query({
      prompt,
      options: {
        model: modelName,
        maxTurns: 20,
        settingSources: ['user', 'project', 'local'],
        systemPrompt: 'You are a technical writer generating and saving Architecture Decision Records.',
        stderr: (data: string) => {
          errorDetails += data;
        }
      }
    })) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          return { success: true };
        } else {
          throw new Error(`${message.subtype}${errorDetails ? ': ' + errorDetails : ''}`);
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message + (errorDetails ? '\n' + errorDetails : '') };
  }
}


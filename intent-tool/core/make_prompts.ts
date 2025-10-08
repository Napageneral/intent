#!/usr/bin/env bun
/**
 * Generates LLM-ready prompts from context bundles.
 * 
 * For each .context.json file, creates a .prompt.md file containing:
 * - Purpose of Engineering Guides (agents.md)
 * - Directory-scoped diff
 * - Current guide content
 * - Instructions to output unified diff patch or NO-CHANGES
 * 
 * Usage:
 *   bun detect_changes.ts | bun build_context.ts | bun make_prompts.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const HEADER = `You are updating short, high-signal Engineering Guides (agents.md) that help humans and AI agents work safely and effectively in this code area.

# Your job
1) Read the DIFF for this directory and the CURRENT GUIDE (agents.md or CLAUDE.md).
2) Decide what is now inaccurate, missing, or unclear (golden path, inputs/outputs, invariants, signals, pitfalls, links).
3) Produce a **unified diff patch** that modifies the Guide **in place** (context lines + changes).
4) Only include edits justified by the DIFF or obvious clarifications (e.g., renaming a queue/route).
5) If no changes are needed, output: \`NO-CHANGES\`.

# Guide purpose (do not restate this in the document)
- Capture the intent of this area and how it fits the larger system.
- Provide the golden path (minimal steps to do the common task here).
- List success signals: logs/metrics/events/IDs that prove success.
- Call out pitfalls and "don't do this" gotchas.
- Link to related areas (but don't duplicate content).

# What makes a great guide
- **Short and actionable**: Under 500 lines, prefer bullet points
- **Observable**: Reference actual log lines, metric names, event types
- **Opinionated**: Say what NOT to do, not just what to do
- **Linked**: Point to related guides, don't duplicate
- **Living**: Updated with every meaningful code change
`;

function makePrompt(bundle: any, tokenGuard = 80000): string {
  let diff = bundle.diff;
  const guide = bundle.current_guide;
  
  // Trim huge diffs: keep first/last N lines if too large
  // Rough heuristic: 4 chars per token average
  if (diff.length > tokenGuard * 4) {
    const lines = diff.split('\n');
    // Keep first 1500 and last 1500 lines
    diff = [...lines.slice(0, 1500), '\n... (trimmed middle for length) ...\n', ...lines.slice(-1500)].join('\n');
  }
  
  const gitInfo = bundle.git;
  let repoInfo = '';
  if (gitInfo.remote) {
    repoInfo += `Repo: ${gitInfo.remote}  |  `;
  }
  repoInfo += `Branch: ${gitInfo.branch}  |  Commit: ${gitInfo.sha}`;
  
  const patchFmt = `
# Output format
Return ONLY ONE of the following:
- The string \`NO-CHANGES\` (if the guide is still accurate)
- A unified diff that applies to the Guide file at: ${bundle.doc_path}

Example unified diff format:
\`\`\`diff
--- a/${bundle.doc_path}
+++ b/${bundle.doc_path}
@@ -10,7 +10,7 @@
 unchanged line
 unchanged line
-old line to remove
+new line to add
 unchanged line
\`\`\`
`;
  
  return `${HEADER}

${repoInfo}
Directory: ${bundle.dir_path}
Guide path: ${bundle.doc_path}

---

# DIFF (directory-scoped)
\`\`\`diff
${diff}
\`\`\`

---

# CURRENT GUIDE
\`\`\`markdown
${guide}
\`\`\`

---

${patchFmt}

Remember:
- Keep changes surgical and justified by the diff
- Preserve the guide's structure and existing links
- Only update sections that are now inaccurate or need clarification
- If nothing needs changing, output: NO-CHANGES
`;
}

function main() {
  // Read context file paths from stdin
  const input = readFileSync(0, 'utf-8');
  
  for (const ctxPath of input.split('\n')) {
    if (!ctxPath.trim()) continue;
    
    const p = ctxPath.trim();
    if (!existsSync(p)) {
      console.error(`Warning: ${ctxPath} does not exist, skipping`);
      continue;
    }
    
    const bundle = JSON.parse(readFileSync(p, 'utf-8'));
    const prompt = makePrompt(bundle);
    
    const outPath = p.replace('.context.json', '.prompt.md');
    writeFileSync(outPath, prompt, 'utf-8');
    
    // Output path for verification
    console.log(outPath);
  }
}

main();


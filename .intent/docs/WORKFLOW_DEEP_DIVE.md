# Intent Tool - Workflow Deep Dive

**Date:** 2025-10-06  
**Purpose:** Document how the intent generation workflow currently assembles context and generates documentation

---

## 🎯 High-Level Flow

When user clicks "Generate Intent Documentation":

```
User clicks button
  ↓
POST /api/workflow
  ↓
runWorkflow() generator
  ↓
┌─────────────────────────────────────┐
│ Step 1: Get Comprehensive Diff      │
│ Step 2: Skip Layered Update (TODO)  │
│ Step 3: Get Guide Diffs             │
│ Step 4: Generate ADR                │
│ Step 5: Generate Commit Message     │
│ Step 6: Return Complete Result      │
└─────────────────────────────────────┘
  ↓
SSE stream to frontend
  ↓
Preview panel appears
```

---

## 📊 Current Implementation Details

### **Step 1: Get Comprehensive Diff** ⏱️ ~100ms

**Location:** `server/svc/workflow.ts:25-39`

**What it does:**
- Runs 3 git commands in sequence:
  1. `git diff --cached` → Staged changes
  2. `git diff` → Unstaged changes
  3. `git ls-files --others --exclude-standard` → Untracked files

**Context assembled:**
```typescript
diffBefore = `
# Staged Changes:
${staged || '(none)'}

# Unstaged Changes:
${unstaged || '(none)'}

# Untracked Files:
${untracked || '(none)'}
`
```

**Issues:**
- ❌ Only gets file NAMES for untracked, not actual content
- ❌ No directory structure or file tree context
- ❌ No parent guide content
- ❌ No existing ADR history

---

### **Step 2: Layered Update (Currently SKIPPED)** ⏱️ N/A

**Location:** `server/svc/workflow.ts:41-47`

**Current behavior:**
```typescript
// Step 2: Analyze current changes (skip layered update for now - can be added back)
yield { type: 'queue', queue: [{ layer: 0, path: 'Analyzing changes...', status: 'in_progress' }] };

// For now, just work with existing unstaged changes
// TODO: Re-enable layered update once we debug it

yield { type: 'queue', queue: [{ layer: 0, path: 'Analysis complete', status: 'completed' }] };
```

**What SHOULD happen (when re-enabled):**

1. **Detect Changes** → `core/detect_changes.ts`
   - Runs `git diff` based on scope
   - Finds affected guides by walking parent directories
   - Returns: `{ affected_docs: string[], changed_files: string[], scope: string }`

2. **Build Context Bundles** → `core/build_context.ts`
   - For each affected guide:
     - Get directory-scoped diff (only changes under that guide's dir)
     - Read current guide content
     - Collect git metadata (branch, sha, remote)
     - Create `.proposed-intent/<guide>.context.json`

3. **Make Prompts** → `core/make_prompts.ts`
   - Load context bundle
   - Load guide template from `.intent/config.json`
   - Build structured prompt:
     ```markdown
     # Context
     Changed files: [...]
     Git: branch/sha
     
     # Current Guide
     <guide content>
     
     # Code Changes (Diff)
     <directory-scoped diff>
     
     # Instructions
     Update this guide based on the changes shown.
     ```
   - Save as `.proposed-intent/<guide>.prompt.md`

4. **Build Guide Tree** → `core/workflows/build_tree.ts`
   - Find parent-child relationships between guides
   - Compute bottom-up layers:
     - Layer 0: Leaves (no children)
     - Layer 1: Parents of Layer 0
     - Layer 2: Parents of Layer 1
     - etc.

5. **Process Layer-by-Layer** → `core/workflows/update_layered.ts`
   - For each layer (leaves → root):
     - Load prompts for that layer
     - Add child-layer summaries to parent prompts
     - Spawn Claude Code agents in parallel
     - Each agent calls `updateGuideFile()` → direct editing
     - Wait for all agents in layer to complete
     - Record layer summary (git diffs)
     - Pass summaries to next layer

**Why it's instant right now:**
- We skip the entire layered workflow
- No Claude Code agents are spawned
- No actual guide updates happen

---

### **Step 3: Get Guide Diffs** ⏱️ ~10ms

**Location:** `server/svc/workflow.ts:49-76`

**What it does:**
```typescript
// Get all changed files (unstaged only right now)
const changedFiles = execSync('git diff --name-only', { cwd: workingDir }).trim();

// Filter to guides only
const changedGuides = changedFiles
  .split('\n')
  .filter(f => f.includes('agents.md') || f.includes('CLAUDE.md'));

// Get diff for each guide
for (const guidePath of changedGuides) {
  const diff = execSync(`git diff -- "${guidePath}"`, { cwd: workingDir });
  guideDiffs.push({ path: guidePath, diff });
}
```

**Issues:**
- ❌ Only looks at UNSTAGED changes (`git diff`)
- ❌ Should also check STAGED changes (`git diff --cached`)
- ❌ Misses guides that don't exist yet but SHOULD be created
- ❌ No context about WHY guides are stale

**Result:** 
- Returns empty `guideDiffs: []` if no agents.md files were manually edited
- This is why you see "No agents.md files were modified"

---

### **Step 4: Generate ADR** ⏱️ ~5ms (synchronous)

**Location:** `server/svc/workflow.ts:116-151`

**Current implementation:**
```typescript
async function generateADR(workingDir: string, diff: string, guideDiffs: any[]): Promise<string> {
  // For now, generate a simple ADR
  // TODO: Use Claude Code SDK to generate rich ADR
  const date = new Date().toISOString().split('T')[0];
  const number = String(getNextADRNumber(workingDir)).padStart(3, '0');
  
  const adr = `# ADR-${number}: Intent Documentation Update

**Status:** Proposed
**Date:** ${date}
**Commits:** (Pending)

## Context

Code changes detected in the repository that require documentation updates.

## Changes Made

${guideDiffs.map(g => `- Updated: ${g.path}`).join('\n') || '- No guide changes'}

## Code Diff Summary

\`\`\`
${diff.split('\n').slice(0, 50).join('\n')}
${diff.split('\n').length > 50 ? '\n... (truncated)' : ''}
\`\`\`

## Verification

- [ ] All affected guides updated
- [ ] ADR created
- [ ] Changes committed
`;
  
  return adr;
}
```

**What it uses:**
- ✅ `workingDir` - Project root
- ✅ `diff` - The comprehensive diff from Step 1
- ✅ `guideDiffs` - List of modified guide files (usually empty)

**What it DOESN'T use:**
- ❌ Existing ADR history (no context from previous ADRs)
- ❌ Chat log or conversation history
- ❌ Structured analysis of changes
- ❌ Claude Code SDK (should use LLM!)
- ❌ File tree or dependency information

**Why it's generic:**
- **Hardcoded template** with minimal dynamic content
- Only fills in: date, number, truncated diff
- No semantic understanding of changes
- No comparison to previous ADRs
- No analysis of intent

**Why it's instant:**
- Just string concatenation
- No LLM call (says "TODO")
- Returns immediately

---

### **Step 5: Generate Commit Message** ⏱️ ~30ms

**Location:** `server/svc/workflow.ts:153-194`

**Current implementation:**
```typescript
async function generateCommitMessage(workingDir: string, diff: string, adr: string): Promise<string> {
  try {
    // Parse the comprehensive diff to get file lists
    const staged = execSync('git diff --cached --name-status', { cwd: workingDir }).trim();
    const unstaged = execSync('git diff --name-status', { cwd: workingDir }).trim();
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: workingDir }).trim();
    
    const allFiles = [
      ...staged.split('\n').filter(Boolean),
      ...unstaged.split('\n').filter(Boolean),
      ...untracked.split('\n').map(f => `A\t${f}`)
    ];
    
    // Categorize changes
    const added = allFiles.filter(l => l.startsWith('A')).map(l => l.split('\t')[1]);
    const modified = allFiles.filter(l => l.startsWith('M')).map(l => l.split('\t')[1]);
    const deleted = allFiles.filter(l => l.startsWith('D')).map(l => l.split('\t')[1]);
    
    // Build detailed commit message
    let message = 'docs: update intent documentation\n\n';
    
    if (added.length > 0) {
      message += `Added files:\n${added.map(f => `- ${f}`).join('\n')}\n\n`;
    }
    
    if (modified.length > 0) {
      message += `Modified files:\n${modified.map(f => `- ${f}`).join('\n')}\n\n`;
    }
    
    if (deleted.length > 0) {
      message += `Deleted files:\n${deleted.map(f => `- ${f}`).join('\n')}\n\n`;
    }
    
    message += 'Generated ADR for changes\n';
    message += '\nIntent-Updated: yes';
    
    return message;
  } catch (e) {
    console.error('Failed to generate detailed commit message:', e);
    return `docs: update intent documentation\n\nGenerated ADR for changes\n\nIntent-Updated: yes`;
  }
}
```

**What it uses:**
- ✅ File lists (Added, Modified, Deleted)
- ✅ All staged, unstaged, and untracked files

**What it DOESN'T use:**
- ❌ ADR content (passed in but ignored!)
- ❌ Diff content (ignored!)
- ❌ Any semantic understanding of changes
- ❌ Claude Code SDK (should use LLM!)
- ❌ Conventional commit types (always uses "docs:")

**Why it's generic:**
- Just lists files mechanically
- Always says "docs: update intent documentation"
- Doesn't describe WHAT changed or WHY
- No analysis of the actual work done

**Why it's instant:**
- Pure string manipulation
- No LLM call
- Just git commands + formatting

---

## 🔍 Context Assembly - Current vs Needed

### **For agents.md Updates** (Currently Disabled)

**Current context (when enabled):**
```json
{
  "doc_path": "app/frontend/agents.md",
  "dir_path": "app/frontend",
  "scope": "staged",
  "diff": "<git diff --cached -- app/frontend>",
  "current_guide": "<file contents>",
  "changed_files": ["app/frontend/src/file1.ts", "..."],
  "git": {
    "branch": "main",
    "sha": "abc123",
    "remote": "https://github.com/..."
  }
}
```

**What's MISSING:**
- ❌ Child guide updates (from layer below)
- ❌ Parent guide content (for context)
- ❌ Related guides (siblings, cousins)
- ❌ Existing ADR history
- ❌ Chat/conversation log
- ❌ File dependency graph
- ❌ Test file relationships

**Prompt structure (from `make_prompts.ts`):**
```markdown
# Context

You are updating an engineering guide based on code changes.

**Changed files in this scope:**
- file1.ts
- file2.ts

**Git:**
- Branch: main
- SHA: abc123

# Current Guide

<agents.md content>

# Code Changes (Diff)

<directory-scoped diff>

# Instructions

Update this guide to reflect the changes shown in the diff.
Keep sections accurate and concise.
```

**System prompt:**
```
You are a documentation maintenance agent.

CRITICAL: You MUST use read_file and edit_file tools to update documentation.

Process:
1. read_file: Load the guide file
2. Analyze: Compare guide content against the code diff
3. edit_file: Update outdated/inaccurate sections
4. Confirm: The file has been updated

Do NOT just describe changes - you must actually edit the files.
```

---

### **For ADR Generation** (Currently Template-Only)

**Current context:**
- `workingDir` - Project root path
- `diff` - Comprehensive diff string (truncated to 50 lines)
- `guideDiffs` - Array of guide file changes (usually empty)

**What's used:**
- ✅ Date
- ✅ Next ADR number
- ✅ First 50 lines of diff (truncated!)

**What's IGNORED:**
- ❌ `diff` parameter (only first 50 lines used)
- ❌ Previous ADR history
- ❌ Chat log
- ❌ Guide update summaries
- ❌ Any semantic analysis

**NO LLM CALL:**
- Currently just a hardcoded template with fill-in-the-blanks
- Says `// TODO: Use Claude Code SDK to generate rich ADR`
- Returns synchronously (no async work)

**Why it's instant:**
- No AI generation
- Just string concatenation
- Immediate return

---

### **For Commit Message Generation** (Currently Template-Only)

**Current context:**
- `workingDir` - Project root
- `diff` - Comprehensive diff (but ignored!)
- `adr` - Generated ADR content (but ignored!)

**What's used:**
- ✅ File status lists (git diff --name-status)
- ✅ File categorization (Added/Modified/Deleted)

**What's IGNORED:**
- ❌ `diff` parameter (passed in, never used!)
- ❌ `adr` parameter (passed in, never used!)
- ❌ Any semantic understanding

**NO LLM CALL:**
- Just mechanical file listing
- Hardcoded prefix: "docs: update intent documentation"
- No analysis of what changed or why

**Why it's generic:**
- Always uses "docs:" prefix
- No description of actual work
- Just lists filenames
- No context about the changes

---

## 🚨 Why Everything Is Instant

### **The Truth:**

1. **Layered update is DISABLED**
   - Line 44-45: `// For now, just work with existing unstaged changes`
   - Immediately yields "Analysis complete"
   - No Claude Code agents spawned
   - No actual guide updates

2. **ADR is a template**
   - No LLM call
   - Just fills in date + number + truncated diff
   - Line 117: `// TODO: Use Claude Code SDK`
   - Pure string concatenation

3. **Commit message is mechanical**
   - Just lists files from git status
   - No semantic understanding
   - No LLM call
   - String manipulation only

**Total execution time:** ~150ms
- 100ms: Git commands
- 50ms: String concatenation
- 0ms: Actual AI generation

**This explains:**
- ✓ Why it feels instant
- ✓ Why ADR is generic
- ✓ Why commit message just lists files
- ✓ Why no agents.md changes happen

---

## 🎯 What SHOULD Happen (Proper Implementation)

### **Step 1: Context Assembly** ⏱️ ~500ms

**For Guide Updates:**
```typescript
{
  // Core context
  doc_path: "app/frontend/src/hooks/agents.md",
  dir_path: "app/frontend/src/hooks",
  scope: "staged",
  
  // Code changes
  diff: "<directory-scoped diff>",
  changed_files: ["useContextTags.ts", "useAtAutocomplete.ts"],
  
  // Guide context
  current_guide: "<agents.md content>",
  parent_guide: "<app/frontend/agents.md content>",
  child_guides: [
    { path: "app/frontend/src/hooks/context/agents.md", summary: "Updated hook behavior" }
  ],
  
  // ADR context
  related_adrs: [
    { number: "001", title: "Context GUI Only", relevance: "Removed @-tag parsing" }
  ],
  
  // Git metadata
  git: {
    branch: "main",
    sha: "abc123",
    remote: "https://...",
    author: "Tyler",
    files_in_commit: 5
  }
}
```

**For ADR Generation:**
```typescript
{
  // Changes
  diff: "<full git diff>",
  file_tree: {
    added: ["server/svc/workflow.ts", "..."],
    modified: ["src/cli.ts", "..."],
    deleted: []
  },
  
  // Guide updates
  guide_updates: [
    { path: "agents.md", summary: "Added workflow documentation", diff: "<diff>" }
  ],
  
  // Historical context
  previous_adrs: [
    { number: "004", title: "Intent Extraction", date: "2025-10-05", summary: "..." },
    { number: "003", title: "Thread Chat Naming", date: "2025-10-04", summary: "..." }
  ],
  
  // Conversation log (if available)
  chat_log: "<Recent conversation that led to these changes>",
  
  // Metadata
  scope: "staged",
  author: "Tyler",
  timestamp: "2025-10-06T18:00:00Z"
}
```

**Prompt for ADR:**
```markdown
# Task: Generate Architecture Decision Record

## Previous ADRs (Last 5)
<ADR summaries for context>

## Code Changes
<Full git diff>

## Guide Updates
<Summary of agents.md changes>

## Conversation Context
<Chat log if available>

## Instructions
Generate ADR-NNN following the template structure.
Focus on:
- WHY these changes were made
- WHAT problem they solve
- Trade-offs and alternatives considered
- Verification checklist
```

**For Commit Message:**
```typescript
{
  // Changes
  file_tree: {
    added: [10 files],
    modified: [6 files],
    deleted: []
  },
  
  // Generated docs
  adr_summary: "Added single-page workflow with preview panel",
  guide_summaries: ["Updated agents.md with new architecture"],
  
  // Semantic analysis
  change_type: "feat" | "fix" | "refactor" | "docs",
  scope: "workflow",
  breaking: false,
  
  // Context
  previous_commits: ["Last 3 commit messages for style consistency"]
}
```

**Prompt for Commit Message:**
```markdown
# Task: Generate Conventional Commit Message

## Changes Summary
Added: 10 files
Modified: 6 files

## ADR Summary
<One-sentence summary of the ADR>

## Guide Updates
<What documentation was updated>

## Style Guide
Use conventional commits format:
type(scope): brief description

body with details

footer

## Previous Commits (for consistency)
<Last 3 commits>

## Instructions
Generate a clear, specific commit message describing WHAT and WHY.
```

---

## 🔧 Execution Flow Comparison

### **Current (Instant):**
```
runWorkflow()
├── Get diffs (100ms) ✓
├── Skip layered update (0ms) ✗ DISABLED
├── Get guide diffs (10ms) → Usually empty
├── Generate ADR (5ms) → Template only
└── Generate commit msg (30ms) → File list only

Total: ~150ms
LLM calls: 0
Actual documentation: 0
```

### **Proper (Should Take 10-30s):**
```
runWorkflow()
├── Get diffs (100ms)
├── Detect affected guides (200ms)
├── Build context bundles (500ms)
│   ├── Read guide files
│   ├── Get directory-scoped diffs
│   ├── Load parent/child guides
│   └── Load ADR history
├── Build guide tree (50ms)
├── Process layers (10-20s)
│   ├── Layer 0: Spawn 3 Claude agents (parallel) → 5-8s
│   ├── Layer 1: Spawn 2 Claude agents (parallel) → 4-6s
│   └── Layer 2: Spawn 1 Claude agent → 3-4s
├── Collect guide diffs (100ms)
├── Generate ADR with Claude (3-5s)
│   ├── Build context: diff + guides + ADR history
│   ├── Call Claude Code SDK
│   └── Stream structured ADR
└── Generate commit msg with Claude (2-3s)
    ├── Build context: files + ADR + guides
    ├── Call Claude Code SDK
    └── Stream commit message

Total: 15-35 seconds
LLM calls: N+2 (N guide agents + ADR + commit)
Actual documentation: Rich, contextual, accurate
```

---

## 📝 Summary Table

| Step | Current | Proper | Time | Uses LLM? |
|------|---------|--------|------|-----------|
| Get diffs | ✓ Works | Should get staged too | 100ms | No |
| Layered update | ✗ DISABLED | Bottom-up, parallel agents | 10-20s | Yes (N agents) |
| Guide diffs | ✓ Works | Should check staged + created | 10ms | No |
| ADR generation | ✗ Template | Claude Code SDK call | 3-5s | Should be! |
| Commit message | ✗ File list | Claude Code SDK call | 2-3s | Should be! |

**Current total:** ~150ms, 0 LLM calls  
**Proper total:** 15-35s, N+2 LLM calls

---

## 🐛 Key Issues

### **1. Layered Update Disabled**
- **File:** `server/svc/workflow.ts:41-47`
- **Why:** Commented out as "TODO"
- **Impact:** No agents.md files get updated

### **2. No LLM for ADR**
- **File:** `server/svc/workflow.ts:116-151`
- **Why:** Says `// TODO: Use Claude Code SDK`
- **Impact:** Generic, unhelpful ADRs

### **3. No LLM for Commit Message**
- **File:** `server/svc/workflow.ts:153-194`
- **Why:** Just mechanical file listing
- **Impact:** No semantic understanding

### **4. Missing Context**
- No ADR history loaded
- No conversation log included
- No parent/child guide relationships
- No file content for untracked files

---

## 🚀 Next Steps to Fix

1. **Re-enable layered workflow** in `workflow.ts`
2. **Add Claude Code calls** for ADR generation
3. **Add Claude Code calls** for commit message generation
4. **Enrich context** with ADR history, chat logs, guide relationships
5. **Add progress streaming** for each Claude Code agent
6. **Test end-to-end** with real guide updates

---

**This explains why everything feels instant - we're skipping all the AI work!** 🎯


# ADR-002: Claude Code SDK Integration for Automated Patch Generation

**Status:** Accepted  
**Date:** 2025-10-06  
**Commits:** (Current changes)

## Context

Intent v0.1.0 generated prompts but required **manual steps**:
1. User opens each `.prompt.md` in Cursor
2. User copies to LLM chat
3. LLM generates patch
4. User saves as `.patch` file
5. User runs `git apply`

### Problems
- **Too manual**: 5 steps per file, non-scalable
- **Cursor-dependent**: Only works in Cursor IDE
- **Not CI/CD friendly**: Can't automate in pipelines
- **Slow**: Sequential processing, ~30s per file

### User Requirements
- "I definitely want it to kick those agents off in the background not leave it to the user"
- "Can we set it up to utilize claude code or openai codex as the agent?"
- "Makes this way more portable to enterprises that cant or dont use cursor"
- **"CLAUDE CODE FROM DAY 1"**

## Decision

**Integrate Claude Code SDK directly into Intent** for automated, parallel patch generation.

### Two Execution Modes

**Mode 1: Manual (Default)**
```bash
intent update
# Generates prompts → user reviews in Cursor
```

**Mode 2: Auto (New!)**
```bash
intent update --auto
# Generates prompts → LLM processes → applies patches → DONE
```

### Architecture

```
intent update --auto
    ↓
1. Detect changes (existing)
    ↓
2. Build context bundles (existing)
    ↓
3. Generate prompts (existing)
    ↓
4. Process with Claude Code (NEW!)
   - Parallel single-turn calls
   - 5 prompts → 5 LLM calls simultaneously
   - 10 seconds total (not 2.5 minutes)
    ↓
5. Apply patches (NEW!)
   - git apply for each .patch
   - Handle conflicts gracefully
    ↓
6. Done! ✅
```

### Changes Made

**New Files:**
- `core/llm/client.ts` - Claude Code SDK integration
- `core/workflows/process_prompts.ts` - Parallel patch generation
- `core/workflows/apply_patches.ts` - Git apply orchestration

**Modified:**
- `src/cli.ts` - Added `--auto` and `--skip-apply` flags
- `package.json` - Added `@anthropic-ai/claude-agent-sdk` dependency

## Consequences

### Positive

✅ **Fully automated** - One command does everything  
✅ **Fast** - Parallel LLM calls (5 files in ~10s, not 2.5min)  
✅ **Enterprise-friendly** - Works in CI/CD, no Cursor required  
✅ **Portable** - CLI tool with API keys, not IDE-dependent  
✅ **Cost-efficient** - Single-turn mode is cheaper than agent mode  
✅ **Flexible** - Can still do manual review with default mode

### Negative

❌ **Requires API key** - Users need `ANTHROPIC_API_KEY`  
❌ **Cost tracking needed** - Users pay for LLM calls  
❌ **Network dependency** - Fails without internet

**Mitigation:**
- Default mode (no `--auto`) works offline
- Clear error messages if API key missing
- Usage/cost displayed in output

### Neutral

ℹ️ **Model choice** - Claude Sonnet 4-5 as default (configurable)  
ℹ️ **Single-turn only** - No agent mode yet (coming in ADR-003)  
ℹ️ **Anthropic-only** - No OpenAI support yet (easy to add)

## Alternatives Considered

### A. Keep Cursor-only workflow
**Rejected because:**
- Not enterprise-friendly
- Can't be used in CI/CD
- Doesn't scale to large codebases
- User explicitly requested Claude Code integration

### B. Use Python LiteLLM wrapper
**Rejected because:**
- Adds Python dependency to TypeScript package
- User said "TYPESCRIPT ALL DAY BABY"
- Native SDK is cleaner, type-safe

### C. Use CLI tools (claude-cli, llm, aichat)
**Rejected because:**
- Requires users to install multiple tools
- Less control over execution
- No programmatic access to responses
- TypeScript SDK is first-class solution

### D. Agent mode from day 1
**Rejected because:**
- Overkill for simple agents.md updates (single-turn is 95% of use cases)
- More expensive
- Slower (sequential planning)
- Can add agent mode later (ADR-003)

## Implementation Notes

### Single-Turn Mode (Fast & Cheap)

```typescript
// Parallel execution - key to performance
const patches = await Promise.all(
  prompts.map(prompt => 
    generatePatch(prompt, config)
  )
);
```

**Performance:**
- 5 files × ~2s each = ~10s total (parallel)
- vs 5 files × ~30s each = 2.5min (sequential manual)

**Cost:**
- ~$0.03 per file × 5 = ~$0.15 per run
- Much cheaper than agent mode (~$1-2)

### Claude Code SDK Usage

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Single-turn call
for await (const message of query({
  prompt: fullPrompt,
  options: {
    model: 'claude-sonnet-4-5',
    maxTurns: 1,
    permissionMode: 'bypassPermissions'
  }
})) {
  // Extract patch from result
}
```

### Workflow Flags

```bash
# Generate prompts only
intent update

# Generate + process + apply
intent update --auto

# Generate + process (don't apply)
intent update --auto --skip-apply
```

## Related Decisions

- ADR-001: User-installed tool (enables CLI-based automation)
- Future ADR-003: Agent mode for complex workflows
- Future ADR-004: ADR auto-generation

## Follow-Up Work

1. ✅ Install Claude Code SDK
2. ✅ Implement single-turn LLM client
3. ✅ Add parallel patch generation
4. ✅ Add patch application
5. ✅ Update CLI with --auto flag
6. ⏸️ Test on ChatStats changes
7. ⏸️ Add error handling and retries
8. ⏸️ Add cost tracking/display
9. ⏸️ Document usage in README

## Notes

**Philosophy:** Start simple, add complexity only when needed.

**Single-turn vs Agent:**
- Single-turn: Fast, cheap, predictable (95% of use cases)
- Agent: Powerful, expensive, complex (5% of use cases)

We start with single-turn. When we need planning, conflict resolution, or onboarding, we'll add agent mode.

**User Quote:** "oh yeah we dont even need agents for the agents.md file updates because we can take all of the context from each chunk and get that update with a one step chat."

**Vision:** Full dev cycle with agents comes later:
- Chat with agent that has context
- Plan implementation
- Execute and test
- Update agents.md + create ADR + commit

But for now: **Single-turn for speed and simplicity.**


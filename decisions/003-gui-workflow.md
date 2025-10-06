# ADR-003: GUI Workflow with Single-Page Intent Generation

**Status:** Accepted  
**Date:** 2025-10-06  
**Commits:** (Pending)

## Context

After building the core CLI workflow, we needed a better user experience for the daily intent documentation loop. The CLI workflow (`intent update --auto --layered`) works but requires users to review diffs in their editor and doesn't provide real-time feedback during agent execution.

Users want a visual, interactive way to:
1. See their staged changes in context (file tree)
2. Trigger documentation generation
3. Watch agents work in real-time
4. Review generated docs before committing
5. Edit commit messages if needed
6. One-click commit everything

## Decision

Built a **local HTTP server + React GUI** that provides a complete single-page workflow for intent documentation.

### Architecture

**Server (Bun + Hono):**
- Port 5174, auto-starts when user runs `intent`
- SSE streaming for real-time progress
- REST API for context, changes, file tree, workflow execution

**Frontend (React + Vite):**
- Generate page (default `/`) - Context-aware workflow page
- Dashboard page (`/dashboard`) - Project overview and stats
- IDE-style file tree with change decorations
- Live agent queue showing layer-by-layer progress
- 3-tab preview panel (Guide Diffs | ADR | Commit Message)

### Key Features

1. **Smart Launch**
   - `intent` (no args) detects context
   - Auto-starts server if not running
   - Opens browser to Generate page
   - Shows CLI warning if unstaged files exist

2. **Context-Aware UI**
   - Detects staged vs unstaged changes
   - Shows file tree with A/M/D badges
   - Warns users to stage changes for best results
   - Only processes staged changes (intentional constraint)

3. **Single-Page Workflow**
   - One button: "Generate Intent Documentation"
   - Agent queue appears inline during execution
   - Preview panel slides in at top after completion
   - Tabs show progress indicators (⏳ → ✓)
   - Compact file lists (2x2 grid, max 100px height)

4. **Review & Commit**
   - 3 tabs: Guide Diffs, ADR Preview, Commit Message
   - Editable commit message
   - One-click "Accept & Commit"
   - Cancel button resets state for re-runs

## Implementation

### Files Added

**Server Services:**
- `server/index.ts` - Hono server with SSE support
- `server/svc/workflow.ts` - Complete workflow orchestrator
- `server/svc/context.ts` - Smart change detection
- `server/svc/filetree.ts` - File tree builder with git status
- `server/svc/changes.ts` - File change lists
- `server/svc/intent.ts` - Commit handler

**Frontend Pages:**
- `web/src/pages/Generate.tsx` - Main workflow page (285 lines)
- `web/src/pages/Dashboard.tsx` - Overview page (simplified)
- `web/src/components/FileTree.tsx` - IDE-style tree component

**Infrastructure:**
- `dev.sh` - Quick rebuild script
- `web/vite.config.ts` - Vite config with proxy
- `web/package.json` - Frontend dependencies

### Files Modified

- `src/cli.ts` - Added smartStart() for GUI launch, unstaged file warnings
- `web/src/App.tsx` - Routing updated (Generate = default)
- `web/src/index.css` - Beige color scheme
- `agents.md` - Updated with GUI workflow documentation

## Consequences

### Positive

✅ **Much better UX** - Visual, interactive, real-time feedback  
✅ **Context-aware** - Smart detection of changes and affected guides  
✅ **One-click workflow** - Generate → Review → Commit in one flow  
✅ **Reusable** - Server can support future features (onboarding wizard, etc.)  
✅ **Progress visibility** - See exactly what agents are doing  
✅ **Editable output** - Can tweak commit messages before committing

### Negative

⚠️ **Requires browser** - Not pure CLI anymore (but CLI still works)  
⚠️ **Server dependency** - Need Bun process running in background  
⚠️ **More complex** - Additional moving parts (server, frontend, SSE)

### Neutral

📊 **Staged-only by design** - Forces users to stage changes first (better context)  
📊 **Localhost only** - No remote server, all local (good for security)  
📊 **Port 5174** - Hardcoded for now (could be configurable)

## Current Limitations (To Fix)

### 1. Layered Workflow Disabled
**File:** `server/svc/workflow.ts:41-47`  
**Issue:** Commented out as "TODO", so no guide updates happen  
**Impact:** Preview shows "No agents.md changes"

### 2. ADR Uses Template (No LLM)
**File:** `server/svc/workflow.ts:116-151`  
**Issue:** Hardcoded template, says `// TODO: Use Claude Code SDK`  
**Impact:** Generic ADRs, no semantic understanding

### 3. Commit Message Is Mechanical
**File:** `server/svc/workflow.ts:153-194`  
**Issue:** Just lists files, no LLM call  
**Impact:** No description of WHAT or WHY

### 4. Missing Context
- No ADR history loaded for new ADRs
- No conversation log included
- No parent/child guide relationships in prompts
- Untracked files only show names, not content

## Next Steps

### Immediate (MVP)
1. ✅ Re-enable layered workflow in `workflow.ts`
2. ✅ Add Claude Code SDK calls for ADR generation
3. ✅ Add Claude Code SDK calls for commit messages
4. ✅ Fix progress streaming (currently simulated)

### Future Enhancements
- [ ] Onboarding wizard UI (scan → questions → drafts)
- [ ] Run history page with replay
- [ ] Guide coverage visualization
- [ ] Diff view improvements (syntax highlighting)
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle

## Verification

### Core Workflow Working ✅
- `intent` launches server and opens browser
- Generate page shows file tree + staged changes
- Warning appears for unstaged files
- Button triggers workflow via POST /api/workflow
- SSE streams progress events
- Preview panel appears after completion
- Cancel/Accept buttons work

### UI/UX Working ✅
- IDE-style file tree with proper indentation
- Draggable divider between panels
- Compact 2x2 file lists (always show all 4 groups)
- All files listed (no "+N more...")
- Tab progress indicators (⏳ → ✓)
- Beige color scheme applied

### Known Issues 🐛
- Layered workflow disabled (instant results)
- ADR/commit use templates (no LLM)
- Need to enrich context for better quality

## Related Decisions

- Related to ADR-001: User-Installed Tool
- Related to ADR-002: Claude Code Integration
- Enables dogfooding Intent on itself

## Notes

This ADR represents a major milestone - Intent is now a complete product with both CLI and GUI workflows. The GUI makes the daily loop effortless and provides transparency into what the AI agents are doing.

The architecture is designed to support future expansion:
- Server can host onboarding wizard
- SSE can stream detailed progress
- Frontend can add more sophisticated visualizations
- All while keeping the CLI workflow available for power users

**Philosophy:** Make documentation maintenance so easy that it becomes automatic. The GUI is a key part of achieving that vision.


# Intent - Engineering Guide & ADR Tool

## Purpose

Intent is a **user-installed CLI tool** that automates engineering guide (`agents.md`) and Architecture Decision Record (ADR) maintenance for any codebase in any language.

**Key Insight:** Documentation drift is a tooling problem, not a discipline problem. Intent makes staying in sync effortless.

## Architecture

### Core Components

```
intent/
├── src/
│   ├── cli.ts           # Main CLI entry point
│   └── index.ts         # Programmatic API (future)
├── core/
│   ├── detect_changes.ts    # Find changed files → affected guides
│   ├── build_context.ts     # Build per-guide context bundles
│   ├── make_prompts.ts      # Generate LLM-ready prompts
│   └── run.ts               # Orchestrator
└── templates/
    ├── adr-readme.md        # Copied to user projects on init
    └── adr-template.md      # Template for new ADRs
```

### Data Flow

```
git diff → detect changes → find affected guides → build context → generate prompts
                                                                         ↓
user opens in Cursor ← .proposed-intent/*.prompt.md ← make prompts ← context bundles
         ↓
LLM generates patch
         ↓
git apply .proposed-intent/*.patch → updated agents.md
```

## User Workflow

### 1. Installation
```bash
npm install -g @tylerhoecker/intent
```

Tool is installed **per-user**, works across all projects.

### 2. Project Initialization
```bash
cd user-project/
intent init
```

Creates:
- `.intent/config.json` - Project-specific settings
- `.intent/decisions/` - ADR directory
- Updates `.gitignore`

### 3. Usage Loop
```bash
# Make code changes
git add .

# Generate update prompts
intent update

# Review in Cursor
# Apply patches
git apply .proposed-intent/*.patch

# Commit everything
git commit -m "feat: ... \n\nDocs-Reviewed: yes"
```

## Key Design Decisions

### Language-Agnostic

Intent works with **any language** because:
- Uses git (universal)
- Doesn't parse code (uses diffs)
- Relies on user-created `agents.md` files (any format)

This means:
✅ Works with TypeScript, Python, Java, Go, Rust, Ruby, etc.
✅ No language-specific plugins needed
✅ Simple, maintainable codebase

### User-Installed, Not Project-Specific

Like `prettier` or `eslint`, Intent is installed **once per user**, used across **many projects**.

Benefits:
- No need to add to every project's `package.json`
- Version managed by user, not per-project
- Works with non-Node projects (Java, Python, etc.)

Trade-offs:
- Projects can't pin Intent version
- Need to document "requires Intent v0.x+"

### Opinionated File Locations

- Engineering guides: `agents.md` (or `CLAUDE.md` for legacy)
- ADRs: `.intent/decisions/NNN-title.md`
- Config: `.intent/config.json`
- Working files: `.proposed-intent/` (gitignored)

This consistency makes tooling simpler and cross-project navigation easier.

## Common Patterns

### Scope Detection

Three scopes for detecting changes:

1. **`staged`** (default) - `git diff --cached`
   - Use: Day-to-day workflow
   - When: After `git add`, before commit

2. **`head`** - `git diff HEAD~1`
   - Use: Post-commit cleanup
   - When: Forgot to update guides before committing

3. **`pr`** - `git diff origin/main...HEAD`
   - Use: Pre-PR review
   - When: Want to see all changes in branch

### Guide Discovery

Walk up from each changed file to repo root, collect all `agents.md`:

```
app/backend/routers/users.py changed
  → Check app/backend/routers/agents.md
  → Check app/backend/agents.md
  → Check app/agents.md
  → Stop at repo root
```

This ensures **all affected guides** get updated, from specific to general.

### Directory-Scoped Diffs

Each guide only sees diffs **within its directory**:

```
app/backend/agents.md sees:
  - app/backend/**/*.py changes
  - NOT app/frontend/**/*.tsx changes
```

This prevents:
- Irrelevant noise in prompts
- Token waste
- Guide updates unrelated to their scope

## Signals & Observability

### Logs
- `console.log()` for user-facing messages
- Exit codes: 0 = success, 1 = error

### Files
- `.proposed-intent/*.prompt.md` - Generated prompts
- `.proposed-intent/*.context.json` - Context bundles (for debugging)
- `.proposed-intent/*.patch` - User-generated patches

### Errors
- Missing git: "git: command not found"
- No changes: "No guides affected by these changes"
- Parse errors: Include line numbers and file paths

## Invariants

### Must-Have Properties

1. **Idempotent** - Running twice produces same result
2. **Safe** - Never modifies source files directly (only creates prompts)
3. **Gitignore-aware** - Respects `.gitignore` patterns
4. **Portable** - Works on macOS, Linux, Windows (via WSL)

### Never Do This

❌ **Don't auto-apply patches** - User must review
❌ **Don't modify .git/** - Only read, never write
❌ **Don't require LLM API keys** - Tool should work offline (manual patch creation)
❌ **Don't parse code** - Use diffs only

## Pitfalls

### "No guides affected"
**Symptom:** Tool says no guides affected even though files changed.

**Cause:** Changed files don't have any `agents.md` in their parent hierarchy.

**Solution:** Create `agents.md` in relevant directories.

### "Patch fails to apply"
**Symptom:** `git apply` fails with "does not match index".

**Cause:** Guide was modified between prompt generation and patch application.

**Solution:** Re-run `intent update` to regenerate fresh prompts.

### "Token limit exceeded"
**Symptom:** LLM refuses to process prompt due to size.

**Cause:** Too many changes in one scope.

**Solution:** Split changes into smaller commits, run Intent per-commit.

## Future Enhancements

- [ ] **Auto-ADR generation** - Generate ADRs alongside guide updates
- [ ] **Chat log capture** - Include Cursor conversation in ADR context
- [ ] **Pre-commit hook** - Auto-run and block if guides not updated
- [ ] **GUI mode** - Visual file tree + chunk selection
- [ ] **Verification mode** - Check guides reference real code elements

## Related Files

- `README.md` - User-facing documentation
- `src/cli.ts` - Main entry point implementation
- `templates/` - User-facing templates

## Dogfooding

This repo uses Intent to maintain its own documentation:

```bash
cd intent-tool/
# Make changes
git add .
# Update this file!
intent update
```

Our ADRs are in `decisions/` and document key choices like:
- Why CLI tool instead of library
- Why language-agnostic approach
- Why user-installed not project-specific

## Philosophy

**Good documentation is:**
1. **Living** - Updated with every change
2. **Observable** - References actual code
3. **Opinionated** - Says what NOT to do
4. **Linked** - Points to related docs
5. **Automated** - Uses tools to stay fresh

Intent makes #5 possible, which makes #1-4 sustainable.


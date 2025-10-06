# Intent - Engineering Guide & ADR Automation

> Keep your documentation in sync with your code, automatically.

Intent is a **user-installed tool** that maintains `agents.md` engineering guides and Architecture Decision Records (ADRs) across any codebase, in any language.

## Why Intent?

Code changes fast. Documentation doesn't. Intent bridges the gap:

- **Detects** changed files in your git repo
- **Finds** affected engineering guides (`agents.md`)
- **Generates** LLM-ready prompts for updates
- **Creates** ADRs to capture the "why" behind changes

Works with **any language/framework**: TypeScript, Python, Java, Go, Rust, etc.

## Installation

### Global (recommended)
```bash
npm install -g @tylerhoecker/intent
```

### Per-project
```bash
npm install --save-dev @tylerhoecker/intent
```

## Quick Start

```bash
# 1. Initialize in your project
cd your-project/
intent init

# 2. Make code changes
# ... edit files ...

# 3. Stage changes
git add .

# 4. Generate guide updates
intent update

# 5. Open prompts in Cursor
# Check .proposed-intent/*.prompt.md
# Let Cursor/LLM generate patches
# Apply patches: git apply .proposed-intent/*.patch

# 6. Commit everything
git commit -m "feat: new feature

See: ADR-042
Docs-Reviewed: yes"
```

## What Gets Created

When you run `intent init`, it creates:

```
your-project/
├── .intent/
│   ├── config.json           # Project settings
│   └── decisions/            # Your ADRs go here
│       ├── README.md         # ADR documentation
│       └── TEMPLATE.md       # Copy this for new ADRs
├── .proposed-intent/         # Generated prompts (gitignored)
└── .gitignore                # Updated to ignore .proposed-intent/
```

## Commands

### `intent init`
Initialize Intent in the current project. Creates `.intent/` directory with config and templates.

### `intent update [scope]`
Generate guide update prompts for changed files.

**Scopes:**
- `staged` (default) - Use staged changes
- `head` - Use last commit
- `pr` - Use changes against origin/main

**Examples:**
```bash
# Update for staged changes
git add .
intent update

# Update for last commit
intent update head

# Update for PR diff
intent update pr
```

## How It Works

### 1. Detection
Scans git for changed files, walks up directory tree collecting all `agents.md` files.

### 2. Context Building
For each affected guide, creates a context bundle with:
- Directory-scoped diff
- Current guide content
- Git metadata

### 3. Prompt Generation
Generates LLM-ready prompts asking for guide updates as unified diff patches.

### 4. Review & Apply
You (or Cursor) review prompts, generate patches, apply them.

## Engineering Guides (agents.md)

Engineering guides document **how your system works**:

```markdown
# Backend API Routes

## Overview
Our API uses FastAPI with SQLAlchemy...

## Adding a New Route
1. Create router in `routers/`
2. Register in `main.py`
3. Add tests in `tests/`

## Common Patterns
- All routes use `@router.get()` decorator
- Authentication via `Depends(get_current_user)`
- Errors return `HTTPException(status_code=...)`

## Pitfalls
- ⚠️ Don't use sync DB calls in async routes
- ⚠️ Always validate input with Pydantic models
```

## Architecture Decision Records (ADRs)

ADRs capture **why decisions were made**:

```markdown
# ADR-001: Use FastAPI Instead of Flask

**Status:** Accepted
**Date:** 2025-10-01

## Context
We needed a Python web framework. Flask was considered but...

## Decision
Use FastAPI for native async support and automatic OpenAPI docs.

## Consequences
✅ Better performance with async/await
✅ Auto-generated API docs
❌ Steeper learning curve for team

## Alternatives Considered
Flask: Rejected due to lack of native async support.
```

## Configuration

Edit `.intent/config.json`:

```json
{
  "projectName": "MyProject",
  "adrDirectory": ".intent/decisions",
  "agentsFiles": ["agents.md", "CLAUDE.md"],
  "autoGenerateADRs": false,
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

## Cursor Integration

Add to `.cursor/commands/intent.md`:

```markdown
---
name: intent
description: Update engineering guides for code changes
---

You are updating engineering guides and ADRs.

Run: npx intent update --scope staged

Review the generated prompts in .proposed-intent/ and create patches.
```

## Works With Any Language

Intent is **language-agnostic**:

✅ **TypeScript/JavaScript** - Node.js, React, Vue, etc.
✅ **Python** - Django, FastAPI, Flask, etc.  
✅ **Java** - Spring, Maven, Gradle, etc.
✅ **Go** - Any Go project
✅ **Rust** - Cargo projects
✅ **Ruby** - Rails, Sinatra, etc.

It only cares about:
- Git repository structure
- `agents.md` files (you create these)
- Git diffs

## Philosophy

**Documentation should be:**
1. **Living** - Updated with every meaningful code change
2. **Observable** - Reference actual code elements
3. **Opinionated** - Say what NOT to do
4. **Linked** - Point to related guides
5. **Automated** - Use tools to stay in sync

## Dogfooding

Intent uses itself! This repo has:
- `agents.md` - How Intent works
- `decisions/` - Why we made certain choices

Run `intent update` in this repo to see it in action.

## Development

```bash
# Clone the repo
git clone https://github.com/tylerhoecker/intent.git
cd intent

# Install dependencies
npm install

# Build
npm run build

# Link for local testing
npm link

# Use in another project
cd ../your-project
npm link @tylerhoecker/intent
intent update
```

## License

MIT

## Author

Tyler Hoecker

## Contributing

Issues and PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).


# ADR-001: User-Installed Tool (Not Project-Specific)

**Status:** Accepted  
**Date:** 2025-10-06  
**Commits:** Initial extraction

## Context

We needed to decide how Intent should be installed and distributed:

### Option A: Project-Specific Package
- Added to each project's `package.json`
- Versioned per-project
- Works like `eslint` or `prettier`

### Option B: User-Installed Global Tool  
- Installed once per user: `npm install -g @tylerhoecker/intent`
- Works across all projects
- Version managed by user

### Constraints
- Must work with non-Node projects (Java, Python, Go, etc.)
- Users often work on multiple projects
- Tool needs to be language-agnostic

## Decision

**Build Intent as a user-installed global tool.**

Users run:
```bash
npm install -g @tylerhoecker/intent
```

Then use it in any project:
```bash
cd any-project/
intent init
intent update
```

## Consequences

### Positive

✅ **Works with any language** - Java/Python developers don't need Node in their project  
✅ **Install once, use everywhere** - No need to add to every project  
✅ **Simpler mental model** - It's a user tool like `git` or `vim`, not a dependency  
✅ **No version conflicts** - Each user controls their Intent version  
✅ **Easier updates** - `npm update -g @tylerhoecker/intent` updates all projects at once

### Negative

❌ **Projects can't pin version** - Can't enforce "this project requires Intent v2.x"  
❌ **Team coordination** - Teams must agree on minimum version  
❌ **No package.json entry** - Doesn't show up in project dependencies

**Mitigation:** 
- Document minimum version in README: "Requires Intent v0.1.0+"
- Provide `intent version` command
- Consider adding `.tool-versions` support later (like `asdf`)

### Neutral

ℹ️ **Publishing** - Must publish to NPM for global install to work  
ℹ️ **CI/CD** - CI environments need: `npm install -g @tylerhoecker/intent`  
ℹ️ **Discovery** - Users must know about Intent (marketing challenge)

## Alternatives Considered

### A. Project-Specific Package (like eslint)
**Rejected because:**
- Adds Node dependency to non-Node projects
- Requires adding to every single project
- Version management becomes per-project headache
- Doesn't match mental model: "Intent is MY tool, not my project's tool"

### B. Standalone Binary (Rust/Go)
**Rejected because:**
- TypeScript/Node ecosystem is familiar
- Easier to prototype and iterate
- Can still compile to binary later if needed
- Current implementation is fast enough

### C. Cursor Extension
**Rejected because:**
- Cursor doesn't support custom extensions yet
- Would lock us into Cursor (want CLI independence)
- Can still integrate via Cursor commands

## Implementation Notes

### Package Setup
```json
{
  "name": "@tylerhoecker/intent",
  "bin": {
    "intent": "./dist/cli.js"
  }
}
```

### Installation Flow
1. User runs: `npm install -g @tylerhoecker/intent`
2. NPM creates symlink: `/usr/local/bin/intent` → package
3. User can now run `intent` from any directory

### Project Initialization
Each project gets its own:
- `.intent/config.json` - Project-specific config
- `.intent/decisions/` - Project-specific ADRs
- `.proposed-intent/` - Working files (gitignored)

But the **tool itself** is user-global.

## Related Decisions

- Future ADR: Whether to support project-local fallback (`./node_modules/.bin/intent`)
- Future ADR: Whether to build standalone binary for non-Node users

## Follow-Up Work

1. ✅ Package created with proper bin entry
2. ⏸️ Publish to NPM
3. ⏸️ Test global install on clean machine
4. ⏸️ Document team adoption workflow

## Notes

**Philosophy:** Intent is a **user tool**, not a **project dependency**. Like `git`, you install it once and use it everywhere.

**Quote from user:** "I just want to import it and use it as a cursor command... maybe it really is a user based tool moreso than a repo based tool."

This matches tools like:
- **git** - Version control (user-installed)
- **vim/emacs** - Text editing (user-installed)  
- **prettier** - Code formatting (project-installed)
- **eslint** - Linting (project-installed)

Intent is in the first category: tools that enhance YOUR workflow across ALL projects.


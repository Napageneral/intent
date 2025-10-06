# Architecture Decision Records (ADRs)

## Purpose

This directory contains **Architecture Decision Records** - documents that capture the **intent and context** behind significant changes to the codebase. Each ADR describes:

1. **What** changed (the diff/implementation)
2. **Why** we made the change (the problem/motivation)
3. **How** it impacts the system (consequences)
4. **When** it happened (git commit/PR reference)

## Why ADRs?

Traditional commit messages are **lossy**:
- They describe what changed, not why
- Context gets lost over time
- Future developers (and LLMs) can't understand intent

ADRs are **persistent memory**:
- Capture decision-making rationale
- Explain trade-offs considered
- Document alternatives rejected
- Link to related decisions

## Format

Each ADR follows this structure:

```markdown
# ADR-NNN: Short Title

**Status:** Accepted | Superseded | Deprecated
**Date:** YYYY-MM-DD
**Commits:** abc1234, def5678

## Context

What is the issue/problem we're trying to solve?
What constraints exist?

## Decision

What did we decide to do?
What specific changes were made?

## Consequences

### Positive
- Benefits gained
- Problems solved

### Negative
- Trade-offs made
- Technical debt incurred

### Neutral
- Things to monitor
- Follow-up work needed

## Alternatives Considered

What other approaches did we evaluate?
Why were they rejected?

## Implementation Notes

Key files changed, patterns introduced, etc.

## Related Decisions

- Links to other ADRs
- Links to relevant agents.md sections
```

## Naming Convention

ADRs are numbered sequentially:

```
001-short-descriptive-name.md
002-another-decision.md
003-yet-another.md
```

**Never reuse numbers** - even if an ADR is superseded, keep the file for historical reference.

## When to Write an ADR

Write an ADR for:

✅ **Architectural changes**
- New patterns introduced
- Major refactors
- Technology choices

✅ **Breaking changes**
- API changes
- Database migrations
- Config format changes

✅ **Feature removals**
- Dead code cleanup
- Deprecations
- Simplifications

✅ **Non-obvious decisions**
- "Why did we do it this way?"
- Trade-offs that need explanation
- Rejected alternatives worth documenting

❌ **Don't write an ADR for:**
- Trivial bug fixes
- Typo corrections
- Dependency updates (unless they change behavior)
- Pure code cleanup with no semantic changes

## Workflow

### 1. Make Code Changes
```bash
# Make your changes
git add .
```

### 2. Create ADR
```bash
# Find next number
ls scripts/intent/decisions/ | grep -E '^[0-9]+' | sort -n | tail -1

# Create new ADR
touch scripts/intent/decisions/NNN-your-title.md

# Use template from README.md
```

### 3. Link ADR to Commits
```bash
# In commit message
git commit -m "feat: context GUI-only selection

See: ADR-001 (scripts/intent/decisions/001-context-gui-only.md)

Docs-Reviewed: yes"
```

### 4. Update agents.md (Separately)
ADRs capture **intent** and **rationale**.
agents.md files capture **current state** and **how-to**.

They serve different purposes - don't conflate them.

## ADR Lifecycle

**Proposed** → **Accepted** → **Superseded** → **Deprecated**

- **Proposed**: Under discussion
- **Accepted**: Implemented and in use
- **Superseded**: Replaced by a newer ADR (link to successor)
- **Deprecated**: No longer relevant (explain why)

When superseding an ADR, update the status:

```markdown
# ADR-001: Old Decision

**Status:** Superseded by ADR-023
**Date:** 2025-10-01
...
```

## Examples

### Good ADR Title
✅ `001-context-gui-only.md` - Specific and searchable

### Bad ADR Title
❌ `001-frontend-changes.md` - Too vague

### Good Context
✅ "Users found typed context tags (@convos:...) confusing and hard to discover. Support requests showed 80% of users didn't know this feature existed."

### Bad Context
❌ "The old way was bad so we changed it."

### Good Decision
✅ "Remove typed context selection (@-tags). Use GUI chips exclusively. Modified 3 files: MultimodalInput.tsx, useContextTags.ts, compose.ts."

### Bad Decision
❌ "Made it better."

## Philosophy

ADRs are **lightweight documentation** that:

1. **Live in the codebase** - Versioned alongside code
2. **Are immutable** - Never delete, only supersede
3. **Focus on "why"** - Not "how" (that's what code/guides are for)
4. **Are searchable** - Future devs/LLMs can grep for keywords
5. **Build narrative** - Reading ADRs in order tells the story of the system

## Intent Integration

ADRs work alongside the Intent system:

- **Intent** detects code changes → updates agents.md (current state)
- **ADRs** capture why changes were made (historical intent)
- **agents.md** tells you how the system works now
- **ADRs** tell you why it works that way

Think of it as:
- **agents.md** = "What is true today"
- **ADRs** = "Why we made it true"

## Resources

- [Original ADR proposal by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
- [Markdown Any Decision Records (MADR)](https://adr.github.io/madr/)

---

**Remember:** The best time to write an ADR is **right after you make the decision**, while the context is fresh. Don't wait!


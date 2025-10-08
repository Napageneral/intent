# Architecture Decision Records

> Capturing the "why" behind code changes

## Purpose

ADRs document **intent and context** behind significant changes:

1. **What** changed (the implementation)
2. **Why** we made the change (the motivation)
3. **How** it impacts the system (consequences)
4. **When** it happened (commit/PR reference)

**Philosophy:** Code tells you what it does. ADRs tell you why it does it that way.

---

## When to Write an ADR

✅ **Write for:**
- Architectural changes
- Breaking changes
- Feature removals
- Non-obvious decisions
- Trade-offs worth documenting

❌ **Skip for:**
- Trivial bug fixes
- Typo corrections
- Dependency updates (unless behavior changes)

---

## Template

Copy this for new ADRs:

```markdown
# ADR-NNN: Short Descriptive Title

**Status:** Proposed | Accepted | Superseded | Deprecated  
**Date:** YYYY-MM-DD  
**Commits:** abc1234 or (Pending)

## Context

What problem are we solving? What constraints exist?

Be specific. Include data if available.

## Decision

What did we decide to do?

State it clearly in 1-3 sentences.

### Changes Made
- File A: What changed
- File B: What changed

## Consequences

### Positive
✅ Benefits gained

### Negative
❌ Trade-offs accepted

**Mitigation:** How we address negatives

### Neutral
ℹ️ Things to monitor

## Alternatives Considered

### Alternative A: [Name]
**Rejected because:**
- Reason 1
- Reason 2

## Implementation Notes

Key files, patterns, testing notes.

## Related Decisions

Links to other ADRs, issues, PRs.

## Follow-Up Work

- [ ] Task 1
- [ ] Task 2

## Notes

Additional context, quotes, philosophy.
```

---

## Active Decisions

*(Index updated by Intent)*

| Number | Title | Date | Status |
|--------|-------|------|--------|
| - | - | - | - |

---

## Best Practices

### Good Title
✅ "001-context-gui-only.md" - Specific and searchable  
❌ "001-frontend-changes.md" - Too vague

### Good Context
✅ "Users found typed tags confusing. 80% didn't know the feature existed."  
❌ "The old way was bad."

### Good Decision
✅ "Remove typed context. Modified 3 files: MultimodalInput.tsx, useContextTags.ts, compose.ts."  
❌ "Made it better."

---

## Lifecycle

**Proposed** → **Accepted** → **Superseded** → **Deprecated**

When superseding:
```markdown
**Status:** Superseded by ADR-023
```

Never delete ADRs - they're historical record.

---

## Workflow

1. Make code changes
2. Copy template above
3. Name: `NNN-title.md` (sequential number)
4. Fill all sections
5. Commit with: "See: ADR-NNN"

---

## Philosophy

ADRs are **lightweight documentation** that:

1. **Live in the codebase** - Versioned alongside code
2. **Are immutable** - Never delete, only supersede
3. **Focus on "why"** - Not "how" (code shows that)
4. **Are searchable** - grep-able by future devs/LLMs
5. **Build narrative** - Reading in order tells the story

Think of it as:
- **agents.md** = "What is true today"
- **ADRs** = "Why we made it true"

---

## Resources

- [Original ADR proposal](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)

---

**Remember:** Write ADRs **right after the decision**, while context is fresh!


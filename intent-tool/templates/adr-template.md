# ADR-NNN: [Short Descriptive Title]

**Status:** Proposed | Accepted | Superseded | Deprecated  
**Date:** YYYY-MM-DD  
**Commits:** [commit-sha] or (Pending)

## Context

**What problem are we solving?**

Describe the issue, problem, or opportunity that prompted this decision. Include:
- Current state / pain points
- Constraints (technical, business, time)
- Stakeholders affected
- Quantitative data if available (e.g., "80% of users reported confusion")

Keep this section factual and objective. Don't advocate for the solution yet.

## Decision

**What did we decide to do?**

State the decision clearly and concisely. This should be 1-3 sentences that someone can understand without reading the full document.

Example: "Remove typed context selection (@-tags). Context can now only be added via GUI chips. Modified 3 files: MultimodalInput.tsx, useContextTags.ts, compose.ts."

### Changes Made

Bullet list of specific changes:
- File A: What changed
- File B: What changed
- Pattern X introduced
- API Y deprecated

## Consequences

### Positive

✅ Benefits gained
✅ Problems solved
✅ New capabilities enabled

### Negative

❌ Trade-offs accepted
❌ Technical debt incurred
❌ Limitations introduced

*Mitigation:* How we'll address each negative consequence

### Neutral

ℹ️ Things to monitor
ℹ️ Follow-up work needed
ℹ️ Unknowns or uncertainties

## Alternatives Considered

List other options that were evaluated and why they were rejected.

### Alternative A: [Name]
**Rejected because:**
- Reason 1
- Reason 2

### Alternative B: [Name]
**Rejected because:**
- Reason 1
- Reason 2

## Implementation Notes

### Files Modified
- `/path/to/file1.ts`
- `/path/to/file2.py`

### Files Pending Cleanup
- `/path/to/deprecated.ts` (unused after this change)

### Testing Checklist
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

### Architecture Insights

Any important patterns, principles, or system properties revealed or introduced by this decision.

## Related Decisions

- Link to other ADRs: "See ADR-XXX for..."
- Link to agents.md sections: "See `app/backend/agents.md` for current architecture"
- Link to issues/PRs: "Closes #123"

## Follow-Up Work

1. ✅ Completed item
2. ⏸️ Pending item
3. 🚧 In progress item

## Notes

Any additional context, quotes, philosophy, or rationale that doesn't fit elsewhere.

**Philosophy:** The guiding principle behind this decision.

**Quote:** Relevant wisdom from docs, team discussions, or external sources.


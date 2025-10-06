# ADR-004: Intent Documentation Update

**Status:** Proposed
**Date:** 2025-10-06
**Commits:** (Pending)

## Context

Code changes detected in the repository that require documentation updates.

## Changes Made

- No guide changes

## Code Diff Summary

```
# Staged Changes:
diff --git a/.gitignore b/.gitignore
index 8e69ef9..00bcf52 100644
--- a/.gitignore
+++ b/.gitignore
@@ -4,8 +4,4 @@ dist/
 .DS_Store
 .env
 *.db
-.proposed-intent/
-
-# Intent's own working files
-.intent/
-
+.intent/.proposed-intent/
\ No newline at end of file
diff --git a/.intent/agents.md b/.intent/agents.md
new file mode 100644
index 0000000..36ce6a5
--- /dev/null
+++ b/.intent/agents.md
@@ -0,0 +1,174 @@
+# Architecture Decision Records
+
+> Capturing the "why" behind code changes
+
+## Purpose
+
+ADRs document **intent and context** behind significant changes:
+
+1. **What** changed (the implementation)
+2. **Why** we made the change (the motivation)
+3. **How** it impacts the system (consequences)
+4. **When** it happened (commit/PR reference)
+
+**Philosophy:** Code tells you what it does. ADRs tell you why it does it that way.
+
+---
+
+## When to Write an ADR
+
+✅ **Write for:**
+- Architectural changes
+- Breaking changes
+- Feature removals
+- Non-obvious decisions
+- Trade-offs worth documenting
+
+❌ **Skip for:**
+- Trivial bug fixes

... (truncated)
```

## Verification

- [ ] All affected guides updated
- [ ] ADR created
- [ ] Changes committed

# Testing Phase 1: Layered Workflow

## Quick Verification Test

### Setup
```bash
cd /Users/tyler/Desktop/projects/intent-tool

# Make a small code change to test
echo "// Test change $(date)" >> src/cli.ts

# Stage it
git add src/cli.ts
```

### Run the workflow
```bash
# Option 1: CLI (see direct output)
bun run src/cli.ts

# Option 2: GUI (see streaming progress)
intent
# Then click "Generate Intent Documentation" in browser
```

### What to Look For

#### ✅ **Signs it's working (real AI work):**

1. **Console shows actual layer processing:**
   ```
   📚 Intent - Layered Guide Updater
   Scope: staged
   
   🔍 Detecting changed files and affected guides...
   Found 1 affected guide(s)
   
   📊 Building guide tree (bottom-up layers)...
   Computed 1 layer(s)
     Layer 0: 1 guide(s) - agents.md
   
   🔶 Layer 0 (1 guide(s))
     🤖 Updating guides with Claude Code...
   ```

2. **Files are actually changed:**
   ```bash
   git diff agents.md
   # Should show actual changes!
   ```

3. **State directory created:**
   ```bash
   ls -la .intent/state/
   # Should see layer-0-summary.json, etc.
   ```

4. **UI shows progress updates** (if using GUI):
   - Queue shows guides being processed
   - Status messages update in real-time
   - Takes actual time (not instant)

#### ❌ **Signs it's still broken (theater):**

1. **Instant completion** (~150ms)
2. **No git diff changes** to agents.md
3. **No .intent/state/ directory**
4. **Generic ADR with no guide diffs**

### Expected Timing

- **Detection:** < 100ms ⚡
- **Layer building:** < 100ms ⚡
- **Layer 0 processing:** 10-30 seconds ⏱️ ← THIS IS THE KEY!
- **ADR generation:** < 100ms (template, will be slow in Phase 2)
- **Commit message:** < 100ms (template, will be slow in Phase 3)

**Total:** 10-30 seconds (most time is Claude Code updating guides)

If it finishes in under 1 second, something is wrong!

## Debugging Common Issues

### Issue: "No guides affected"
**Cause:** No staged changes or changes don't affect any agents.md files
**Fix:** Make sure you've `git add` some files and that there's an agents.md in the tree

### Issue: "No directory-scoped diffs"
**Cause:** The staged changes are in a directory with no agents.md
**Fix:** Either add an agents.md or make changes in a directory that has one

### Issue: "Some guides failed to update"
**Cause:** Claude Code SDK error (API key, rate limits, etc.)
**Fix:** 
- Check `ANTHROPIC_API_KEY` is set
- Check you have API credits
- Check the error message in console

### Issue: Still instant (<1 second)
**Cause:** Workflow is not actually calling Claude Code
**Fix:**
- Check that `server/svc/workflow.ts` was updated
- Rebuild with `bun run build`
- Restart the server

### Issue: State directory not created
**Cause:** Permission issues or path problems
**Fix:**
- Check `.intent/` directory exists
- Try `mkdir -p .intent/state`

## Detailed Verification

### 1. Check the workflow file
```bash
grep -n "TODO: Re-enable" server/svc/workflow.ts
```
**Should return:** Nothing (that TODO is gone!)

### 2. Check the layer summary
```bash
cat .intent/state/layer-0-summary.json
```
**Should contain:** JSON with guide paths and their diffs

### 3. Check the generated ADR
```bash
cat .intent/decisions/00X-*.md | grep -A 5 "Guides Updated"
```
**Should show:** Actual guide paths (e.g., "- agents.md")

### 4. Check the commit message
```bash
git log --format=%B -n 1
```
**Should include:** 
- "docs: update engineering guides"
- List of guides updated
- ADR reference

## Success Criteria

✅ **Phase 1 is working if:**

1. Workflow takes more than 5 seconds (actual AI work)
2. `git diff` shows changes to agents.md files
3. `.intent/state/` directory exists with layer summaries
4. ADR includes actual guide diffs (not just templates)
5. Commit message lists guides that were updated
6. UI shows real-time progress (if using GUI)

## Next Steps After Verification

Once Phase 1 is confirmed working:

**Phase 2:** Add LLM-powered ADR generation
- Replace template with Claude Code SDK call
- Load previous ADRs for context
- Generate semantic, detailed ADRs

**Phase 3:** Add semantic commit message generation  
- Replace file listing with LLM analysis
- Generate conventional commit format
- Include context about why changes were made

**Phase 4:** Polish
- Better error handling
- Retry logic for failed guides
- Progress percentage
- Estimated time remaining

---

**Ready to test!** 🧪

Make a small change, stage it, and run `intent` to see if the workflow actually updates your guides.


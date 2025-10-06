# Testing Intent with Claude Code

## Quick Test

```bash
# 1. Verify intent is linked and built
cd ~/Desktop/projects/intent-tool
npm run build
intent version

# 2. Test in ChatStats
cd ~/Desktop/projects/ChatStats

# 3. Set API key (if not already in ~/.zshrc)
export ANTHROPIC_API_KEY=your-key

# 4. Run automated workflow
intent update --auto

# Expected output:
# 🔍 Detecting changes...
# 📚 Intent - Engineering Guide Updater
# Scope: staged
# 🔍 Detecting changed files and affected guides...
# Found 5 affected guide(s)
# 📦 Building context bundles...
# Created 5 context bundle(s)
# ✍️  Generating LLM prompts...
# ✓ Generated 5 prompt(s)
# 🤖 Generating patches with Claude Code...
# 🔄 Generating 5 patches in parallel...
#   [1/5] Processing app__agents.md...
#   ✓ [1/5] Complete
#   [2/5] Processing app__frontend__agents.md...
#   ✓ [2/5] Complete
#   ... etc ...
# ✅ Generated 5 patches in 10.2s
# 📦 Applying 5 patch(es)...
#   ✓ [1/5] Applied: app__agents.md.patch
#   ✓ [2/5] Applied: app__frontend__agents.md.patch
#   ... etc ...
# ✅ Applied 5 patch(es)
# 🎉 All done! Your guides have been updated.

# 5. Review changes
git diff app/agents.md
git diff app/frontend/agents.md

# 6. If good, commit
git commit -m "feat: context GUI-only + cleanup + intent extraction

See: ADR-001, ADR-002, ADR-003, ADR-004

Docs-Reviewed: yes"
```

## If You Get Errors

### "Cannot find module '@anthropic-ai/claude-agent-sdk'"

The module might not be resolving correctly. Try:

```bash
# Rebuild and relink
cd ~/Desktop/projects/intent-tool
npm install
npm run build
npm link

# Open a NEW terminal window
cd ~/Desktop/projects/ChatStats
intent update --auto
```

### "ANTHROPIC_API_KEY not set"

```bash
export ANTHROPIC_API_KEY=your-key-here
```

Or add to `~/.zshrc` for persistence.

## Success Criteria

✅ intent update --auto completes without errors  
✅ 5 .patch files created in .proposed-intent/  
✅ Patches applied to agents.md files  
✅ git diff shows updated documentation  
✅ Total time: ~10-15 seconds


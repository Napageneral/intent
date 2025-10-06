# Intent Quick Start

## 🚀 Installation (Development)

```bash
cd ~/Desktop/projects/intent-tool
npm install
npm run build
npm link
```

Verify:
```bash
intent version  # Should show v0.1.0
```

## ⚡ Usage in Any Project

### First Time Setup
```bash
cd your-project/
intent init
```

Creates:
- `.intent/config.json` - Project settings
- `.intent/decisions/agents.md` - ADR guide + template

### Daily Workflow

#### Option 1: Manual Review (Safe)
```bash
# Make code changes
git add .

# Generate prompts
intent update

# Review in Cursor, generate patches manually
# Apply: git apply .proposed-intent/*.patch
```

#### Option 2: Fully Automated (Fast) ⭐
```bash
# Make code changes
git add .

# Generate + process + apply automatically
intent update --auto

# Done! Review changes
git diff

# Commit
git commit -m "feat: new feature

Docs-Reviewed: yes"
```

#### Option 3: Generate But Review Before Apply
```bash
git add .

# Generate patches but don't apply
intent update --auto --skip-apply

# Review patches in .proposed-intent/
# Apply manually when ready
git apply --index .proposed-intent/*.patch
```

## 🔑 Required Environment Variable

```bash
export ANTHROPIC_API_KEY=your-key-here
```

Add to your `~/.zshrc` or `~/.bashrc`:
```bash
echo 'export ANTHROPIC_API_KEY=your-key' >> ~/.zshrc
source ~/.zshrc
```

## 📊 How It Works

### Without --auto (Manual)
```
1. Detect changes (0.1s)
2. Build context (0.2s)
3. Generate prompts (0.1s)
→ User reviews in Cursor
→ User generates patches
→ User applies patches
Total: ~5-10 minutes
```

### With --auto (Automated)
```
1. Detect changes (0.1s)
2. Build context (0.2s)
3. Generate prompts (0.1s)
4. Process with Claude (10s parallel)
5. Apply patches (0.5s)
Total: ~10-15 seconds ⚡
```

## 🎯 Testing Intent on ChatStats

```bash
cd ~/Desktop/projects/ChatStats

# You have staged changes:
# - Context GUI-only feature
# - Dead code cleanup
# - Intent extraction

# Test automated workflow
intent update --auto

# Should:
# 1. Find 5 affected agents.md files
# 2. Generate 5 patches in parallel (~10s)
# 3. Apply all patches
# 4. Show summary

# Review changes
git diff app/*/agents.md

# If good, commit
git commit -m "feat: context GUI-only + cleanup + intent extraction

Changes:
- Removed typed context selection
- Deleted dead analysis components
- Extracted intent-tool as standalone package

See: ADR-001, ADR-002, ADR-003, ADR-004

Docs-Reviewed: yes"
```

## 🐕 Dogfooding Intent on Itself

```bash
cd ~/Desktop/projects/intent-tool

# Make changes to intent
# ...edit code...

# Stage changes
git add .

# Use intent on itself!
intent update --auto

# This will update:
# - intent-tool/agents.md
# - Any new layer-specific agents.md files

# Review and commit
git diff agents.md
git commit -m "feat: your feature

See: ADR-003

Docs-Reviewed: yes"
```

## 🔧 Configuration

`.intent/config.json`:
```json
{
  "projectName": "YourProject",
  "adrDirectory": ".intent/decisions",
  "agentsFiles": ["agents.md", "CLAUDE.md"],
  "autoGenerateADRs": false,
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5"
  }
}
```

## 💡 Tips

- **First run?** Use `intent update` (no --auto) to see prompts first
- **Confident?** Use `intent update --auto` for speed
- **Review before apply?** Use `intent update --auto --skip-apply`
- **CI/CD?** Perfect for GitHub Actions with `--auto` flag

## 🚨 Troubleshooting

### "ANTHROPIC_API_KEY not set"
```bash
export ANTHROPIC_API_KEY=your-key
```

### "No prompts found"
```bash
# Make sure you have changes
git status

# Stage them
git add .

# Try again
intent update
```

### "Patch failed to apply"
```bash
# Guide was modified, regenerate
intent update --auto
```

## 📚 Next Steps

After testing:
1. Add ADR generation (single-turn)
2. Add agent mode for complex workflows
3. Add onboarding flow for legacy codebases
4. Publish to NPM

## 🎉 The Vision

Eventually:
```bash
# Full dev cycle with agent
intent dev

Agent: "What should we build?"
You: "Add PDF export feature"
Agent: [searches, plans, implements, tests]
Agent: "Done! Updated 3 files, added tests. Commit?"
You: "Yes"
Agent: [updates agents.md, generates ADR, commits]
✅ Complete!
```

But for now: **Fast, automated agents.md updates** 🚀


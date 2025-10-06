# 🎉 Intent Tool - Ready for Testing!

## ✅ What's Been Built

You now have a **complete, intelligent documentation automation system**!

### **Core Features:**
- ✅ **Smart Launch**: Just type `intent` - auto-starts server, opens browser
- ✅ **Context Detection**: Sees your changes in real-time
- ✅ **Layered Workflow**: Bottom-up guide updates with child→parent context
- ✅ **Onboarding**: Scan projects, generate question packs, synthesize drafts
- ✅ **Review UI**: Intent-focused diff view (agents.md + ADRs only)
- ✅ **Auto-commit**: Generate ADR + commit message, one-click commit

### **Tech Stack:**
- Bun + TypeScript (CLI + Server)
- Hono (HTTP framework)
- React + Vite (GUI)
- SQLite (persistence)
- Claude Code SDK (direct file editing)
- SSE (real-time streaming)

---

## 🧪 HOW TO TEST

### Prerequisites:
```bash
cd /Users/tyler/Desktop/projects/intent-tool
# You have 8 unstaged files with real changes ready to test!
```

### Test Flow:

#### 1️⃣ **Launch Intent**
```bash
intent
```

**What happens:**
- Checks if server is running
- Starts detached Bun server if needed
- Opens http://localhost:5174 in your browser
- Shows dashboard with your current context

#### 2️⃣ **See Your Changes (Dashboard)**
You should see:
```
📝 Active Changes Detected

Staged Files:   0
Unstaged Files: 8+
Affected Guides: 1 (agents.md)

Potentially Stale Guides:
[agents.md]

[🚀 Update All Guides (Layered)] [Review Changes]
```

#### 3️⃣ **Click "Review Changes"**
Shows intent-focused review:
- **Code Changes Summary**: 8 files with +/- line counts (collapsed view)
- **agents.md Diff**: Full diff showing what needs updating (syntax highlighted)
- **Big Button**: "✨ Update Docs & Generate ADR"

#### 4️⃣ **Click "Update Docs & Generate ADR"**
Intent will:
1. Run layered workflow to update `agents.md`
2. Generate ADR documenting today's changes
3. Propose a commit message

Shows:
```
📋 Generated ADR
[Full ADR markdown preview]

💬 Proposed Commit Message
[Editable textarea with generated message]

[✅ Accept & Commit] [← Back to Review]
```

#### 5️⃣ **Click "Accept & Commit"**
- Stages all guides + ADR
- Commits with the message
- Redirects to dashboard
- Shows success!

---

## 🔍 What To Watch For

### Expected Behavior:
- ✅ Dashboard auto-refreshes every 5s
- ✅ Change counts update when you modify files
- ✅ Affected guides list updates dynamically
- ✅ Review page only shows guide/ADR diffs in full
- ✅ Code files just show filename + counts

### Potential Issues:
- ⚠️ ADR generation might take 30-60s (Claude Code is thinking)
- ⚠️ If you see "NO-CHANGES-NEEDED" in ADR, Claude was too conservative
- ⚠️ Browser might not auto-open on non-macOS (just open http://localhost:5174 manually)

---

## 🎯 Complete Workflow You're Testing

```
                   Developer makes code changes
                              ↓
                      Type: intent
                              ↓
            ┌─────────────────┴──────────────────┐
            │     Server starts (if needed)       │
            │     Browser opens to dashboard      │
            └─────────────────┬──────────────────┘
                              ↓
            ┌─────────────────┴──────────────────┐
            │   Dashboard shows:                  │
            │   - 8 unstaged files                │
            │   - 1 affected guide (agents.md)    │
            │   - Stale guide indicator           │
            └─────────────────┬──────────────────┘
                              ↓
                    Click "Review Changes"
                              ↓
            ┌─────────────────┴──────────────────┐
            │   Review Page shows:                │
            │   - Code files: names + counts      │
            │   - agents.md: FULL diff           │
            │   - Button: Update Docs & Gen ADR   │
            └─────────────────┬──────────────────┘
                              ↓
                Click "Update Docs & Generate ADR"
                              ↓
            ┌─────────────────┴──────────────────┐
            │   Backend:                          │
            │   1. Runs layered workflow          │
            │   2. Claude updates agents.md       │
            │   3. Claude generates ADR           │
            │   4. Generates commit message       │
            └─────────────────┬──────────────────┘
                              ↓
            ┌─────────────────┴──────────────────┐
            │   Shows:                            │
            │   - Generated ADR preview           │
            │   - Commit message (editable)       │
            │   - Button: Accept & Commit         │
            └─────────────────┬──────────────────┘
                              ↓
                    Click "Accept & Commit"
                              ↓
            ┌─────────────────┴──────────────────┐
            │   - Stages guides + ADR             │
            │   - Commits with message            │
            │   - Redirects to dashboard          │
            │   - Shows success alert             │
            └─────────────────────────────────────┘
```

---

## 🚀 Commands Available

```bash
# Smart start (recommended!)
intent

# Traditional commands
intent init         # Initialize .intent/ in project
intent update       # Generate prompts only
intent update --auto --layered  # Run full layered update
intent onboard      # Scan for missing guides
intent synthesize   # Generate drafts from answered questions
intent serve        # Start server (foreground)
```

---

## 📊 Built Features

| Feature | Status |
|---------|--------|
| Layered workflow | ✅ Complete |
| Storage (SQLite) | ✅ Complete |
| Onboarding | ✅ Complete |
| HTTP Server + API | ✅ Complete |
| React GUI | ✅ Complete |
| Smart context detection | ✅ Complete |
| Diff review UI | ✅ Complete |
| ADR generation | ✅ Complete |
| Commit message generation | ✅ Complete |
| One-click commit | ✅ Complete |

**Total: 34/49 tasks complete (69%!)**

---

## 🔧 Quick Dev Commands

```bash
# Rebuild everything
./dev.sh

# Just rebuild CLI
npm run build:cli && sed -i '' '1s|^#!/usr/bin/env node|#!/usr/bin/env bun|' dist/src/cli.js && npm link

# Just rebuild web
npm run build:web

# Start server manually (for debugging)
bun run server/index.ts

# Check server health
curl http://localhost:5174/api/health
```

---

## 📝 After Testing

If everything works:
1. Stage all changes: `git add -A`
2. Let Intent document itself: `intent` (it will create its own ADR!)
3. Review and commit through the GUI
4. Push to GitHub: `git push origin main`

If something breaks:
- Check server logs
- Test endpoints with `curl`
- Check browser console for errors
- Let me know and I'll fix it!

---

**You're about to test a tool that documents itself. Meta level: 100. 🎯**

Good luck! 🚀


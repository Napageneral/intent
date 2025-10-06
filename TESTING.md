# Testing Guide - Intent Tool

## 🧪 Ready to Test!

All changes are **unstaged** and ready for you to test the complete workflow.

## 🎯 Test Scenario

From the `intent-tool` directory, you have **real uncommitted changes** that Intent can document!

### Step 1: Launch Intent
```bash
cd /Users/tyler/Desktop/projects/intent-tool
intent
```

**Expected:**
- ✅ Server starts on http://localhost:5174
- ✅ Browser opens automatically
- ✅ Dashboard shows "Active Changes Detected" panel

### Step 2: Review Changes
On the dashboard, you should see:
- **Staged Files**: 0 (because we haven't staged yet)
- **Unstaged Files**: 7+ (all our new code!)
- **Affected Guides**: 1 (agents.md)
- **Stale Guides**: Badge showing "agents.md"

Click **"Review Changes"** button

### Step 3: Intent Review Page
You'll see:
- **Code Changes Summary**: List of 7 files with +/- counts (just filenames, no full diff)
- **Guide Diffs**: FULL diff view of `agents.md` showing what needs updating
- **Bottom Button**: "✨ Update Docs & Generate ADR"

Click the button!

### Step 4: Generation (This is the magic!)
Intent will:
1. Run layered workflow to update `agents.md`
2. Generate a new ADR in `.intent/decisions/`
3. Propose a commit message

You'll see:
- **Generated ADR**: Full markdown preview
- **Commit Message**: Editable textarea with proposed message
- **Two buttons**: "✅ Accept & Commit" or "← Back to Review"

### Step 5: Commit
Edit the commit message if you want, then click **"Accept & Commit"**

**Expected:**
- ✅ All guide changes + ADR committed
- ✅ Redirects to dashboard
- ✅ Shows success message

## 📦 What's Been Built

**New Files:**
- `server/svc/context.ts` - Smart change detection
- `server/svc/changes.ts` - File change tracking
- `server/svc/intent.ts` - Intent generation (update + ADR + commit msg)
- `web/src/pages/Review.tsx` - Diff review UI

**Modified:**
- `src/cli.ts` - Smart start (no args opens GUI)
- `server/index.ts` - New endpoints: /api/changes, /api/generate-intent, /api/commit
- `web/src/pages/Dashboard.tsx` - Context-aware change detection panel
- `web/src/App.tsx` - Added Review route

**New Endpoints:**
- GET `/api/context` - Project context with change detection
- GET `/api/changes` - List of changed files with line counts
- POST `/api/generate-intent` - Run update + generate ADR + commit msg
- POST `/api/commit` - Stage guides + ADR, commit

## 🐛 Known Issues to Watch For

1. **ADR generation might timeout** - If Claude Code takes too long
2. **Commit might fail** - If there are merge conflicts
3. **Browser might not auto-open** - Platform-specific (works on macOS)

## 🔥 Cool Things to Try

After testing the basic flow:
1. Make another code change while server is running - watch it auto-detect (5s refresh)
2. Click "Update All Guides (Layered)" from dashboard - runs without opening review
3. Check `.intent/state/layer-0-summary.json` - see the layer summaries
4. Run `intent onboard` - see it find missing guides
5. Check SQLite database: `sqlite3 .intent/intent.db "SELECT * FROM run;"`

## 🚀 Next Session

Once this works, we can add:
- Live SSE progress during updates
- Settings page for model/policy config
- Verification (signal health checks)
- Multi-layer visualization for complex updates

---

**Have fun testing! 🎉**


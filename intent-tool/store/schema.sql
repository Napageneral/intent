-- Intent Tool Database Schema
-- SQLite database for tracking guides, runs, question packs, and ADRs

-- Project metadata (single row)
CREATE TABLE IF NOT EXISTS project (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  repo_root TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Guide files being tracked
CREATE TABLE IF NOT EXISTS guide (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,           -- 'app/frontend/agents.md'
  parent_path TEXT,                    -- 'app/agents.md' or NULL for root
  last_hash TEXT,                      -- sha256 of file contents at last check
  last_updated_at TEXT,
  coverage_level TEXT,                 -- 'system|service|feature|component'
  status TEXT DEFAULT 'active',       -- 'active|draft|archived'
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_guide_path ON guide(path);
CREATE INDEX IF NOT EXISTS idx_guide_parent ON guide(parent_path);

-- Update runs (layered or flat)
CREATE TABLE IF NOT EXISTS run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  scope TEXT NOT NULL,                 -- 'staged|head|pr'
  layered INTEGER DEFAULT 1,           -- 1 = layered, 0 = flat
  status TEXT DEFAULT 'running',       -- 'running|success|partial|failed|noop'
  model TEXT DEFAULT 'claude-sonnet-4-5',
  total_layers INTEGER,
  guides_updated INTEGER DEFAULT 0,
  guides_nochange INTEGER DEFAULT 0,
  guides_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  total_cost_cents INTEGER,            -- optional tracking
  meta_json TEXT                       -- extra metadata as JSON
);

CREATE INDEX IF NOT EXISTS idx_run_status ON run(status);
CREATE INDEX IF NOT EXISTS idx_run_started ON run(started_at DESC);

-- Per-guide results within a run
CREATE TABLE IF NOT EXISTS run_guide (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  guide_path TEXT NOT NULL,
  layer_index INTEGER NOT NULL,       -- which layer this guide was in
  status TEXT NOT NULL,                -- 'updated|nochange|failed|skipped'
  llm_turns INTEGER,                   -- how many LLM turns used
  duration_ms INTEGER,
  diff_summary TEXT,                   -- compact unified diff or summary
  error TEXT,                          -- error message if failed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_run_guide_run ON run_guide(run_id);
CREATE INDEX IF NOT EXISTS idx_run_guide_status ON run_guide(run_id, status);

-- Question packs for onboarding
CREATE TABLE IF NOT EXISTS question_pack (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_path TEXT NOT NULL,            -- target guide path
  status TEXT DEFAULT 'draft',         -- 'draft|answered|synthesized|applied'
  content_md TEXT,                     -- question markdown
  answers_md TEXT,                     -- answered questions markdown
  synthesized_draft TEXT,              -- generated draft guide
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qpack_path ON question_pack(guide_path);
CREATE INDEX IF NOT EXISTS idx_qpack_status ON question_pack(status);

-- Architecture Decision Records
CREATE TABLE IF NOT EXISTS adr (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER UNIQUE NOT NULL,      -- 001, 002, etc.
  path TEXT UNIQUE NOT NULL,           -- '.intent/decisions/001-foo.md'
  title TEXT NOT NULL,
  status TEXT DEFAULT 'accepted',      -- 'draft|accepted|superseded|deprecated'
  date TEXT NOT NULL,
  commits TEXT,                        -- comma-separated short SHAs
  summary TEXT,                        -- short description
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adr_number ON adr(number);
CREATE INDEX IF NOT EXISTS idx_adr_status ON adr(status);

-- Coverage tracking (onboarding scan results)
CREATE TABLE IF NOT EXISTS coverage_candidate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,           -- directory path
  score REAL NOT NULL,                 -- 0.0 - 1.0 heuristic score
  reason_tags TEXT,                    -- JSON array of reasons: ["routes","tests"]
  has_guide INTEGER DEFAULT 0,         -- 0 = needs guide, 1 = has guide
  status TEXT DEFAULT 'pending',       -- 'pending|accepted|rejected|applied'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coverage_status ON coverage_candidate(status);
CREATE INDEX IF NOT EXISTS idx_coverage_score ON coverage_candidate(score DESC);


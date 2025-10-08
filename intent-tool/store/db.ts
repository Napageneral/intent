/**
 * Intent Database Layer
 * 
 * Bun.sqlite wrapper for Intent storage
 * Tables: project, guide, run, run_guide, question_pack, adr, coverage_candidate
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

let _db: Database | null = null;

/**
 * Get or initialize the database
 */
export function getDb(projectRoot?: string): Database {
  if (_db) return _db;
  
  const root = projectRoot || process.env.USER_CWD || process.cwd();
  const intentDir = join(root, '.intent');
  const dbPath = join(intentDir, 'intent.db');
  
  // Ensure .intent directory exists
  if (!existsSync(intentDir)) {
    mkdirSync(intentDir, { recursive: true });
  }
  
  // Open database
  _db = new Database(dbPath);
  
  // Load schema if this is a new database
  if (!tableExists(_db, 'project')) {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    _db.exec(schema);
  }
  
  return _db;
}

/**
 * Check if a table exists
 */
function tableExists(db: Database, tableName: string): boolean {
  const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return !!result;
}

/**
 * Close the database connection
 */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// ===== PROJECT =====

export interface Project {
  id: number;
  name: string;
  repo_root: string;
  created_at: string;
  updated_at: string;
}

export function upsertProject(name: string, repo_root: string): void {
  const db = getDb();
  db.run(
    `INSERT INTO project (id, name, repo_root) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=?, repo_root=?, updated_at=CURRENT_TIMESTAMP`,
    [name, repo_root, name, repo_root]
  );
}

export function getProject(): Project | null {
  const db = getDb();
  return db.query('SELECT * FROM project WHERE id = 1').get() as Project | null;
}

// ===== GUIDE =====

export interface Guide {
  id: number;
  path: string;
  parent_path: string | null;
  last_hash: string | null;
  last_updated_at: string | null;
  coverage_level: string | null;
  status: string;
  notes: string | null;
}

export function upsertGuide(guide: Partial<Guide> & { path: string }): void {
  const db = getDb();
  const existing = db.query('SELECT id FROM guide WHERE path = ?').get(guide.path) as { id: number } | null;
  
  if (existing) {
    // Update
    const fields: string[] = [];
    const values: any[] = [];
    
    if (guide.parent_path !== undefined) { fields.push('parent_path=?'); values.push(guide.parent_path); }
    if (guide.last_hash !== undefined) { fields.push('last_hash=?'); values.push(guide.last_hash); }
    if (guide.last_updated_at !== undefined) { fields.push('last_updated_at=?'); values.push(guide.last_updated_at); }
    if (guide.coverage_level !== undefined) { fields.push('coverage_level=?'); values.push(guide.coverage_level); }
    if (guide.status !== undefined) { fields.push('status=?'); values.push(guide.status); }
    if (guide.notes !== undefined) { fields.push('notes=?'); values.push(guide.notes); }
    
    if (fields.length > 0) {
      values.push(guide.path);
      db.run(`UPDATE guide SET ${fields.join(', ')} WHERE path = ?`, values);
    }
  } else {
    // Insert
    db.run(
      `INSERT INTO guide (path, parent_path, last_hash, last_updated_at, coverage_level, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        guide.path,
        guide.parent_path || null,
        guide.last_hash || null,
        guide.last_updated_at || null,
        guide.coverage_level || null,
        guide.status || 'active',
        guide.notes || null
      ]
    );
  }
}

export function getGuide(path: string): Guide | null {
  const db = getDb();
  return db.query('SELECT * FROM guide WHERE path = ?').get(path) as Guide | null;
}

export function getAllGuides(): Guide[] {
  const db = getDb();
  return db.query('SELECT * FROM guide ORDER BY path').all() as Guide[];
}

// ===== RUN =====

export interface Run {
  id: number;
  started_at: string;
  finished_at: string | null;
  scope: string;
  layered: number;
  status: string;
  model: string;
  total_layers: number | null;
  guides_updated: number;
  guides_nochange: number;
  guides_failed: number;
  duration_ms: number | null;
  total_cost_cents: number | null;
  meta_json: string | null;
}

export function insertRun(run: Partial<Run> & { scope: string }): number {
  const db = getDb();
  const result = db.run(
    `INSERT INTO run (scope, layered, model, status)
     VALUES (?, ?, ?, ?)`,
    [
      run.scope,
      run.layered ?? 1,
      run.model || 'claude-sonnet-4-5',
      run.status || 'running'
    ]
  );
  return result.lastInsertRowid as number;
}

export function updateRun(id: number, updates: Partial<Run>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.finished_at !== undefined) { fields.push('finished_at=?'); values.push(updates.finished_at); }
  if (updates.status !== undefined) { fields.push('status=?'); values.push(updates.status); }
  if (updates.total_layers !== undefined) { fields.push('total_layers=?'); values.push(updates.total_layers); }
  if (updates.guides_updated !== undefined) { fields.push('guides_updated=?'); values.push(updates.guides_updated); }
  if (updates.guides_nochange !== undefined) { fields.push('guides_nochange=?'); values.push(updates.guides_nochange); }
  if (updates.guides_failed !== undefined) { fields.push('guides_failed=?'); values.push(updates.guides_failed); }
  if (updates.duration_ms !== undefined) { fields.push('duration_ms=?'); values.push(updates.duration_ms); }
  if (updates.total_cost_cents !== undefined) { fields.push('total_cost_cents=?'); values.push(updates.total_cost_cents); }
  if (updates.meta_json !== undefined) { fields.push('meta_json=?'); values.push(updates.meta_json); }
  
  if (fields.length > 0) {
    values.push(id);
    db.run(`UPDATE run SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

export function getRun(id: number): Run | null {
  const db = getDb();
  return db.query('SELECT * FROM run WHERE id = ?').get(id) as Run | null;
}

export function getLatestRun(): Run | null {
  const db = getDb();
  return db.query('SELECT * FROM run ORDER BY started_at DESC LIMIT 1').get() as Run | null;
}

export function getAllRuns(limit = 50): Run[] {
  const db = getDb();
  return db.query('SELECT * FROM run ORDER BY started_at DESC LIMIT ?').all(limit) as Run[];
}

// ===== RUN_GUIDE =====

export interface RunGuide {
  id: number;
  run_id: number;
  guide_path: string;
  layer_index: number;
  status: string;
  llm_turns: number | null;
  duration_ms: number | null;
  diff_summary: string | null;
  error: string | null;
  created_at: string;
}

export function insertRunGuide(rg: Omit<RunGuide, 'id' | 'created_at'>): void {
  const db = getDb();
  db.run(
    `INSERT INTO run_guide (run_id, guide_path, layer_index, status, llm_turns, duration_ms, diff_summary, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rg.run_id,
      rg.guide_path,
      rg.layer_index,
      rg.status,
      rg.llm_turns || null,
      rg.duration_ms || null,
      rg.diff_summary || null,
      rg.error || null
    ]
  );
}

export function getRunGuides(runId: number): RunGuide[] {
  const db = getDb();
  return db.query('SELECT * FROM run_guide WHERE run_id = ? ORDER BY layer_index, guide_path').all(runId) as RunGuide[];
}

// ===== QUESTION_PACK =====

export interface QuestionPack {
  id: number;
  guide_path: string;
  status: string;
  content_md: string | null;
  answers_md: string | null;
  synthesized_draft: string | null;
  created_at: string;
  updated_at: string;
}

export function insertQuestionPack(qp: Partial<QuestionPack> & { guide_path: string }): number {
  const db = getDb();
  const result = db.run(
    `INSERT INTO question_pack (guide_path, status, content_md)
     VALUES (?, ?, ?)`,
    [qp.guide_path, qp.status || 'draft', qp.content_md || null]
  );
  return result.lastInsertRowid as number;
}

export function updateQuestionPack(id: number, updates: Partial<QuestionPack>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.status !== undefined) { fields.push('status=?'); values.push(updates.status); }
  if (updates.content_md !== undefined) { fields.push('content_md=?'); values.push(updates.content_md); }
  if (updates.answers_md !== undefined) { fields.push('answers_md=?'); values.push(updates.answers_md); }
  if (updates.synthesized_draft !== undefined) { fields.push('synthesized_draft=?'); values.push(updates.synthesized_draft); }
  
  if (fields.length > 0) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    values.push(id);
    db.run(`UPDATE question_pack SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

export function getQuestionPack(id: number): QuestionPack | null {
  const db = getDb();
  return db.query('SELECT * FROM question_pack WHERE id = ?').get(id) as QuestionPack | null;
}

export function getQuestionPacksByStatus(status: string): QuestionPack[] {
  const db = getDb();
  return db.query('SELECT * FROM question_pack WHERE status = ? ORDER BY created_at').all(status) as QuestionPack[];
}

// ===== ADR =====

export interface ADR {
  id: number;
  number: number;
  path: string;
  title: string;
  status: string;
  date: string;
  commits: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export function insertADR(adr: Partial<ADR> & { number: number; path: string; title: string; date: string }): number {
  const db = getDb();
  const result = db.run(
    `INSERT INTO adr (number, path, title, status, date, commits, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      adr.number,
      adr.path,
      adr.title,
      adr.status || 'accepted',
      adr.date,
      adr.commits || null,
      adr.summary || null
    ]
  );
  return result.lastInsertRowid as number;
}

export function updateADR(id: number, updates: Partial<ADR>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.title !== undefined) { fields.push('title=?'); values.push(updates.title); }
  if (updates.status !== undefined) { fields.push('status=?'); values.push(updates.status); }
  if (updates.commits !== undefined) { fields.push('commits=?'); values.push(updates.commits); }
  if (updates.summary !== undefined) { fields.push('summary=?'); values.push(updates.summary); }
  
  if (fields.length > 0) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    values.push(id);
    db.run(`UPDATE adr SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

export function getADR(number: number): ADR | null {
  const db = getDb();
  return db.query('SELECT * FROM adr WHERE number = ?').get(number) as ADR | null;
}

export function getAllADRs(): ADR[] {
  const db = getDb();
  return db.query('SELECT * FROM adr ORDER BY number DESC').all() as ADR[];
}

export function getNextADRNumber(): number {
  const db = getDb();
  const result = db.query('SELECT MAX(number) as max_num FROM adr').get() as { max_num: number | null };
  return (result.max_num || 0) + 1;
}

// ===== COVERAGE_CANDIDATE =====

export interface CoverageCandidate {
  id: number;
  path: string;
  score: number;
  reason_tags: string;
  has_guide: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function insertCoverageCandidate(cc: Partial<CoverageCandidate> & { path: string; score: number; reason_tags: string }): number {
  const db = getDb();
  const result = db.run(
    `INSERT INTO coverage_candidate (path, score, reason_tags, has_guide, status)
     VALUES (?, ?, ?, ?, ?)`,
    [cc.path, cc.score, cc.reason_tags, cc.has_guide || 0, cc.status || 'pending']
  );
  return result.lastInsertRowid as number;
}

export function updateCoverageCandidate(id: number, updates: Partial<CoverageCandidate>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.has_guide !== undefined) { fields.push('has_guide=?'); values.push(updates.has_guide); }
  if (updates.status !== undefined) { fields.push('status=?'); values.push(updates.status); }
  
  if (fields.length > 0) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    values.push(id);
    db.run(`UPDATE coverage_candidate SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

export function getCoverageCandidates(status?: string): CoverageCandidate[] {
  const db = getDb();
  if (status) {
    return db.query('SELECT * FROM coverage_candidate WHERE status = ? ORDER BY score DESC').all(status) as CoverageCandidate[];
  }
  return db.query('SELECT * FROM coverage_candidate ORDER BY score DESC').all() as CoverageCandidate[];
}


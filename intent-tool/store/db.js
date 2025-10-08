"use strict";
/**
 * Intent Database Layer
 *
 * Bun.sqlite wrapper for Intent storage
 * Tables: project, guide, run, run_guide, question_pack, adr, coverage_candidate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
exports.upsertProject = upsertProject;
exports.getProject = getProject;
exports.upsertGuide = upsertGuide;
exports.getGuide = getGuide;
exports.getAllGuides = getAllGuides;
exports.insertRun = insertRun;
exports.updateRun = updateRun;
exports.getRun = getRun;
exports.getLatestRun = getLatestRun;
exports.getAllRuns = getAllRuns;
exports.insertRunGuide = insertRunGuide;
exports.getRunGuides = getRunGuides;
exports.insertQuestionPack = insertQuestionPack;
exports.updateQuestionPack = updateQuestionPack;
exports.getQuestionPack = getQuestionPack;
exports.getQuestionPacksByStatus = getQuestionPacksByStatus;
exports.insertADR = insertADR;
exports.updateADR = updateADR;
exports.getADR = getADR;
exports.getAllADRs = getAllADRs;
exports.getNextADRNumber = getNextADRNumber;
exports.insertCoverageCandidate = insertCoverageCandidate;
exports.updateCoverageCandidate = updateCoverageCandidate;
exports.getCoverageCandidates = getCoverageCandidates;
const bun_sqlite_1 = require("bun:sqlite");
const fs_1 = require("fs");
const path_1 = require("path");
let _db = null;
/**
 * Get or initialize the database
 */
function getDb(projectRoot) {
    if (_db)
        return _db;
    const root = projectRoot || process.env.USER_CWD || process.cwd();
    const intentDir = (0, path_1.join)(root, '.intent');
    const dbPath = (0, path_1.join)(intentDir, 'intent.db');
    // Ensure .intent directory exists
    if (!(0, fs_1.existsSync)(intentDir)) {
        (0, fs_1.mkdirSync)(intentDir, { recursive: true });
    }
    // Open database
    _db = new bun_sqlite_1.Database(dbPath);
    // Load schema if this is a new database
    if (!tableExists(_db, 'project')) {
        const schemaPath = (0, path_1.join)(__dirname, 'schema.sql');
        const schema = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
        _db.exec(schema);
    }
    return _db;
}
/**
 * Check if a table exists
 */
function tableExists(db, tableName) {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    return !!result;
}
/**
 * Close the database connection
 */
function closeDb() {
    if (_db) {
        _db.close();
        _db = null;
    }
}
function upsertProject(name, repo_root) {
    const db = getDb();
    db.run(`INSERT INTO project (id, name, repo_root) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=?, repo_root=?, updated_at=CURRENT_TIMESTAMP`, [name, repo_root, name, repo_root]);
}
function getProject() {
    const db = getDb();
    return db.query('SELECT * FROM project WHERE id = 1').get();
}
function upsertGuide(guide) {
    const db = getDb();
    const existing = db.query('SELECT id FROM guide WHERE path = ?').get(guide.path);
    if (existing) {
        // Update
        const fields = [];
        const values = [];
        if (guide.parent_path !== undefined) {
            fields.push('parent_path=?');
            values.push(guide.parent_path);
        }
        if (guide.last_hash !== undefined) {
            fields.push('last_hash=?');
            values.push(guide.last_hash);
        }
        if (guide.last_updated_at !== undefined) {
            fields.push('last_updated_at=?');
            values.push(guide.last_updated_at);
        }
        if (guide.coverage_level !== undefined) {
            fields.push('coverage_level=?');
            values.push(guide.coverage_level);
        }
        if (guide.status !== undefined) {
            fields.push('status=?');
            values.push(guide.status);
        }
        if (guide.notes !== undefined) {
            fields.push('notes=?');
            values.push(guide.notes);
        }
        if (fields.length > 0) {
            values.push(guide.path);
            db.run(`UPDATE guide SET ${fields.join(', ')} WHERE path = ?`, values);
        }
    }
    else {
        // Insert
        db.run(`INSERT INTO guide (path, parent_path, last_hash, last_updated_at, coverage_level, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            guide.path,
            guide.parent_path || null,
            guide.last_hash || null,
            guide.last_updated_at || null,
            guide.coverage_level || null,
            guide.status || 'active',
            guide.notes || null
        ]);
    }
}
function getGuide(path) {
    const db = getDb();
    return db.query('SELECT * FROM guide WHERE path = ?').get(path);
}
function getAllGuides() {
    const db = getDb();
    return db.query('SELECT * FROM guide ORDER BY path').all();
}
function insertRun(run) {
    const db = getDb();
    const result = db.run(`INSERT INTO run (scope, layered, model, status)
     VALUES (?, ?, ?, ?)`, [
        run.scope,
        run.layered ?? 1,
        run.model || 'claude-sonnet-4-5',
        run.status || 'running'
    ]);
    return result.lastInsertRowid;
}
function updateRun(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];
    if (updates.finished_at !== undefined) {
        fields.push('finished_at=?');
        values.push(updates.finished_at);
    }
    if (updates.status !== undefined) {
        fields.push('status=?');
        values.push(updates.status);
    }
    if (updates.total_layers !== undefined) {
        fields.push('total_layers=?');
        values.push(updates.total_layers);
    }
    if (updates.guides_updated !== undefined) {
        fields.push('guides_updated=?');
        values.push(updates.guides_updated);
    }
    if (updates.guides_nochange !== undefined) {
        fields.push('guides_nochange=?');
        values.push(updates.guides_nochange);
    }
    if (updates.guides_failed !== undefined) {
        fields.push('guides_failed=?');
        values.push(updates.guides_failed);
    }
    if (updates.duration_ms !== undefined) {
        fields.push('duration_ms=?');
        values.push(updates.duration_ms);
    }
    if (updates.total_cost_cents !== undefined) {
        fields.push('total_cost_cents=?');
        values.push(updates.total_cost_cents);
    }
    if (updates.meta_json !== undefined) {
        fields.push('meta_json=?');
        values.push(updates.meta_json);
    }
    if (fields.length > 0) {
        values.push(id);
        db.run(`UPDATE run SET ${fields.join(', ')} WHERE id = ?`, values);
    }
}
function getRun(id) {
    const db = getDb();
    return db.query('SELECT * FROM run WHERE id = ?').get(id);
}
function getLatestRun() {
    const db = getDb();
    return db.query('SELECT * FROM run ORDER BY started_at DESC LIMIT 1').get();
}
function getAllRuns(limit = 50) {
    const db = getDb();
    return db.query('SELECT * FROM run ORDER BY started_at DESC LIMIT ?').all(limit);
}
function insertRunGuide(rg) {
    const db = getDb();
    db.run(`INSERT INTO run_guide (run_id, guide_path, layer_index, status, llm_turns, duration_ms, diff_summary, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        rg.run_id,
        rg.guide_path,
        rg.layer_index,
        rg.status,
        rg.llm_turns || null,
        rg.duration_ms || null,
        rg.diff_summary || null,
        rg.error || null
    ]);
}
function getRunGuides(runId) {
    const db = getDb();
    return db.query('SELECT * FROM run_guide WHERE run_id = ? ORDER BY layer_index, guide_path').all(runId);
}
function insertQuestionPack(qp) {
    const db = getDb();
    const result = db.run(`INSERT INTO question_pack (guide_path, status, content_md)
     VALUES (?, ?, ?)`, [qp.guide_path, qp.status || 'draft', qp.content_md || null]);
    return result.lastInsertRowid;
}
function updateQuestionPack(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];
    if (updates.status !== undefined) {
        fields.push('status=?');
        values.push(updates.status);
    }
    if (updates.content_md !== undefined) {
        fields.push('content_md=?');
        values.push(updates.content_md);
    }
    if (updates.answers_md !== undefined) {
        fields.push('answers_md=?');
        values.push(updates.answers_md);
    }
    if (updates.synthesized_draft !== undefined) {
        fields.push('synthesized_draft=?');
        values.push(updates.synthesized_draft);
    }
    if (fields.length > 0) {
        fields.push('updated_at=CURRENT_TIMESTAMP');
        values.push(id);
        db.run(`UPDATE question_pack SET ${fields.join(', ')} WHERE id = ?`, values);
    }
}
function getQuestionPack(id) {
    const db = getDb();
    return db.query('SELECT * FROM question_pack WHERE id = ?').get(id);
}
function getQuestionPacksByStatus(status) {
    const db = getDb();
    return db.query('SELECT * FROM question_pack WHERE status = ? ORDER BY created_at').all(status);
}
function insertADR(adr) {
    const db = getDb();
    const result = db.run(`INSERT INTO adr (number, path, title, status, date, commits, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        adr.number,
        adr.path,
        adr.title,
        adr.status || 'accepted',
        adr.date,
        adr.commits || null,
        adr.summary || null
    ]);
    return result.lastInsertRowid;
}
function updateADR(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];
    if (updates.title !== undefined) {
        fields.push('title=?');
        values.push(updates.title);
    }
    if (updates.status !== undefined) {
        fields.push('status=?');
        values.push(updates.status);
    }
    if (updates.commits !== undefined) {
        fields.push('commits=?');
        values.push(updates.commits);
    }
    if (updates.summary !== undefined) {
        fields.push('summary=?');
        values.push(updates.summary);
    }
    if (fields.length > 0) {
        fields.push('updated_at=CURRENT_TIMESTAMP');
        values.push(id);
        db.run(`UPDATE adr SET ${fields.join(', ')} WHERE id = ?`, values);
    }
}
function getADR(number) {
    const db = getDb();
    return db.query('SELECT * FROM adr WHERE number = ?').get(number);
}
function getAllADRs() {
    const db = getDb();
    return db.query('SELECT * FROM adr ORDER BY number DESC').all();
}
function getNextADRNumber() {
    const db = getDb();
    const result = db.query('SELECT MAX(number) as max_num FROM adr').get();
    return (result.max_num || 0) + 1;
}
function insertCoverageCandidate(cc) {
    const db = getDb();
    const result = db.run(`INSERT INTO coverage_candidate (path, score, reason_tags, has_guide, status)
     VALUES (?, ?, ?, ?, ?)`, [cc.path, cc.score, cc.reason_tags, cc.has_guide || 0, cc.status || 'pending']);
    return result.lastInsertRowid;
}
function updateCoverageCandidate(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];
    if (updates.has_guide !== undefined) {
        fields.push('has_guide=?');
        values.push(updates.has_guide);
    }
    if (updates.status !== undefined) {
        fields.push('status=?');
        values.push(updates.status);
    }
    if (fields.length > 0) {
        fields.push('updated_at=CURRENT_TIMESTAMP');
        values.push(id);
        db.run(`UPDATE coverage_candidate SET ${fields.join(', ')} WHERE id = ?`, values);
    }
}
function getCoverageCandidates(status) {
    const db = getDb();
    if (status) {
        return db.query('SELECT * FROM coverage_candidate WHERE status = ? ORDER BY score DESC').all(status);
    }
    return db.query('SELECT * FROM coverage_candidate ORDER BY score DESC').all();
}

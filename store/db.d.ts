/**
 * Intent Database Layer
 *
 * Bun.sqlite wrapper for Intent storage
 * Tables: project, guide, run, run_guide, question_pack, adr, coverage_candidate
 */
import { Database } from 'bun:sqlite';
/**
 * Get or initialize the database
 */
export declare function getDb(projectRoot?: string): Database;
/**
 * Close the database connection
 */
export declare function closeDb(): void;
export interface Project {
    id: number;
    name: string;
    repo_root: string;
    created_at: string;
    updated_at: string;
}
export declare function upsertProject(name: string, repo_root: string): void;
export declare function getProject(): Project | null;
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
export declare function upsertGuide(guide: Partial<Guide> & {
    path: string;
}): void;
export declare function getGuide(path: string): Guide | null;
export declare function getAllGuides(): Guide[];
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
export declare function insertRun(run: Partial<Run> & {
    scope: string;
}): number;
export declare function updateRun(id: number, updates: Partial<Run>): void;
export declare function getRun(id: number): Run | null;
export declare function getLatestRun(): Run | null;
export declare function getAllRuns(limit?: number): Run[];
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
export declare function insertRunGuide(rg: Omit<RunGuide, 'id' | 'created_at'>): void;
export declare function getRunGuides(runId: number): RunGuide[];
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
export declare function insertQuestionPack(qp: Partial<QuestionPack> & {
    guide_path: string;
}): number;
export declare function updateQuestionPack(id: number, updates: Partial<QuestionPack>): void;
export declare function getQuestionPack(id: number): QuestionPack | null;
export declare function getQuestionPacksByStatus(status: string): QuestionPack[];
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
export declare function insertADR(adr: Partial<ADR> & {
    number: number;
    path: string;
    title: string;
    date: string;
}): number;
export declare function updateADR(id: number, updates: Partial<ADR>): void;
export declare function getADR(number: number): ADR | null;
export declare function getAllADRs(): ADR[];
export declare function getNextADRNumber(): number;
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
export declare function insertCoverageCandidate(cc: Partial<CoverageCandidate> & {
    path: string;
    score: number;
    reason_tags: string;
}): number;
export declare function updateCoverageCandidate(id: number, updates: Partial<CoverageCandidate>): void;
export declare function getCoverageCandidates(status?: string): CoverageCandidate[];

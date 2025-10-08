/**
 * Onboarding Service
 *
 * Helps users bootstrap Intent in a new (legacy) codebase by:
 * 1. Scanning the repo to identify candidate directories for guides
 * 2. Generating question packs for each candidate
 * 3. Synthesizing draft guides from answered questions
 */
export interface CoverageCandidate {
    path: string;
    score: number;
    reasons: string[];
    has_guide: boolean;
    file_count: number;
    has_tests: boolean;
}
export interface CoverageSummary {
    total_dirs: number;
    candidates: CoverageCandidate[];
    existing_guides: string[];
    coverage_percent: number;
}
/**
 * Scan project and generate coverage report
 */
export declare function scanProject(projectRoot: string, maxDepth?: number): CoverageSummary;
/**
 * Generate question pack content for a directory
 */
export declare function generateQuestionPack(candidate: CoverageCandidate, projectRoot: string): string;
/**
 * Parse answered question pack
 */
export interface ParsedAnswers {
    path: string;
    intent: string;
    golden_path: string;
    invariants: string;
    inputs: string;
    outputs: string;
    signals: string;
    pitfalls: string;
    related: string;
    security?: string;
    notes?: string;
}
export declare function parseQuestionPackAnswers(markdown: string): ParsedAnswers | null;

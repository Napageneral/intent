"use strict";
/**
 * Onboarding Service
 *
 * Helps users bootstrap Intent in a new (legacy) codebase by:
 * 1. Scanning the repo to identify candidate directories for guides
 * 2. Generating question packs for each candidate
 * 3. Synthesizing draft guides from answered questions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanProject = scanProject;
exports.generateQuestionPack = generateQuestionPack;
exports.parseQuestionPackAnswers = parseQuestionPackAnswers;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Heuristics for identifying directories that deserve a guide
 */
const HEURISTICS = {
    // Files that indicate this is a routing/API boundary
    route_like: ['router', 'routes', 'controller', 'api', 'endpoints', 'handlers', 'views'],
    // Files that indicate background processing
    worker_like: ['worker', 'queue', 'job', 'task', 'etl', 'processor', 'consumer'],
    // Schema/data definitions
    schema_like: ['schema', 'model', 'entity', 'proto', 'graphql', 'migrations'],
    // Service/business logic
    service_like: ['service', 'services', 'manager', 'repository', 'repositories'],
    // Event/message handling
    event_like: ['events', 'event', 'listener', 'subscriber', 'pubsub', 'webhook'],
    // Tests indicate importance
    test_like: ['test', 'tests', '__tests__', 'spec', 'specs'],
};
/**
 * Directories to skip (common noise)
 */
const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'release',
    '__pycache__',
    '.pytest_cache',
    'venv',
    'env',
    '.venv',
    'target', // Rust
    'bin',
    'obj',
    '.idea',
    '.vscode',
    'coverage',
    'tmp',
    'temp',
    '.cache',
]);
/**
 * Check if a directory name/path matches any heuristic pattern
 */
function matchesHeuristic(dirName, files) {
    const reasons = [];
    let score = 0;
    const lowerName = dirName.toLowerCase();
    const allFiles = files.join(' ').toLowerCase();
    // Check directory name against patterns
    for (const [category, patterns] of Object.entries(HEURISTICS)) {
        for (const pattern of patterns) {
            if (lowerName.includes(pattern) || allFiles.includes(pattern)) {
                reasons.push(category);
                score += category === 'test_like' ? 0.2 : 0.3;
                break; // Only count each category once
            }
        }
    }
    // Bonus for having multiple file types (complexity)
    const extensions = new Set(files.map(f => f.split('.').pop()?.toLowerCase()).filter(Boolean));
    if (extensions.size > 3) {
        score += 0.1;
    }
    // Bonus for having tests subdirectory
    const hasTests = files.some(f => f.toLowerCase().includes('test'));
    if (hasTests) {
        reasons.push('has_tests');
        score += 0.15;
    }
    return { score: Math.min(score, 1.0), reasons: [...new Set(reasons)] };
}
/**
 * Check if directory already has a guide
 */
function hasGuide(dirPath) {
    return (0, fs_1.existsSync)((0, path_1.join)(dirPath, 'agents.md')) || (0, fs_1.existsSync)((0, path_1.join)(dirPath, 'CLAUDE.md'));
}
/**
 * Recursively walk directory tree and identify candidates
 */
function walkDirectory(rootPath, currentPath, maxDepth, currentDepth = 0) {
    if (currentDepth > maxDepth)
        return [];
    const candidates = [];
    try {
        const entries = (0, fs_1.readdirSync)(currentPath);
        const files = [];
        const subdirs = [];
        // Separate files and directories
        for (const entry of entries) {
            const fullPath = (0, path_1.join)(currentPath, entry);
            try {
                const stat = (0, fs_1.statSync)(fullPath);
                if (stat.isDirectory()) {
                    if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) {
                        subdirs.push(entry);
                    }
                }
                else if (stat.isFile()) {
                    files.push(entry);
                }
            }
            catch {
                // Skip entries we can't stat
            }
        }
        // Evaluate current directory
        const relPath = (0, path_1.relative)(rootPath, currentPath) || '.';
        const dirName = (0, path_1.basename)(currentPath);
        // Only consider directories with files and at least one subdir or enough files
        if (files.length > 3 || (files.length > 0 && subdirs.length > 0)) {
            const { score, reasons } = matchesHeuristic(dirName, files);
            if (score > 0.25) { // Threshold for candidacy
                candidates.push({
                    path: relPath,
                    score,
                    reasons,
                    has_guide: hasGuide(currentPath),
                    file_count: files.length,
                    has_tests: reasons.includes('has_tests'),
                });
            }
        }
        // Recurse into subdirectories
        for (const subdir of subdirs) {
            const subdirPath = (0, path_1.join)(currentPath, subdir);
            candidates.push(...walkDirectory(rootPath, subdirPath, maxDepth, currentDepth + 1));
        }
    }
    catch (error) {
        // Skip directories we can't read
    }
    return candidates;
}
/**
 * Find all existing guides in the repo
 */
function findExistingGuides(rootPath) {
    try {
        // Use git to find all agents.md and CLAUDE.md files
        const result = (0, child_process_1.execSync)('git ls-files | grep -E "(agents\\.md|CLAUDE\\.md)$"', { cwd: rootPath, encoding: 'utf-8' });
        return result.trim().split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
/**
 * Scan project and generate coverage report
 */
function scanProject(projectRoot, maxDepth = 4) {
    const candidates = walkDirectory(projectRoot, projectRoot, maxDepth);
    const existingGuides = findExistingGuides(projectRoot);
    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    // Mark candidates that already have guides
    for (const candidate of candidates) {
        const guidePath = (0, path_1.join)(projectRoot, candidate.path, 'agents.md');
        const legacyPath = (0, path_1.join)(projectRoot, candidate.path, 'CLAUDE.md');
        candidate.has_guide = (0, fs_1.existsSync)(guidePath) || (0, fs_1.existsSync)(legacyPath);
    }
    // Calculate coverage
    const totalDirs = candidates.length;
    const coveredDirs = candidates.filter(c => c.has_guide).length;
    const coverage = totalDirs > 0 ? (coveredDirs / totalDirs) * 100 : 0;
    return {
        total_dirs: totalDirs,
        candidates: candidates.filter(c => c.score > 0.4), // Only return strong candidates
        existing_guides: existingGuides,
        coverage_percent: Math.round(coverage * 10) / 10,
    };
}
/**
 * Generate question pack content for a directory
 */
function generateQuestionPack(candidate, projectRoot) {
    const fullPath = (0, path_1.join)(projectRoot, candidate.path);
    const dirName = (0, path_1.basename)(candidate.path);
    // Try to read a few sample files for context
    let sampleFiles = [];
    try {
        const entries = (0, fs_1.readdirSync)(fullPath);
        sampleFiles = entries
            .filter(f => !f.startsWith('.') && !f.includes('test'))
            .slice(0, 5);
    }
    catch { }
    return `# Guide Questions: ${candidate.path}

## Directory Context

**Path:** \`${candidate.path}\`  
**Score:** ${candidate.score.toFixed(2)}  
**Reasons:** ${candidate.reasons.join(', ')}  
**Files:** ${candidate.file_count}  
**Has Tests:** ${candidate.has_tests ? 'Yes' : 'No'}

${sampleFiles.length > 0 ? `**Sample Files:** ${sampleFiles.join(', ')}` : ''}

---

## Questions to Answer

Please answer these questions to help generate a concise, effective \`agents.md\` guide for this directory.

### 1. Intent & Purpose

**What is the primary purpose of this directory?**  
_One sentence describing what this code does and why it exists._

→ 

**Who are the primary users/consumers?**  
_Other services? External APIs? Background jobs?_

→ 

---

### 2. Golden Path

**What is the most common use case?**  
_The "80%" scenario - what do most people do here?_

→ 

**What are the key steps/functions for that use case?**  
_Entry points, main functions, key classes._

→ 

---

### 3. Invariants & Constraints

**What assumptions must always be true?**  
_Data requirements, state expectations, dependencies._

→ 

**What are the key constraints?**  
_Performance limits, rate limits, resource limits._

→ 

---

### 4. Inputs & Outputs

**What are the inputs?**  
_HTTP requests? Events? Messages? Files?_

→ 

**What are the outputs?**  
_Responses? Side effects? Database writes? Events emitted?_

→ 

---

### 5. Success Signals

**How do you know this is working correctly?**  
_Logs? Metrics? Events? Status codes?_

→ 

**What do success logs look like?**  
_Actual log messages or metric names to grep for._

→ 

---

### 6. Pitfalls & Gotchas

**What mistakes do people make here?**  
_Common misunderstandings or errors._

→ 

**What should developers NOT do?**  
_Anti-patterns specific to this area._

→ 

---

### 7. Related Areas

**What other directories/systems does this interact with?**  
_List paths or service names._

→ 

---

### 8. Security & Compliance (if applicable)

**Are there auth/permission requirements?**

→ 

**Any PII or sensitive data handling?**

→ 

---

## Notes

_Any additional context, links to docs, or special considerations._

→ 
`;
}
function parseQuestionPackAnswers(markdown) {
    // Simple extraction - look for "→" followed by answer text
    const extractAnswer = (section) => {
        const match = markdown.match(new RegExp(`${section}[^→]*→\\s*([^#]+)`, 's'));
        return match ? match[1].trim() : '';
    };
    const pathMatch = markdown.match(/\*\*Path:\*\*\s*`([^`]+)`/);
    if (!pathMatch)
        return null;
    return {
        path: pathMatch[1],
        intent: extractAnswer('What is the primary purpose'),
        golden_path: extractAnswer('What are the key steps'),
        invariants: extractAnswer('What assumptions must always be true'),
        inputs: extractAnswer('What are the inputs'),
        outputs: extractAnswer('What are the outputs'),
        signals: extractAnswer('How do you know this is working'),
        pitfalls: extractAnswer('What mistakes do people make'),
        related: extractAnswer('What other directories'),
        security: extractAnswer('Are there auth'),
        notes: extractAnswer('Notes'),
    };
}

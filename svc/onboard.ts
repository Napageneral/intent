/**
 * Onboarding Service
 * 
 * Helps users bootstrap Intent in a new (legacy) codebase by:
 * 1. Scanning the repo to identify candidate directories for guides
 * 2. Generating question packs for each candidate
 * 3. Synthesizing draft guides from answered questions
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, relative, basename } from 'path';

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
function matchesHeuristic(dirName: string, files: string[]): { score: number; reasons: string[] } {
  const reasons: string[] = [];
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
function hasGuide(dirPath: string): boolean {
  return existsSync(join(dirPath, 'agents.md')) || existsSync(join(dirPath, 'CLAUDE.md'));
}

/**
 * Recursively walk directory tree and identify candidates
 */
function walkDirectory(
  rootPath: string,
  currentPath: string,
  maxDepth: number,
  currentDepth: number = 0
): CoverageCandidate[] {
  if (currentDepth > maxDepth) return [];
  
  const candidates: CoverageCandidate[] = [];
  
  try {
    const entries = readdirSync(currentPath);
    const files: string[] = [];
    const subdirs: string[] = [];
    
    // Separate files and directories
    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) {
            subdirs.push(entry);
          }
        } else if (stat.isFile()) {
          files.push(entry);
        }
      } catch {
        // Skip entries we can't stat
      }
    }
    
    // Evaluate current directory
    const relPath = relative(rootPath, currentPath) || '.';
    const dirName = basename(currentPath);
    
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
      const subdirPath = join(currentPath, subdir);
      candidates.push(...walkDirectory(rootPath, subdirPath, maxDepth, currentDepth + 1));
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return candidates;
}

/**
 * Find all existing guides in the repo
 */
function findExistingGuides(rootPath: string): string[] {
  try {
    // Use git to find all agents.md and CLAUDE.md files
    const result = execSync(
      'git ls-files | grep -E "(agents\\.md|CLAUDE\\.md)$"',
      { cwd: rootPath, encoding: 'utf-8' }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Scan project and generate coverage report
 */
export function scanProject(projectRoot: string, maxDepth: number = 4): CoverageSummary {
  const candidates = walkDirectory(projectRoot, projectRoot, maxDepth);
  const existingGuides = findExistingGuides(projectRoot);
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  
  // Mark candidates that already have guides
  for (const candidate of candidates) {
    const guidePath = join(projectRoot, candidate.path, 'agents.md');
    const legacyPath = join(projectRoot, candidate.path, 'CLAUDE.md');
    candidate.has_guide = existsSync(guidePath) || existsSync(legacyPath);
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
export function generateQuestionPack(candidate: CoverageCandidate, projectRoot: string): string {
  const fullPath = join(projectRoot, candidate.path);
  const dirName = basename(candidate.path);
  
  // Try to read a few sample files for context
  let sampleFiles: string[] = [];
  try {
    const entries = readdirSync(fullPath);
    sampleFiles = entries
      .filter(f => !f.startsWith('.') && !f.includes('test'))
      .slice(0, 5);
  } catch {}
  
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

export function parseQuestionPackAnswers(markdown: string): ParsedAnswers | null {
  // Simple extraction - look for "→" followed by answer text
  const extractAnswer = (section: string): string => {
    const match = markdown.match(new RegExp(`${section}[^→]*→\\s*([^#]+)`, 's'));
    return match ? match[1].trim() : '';
  };
  
  const pathMatch = markdown.match(/\*\*Path:\*\*\s*`([^`]+)`/);
  if (!pathMatch) return null;
  
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

/**
 * Build a synthesis prompt for Claude Code to generate a draft guide
 */
export function buildSynthesisPrompt(answers: ParsedAnswers, sampleCode?: string): string {
  return `You are generating a concise, actionable engineering guide (agents.md) for: ${answers.path}

## Answered Questions

**Intent & Purpose:**
${answers.intent}

**Golden Path (Common Use Case):**
${answers.golden_path}

**Invariants & Constraints:**
${answers.invariants}

**Inputs:**
${answers.inputs}

**Outputs:**
${answers.outputs}

**Success Signals:**
${answers.signals}

**Pitfalls & Gotchas:**
${answers.pitfalls}

**Related Areas:**
${answers.related}

${answers.security ? `**Security:**\n${answers.security}\n` : ''}
${answers.notes ? `**Notes:**\n${answers.notes}\n` : ''}
${sampleCode ? `\n## Sample Code\n\`\`\`\n${sampleCode}\n\`\`\`\n` : ''}

---

## Your Task

Generate a concise agents.md file (under 300 lines) following this structure:

# ${answers.path}

## Purpose

[One paragraph from Intent & Purpose above]

## Golden Path

[Minimal steps from Golden Path above - bullet points with code snippets if relevant]

## Inputs & Outputs

**Inputs:**
[From answers]

**Outputs:**
[From answers]

## Success Signals

[From answers - actual log lines, metric names, event types]

## Invariants

[From answers - what must always be true]

## Pitfalls

**Don't:**
[From answers - anti-patterns as bullet points]

## Related

[From answers - links to other guides]

${answers.security ? '## Security\n\n[From answers]\n' : ''}

---

**Guidelines:**
- Be concise and actionable (prefer bullets over paragraphs)
- Reference actual observable signals (logs, metrics, events)
- Focus on the 80% use case
- Link to related guides, don't duplicate
- Keep under 300 lines

Output ONLY the markdown guide. No preamble, no explanation.`;
}


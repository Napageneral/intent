/**
 * Run Service
 * Manages layered update runs with real-time SSE streaming
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import { join } from 'path';
import { insertRun, updateRun, getRun, getAllRuns, type Run } from '../../store/db';

// Global event bus for SSE streaming
export const runEventBus = new EventEmitter();

interface StartRunOptions {
  scope: 'staged' | 'head' | 'pr';
  layered?: boolean;
  model?: string;
}

/**
 * Start a new layered update run in the background
 */
export async function startRun(options: StartRunOptions): Promise<{ runId: number }> {
  const { scope, layered = true, model = 'claude-sonnet-4-5' } = options;
  const workingDir = process.env.USER_CWD || process.cwd();
  const intentRoot = join(__dirname, '..', '..');
  
  // Insert run record
  const runId = insertRun({
    scope,
    layered: layered ? 1 : 0,
    model,
    status: 'running'
  });
  
  // Emit start event
  runEventBus.emit(`run:${runId}`, {
    type: 'run-start',
    runId,
    scope,
    layered,
    timestamp: new Date().toISOString()
  });
  
  // Start background process
  setImmediate(() => executeRun(runId, scope, layered, model, workingDir, intentRoot));
  
  return { runId };
}

/**
 * Execute the run in background
 */
async function executeRun(
  runId: number,
  scope: string,
  layered: boolean,
  model: string,
  workingDir: string,
  intentRoot: string
) {
  const startTime = Date.now();
  
  try {
    const script = layered
      ? join(intentRoot, 'core', 'workflows', 'update_layered.ts')
      : join(intentRoot, 'core', 'run.ts');
    
    const scopeEnv = scope === 'pr' ? 'against_origin_main' : scope;
    
    // Spawn bun process
    const proc = spawn('bun', ['run', script, scope], {
      cwd: intentRoot,
      env: {
        ...process.env,
        USER_CWD: workingDir,
        INTENT_SCOPE: scopeEnv,
        INTENT_MODEL: model
      }
    });
    
    // Stream stdout/stderr to SSE
    proc.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        runEventBus.emit(`run:${runId}`, {
          type: 'log',
          runId,
          message: line,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    proc.stderr?.on('data', (data) => {
      runEventBus.emit(`run:${runId}`, {
        type: 'error',
        runId,
        message: data.toString(),
        timestamp: new Date().toISOString()
      });
    });
    
    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const status = code === 0 ? 'success' : 'failed';
      
      // Update run record
      updateRun(runId, {
        status,
        finished_at: new Date().toISOString(),
        duration_ms: duration
      });
      
      // Emit completion event
      runEventBus.emit(`run:${runId}`, {
        type: 'run-end',
        runId,
        status,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    updateRun(runId, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: duration
    });
    
    runEventBus.emit(`run:${runId}`, {
      type: 'run-end',
      runId,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get run by ID
 */
export function getRunById(id: number): Run | null {
  return getRun(id);
}

/**
 * Get all runs
 */
export function listRuns(limit: number = 50): Run[] {
  return getAllRuns(limit);
}


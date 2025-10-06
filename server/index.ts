/**
 * Intent Server
 * 
 * Local HTTP API for GUI + programmatic access
 * Enables real-time run monitoring, onboarding wizard, and guide management
 */

import { Hono } from 'hono';
import { serve } from 'bun';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';

// Services
import { getStatus } from './svc/status';
import { getTree } from './svc/tree';
import { diffGuide } from './svc/diff';
import { startRun, getRunById, listRuns, runEventBus } from './svc/run';
import { getContext } from './svc/context';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Serve static files from dist/web (built frontend)
app.use('/*', serveStatic({ root: './dist/web' }));

// ===== ROUTES =====

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

// Status
app.get('/api/status', (c) => c.json(getStatus()));

// Context (smart detection)
app.get('/api/context', async (c) => c.json(await getContext()));

// Guide tree
app.get('/api/tree', (c) => c.json(getTree()));

// Guide diff
app.get('/api/diff', async (c) => {
  const path = c.req.query('path');
  if (!path) {
    return c.json({ error: 'path query parameter required' }, 400);
  }
  return c.text(await diffGuide(path));
});

// Run management
app.post('/api/run', async (c) => {
  const scope = (c.req.query('scope') || 'staged') as 'staged' | 'head' | 'pr';
  const layered = c.req.query('layered') !== 'false';
  const model = c.req.query('model') || 'claude-sonnet-4-5';
  
  const result = await startRun({ scope, layered, model });
  return c.json(result, 202);
});

app.get('/api/run/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const run = getRunById(id);
  
  if (!run) {
    return c.json({ error: 'Run not found' }, 404);
  }
  
  return c.json(run);
});

app.get('/api/runs', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const runs = listRuns(limit);
  return c.json({ runs });
});

// SSE stream for run progress
app.get('/api/run/:id/stream', async (c) => {
  const id = c.req.param('id');
  
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', runId: id })}\n\n`));
      
      // Listen to run events
      const handler = (event: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      
      runEventBus.on(`run:${id}`, handler);
      
      // Cleanup on close
      c.req.raw.signal.addEventListener('abort', () => {
        runEventBus.off(`run:${id}`, handler);
        try {
          controller.close();
        } catch {}
      });
      
      // Send heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);
      
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// Onboarding (TODO: implement)
app.post('/api/onboard/scan', (c) => c.json({ error: 'not_implemented' }, 501));
app.post('/api/onboard/questions', (c) => c.json({ error: 'not_implemented' }, 501));
app.post('/api/onboard/synthesize', (c) => c.json({ error: 'not_implemented' }, 501));

// Settings
app.get('/api/settings', (c) => {
  // TODO: Read from .intent/config.json
  return c.json({
    model: 'claude-sonnet-4-5',
    editPolicy: 'allowAll',
    layeredDefault: true
  });
});

// ===== SERVER =====

const PORT = parseInt(process.env.INTENT_PORT || '5174');

export function startServer(port: number = PORT) {
  serve({
    port,
    fetch: app.fetch,
  });
  
  console.log(`✨ Intent server running on http://localhost:${port}`);
  console.log(`   API: http://localhost:${port}/api/health`);
  console.log('');
  console.log('Press Ctrl+C to stop');
}

// Run if called directly
if (import.meta.main) {
  startServer();
}


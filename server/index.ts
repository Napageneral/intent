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

// Services
import { getStatus } from './svc/status';
import { getTree } from './svc/tree';
import { diffGuide } from './svc/diff';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// ===== ROUTES =====

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

// Status
app.get('/api/status', (c) => c.json(getStatus()));

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

// Run management (TODO: implement)
app.post('/api/run', (c) => c.json({ runId: 0, status: 'not_implemented' }, 501));
app.get('/api/run/:id', (c) => c.json({ error: 'not_implemented' }, 501));
app.get('/api/run/:id/stream', (c) => c.json({ error: 'not_implemented' }, 501));

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


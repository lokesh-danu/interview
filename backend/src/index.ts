import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

import { authMiddleware } from './middleware/auth.js';
import { errorMiddleware } from './middleware/error.js';
import { connectQueue, closeQueue } from './services/queue.js';

import documents from './routes/documents.js';
import chats from './routes/chats.js';
import agent from './routes/agent.js';
import webhook from './routes/webhook.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000'], // Next.js dev server
  credentials: true,
}));
app.use('*', errorMiddleware);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Public routes (no auth)
app.route('/webhook', webhook);

// Authenticated routes
app.use('/api/*', authMiddleware);
app.route('/api/documents', documents);
app.route('/api/chats', chats);
app.route('/api/agent', agent);

// Users endpoint (stubbed)
app.get('/api/users/me', (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
  });
});

// Start server
const port = parseInt(process.env.PORT || '3001');

async function start() {
  try {
    // Connect to RabbitMQ
    await connectQueue();
    console.log('Connected to RabbitMQ');

    // Start HTTP server
    serve({
      fetch: app.fetch,
      port,
    });
    console.log(`API server running on http://localhost:${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await closeQueue();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeQueue();
  process.exit(0);
});

start();

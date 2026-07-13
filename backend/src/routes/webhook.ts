import { Hono } from 'hono';
import { createAgentRun } from '../db/queries.js';
import { publish } from '../services/queue.js';
import { ValidationError } from '../middleware/error.js';
import { AgentRunQueue } from '../types.js';

const webhook = new Hono();

/**
 * POST /webhook/agent-run
 * External webhook to trigger agent runs.
 * Requires X-Webhook-Secret header for authentication.
 */
webhook.post('/agent-run', async (c) => {
  // Validate webhook secret
  const secret = c.req.header('X-Webhook-Secret');
  const expectedSecret = process.env.WEBHOOK_SECRET || 'dev-secret';

  if (secret !== expectedSecret) {
    return c.json({ error: 'Invalid webhook secret' }, 401);
  }

  const body = await c.req.json();
  const { orgId, documentIds, prompt } = body;

  if (!orgId) {
    throw new ValidationError('orgId is required');
  }

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    throw new ValidationError('documentIds is required and must be a non-empty array');
  }

  // Create agent run record (no triggeredBy for webhook)
  const run = await createAgentRun(orgId, null, documentIds, prompt);

  // Publish to queue for agent to process
  const queueMessage: AgentRunQueue = {
    runId: run.id,
    orgId,
    documentIds,
    prompt,
  };
  await publish('agent.run', queueMessage);

  return c.json({
    runId: run.id,
    status: run.status,
  }, 201);
});

export default webhook;

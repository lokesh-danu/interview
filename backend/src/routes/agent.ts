import { Hono } from 'hono';
import {
  findAgentRunById,
  findAgentRunsByOrg,
  createAgentRun,
} from '../db/queries.js';
import { publish } from '../services/queue.js';
import { NotFoundError, ValidationError } from '../middleware/error.js';
import { AgentRunQueue } from '../types.js';

const agent = new Hono();

/**
 * POST /agent/run
 * Trigger an agent run.
 */
agent.post('/run', async (c) => {
  const user = c.get('user');
  const orgId = c.get('orgId');

  const body = await c.req.json();
  const { documentIds, prompt } = body;

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    throw new ValidationError('documentIds is required and must be a non-empty array');
  }

  // Create agent run record
  const run = await createAgentRun(orgId, user.id, documentIds, prompt);

  // Publish to queue for agent to process
  const queueMessage: AgentRunQueue = {
    runId: run.id,
    orgId,
    documentIds,
    prompt,
  };
  await publish('agent.run', queueMessage);

  return c.json({
    id: run.id,
    status: run.status,
    createdAt: run.createdAt,
  }, 201);
});

/**
 * GET /agent/runs
 * List all agent runs for the current org.
 */
agent.get('/runs', async (c) => {
  const orgId = c.get('orgId');
  const runs = await findAgentRunsByOrg(orgId);

  return c.json(runs.map((run) => ({
    id: run.id,
    status: run.status,
    inputDocIds: run.inputDocIds,
    output: run.output,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
  })));
});

/**
 * GET /agent/runs/:id
 * Get a single agent run by ID.
 */
agent.get('/runs/:id', async (c) => {
  const orgId = c.get('orgId');
  const runId = c.req.param('id');

  const run = await findAgentRunById(runId);
  if (!run || run.orgId !== orgId) {
    throw new NotFoundError('Agent run');
  }

  return c.json({
    id: run.id,
    status: run.status,
    inputDocIds: run.inputDocIds,
    output: run.output,
    metadata: run.metadata,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
  });
});

export default agent;

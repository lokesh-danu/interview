import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { v4 as uuidv4 } from 'uuid';
import {
  findChatById,
  findChatsByOrg,
  createChat,
  findMessagesByChat,
  createMessage,
} from '../db/queries.js';
import { getSSEManager } from '../services/sse.js';
import { publish } from '../services/queue.js';
import { NotFoundError, ValidationError } from '../middleware/error.js';
import { ChatMessageQueue, SSEEvent } from '../types.js';

const chats = new Hono();

/**
 * POST /chats
 * Create a new chat.
 */
chats.post('/', async (c) => {
  const user = c.get('user');
  const orgId = c.get('orgId');

  const body = await c.req.json();
  const title = body.title || 'New Chat';

  const chat = await createChat(orgId, user.id, title);

  return c.json({
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
  }, 201);
});

/**
 * GET /chats
 * List all chats for the current org.
 */
chats.get('/', async (c) => {
  const orgId = c.get('orgId');
  const chatList = await findChatsByOrg(orgId);

  return c.json(chatList.map((chat) => ({
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
  })));
});

/**
 * GET /chats/:id
 * Get a chat with its messages.
 */
chats.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const chatId = c.req.param('id');

  const chat = await findChatById(chatId);
  if (!chat || chat.orgId !== orgId) {
    throw new NotFoundError('Chat');
  }

  const messages = await findMessagesByChat(chatId);

  return c.json({
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    })),
  });
});

/**
 * POST /chats/:id/messages
 * Send a message and return SSE stream for response.
 */
chats.post('/:id/messages', async (c) => {
  const user = c.get('user');
  const orgId = c.get('orgId');
  const chatId = c.req.param('id');

  // Validate chat exists and belongs to org
  const chat = await findChatById(chatId);
  if (!chat || chat.orgId !== orgId) {
    throw new NotFoundError('Chat');
  }

  // Parse request body
  const body = await c.req.json();
  const { content, documentIds } = body;

  if (!content || typeof content !== 'string') {
    throw new ValidationError('Content is required');
  }

  // Save user message
  await createMessage(chatId, 'user', content);

  // Create SSE session
  const sessionId = uuidv4();
  const sseManager = getSSEManager();
  await sseManager.createSession(sessionId);

  // Get recent messages for context (last 20)
  const recentMessages = await findMessagesByChat(chatId, 20);
  const contextMessages = recentMessages.reverse().map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Publish to queue for agent to process
  const queueMessage: ChatMessageQueue = {
    sessionId,
    chatId,
    orgId,
    userId: user.id,
    content,
    documentIds: documentIds || [],
    contextMessages,
  };
  await publish('chat.message', queueMessage);

  // Return SSE stream
  return streamSSE(c, async (stream) => {
    // Subscribe to SSE events
    const unsubscribe = sseManager.subscribe(sessionId, (event: SSEEvent) => {
      stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event.data),
      });

      // Close stream on done or error
      if (event.type === 'done' || event.type === 'error') {
        stream.close();
        sseManager.deleteSession(sessionId);
      }
    });

    // Handle client disconnect
    c.req.raw.signal.addEventListener('abort', () => {
      unsubscribe();
      sseManager.deleteSession(sessionId);
      stream.close();
    });

    // Keep stream open until closed by events
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        // Stream will be closed by SSE events
      }, 1000);

      stream.onAbort(() => {
        clearInterval(checkInterval);
        resolve();
      });
    });
  });
});

export default chats;

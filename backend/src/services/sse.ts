import { createClient, RedisClientType } from 'redis';
import { SSEEvent } from '../types.js';

type Subscriber = (event: SSEEvent) => void;

/**
 * Redis-backed SSE session manager.
 * Supports multiple API instances by using Redis pub/sub.
 */
export class SSEManager {
  private redis: RedisClientType;
  private subscribers: Map<string, Set<Subscriber>> = new Map();

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.redis.connect();
  }

  /**
   * Create a new SSE session.
   */
  async createSession(sessionId: string): Promise<void> {
    await this.redis.set(`sse:${sessionId}`, JSON.stringify({ created: Date.now() }), {
      EX: 3600, // 1 hour TTL
    });
  }

  /**
   * Subscribe to SSE events for a session.
   * Returns an unsubscribe function.
   */
  subscribe(sessionId: string, callback: Subscriber): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    this.subscribers.get(sessionId)!.add(callback);

    // Subscribe to Redis pub/sub for cross-instance events
    const channel = `sse:${sessionId}:events`;
    const redisSub = this.redis.duplicate();
    redisSub.connect().then(() => {
      redisSub.subscribe(channel, (message) => {
        const event = JSON.parse(message) as SSEEvent;
        callback(event);
      });
    });

    return () => {
      this.subscribers.get(sessionId)?.delete(callback);
      redisSub.unsubscribe(channel).then(() => redisSub.disconnect());
    };
  }

  /**
   * Emit an SSE event to a session.
   */
  async emit(sessionId: string, event: SSEEvent): Promise<void> {
    // Publish to Redis for cross-instance delivery
    await this.redis.publish(`sse:${sessionId}:events`, JSON.stringify(event));

    // Also notify local subscribers
    this.subscribers.get(sessionId)?.forEach((cb) => cb(event));
  }

  /**
   * Delete an SSE session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`sse:${sessionId}`);
    this.subscribers.delete(sessionId);
  }

  /**
   * Check if a session exists.
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const exists = await this.redis.exists(`sse:${sessionId}`);
    return exists === 1;
  }
}

// Singleton instance
let sseManager: SSEManager | null = null;

export function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager();
  }
  return sseManager;
}

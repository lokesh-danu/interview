import { Context, Next } from 'hono';
import { findUserById } from '../db/queries.js';

// Extend Hono context to include user and orgId
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      orgId: string;
      email: string;
      name: string | null;
    };
    orgId: string;
  }
}

/**
 * Stubbed auth middleware.
 * Extracts user ID from X-User-Id header or cookie.
 * In production, this would validate JWT tokens.
 */
export async function authMiddleware(c: Context, next: Next) {
  // Try header first, then cookie
  let userId = c.req.header('X-User-Id');

  if (!userId) {
    // Try cookie
    const cookies = c.req.header('Cookie');
    if (cookies) {
      const match = cookies.match(/userId=([^;]+)/);
      if (match) {
        userId = match[1];
      }
    }
  }

  if (!userId) {
    return c.json({ error: 'Unauthorized - Missing user ID' }, 401);
  }

  const user = await findUserById(userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Set user and orgId on context
  c.set('user', user);
  c.set('orgId', user.orgId);

  await next();
}

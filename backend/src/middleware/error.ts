import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Global error handler middleware.
 */
export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error('Unhandled error:', err);

    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }

    if (err instanceof Error) {
      // Don't expose internal errors in production
      return c.json({ error: 'Internal server error' }, 500);
    }

    return c.json({ error: 'Unknown error' }, 500);
  }
}

/**
 * Validation error class.
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error class.
 */
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

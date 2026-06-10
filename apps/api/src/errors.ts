import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorCode = 'unauthorized' | 'not_found' | 'validation_failed' | 'internal'

const STATUS: Record<ErrorCode, ContentfulStatusCode> = {
  unauthorized: 401,
  not_found: 404,
  validation_failed: 422,
  internal: 500,
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export function errorResponse(c: Context, code: ErrorCode, message: string) {
  return c.json({ error: { code, message } }, STATUS[code])
}

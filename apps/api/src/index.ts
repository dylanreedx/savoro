import { Hono } from 'hono'
import type { AppEnv } from './app-env'
import { ApiError, errorResponse } from './errors'
import { logs } from './routes/logs'

const app = new Hono<AppEnv>()

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return errorResponse(c, err.code, err.message)
  }
  console.error(err)
  return errorResponse(c, 'internal', 'Internal error.')
})

app.notFound((c) => errorResponse(c, 'not_found', 'Route not found.'))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/v1/logs', logs)

export default app

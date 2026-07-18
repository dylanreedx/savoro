import { Hono } from 'hono'
import type { AppEnv } from './app-env'
import { ApiError, errorResponse } from './errors'
import { auth } from './routes/auth'
import { cookbook } from './routes/cookbook'
import { discover } from './routes/discover'
import { goals } from './routes/goals'
import { logs } from './routes/logs'
import { me, profiles } from './routes/profiles'
import { recipes } from './routes/recipes'
import { search } from './routes/search'
import { activity, friends, users } from './routes/social'

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

app.route('/v1/auth', auth)
app.route('/v1/logs', logs)
app.route('/v1/goals', goals)
app.route('/v1/me', me)
app.route('/v1/profiles', profiles)
app.route('/v1/recipes', recipes)
app.route('/v1/cookbook', cookbook)
app.route('/v1/discover', discover)
app.route('/v1/search', search)
app.route('/v1/users', users)
app.route('/v1/friends', friends)
app.route('/v1/activity', activity)

export default app

import { existsSync } from 'node:fs'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import compression from 'compression'
import type { AppConfig } from './config.js'
import type { Db } from './db.js'
import {
  authorizeOrBootstrap, clearLoginFailures, createSession, listAdmins, loginBlocked,
  recordLoginFailure, resolveSession, revokeSession, rotateCsrf, saveAdmin, validCsrf,
  type AdminAccess,
} from './access.js'
import { clearSessionCookie, sameOrigin, setSessionCookie, sha256 } from './security.js'
import { authenticateEmployee, revalidateEmployee, searchEmployees, UpstreamError } from './upstream.js'
import { facilitiesNeedingOperationsContactReview, facilityOperations } from './data/facility-operations.js'

type Dependencies = { config: AppConfig; db: Db }
type AuthorizedRequest = Request & { admin?: AdminAccess }

const privatePortraits: Record<string, string> = {
  'ruben-jauregui.png': 'buena-park-valley-view/ruben-jauregui.png',
  'mark-tuttle.png': 'buena-park-valley-view/mark-tuttle.png',
  'fabian-quiroz.png': 'joliet-brandon/fabian-quiroz.png',
  'harold-cuarezma.png': 'people/harold-cuarezma.png',
  'javier-montane.png': 'people/javier-montane.png',
  'john-diaz.png': 'people/john-diaz.png',
}

function noStore(response: Response) {
  response.set('cache-control', 'no-store')
  response.set('pragma', 'no-cache')
}

function fail(response: Response, status: number, error: string) {
  noStore(response)
  return response.status(status).json({ ok: false, error })
}

export function createApp({ config, db }: Dependencies) {
  const app = express()
  if (config.trustProxy) app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(compression())
  app.use((request, response, next) => {
    response.set({
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'cross-origin-resource-policy': 'same-origin',
      'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https://*.arcgisonline.com https://*.arcgis.com https://gibs.earthdata.nasa.gov; frame-src https://www.google.com; worker-src 'self' blob:; child-src blob:",
    })
    if (config.secureCookies) response.set('strict-transport-security', 'max-age=31536000; includeSubDomains')
    next()
  })
  app.use('/api', express.json({ limit: '16kb', type: 'application/json' }))
  app.use('/api', (_request, response, next) => { noStore(response); next() })

  const requireOrigin = (request: Request, response: Response, next: NextFunction) => {
    if (!sameOrigin(request, config)) return fail(response, 403, 'invalid_origin')
    next()
  }
  const requireAuth = async (request: AuthorizedRequest, response: Response, next: NextFunction) => {
    try {
      const admin = await resolveSession(db, config, request)
      if (!admin) return fail(response, 401, 'session_expired')
      request.admin = admin
      next()
    } catch { fail(response, 503, 'service_unavailable') }
  }
  const requireConfiguration = (request: AuthorizedRequest, response: Response, next: NextFunction) => {
    if (!request.admin?.canConfigure) return fail(response, 403, 'configuration_access_required')
    next()
  }
  const requireMutation = async (request: AuthorizedRequest, response: Response, next: NextFunction) => {
    if (!sameOrigin(request, config)) return fail(response, 403, 'invalid_origin')
    if (!await validCsrf(db, config, request)) return fail(response, 403, 'invalid_csrf')
    next()
  }

  app.get('/api/health', async (_request, response) => {
    try { await db.query('SELECT 1'); response.json({ ok: true }) } catch { fail(response, 503, 'database_unavailable') }
  })

  app.get('/api/auth/session', async (request, response) => {
    try {
      const admin = await resolveSession(db, config, request)
      if (!admin) return response.json({ authenticated: false })
      const csrfToken = await rotateCsrf(db, config, request)
      if (!csrfToken) return response.json({ authenticated: false })
      return response.json({ authenticated: true, csrfToken, user: admin })
    } catch { return fail(response, 503, 'service_unavailable') }
  })

  app.post('/api/auth/login', requireOrigin, async (request, response) => {
    const username = typeof request.body?.username === 'string' ? request.body.username.trim() : ''
    const password = typeof request.body?.password === 'string' ? request.body.password : ''
    if (!username || username.length > 254 || !password || password.length > 512) return fail(response, 400, 'invalid_input')
    const throttleKey = sha256(`${request.ip}|${username.toLowerCase()}`)
    try {
      if (await loginBlocked(db, throttleKey)) return fail(response, 429, 'invalid_credentials')
      const identity = await authenticateEmployee(config, username, password)
      const eligible = await revalidateEmployee(config, identity.userId)
      if (!eligible || eligible.userName.toLowerCase() !== identity.username.toLowerCase()) throw new UpstreamError('ineligible', undefined, 'directory_response')
      const admin = await authorizeOrBootstrap(db, config, identity)
      if (!admin) throw new UpstreamError('credentials')
      await clearLoginFailures(db, throttleKey)
      const session = await createSession(db, config, admin)
      setSessionCookie(response, session.token, config)
      return response.json({ ok: true, csrfToken: session.csrf, user: admin })
    } catch (error) {
      await recordLoginFailure(db, throttleKey).catch(() => undefined)
      const unavailable = error instanceof UpstreamError && (error.kind === 'service' || error.kind === 'malformed')
      console.warn('[facility-auth]', { category: unavailable ? 'service' : 'denied', failureStage: error instanceof UpstreamError ? error.stage : undefined, upstreamStatus: error instanceof UpstreamError ? error.status : undefined })
      return fail(response, unavailable ? 503 : 401, unavailable ? 'service_unavailable' : 'invalid_credentials')
    }
  })

  app.post('/api/auth/logout', requireAuth, requireMutation, async (request, response) => {
    await revokeSession(db, config, request)
    clearSessionCookie(response, config)
    response.json({ ok: true })
  })

  app.get('/api/operations/portraits/:filename', requireAuth, (request, response) => {
    const filename = Array.isArray(request.params.filename) ? request.params.filename[0] : request.params.filename
    const relative = privatePortraits[filename]
    if (!relative) return fail(response, 404, 'not_found')
    const file = path.resolve('private-media/operations', relative)
    noStore(response)
    response.set('content-type', 'image/png')
    response.set('content-disposition', 'inline')
    return response.sendFile(file)
  })

  app.get('/api/operations/:facilityId', requireAuth, (request, response) => {
    const facilityId = Array.isArray(request.params.facilityId) ? request.params.facilityId[0] : request.params.facilityId
    const operations = facilityOperations[facilityId]
    const reviewRequired = (facilitiesNeedingOperationsContactReview as readonly string[]).includes(facilityId)
    if (!operations && !reviewRequired) return fail(response, 404, 'facility_not_found')
    return response.json({ operations: operations || null, reviewRequired })
  })

  app.get('/media/operations/*path', (_request, response) => fail(response, 404, 'not_found'))

  app.get('/api/admin/access', requireAuth, requireConfiguration, async (_request, response) => {
    try { response.json(await listAdmins(db)) } catch { fail(response, 503, 'service_unavailable') }
  })

  app.get('/api/admin/employees', requireAuth, requireConfiguration, async (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q.trim() : ''
    const page = typeof request.query.page === 'string' && /^\d+$/.test(request.query.page) ? Number(request.query.page) : 1
    if (query.length > 80 || !Number.isSafeInteger(page) || page < 1 || page > 100_000) return fail(response, 400, 'invalid_query')
    try { response.json(await searchEmployees(config, query, page)) } catch { fail(response, 503, 'employee_directory_unavailable') }
  })

  app.post('/api/admin/access', requireAuth, requireConfiguration, requireMutation, async (request: AuthorizedRequest, response) => {
    const iamUserId = typeof request.body?.iamUserId === 'string' ? request.body.iamUserId : ''
    const isActive = request.body?.isActive
    const canConfigure = request.body?.canConfigure
    const version = request.body?.version
    if (!/^\d{1,128}$/.test(iamUserId) || typeof isActive !== 'boolean' || typeof canConfigure !== 'boolean' || (version !== undefined && (!Number.isSafeInteger(version) || version < 1))) return fail(response, 400, 'invalid_input')
    try {
      const employee = await revalidateEmployee(config, iamUserId)
      if (!employee) return fail(response, 409, 'employee_not_eligible')
      const saved = await saveAdmin(db, request.admin!, employee, { isActive, canConfigure, ...(version === undefined ? {} : { version }) })
      response.json({ ok: true, admin: saved })
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'actor_access_revoked') return fail(response, 403, code)
      if (['self_protection', 'last_configuration_admin', 'stale_record'].includes(code)) return fail(response, 409, code)
      if (error instanceof UpstreamError) return fail(response, 503, 'employee_directory_unavailable')
      return fail(response, 503, 'service_unavailable')
    }
  })

  const dist = path.resolve('dist')
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false, setHeaders: (response, file) => {
      if (file.endsWith('index.html')) response.setHeader('cache-control', 'no-cache')
      else if (file.includes(`${path.sep}assets${path.sep}`)) response.setHeader('cache-control', 'public,max-age=31536000,immutable')
    } }))
    app.get('*path', (_request, response) => response.sendFile(path.join(dist, 'index.html'), { headers: { 'cache-control': 'no-cache' } }))
  }
  return app
}

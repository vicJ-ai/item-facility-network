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
import {
  adminAvailability, adminFacilitySpace, availabilityHistory, facilitySpaceHistory, publicAvailability, publicBulkRack,
  saveAvailability, saveFacilitySpace, validSquareFeet,
} from './availability.js'
import { adminArchive, archiveHistory, publicArchive, setFacilityArchived } from './archive.js'
import { isKnownFacilityId } from './data/facility-ids.js'

type Dependencies = { config: AppConfig; db: Db }
type AuthorizedRequest = Request & { admin?: AdminAccess }

const privatePortraits: Record<string, { relativePath: string; contentType: 'image/png' | 'image/jpeg' }> = {
  'compact-adam-lubin.jpg': { relativePath: 'compact/adam-lubin.jpg', contentType: 'image/jpeg' },
  'compact-alondra-toledano.jpg': { relativePath: 'compact/alondra-toledano.jpg', contentType: 'image/jpeg' },
  'compact-barry-washington.jpg': { relativePath: 'compact/barry-washington.jpg', contentType: 'image/jpeg' },
  'compact-efrain-islas-alcaraz.jpg': { relativePath: 'compact/efrain-islas-alcaraz.jpg', contentType: 'image/jpeg' },
  'compact-elizabeth-martinez.jpg': { relativePath: 'compact/elizabeth-martinez.jpg', contentType: 'image/jpeg' },
  'compact-fabian-quiroz.jpg': { relativePath: 'compact/fabian-quiroz.jpg', contentType: 'image/jpeg' },
  'compact-francisca-aispuro.jpg': { relativePath: 'compact/francisca-aispuro.jpg', contentType: 'image/jpeg' },
  'compact-frank-feliciano.jpg': { relativePath: 'compact/frank-feliciano.jpg', contentType: 'image/jpeg' },
  'compact-harold-cuarezma.jpg': { relativePath: 'compact/harold-cuarezma.jpg', contentType: 'image/jpeg' },
  'compact-javier-montane.jpg': { relativePath: 'compact/javier-montane.jpg', contentType: 'image/jpeg' },
  'compact-jessica-barajas.jpg': { relativePath: 'compact/jessica-barajas.jpg', contentType: 'image/jpeg' },
  'compact-jessica-chaidez.jpg': { relativePath: 'compact/jessica-chaidez.jpg', contentType: 'image/jpeg' },
  'compact-jimmy-esparza.jpg': { relativePath: 'compact/jimmy-esparza.jpg', contentType: 'image/jpeg' },
  'compact-jason-hop.jpg': { relativePath: 'compact/jason-hop.jpg', contentType: 'image/jpeg' },
  'compact-jehnifur-morvai.jpg': { relativePath: 'compact/jehnifur-morvai.jpg', contentType: 'image/jpeg' },
  'compact-jennifer-stanek.jpg': { relativePath: 'compact/jennifer-stanek.jpg', contentType: 'image/jpeg' },
  'compact-john-diaz.jpg': { relativePath: 'compact/john-diaz.jpg', contentType: 'image/jpeg' },
  'compact-john-gleason.jpg': { relativePath: 'compact/john-gleason.jpg', contentType: 'image/jpeg' },
  'compact-juan-barragan.jpg': { relativePath: 'compact/juan-barragan.jpg', contentType: 'image/jpeg' },
  'compact-karen-nesta.jpg': { relativePath: 'compact/karen-nesta.jpg', contentType: 'image/jpeg' },
  'compact-kassandra-ibanez.jpg': { relativePath: 'compact/kassandra-ibanez.jpg', contentType: 'image/jpeg' },
  'compact-lenivy-jackson.jpg': { relativePath: 'compact/lenivy-jackson.jpg', contentType: 'image/jpeg' },
  'compact-margaret-medina.jpg': { relativePath: 'compact/margaret-medina.jpg', contentType: 'image/jpeg' },
  'compact-mark-tuttle.jpg': { relativePath: 'compact/mark-tuttle.jpg', contentType: 'image/jpeg' },
  'compact-mary-smothers.jpg': { relativePath: 'compact/mary-smothers.jpg', contentType: 'image/jpeg' },
  'compact-matthew-david.jpg': { relativePath: 'compact/matthew-david.jpg', contentType: 'image/jpeg' },
  'compact-melissa-ortiz.jpg': { relativePath: 'compact/melissa-ortiz.jpg', contentType: 'image/jpeg' },
  'compact-michelle-topete.jpg': { relativePath: 'compact/michelle-topete.jpg', contentType: 'image/jpeg' },
  'compact-natasha-gray.jpg': { relativePath: 'compact/natasha-gray.jpg', contentType: 'image/jpeg' },
  'compact-onoriode-enaigbe.jpg': { relativePath: 'compact/onoriode-enaigbe.jpg', contentType: 'image/jpeg' },
  'compact-raed-ali.jpg': { relativePath: 'compact/raed-ali.jpg', contentType: 'image/jpeg' },
  'compact-rick-griswold.jpg': { relativePath: 'compact/rick-griswold.jpg', contentType: 'image/jpeg' },
  'compact-ruben-echavarria.jpg': { relativePath: 'compact/ruben-echavarria.jpg', contentType: 'image/jpeg' },
  'compact-ruben-jauregui.jpg': { relativePath: 'compact/ruben-jauregui.jpg', contentType: 'image/jpeg' },
  'compact-stephen-schumaker.jpg': { relativePath: 'compact/stephen-schumaker.jpg', contentType: 'image/jpeg' },
  'compact-susan-mendez.jpg': { relativePath: 'compact/susan-mendez.jpg', contentType: 'image/jpeg' },
  'compact-thelma-tolentino.jpg': { relativePath: 'compact/thelma-tolentino.jpg', contentType: 'image/jpeg' },
  'compact-wayne-brooks.jpg': { relativePath: 'compact/wayne-brooks.jpg', contentType: 'image/jpeg' },
  'compact-yesenia-diaz.jpg': { relativePath: 'compact/yesenia-diaz.jpg', contentType: 'image/jpeg' },
  'compact-yessenia-tovar.jpg': { relativePath: 'compact/yessenia-tovar.jpg', contentType: 'image/jpeg' },
  'ruben-jauregui.png': { relativePath: 'buena-park-valley-view/ruben-jauregui.png', contentType: 'image/png' },
  'mark-tuttle.png': { relativePath: 'buena-park-valley-view/mark-tuttle.png', contentType: 'image/png' },
  'frank-feliciano-v2.png': { relativePath: 'garden-city-prosperity/frank-feliciano-v2.png', contentType: 'image/png' },
  'frank-feliciano.png': { relativePath: 'garden-city-prosperity/frank-feliciano.png', contentType: 'image/png' },
  'ruben-echavarria.png': { relativePath: 'houston-citypark/ruben-echavarria.png', contentType: 'image/png' },
  'adam-lubin-v2.png': { relativePath: 'jacksonville-ignition/adam-lubin-v2.png', contentType: 'image/png' },
  'adam-lubin.png': { relativePath: 'jacksonville-ignition/adam-lubin.png', contentType: 'image/png' },
  'fabian-quiroz.png': { relativePath: 'joliet-brandon/fabian-quiroz.png', contentType: 'image/png' },
  'efrain-islas-alcaraz.png': { relativePath: 'people/efrain-islas-alcaraz.png', contentType: 'image/png' },
  'harold-cuarezma.png': { relativePath: 'people/harold-cuarezma.png', contentType: 'image/png' },
  'javier-montane-v2.png': { relativePath: 'people/javier-montane-v2.png', contentType: 'image/png' },
  'javier-montane.png': { relativePath: 'people/javier-montane.png', contentType: 'image/png' },
  'jessica-barajas-v2.png': { relativePath: 'people/jessica-barajas-v2.png', contentType: 'image/png' },
  'jessica-barajas.jpg': { relativePath: 'people/jessica-barajas.jpg', contentType: 'image/jpeg' },
  'john-diaz.png': { relativePath: 'people/john-diaz.png', contentType: 'image/png' },
  'john-gleason-v2.png': { relativePath: 'people/john-gleason-v2.png', contentType: 'image/png' },
  'john-gleason.png': { relativePath: 'people/john-gleason.png', contentType: 'image/png' },
  'juan-barragan.png': { relativePath: 'people/juan-barragan.png', contentType: 'image/png' },
  'mary-smothers.jpg': { relativePath: 'people/mary-smothers.jpg', contentType: 'image/jpeg' },
  'michelle-topete.jpg': { relativePath: 'people/michelle-topete.jpg', contentType: 'image/jpeg' },
  'oscar-rodriguez.png': { relativePath: 'people/oscar-rodriguez.png', contentType: 'image/png' },
  'rick-griswold.png': { relativePath: 'people/rick-griswold.png', contentType: 'image/png' },
  'wayne-brooks.png': { relativePath: 'people/wayne-brooks.png', contentType: 'image/png' },
  'lenivy-jackson-v2.png': { relativePath: 'pooler-seabrook-building-2/lenivy-jackson-v2.png', contentType: 'image/png' },
  'lenivy-jackson.png': { relativePath: 'pooler-seabrook-building-2/lenivy-jackson.png', contentType: 'image/png' },
  'onoriode-enaigbe.png': { relativePath: 'sparks-vista/onoriode-enaigbe.png', contentType: 'image/png' },
  'stephen-schumaker-v2.png': { relativePath: 'summerville-cypress-tradeport/stephen-schumaker-v2.png', contentType: 'image/png' },
  'stephen-schumaker.png': { relativePath: 'summerville-cypress-tradeport/stephen-schumaker.png', contentType: 'image/png' },
  'jimmy-esparza.png': { relativePath: 'university-park-central/jimmy-esparza.png', contentType: 'image/png' },
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

  app.get('/api/availability', async (_request, response) => {
    try { response.json({ availability: await publicAvailability(db) }) } catch { fail(response, 503, 'service_unavailable') }
  })

  app.get('/api/bulk-rack', async (_request, response) => {
    try { response.json({ bulkRack: await publicBulkRack(db) }) } catch { fail(response, 503, 'service_unavailable') }
  })

  app.get('/api/archived', async (_request, response) => {
    try { response.json({ archived: await publicArchive(db) }) } catch { fail(response, 503, 'service_unavailable') }
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

  app.get('/api/operations/portraits/:filename', (request, response) => {
    const filename = Array.isArray(request.params.filename) ? request.params.filename[0] : request.params.filename
    const portrait = privatePortraits[filename]
    if (!portrait) return fail(response, 404, 'not_found')
    const file = path.resolve('private-media/operations', portrait.relativePath)
    noStore(response)
    response.set('content-type', portrait.contentType)
    response.set('content-disposition', 'inline')
    return response.sendFile(file)
  })

  app.get('/api/operations/:facilityId', (request, response) => {
    const facilityId = Array.isArray(request.params.facilityId) ? request.params.facilityId[0] : request.params.facilityId
    const operations = facilityOperations[facilityId]
    const reviewRequired = (facilitiesNeedingOperationsContactReview as readonly string[]).includes(facilityId)
    if (!operations && !reviewRequired) return fail(response, 404, 'facility_not_found')
    return response.json({ operations: operations || null, reviewRequired })
  })

  app.get('/media/operations/*path', (_request, response) => fail(response, 404, 'not_found'))

  app.get('/api/admin/availability', requireAuth, async (_request, response) => {
    try { response.json({ availability: await adminAvailability(db) }) } catch { fail(response, 503, 'service_unavailable') }
  })

  app.get('/api/admin/availability/history', requireAuth, async (request, response) => {
    const rawPage = typeof request.query.page === 'string' ? request.query.page : '1'
    const facilityId = typeof request.query.facilityId === 'string' && request.query.facilityId ? request.query.facilityId : undefined
    if (!/^\d+$/.test(rawPage) || (facilityId && !isKnownFacilityId(facilityId))) return fail(response, 400, 'invalid_query')
    try { response.json(await availabilityHistory(db, { page: Number(rawPage), ...(facilityId ? { facilityId } : {}) })) } catch { fail(response, 400, 'invalid_query') }
  })

  app.get('/api/admin/facility-space', requireAuth, async (_request, response) => {
    try { response.json({ facilities: await adminFacilitySpace(db) }) } catch { fail(response, 503, 'service_unavailable') }
  })

  app.get('/api/admin/facility-space/history', requireAuth, async (request, response) => {
    const rawPage = typeof request.query.page === 'string' ? request.query.page : '1'
    const facilityId = typeof request.query.facilityId === 'string' && request.query.facilityId ? request.query.facilityId : undefined
    if (!/^\d+$/.test(rawPage) || (facilityId && !isKnownFacilityId(facilityId))) return fail(response, 400, 'invalid_query')
    try { response.json(await facilitySpaceHistory(db, { page: Number(rawPage), ...(facilityId ? { facilityId } : {}) })) } catch { fail(response, 400, 'invalid_query') }
  })

  app.post('/api/admin/availability/:facilityId', requireAuth, requireMutation, async (request: AuthorizedRequest, response) => {
    const facilityId = Array.isArray(request.params.facilityId) ? request.params.facilityId[0] : request.params.facilityId
    const squareFeet = request.body?.squareFeet
    const version = request.body?.version
    if (!isKnownFacilityId(facilityId) || !validSquareFeet(squareFeet) || !Number.isSafeInteger(version) || version < 0) return fail(response, 400, 'invalid_availability')
    try {
      response.json({ ok: true, availability: await saveAvailability(db, config.tenantId, request.admin!, { facilityId, squareFeet, version }) })
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'actor_access_revoked') return fail(response, 403, code)
      if (code === 'stale_availability') return fail(response, 409, code)
      if (code === 'unknown_facility' || code === 'invalid_availability') return fail(response, 400, code)
      return fail(response, 503, 'service_unavailable')
    }
  })

  app.post('/api/admin/facility-space/:facilityId', requireAuth, requireMutation, async (request: AuthorizedRequest, response) => {
    const facilityId = Array.isArray(request.params.facilityId) ? request.params.facilityId[0] : request.params.facilityId
    const body = request.body && typeof request.body === 'object' ? request.body as Record<string, unknown> : {}
    const availabilityVersion = body.availabilityVersion
    const bulkRackVersion = body.bulkRackVersion
    if (!isKnownFacilityId(facilityId) || !validSquareFeet(body.availableSquareFeet) || !validSquareFeet(body.bulkSquareFeet) ||
      !validSquareFeet(body.rackPalletPositions) || !Number.isSafeInteger(availabilityVersion) || Number(availabilityVersion) < 0 ||
      !Number.isSafeInteger(bulkRackVersion) || Number(bulkRackVersion) < 0) return fail(response, 400, 'invalid_space')
    try {
      const space = await saveFacilitySpace(db, config.tenantId, request.admin!, {
        facilityId,
        availability: { squareFeet: Number(body.availableSquareFeet), version: Number(availabilityVersion) },
        bulkRack: {
          version: Number(bulkRackVersion),
          bulkSquareFeet: Number(body.bulkSquareFeet),
          rackPalletPositions: Number(body.rackPalletPositions),
        },
      })
      response.json({ ok: true, space })
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'actor_access_revoked') return fail(response, 403, code)
      if (code === 'stale_availability' || code === 'stale_bulk_rack') return fail(response, 409, code)
      if (code === 'unknown_facility' || code === 'invalid_space') return fail(response, 400, code)
      return fail(response, 503, 'service_unavailable')
    }
  })

  app.get('/api/admin/archive', requireAuth, async (_request, response) => {
    try { response.json({ facilities: await adminArchive(db) }) } catch { fail(response, 503, 'service_unavailable') }
  })

  app.get('/api/admin/archive/history', requireAuth, async (request, response) => {
    const rawPage = typeof request.query.page === 'string' ? request.query.page : '1'
    const facilityId = typeof request.query.facilityId === 'string' && request.query.facilityId ? request.query.facilityId : undefined
    if (!/^\d+$/.test(rawPage) || (facilityId && !isKnownFacilityId(facilityId))) return fail(response, 400, 'invalid_query')
    try { response.json(await archiveHistory(db, { page: Number(rawPage), ...(facilityId ? { facilityId } : {}) })) } catch { fail(response, 400, 'invalid_query') }
  })

  app.post('/api/admin/archive/:facilityId', requireAuth, requireMutation, async (request: AuthorizedRequest, response) => {
    const facilityId = Array.isArray(request.params.facilityId) ? request.params.facilityId[0] : request.params.facilityId
    const archived = request.body?.archived
    const version = request.body?.version
    if (!isKnownFacilityId(facilityId) || typeof archived !== 'boolean' || !Number.isSafeInteger(version) || version < 0) return fail(response, 400, 'invalid_archive')
    try {
      response.json({ ok: true, archive: await setFacilityArchived(db, config.tenantId, request.admin!, { facilityId, archived, version }) })
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'actor_access_revoked') return fail(response, 403, code)
      if (code === 'stale_archive') return fail(response, 409, code)
      if (code === 'unknown_facility' || code === 'invalid_archive') return fail(response, 400, code)
      return fail(response, 503, 'service_unavailable')
    }
  })

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

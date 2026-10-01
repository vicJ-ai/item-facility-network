import 'dotenv/config'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', override: false, quiet: true })

const text = (name: string) => process.env[name]?.trim() || ''

export function databaseSchema(value: string) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value)) throw new Error('DATABASE_SCHEMA must be a lowercase PostgreSQL identifier')
  return value
}

function absoluteUrl(name: string, required = false) {
  const raw = text(name)
  if (!raw) {
    if (required) throw new Error(`${name} is required`)
    return ''
  }
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must be an absolute HTTP(S) URL without credentials, query, or fragment`)
  }
  return url.href.replace(/\/$/, '')
}

function origin(name: string) {
  const raw = text(name)
  if (!raw) throw new Error(`${name} is required`)
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== raw.replace(/\/$/, '')) {
    throw new Error(`${name} must be an absolute HTTP(S) origin`)
  }
  return url.origin
}

export type AppConfig = ReturnType<typeof loadConfig>

export function loadConfig() {
  const publicOrigin = origin('PUBLIC_ORIGIN')
  const sessionSecret = text('SESSION_SECRET')
  const databaseUrl = text('DATABASE_URL')
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  const bootstrap = {
    iamUserId: text('BOOTSTRAP_IAM_USER_ID'),
    tenantId: text('BOOTSTRAP_TENANT_ID'),
    username: text('BOOTSTRAP_USERNAME'),
    email: text('BOOTSTRAP_EMAIL').toLowerCase(),
  }
  if (!bootstrap.iamUserId || !/^\d{1,128}$/.test(bootstrap.iamUserId) || !bootstrap.tenantId || !bootstrap.username || !bootstrap.email) {
    throw new Error('Exact bootstrap IAM ID, tenant, username, and email are required')
  }

  return {
    publicOrigin,
    secureCookies: new URL(publicOrigin).protocol === 'https:',
    databaseUrl,
    databaseSchema: databaseSchema(text('DATABASE_SCHEMA') || 'public'),
    sessionSecret,
    itemGptBaseUrl: absoluteUrl('ITEMGPT_BASE_URL'),
    wmsBaseUrl: absoluteUrl('WMS_API_BASE_URL'),
    wmsServiceUsername: text('WMS_SERVICE_USERNAME'),
    wmsServicePassword: text('WMS_SERVICE_PASSWORD'),
    tenantId: text('PORTAL_TENANT_ID') || 'LT',
    facilityId: text('PORTAL_FACILITY_ID') || 'LT_F1',
    bootstrap,
    port: Number(text('PORT') || 4210),
    trustProxy: text('TRUST_PROXY') === 'true',
    sessionHours: Math.min(24, Math.max(1, Number(text('SESSION_HOURS') || 8))),
  }
}

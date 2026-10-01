import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import type { AppConfig } from './config.js'

export const SESSION_COOKIE = 'facility_session'
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
export const hmacSha256 = (secret: string, value: string) => createHmac('sha256', secret).update(value).digest('hex')
export const opaqueToken = () => randomBytes(32).toString('base64url')

export function parseCookies(request: Request) {
  const header = request.headers.cookie || ''
  return Object.fromEntries(header.split(';').flatMap((part) => {
    const separator = part.indexOf('=')
    if (separator < 1) return []
    try {
      return [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())]]
    } catch {
      return []
    }
  }))
}

export function setSessionCookie(response: Response, token: string, config: AppConfig) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict',
    path: '/',
    maxAge: config.sessionHours * 60 * 60 * 1000,
  })
}

export function clearSessionCookie(response: Response, config: AppConfig) {
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/' })
}

export function sameOrigin(request: Request, config: AppConfig) {
  const origin = request.get('origin')
  return typeof origin === 'string' && origin === config.publicOrigin
}

export function constantEquals(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

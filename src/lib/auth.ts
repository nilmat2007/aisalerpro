import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

export interface Session {
  username: string
  role: string
  is_admin: boolean
  [key: string]: unknown
}

export function getJwtSecretKey(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET
  if (!raw || raw.length < 32) throw new Error('ADMIN_JWT_SECRET missing or too short')
  return new TextEncoder().encode(raw)
}

export const getAdminJwtSecret = getJwtSecretKey

export async function createToken(payload: {
  username: string
  role: string
  is_admin?: boolean
}) {
  const isAdmin =
    typeof payload.is_admin === 'boolean'
      ? payload.is_admin
      : payload.role === 'admin'

  return new SignJWT({
    ...payload,
    is_admin: isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getJwtSecretKey())
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    const isAdmin =
      typeof payload.is_admin === 'boolean'
        ? payload.is_admin
        : payload.role === 'admin'

    return {
      ...payload,
      username: String(payload.username || ''),
      role: String(payload.role || (isAdmin ? 'admin' : 'user')),
      is_admin: isAdmin,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    const isAdmin =
      typeof payload.is_admin === 'boolean'
        ? payload.is_admin
        : payload.role === 'admin'

    return {
      ...payload,
      username: String(payload.username || ''),
      role: String(payload.role || (isAdmin ? 'admin' : 'user')),
      is_admin: isAdmin,
    }
  } catch {
    return null
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return Boolean(session && session.is_admin === true)
}

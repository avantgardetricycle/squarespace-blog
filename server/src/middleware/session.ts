import { Request, Response, NextFunction } from 'express'
import prisma from '../db/index.js'
import { hashToken } from '../lib/auth.js'

export interface SessionUser {
  id: number
  email: string
}

export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.session

  if (!token) {
    res.status(401).json({ error: 'Session required. Please log in again.' })
    return
  }

  const tokenHash = hashToken(token)

  const session = await prisma.session.findFirst({
    where: { sessionTokenHash: tokenHash },
    include: { user: true }
  })

  if (!session) {
    res.status(401).json({ error: 'Invalid session. Please log in again.' })
    return
  }

  if (session.revokedAt) {
    res.status(401).json({ error: 'Session revoked. Please log in again.' })
    return
  }

  if (new Date() > session.expiresAt) {
    res.status(401).json({ error: 'Session expired. Please log in again.' })
    return
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  })

  ;(req as Request & { user: SessionUser }).user = {
    id: session.user.id,
    email: session.user.email
  }

  next()
}

/** Attaches user to req if session exists; does not reject. */
export async function optionalSession(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.session
  if (!token) {
    next()
    return
  }

  const tokenHash = hashToken(token)
  const session = await prisma.session.findFirst({
    where: { sessionTokenHash: tokenHash },
    include: { user: true }
  })

  if (session && !session.revokedAt && new Date() <= session.expiresAt) {
    ;(req as Request & { user?: SessionUser }).user = {
      id: session.user.id,
      email: session.user.email
    }
  }
  next()
}

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
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const tokenHash = hashToken(token)

  const session = await prisma.session.findFirst({
    where: { sessionTokenHash: tokenHash },
    include: { user: true }
  })

  if (!session) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }

  if (session.revokedAt) {
    res.status(401).json({ error: 'Session revoked' })
    return
  }

  if (new Date() > session.expiresAt) {
    res.status(401).json({ error: 'Session expired' })
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

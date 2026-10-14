import { Request, Response, NextFunction } from 'express'
import prisma from '../db/index.js'
import { isEntitledSubscription, isInPaymentGrace, pickDisplaySubscription } from '../lib/subscriptionStatus.js'
import { SessionUser } from './session.js'

/** Block blog setting changes unless the subscription is fully active or trialing. */
export async function requireEditableSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as Request & { user?: SessionUser }).user
  if (!user) {
    res.status(401).json({ error: 'Session required. Please log in again.' })
    return
  }

  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })
    const sub = pickDisplaySubscription(subs)
    if (!isEntitledSubscription(sub)) {
      res.status(403).json({
        error: isInPaymentGrace(sub)
          ? 'Update your payment method before changing settings.'
          : 'An active subscription is required to change settings.'
      })
      return
    }
    next()
  } catch (err) {
    next(err)
  }
}

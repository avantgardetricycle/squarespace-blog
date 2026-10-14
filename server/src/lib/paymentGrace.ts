import prisma from '../db/index.js'
import { isPaymentFailedStatus, type SubscriptionEntitlementInput } from './subscriptionStatus.js'

/** Start the grace clock once, the first time a failed payment is observed. */
export async function stampPaymentFailure<T extends SubscriptionEntitlementInput & { id: string }>(
  sub: T
): Promise<T> {
  if (!isPaymentFailedStatus(sub.status) || sub.paymentFailedAt) return sub
  const paymentFailedAt = new Date()
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { paymentFailedAt }
  })
  return { ...sub, paymentFailedAt }
}

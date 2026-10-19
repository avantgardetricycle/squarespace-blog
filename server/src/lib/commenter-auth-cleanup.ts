import prisma from '../db/index.js'

const DAY_MS = 24 * 60 * 60 * 1000

export async function cleanupCommenterAuthRecords(now = new Date()): Promise<{
  challenges: number
  sessions: number
  events: number
}> {
  const challengeCutoff = new Date(now.getTime() - DAY_MS)
  const sessionCutoff = new Date(now.getTime() - 30 * DAY_MS)
  const eventCutoff = new Date(now.getTime() - 2 * DAY_MS)
  const [challenges, sessions, events] = await Promise.all([
    prisma.commenterOtpChallenge.deleteMany({ where: { createdAt: { lt: challengeCutoff } } }),
    prisma.commenterSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: sessionCutoff } }, { revokedAt: { lt: sessionCutoff } }],
      },
    }),
    prisma.commenterAuthEvent.deleteMany({ where: { createdAt: { lt: eventCutoff } } }),
  ])
  return {
    challenges: challenges.count,
    sessions: sessions.count,
    events: events.count,
  }
}

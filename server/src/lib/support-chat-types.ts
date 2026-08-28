export type SupportChatRole = 'user' | 'assistant'

export interface SupportChatMessage {
  role: SupportChatRole
  content: string
}

export function isSupportChatMessage(value: unknown): value is SupportChatMessage {
  if (!value || typeof value !== 'object') return false
  const role = (value as { role?: unknown }).role
  const content = (value as { content?: unknown }).content
  return (role === 'user' || role === 'assistant') && typeof content === 'string'
}

export function parseSupportChatMessages(value: unknown): SupportChatMessage[] {
  if (!Array.isArray(value)) return []
  return value.filter(isSupportChatMessage).map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

export function countUserMessages(messages: SupportChatMessage[]): number {
  return messages.filter((m) => m.role === 'user').length
}

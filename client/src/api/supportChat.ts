export type SupportChatRole = "user" | "assistant";

export interface SupportChatMessage {
  role: SupportChatRole;
  content: string;
}

export class SupportChatError extends Error {
  error: string;
  retryAfter?: number;

  constructor(message: string, error: string, retryAfter?: number) {
    super(message);
    this.name = "SupportChatError";
    this.error = error;
    this.retryAfter = retryAfter;
  }
}

export async function streamSupportChat(options: {
  messages: SupportChatMessage[];
  conversationId?: string | null;
  siteId?: string | null;
  onDelta: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<{ conversationId: string }> {
  const res = await fetch("/api/support/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: options.messages,
      conversation_id: options.conversationId || undefined,
      site_id: options.siteId || undefined,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      retry_after?: number;
    };
    throw new SupportChatError(
      data.message ?? (data.error === "rate_limited"
        ? "You've sent a lot of messages — take a short break or send your question directly to the team."
        : "Failed to send message"),
      data.error ?? "invalid_request",
      data.retry_after
    );
  }

  if (!res.body) {
    throw new SupportChatError("Empty response", "invalid_request");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let conversationId = "";

  const consumeBlock = (block: string) => {
    const line = block
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"));
    if (!line) return;
    const payload = line.replace(/^data:\s*/, "");
    if (!payload) return;
    const json = JSON.parse(payload) as {
      delta?: string;
      done?: boolean;
      conversation_id?: string;
      error?: string;
      message?: string;
    };
    if (json.error) {
      throw new SupportChatError(json.message ?? "Failed to generate a response", json.error);
    }
    if (typeof json.delta === "string" && json.delta) {
      options.onDelta(json.delta);
    }
    if (json.done && typeof json.conversation_id === "string") {
      conversationId = json.conversation_id;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) consumeBlock(part);
  }
  if (buffer.trim()) consumeBlock(buffer);

  if (!conversationId) {
    throw new SupportChatError("Chat ended unexpectedly", "invalid_request");
  }
  return { conversationId };
}

export async function submitSupportTicket(options: {
  subject: string;
  description: string;
  screenshot?: File | null;
  conversationId?: string | null;
  siteId?: string | null;
}): Promise<{ ticketId: string; message: string }> {
  const form = new FormData();
  form.append("subject", options.subject);
  form.append("description", options.description);
  if (options.conversationId) form.append("conversation_id", options.conversationId);
  if (options.siteId) form.append("site_id", options.siteId);
  if (options.screenshot) form.append("screenshot", options.screenshot);

  const res = await fetch("/api/support/contact", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    ticket_id?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to send message");
  }
  return {
    ticketId: data.ticket_id ?? "",
    message: data.message ?? "Sent! We'll get back to you within one business day.",
  };
}

export interface SupportConversationListItem {
  id: string;
  created_at: string;
  updated_at: string;
  account_email: string;
  account_name: string | null;
  blog_url: string | null;
  blog_name: string | null;
  message_count: number;
  escalated: boolean;
  escalated_at: string | null;
}

export interface SupportConversationDetail extends SupportConversationListItem {
  account_id: number;
  messages: SupportChatMessage[];
}

export interface SupportTicketListItem {
  id: string;
  created_at: string;
  subject: string;
  status: string;
  account_email: string;
  blog_url: string | null;
  conversation_id: string | null;
}

export interface SupportTicketDetail extends SupportTicketListItem {
  updated_at: string;
  description: string;
  screenshot_url: string | null;
  messages: SupportChatMessage[];
}

export async function fetchSupportConversations(params: {
  page?: number;
  escalated?: boolean;
  from?: string;
  to?: string;
}): Promise<{ conversations: SupportConversationListItem[]; total: number; page: number }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (typeof params.escalated === "boolean") qs.set("escalated", String(params.escalated));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const res = await fetch(`/api/support/conversations?${qs}`, { credentials: "include" });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json();
}

export async function fetchSupportConversation(id: string): Promise<SupportConversationDetail> {
  const res = await fetch(`/api/support/conversations/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load conversation");
  return res.json();
}

export async function fetchSupportTickets(params: {
  page?: number;
  status?: string;
}): Promise<{ tickets: SupportTicketListItem[]; total: number; page: number }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.status) qs.set("status", params.status);
  const res = await fetch(`/api/support/tickets?${qs}`, { credentials: "include" });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error("Failed to load tickets");
  return res.json();
}

export async function fetchSupportTicket(id: string): Promise<SupportTicketDetail> {
  const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load ticket");
  return res.json();
}

export async function updateSupportTicketStatus(
  id: string,
  status: string
): Promise<{ id: string; status: string }> {
  const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update ticket");
  return res.json();
}

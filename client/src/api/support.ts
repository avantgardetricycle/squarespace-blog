export type SupportFormMode = "question" | "problem";

export interface SupportFormPayload {
  name: string;
  email: string;
  mode: SupportFormMode;
  subject: string;
  message: string;
  pageUrl?: string;
  screenshot?: {
    filename: string;
    contentType: string;
    data: string;
  };
}

export async function submitSupportRequest(payload: SupportFormPayload): Promise<void> {
  const res = await fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to send message");
  }
}

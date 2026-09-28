const API = "/api";

export type InviteStatus = "pending" | "accepted" | "expired";

export type BetaTesterSummary = {
  userId: number;
  email: string;
  name: string | null;
  inviteStatus: InviteStatus;
  accessUntil: string | null;
  accessActive: boolean;
  lastLoginAt: string | null;
  blogCount: number;
};

export type BetaConfigSummary = {
  version: number;
  updatedAt: string;
  collectionTemplateId: string | null;
  postTemplateId: string | null;
  showDate: boolean;
  showAuthor: boolean;
  showReadingTime: boolean;
  modules: string[];
};

export type BetaBlogSummary = {
  id: string;
  name: string | null;
  url: string | null;
  createdAt: string;
  config: BetaConfigSummary | null;
};

export type BetaActivityEvent = {
  id: string;
  type: "login" | "logout" | "session_ended" | "blog_added" | "blog_removed" | "config_updated";
  at: string;
  summary: string;
};

export type BetaTesterUsage = {
  tester: BetaTesterSummary;
  blogs: BetaBlogSummary[];
  activity: BetaActivityEvent[];
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchBetaTesters(): Promise<BetaTesterSummary[]> {
  const res = await fetch(`${API}/admin/beta-testers`, { credentials: "include" });
  if (!res.ok) throw new Error(await readError(res, "Failed to load beta testers"));
  const body = (await res.json()) as { testers: BetaTesterSummary[] };
  return body.testers;
}

export async function inviteBetaTester(input: {
  email: string;
  name?: string;
}): Promise<{ created: boolean; resent: boolean; tester: BetaTesterSummary | null }> {
  const res = await fetch(`${API}/admin/beta-testers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to send invite"));
  return res.json();
}

export async function resendBetaInvite(userId: number): Promise<BetaTesterSummary | null> {
  const res = await fetch(`${API}/admin/beta-testers/${userId}/resend`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to resend invite"));
  const body = (await res.json()) as { tester: BetaTesterSummary | null };
  return body.tester;
}

export async function fetchBetaTesterUsage(userId: number): Promise<BetaTesterUsage> {
  const res = await fetch(`${API}/admin/beta-testers/${userId}`, { credentials: "include" });
  if (!res.ok) throw new Error(await readError(res, "Failed to load usage"));
  return res.json();
}

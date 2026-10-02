import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  fetchBetaTesters,
  fetchBetaTesterUsage,
  inviteBetaTester,
  resendBetaInvite,
  type BetaTesterSummary,
  type BetaTesterUsage,
  type InviteStatus,
} from "@/api/admin";
import { toast } from "sonner";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function inviteLabel(status: InviteStatus): string {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  return "Expired";
}

function replaceTester(list: BetaTesterSummary[], next: BetaTesterSummary): BetaTesterSummary[] {
  const index = list.findIndex((tester) => tester.userId === next.userId);
  if (index === -1) return [next, ...list];
  const copy = list.slice();
  copy[index] = next;
  return copy;
}

export default function Admin() {
  const [testers, setTesters] = useState<BetaTesterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [usage, setUsage] = useState<BetaTesterUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const loadTesters = useCallback(async () => {
    const rows = await fetchBetaTesters();
    setTesters(rows);
  }, []);

  useEffect(() => {
    loadTesters()
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load beta testers");
      })
      .finally(() => setLoading(false));
  }, [loadTesters]);

  const openUsage = async (userId: number) => {
    setSelectedId(userId);
    setUsage(null);
    setUsageLoading(true);
    try {
      setUsage(await fetchBetaTesterUsage(userId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load usage");
      setSelectedId(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviting(true);
    try {
      const result = await inviteBetaTester({
        email: trimmed,
        name: name.trim() || undefined,
      });
      if (result.tester) {
        setTesters((current) => replaceTester(current, result.tester!));
      } else {
        await loadTesters();
      }
      setEmail("");
      setName("");
      toast.success(result.resent && !result.created ? "Invite resent" : "Invite sent");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (userId: number) => {
    setResendingId(userId);
    try {
      const tester = await resendBetaInvite(userId);
      if (tester) setTesters((current) => replaceTester(current, tester));
      if (selectedId === userId) await openUsage(userId);
      toast.success("Invite resent");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[#0a0a0a]">Admin</h1>
        <p className="text-sm text-[#6b6b6b]">
          Invite beta testers and review how they use BetterBlog. Each invite includes one year of Publication access.
        </p>
      </div>

      <form onSubmit={handleInvite} className="rounded-xl border border-[#e5e4e0] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="beta-email">Email</Label>
            <Input
              id="beta-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tester@example.com"
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="beta-name">Name</Label>
            <Input
              id="beta-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" className="bg-[#5B4FE8] hover:bg-[#4a3fd4]" disabled={inviting}>
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-[#e5e4e0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Invite</TableHead>
              <TableHead>Access until</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Blogs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-[#6b6b6b]">
                  Loading…
                </TableCell>
              </TableRow>
            ) : testers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-[#6b6b6b]">
                  No beta testers yet.
                </TableCell>
              </TableRow>
            ) : (
              testers.map((tester) => (
                <TableRow
                  key={tester.userId}
                  className="cursor-pointer"
                  data-state={selectedId === tester.userId ? "selected" : undefined}
                  onClick={() => void openUsage(tester.userId)}
                >
                  <TableCell>
                    <div className="font-medium text-[#0a0a0a]">{tester.email}</div>
                    {tester.name ? <div className="text-xs text-[#6b6b6b]">{tester.name}</div> : null}
                  </TableCell>
                  <TableCell>{inviteLabel(tester.inviteStatus)}</TableCell>
                  <TableCell>
                    <div>{formatDate(tester.accessUntil)}</div>
                    <div className="text-xs text-[#6b6b6b]">{tester.accessActive ? "Active" : "Ended"}</div>
                  </TableCell>
                  <TableCell>{formatDate(tester.lastLoginAt)}</TableCell>
                  <TableCell>{tester.blogCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resendingId === tester.userId}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleResend(tester.userId);
                      }}
                    >
                      {resendingId === tester.userId ? "Sending…" : "Resend"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedId != null && (
        <section className="space-y-4 rounded-xl border border-[#e5e4e0] bg-white p-6">
          {usageLoading || !usage ? (
            <p className="text-sm text-[#6b6b6b]">Loading usage…</p>
          ) : (
            <>
              <div>
                <h2 className="font-heading text-xl font-semibold text-[#0a0a0a]">{usage.tester.email}</h2>
                <p className="text-sm text-[#6b6b6b]">
                  {usage.blogs.length} {usage.blogs.length === 1 ? "blog" : "blogs"} · invite {usage.tester.inviteStatus}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0a0a0a]">Current blogs</h3>
                {usage.blogs.length === 0 ? (
                  <p className="text-sm text-[#6b6b6b]">No blogs yet.</p>
                ) : (
                  usage.blogs.map((blog) => (
                    <div key={blog.id} className="rounded-lg border border-[#e5e4e0] bg-[#f7f6f3] p-4">
                      <p className="font-medium text-[#0a0a0a]">{blog.name || "Untitled blog"}</p>
                      <p className="text-sm text-[#6b6b6b]">{blog.url || "No URL"}</p>
                      {blog.config ? (
                        <dl className="mt-3 grid gap-1 text-sm text-[#0a0a0a]">
                          <div>Collection template: {blog.config.collectionTemplateName || "—"}</div>
                          <div>Post template: {blog.config.postTemplateName || "—"}</div>
                          <div>
                            Date {blog.config.showDate ? "on" : "off"} · Author {blog.config.showAuthor ? "on" : "off"} · Reading time{" "}
                            {blog.config.showReadingTime ? "on" : "off"}
                          </div>
                          <div>Modules: {blog.config.modules.length ? blog.config.modules.join(", ") : "None"}</div>
                          <div className="text-[#6b6b6b]">Config v{blog.config.version} · {formatDate(blog.config.updatedAt)}</div>
                        </dl>
                      ) : (
                        <p className="mt-2 text-sm text-[#6b6b6b]">No config saved.</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0a0a0a]">Activity</h3>
                {usage.activity.length === 0 ? (
                  <p className="text-sm text-[#6b6b6b]">No activity yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {usage.activity.map((event) => (
                      <li key={event.id} className="flex flex-col gap-0.5 border-b border-[#e5e4e0] pb-2 text-sm last:border-0">
                        <span className="text-[#0a0a0a]">{event.summary}</span>
                        <span className="text-xs text-[#6b6b6b]">{formatDate(event.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

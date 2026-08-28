import { useCallback, useEffect, useState } from "react";
import { Link, useLoaderData } from "react-router";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import type { DashboardMe } from "@/api/auth";
import {
  fetchSupportConversation,
  fetchSupportConversations,
  fetchSupportTicket,
  fetchSupportTickets,
  updateSupportTicketStatus,
  type SupportChatMessage,
  type SupportConversationDetail,
  type SupportConversationListItem,
  type SupportTicketDetail,
  type SupportTicketListItem,
} from "@/api/supportChat";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Transcript({ messages }: { messages: SupportChatMessage[] }) {
  if (!messages.length) {
    return <p className="text-sm text-[#6b6b6b]">No messages.</p>;
  }
  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <div key={`${m.role}-${i}`} className="rounded-lg bg-[#f7f6f3] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">
            {m.role === "user" ? "User" : "Assistant"}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[#0a0a0a]">{m.content}</p>
        </div>
      ))}
    </div>
  );
}

export default function InternalSupport() {
  const me = useLoaderData() as DashboardMe;
  const [tab, setTab] = useState("conversations");
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [conversations, setConversations] = useState<SupportConversationListItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [ticketStatus, setTicketStatus] = useState<string>("open");
  const [expandedConversation, setExpandedConversation] = useState<SupportConversationDetail | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    const data = await fetchSupportConversations({
      escalated: escalatedOnly ? true : undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setConversations(data.conversations);
  }, [escalatedOnly, from, to]);

  const loadTickets = useCallback(async () => {
    const data = await fetchSupportTickets({
      status: ticketStatus === "all" ? undefined : ticketStatus,
    });
    setTickets(data.tickets);
  }, [ticketStatus]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const run = tab === "conversations" ? loadConversations : loadTickets;
    run()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, loadConversations, loadTickets]);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#0a0a0a]">
      <header className="border-b border-[#e5e4e0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-sm font-medium text-[#6b6b6b]">Internal support</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#6b6b6b]">{me.user.email}</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <h1 className="font-heading text-3xl font-bold">Support inbox</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border border-[#e5e4e0]">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={escalatedOnly}
                  onChange={(e) => setEscalatedOnly(e.target.checked)}
                />
                Escalated only
              </label>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#e5e4e0] bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Blog</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Escalated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-[#6b6b6b]">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : conversations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-[#6b6b6b]">
                        No conversations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    conversations.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => {
                          void fetchSupportConversation(row.id).then(setExpandedConversation);
                        }}
                      >
                        <TableCell>{formatDate(row.created_at)}</TableCell>
                        <TableCell>{row.account_email}</TableCell>
                        <TableCell>{row.blog_url || row.blog_name || "—"}</TableCell>
                        <TableCell>{row.message_count}</TableCell>
                        <TableCell>{row.escalated ? "Y" : "N"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {expandedConversation && (
              <div className="rounded-xl border border-[#e5e4e0] bg-white p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{expandedConversation.account_email}</p>
                    <p className="text-sm text-[#6b6b6b]">
                      {expandedConversation.blog_url || "No blog"} · {formatDate(expandedConversation.created_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setExpandedConversation(null)}>
                    Close
                  </Button>
                </div>
                <Transcript messages={expandedConversation.messages} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="mt-4 space-y-4">
            <Select value={ticketStatus} onValueChange={setTicketStatus}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <div className="overflow-hidden rounded-xl border border-[#e5e4e0] bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-[#6b6b6b]">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-[#6b6b6b]">
                        No tickets.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => {
                          void fetchSupportTicket(row.id).then(setExpandedTicket);
                        }}
                      >
                        <TableCell>{formatDate(row.created_at)}</TableCell>
                        <TableCell>{row.subject}</TableCell>
                        <TableCell>{row.account_email}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {expandedTicket && (
              <div className="space-y-4 rounded-xl border border-[#e5e4e0] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{expandedTicket.subject}</p>
                    <p className="text-sm text-[#6b6b6b]">
                      {expandedTicket.account_email} · {expandedTicket.blog_url || "No blog"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setExpandedTicket(null)}>
                    Close
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={expandedTicket.status}
                    onValueChange={(status) => {
                      void updateSupportTicketStatus(expandedTicket.id, status).then(() => {
                        setExpandedTicket({ ...expandedTicket, status });
                        setTickets((prev) =>
                          prev.map((t) => (t.id === expandedTicket.id ? { ...t, status } : t))
                        );
                      });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">open</SelectItem>
                      <SelectItem value="in_progress">in_progress</SelectItem>
                      <SelectItem value="resolved">resolved</SelectItem>
                      <SelectItem value="closed">closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{expandedTicket.description}</p>
                {expandedTicket.screenshot_url && (
                  <p className="text-sm">
                    <a
                      href={expandedTicket.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5B4FE8] hover:underline"
                    >
                      Open screenshot
                    </a>
                  </p>
                )}
                {expandedTicket.messages.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Chat transcript</p>
                    <Transcript messages={expandedTicket.messages} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouteLoaderData, useSearchParams } from "react-router";
import { ArrowUp, Check, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import type { DashboardMe } from "@/api/auth";
import {
  streamSupportChat,
  submitSupportTicket,
  SupportChatError,
  type SupportChatMessage,
} from "@/api/supportChat";

const STARTER_QUESTIONS = [
  "How do I install BetterBlog on my Squarespace site?",
  "Why isn't my template change showing up live?",
  "How does verified subscriber commenting work?",
  "What does the Avg Read Percent metric measure?",
];

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif"]);

function transcriptText(messages: SupportChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "BetterBlog Support"}:\n${m.content}`)
    .join("\n\n");
}

export default function Support() {
  const me = useRouteLoaderData("dashboard") as DashboardMe | undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const siteKey = searchParams.get("siteKey");
  const sites = me?.sites ?? [];
  const selectedSite =
    sites.find((s) => s.siteKey === siteKey) ?? sites[0] ?? null;

  const [tab, setTab] = useState("ask");
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [contactStatus, setContactStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [contactMessage, setContactMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sites.length) return;
    if (!siteKey || !sites.some((s) => s.siteKey === siteKey)) {
      setSearchParams({ siteKey: sites[0].siteKey }, { replace: true });
    }
  }, [sites, siteKey, setSearchParams]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const welcomeVisible = messages.length === 0;

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || streaming || rateLimited) return;
    setChatError(null);
    const nextMessages: SupportChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await streamSupportChat({
        messages: nextMessages.slice(-20),
        conversationId,
        siteId: selectedSite?.id ?? null,
        signal: controller.signal,
        onDelta: (delta) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { role: "assistant", content: last.content + delta };
            }
            return copy;
          });
        },
      });
      setConversationId(result.conversationId);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      const supportErr = err instanceof SupportChatError ? err : null;
      if (supportErr?.error === "rate_limited") {
        setRateLimited(true);
        setChatError(
          "You've sent a lot of messages — take a short break or send your question directly to the team."
        );
      } else {
        setChatError(err instanceof Error ? err.message : "Failed to send message");
      }
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && !last.content) copy.pop();
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const escalateToTeam = () => {
    const body = messages.length
      ? `I'm stuck after chatting with BetterBlog Support.\n\n---\n${transcriptText(messages)}`
      : "";
    setDescription(body);
    setTab("contact");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
      setContactStatus("error");
      setContactMessage("Screenshot must be 5MB or smaller");
      return;
    }
    if (screenshot && !ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)) {
      setContactStatus("error");
      setContactMessage("Screenshot must be a PNG, JPG, or GIF");
      return;
    }
    setContactStatus("submitting");
    try {
      const result = await submitSupportTicket({
        subject,
        description,
        screenshot,
        conversationId,
        siteId: selectedSite?.id ?? null,
      });
      setContactStatus("success");
      setContactMessage(result.message);
    } catch (err) {
      setContactStatus("error");
      setContactMessage(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const selectedSiteLabel = useMemo(
    () => selectedSite?.name || selectedSite?.url || "your blog",
    [selectedSite]
  );

  if (!me) {
    return (
      <div className="flex h-full items-center justify-center text-[#6b6b6b]">Loading…</div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f6f3] p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#0a0a0a]">Support</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            Ask about setup, templates, analytics, comments, or troubleshooting.
          </p>
        </div>
        {sites.length > 1 && (
          <Select
            value={selectedSite?.siteKey}
            onValueChange={(v) => setSearchParams({ siteKey: v })}
          >
            <SelectTrigger className="w-[240px] h-10 bg-white border-[#e4e3de]">
              <SelectValue placeholder="Select blog" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.siteKey}>
                  {s.name || s.url || "Unnamed blog"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="bg-white border border-[#e5e4e0] rounded-full h-11 p-1 w-fit">
          <TabsTrigger
            value="ask"
            className="rounded-full px-4 data-[state=active]:bg-[#5B4FE8] data-[state=active]:text-white"
          >
            Ask BetterBlog
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="rounded-full px-4 data-[state=active]:bg-[#5B4FE8] data-[state=active]:text-white"
          >
            Contact Us
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ask" className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e5e4e0] bg-white">
            <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {welcomeVisible && (
                <div className="space-y-4">
                  <p className="text-[15px] leading-relaxed text-[#0a0a0a]">
                    Hi! Ask me anything about BetterBlog — setup, templates, analytics, comments, or
                    troubleshooting.
                  </p>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">
                      Try asking:
                    </p>
                    <div className="flex flex-col gap-2">
                      {STARTER_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void sendMessage(q)}
                          className="rounded-xl border border-[#e5e4e0] bg-[#f7f6f3] px-3 py-2 text-left text-sm text-[#0a0a0a] hover:border-[#5B4FE8]/40 hover:bg-white transition-colors"
                        >
                          “{q}”
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto bg-[#5B4FE8] text-white"
                      : "bg-[#f7f6f3] text-[#0a0a0a]"
                  )}
                >
                  {message.content || (streaming && index === messages.length - 1 ? "…" : "")}
                </div>
              ))}
              {chatError && <p className="text-sm text-red-600">{chatError}</p>}
            </div>

            <div className="border-t border-[#e5e4e0] p-4 space-y-3">
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(input);
                }}
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={streaming || rateLimited}
                  rows={2}
                  className="min-h-[44px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full bg-[#5B4FE8] hover:bg-[#4a40d4]"
                  disabled={streaming || rateLimited || !input.trim()}
                  aria-label="Send"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </form>
              <p className="text-sm text-[#6b6b6b]">
                Still stuck?{" "}
                <button
                  type="button"
                  onClick={escalateToTeam}
                  className="font-medium text-[#5B4FE8] hover:underline"
                >
                  Send this to the team →
                </button>
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-4 flex-1 overflow-y-auto">
          <div className="max-w-xl rounded-2xl border border-[#e5e4e0] bg-white p-6">
            {contactStatus === "success" ? (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-[#0a0a0a]">Sent!</p>
                  <p className="mt-1 text-sm text-[#6b6b6b]">{contactMessage}</p>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void handleContactSubmit(e)}>
                <div className="space-y-1.5">
                  <Label htmlFor="support-subject">Subject</Label>
                  <Input
                    id="support-subject"
                    value={subject}
                    maxLength={120}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-description">What&apos;s happening?</Label>
                  <Textarea
                    id="support-description"
                    value={description}
                    maxLength={3000}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Screenshot (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    className="hidden"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    {screenshot ? screenshot.name : "Attach file"}
                  </Button>
                  <p className="text-xs text-[#6b6b6b]">PNG, JPG, or GIF up to 5MB.</p>
                </div>
                <div className="rounded-xl bg-[#f7f6f3] px-3 py-2 text-sm text-[#6b6b6b] space-y-0.5">
                  <p>
                    We&apos;ll reply to <span className="font-medium text-[#0a0a0a]">{me?.user.email}</span>
                  </p>
                  {selectedSite && (
                    <p>
                      Blog: <span className="font-medium text-[#0a0a0a]">{selectedSiteLabel}</span>
                    </p>
                  )}
                </div>
                {contactStatus === "error" && (
                  <p className="text-sm text-red-600">{contactMessage}</p>
                )}
                <Button
                  type="submit"
                  className="bg-[#5B4FE8] hover:bg-[#4a40d4]"
                  disabled={contactStatus === "submitting"}
                >
                  {contactStatus === "submitting" ? "Sending…" : "Send to BetterBlog Team"}
                </Button>
                <p className="text-xs text-[#6b6b6b]">We typically respond within one business day.</p>
              </form>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

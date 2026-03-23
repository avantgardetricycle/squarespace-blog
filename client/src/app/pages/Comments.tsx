import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  MessageCircle,
  ThumbsUp,
  Trash2,
  Check,
  Reply,
  Eye,
  EyeOff,
  Flag,
  Search,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Slider } from "@/app/components/ui/slider";
import { toast } from "sonner";
import { getDashboardMe, type DashboardMe } from "@/api/auth";

// API statuses: pending, approved, spam, deleted
// UI statuses: published (approved), awaiting (pending), spam, hidden (deleted)
type ApiStatus = "pending" | "approved" | "spam" | "deleted";
type UiStatus = "published" | "awaiting" | "hidden" | "spam";

interface Comment {
  id: string;
  postId: string;
  postTitle?: string;
  parentId: string | null;
  displayName: string;
  email: string | null;
  verifiedSubscriber: boolean;
  body: string;
  status: ApiStatus;
  ipAddress: string | null;
  createdAt: string;
  likeCount: number;
}

function apiToUiStatus(s: ApiStatus): UiStatus {
  if (s === "approved") return "published";
  if (s === "pending") return "awaiting";
  if (s === "deleted") return "hidden";
  return "spam";
}

function uiToApiStatus(s: UiStatus): ApiStatus {
  if (s === "published") return "approved";
  if (s === "awaiting") return "pending";
  if (s === "hidden") return "deleted";
  return "spam";
}

interface Counts {
  pending: number;
  approved: number;
  spam: number;
  deleted: number;
}

interface CommentSettings {
  commentsEnabled: boolean;
  allowAnonymousComments: boolean;
  subscriberCommentsEnabled: boolean;
  apiKeyVerified: boolean;
  requireApproval: boolean;
  autoCloseAfterDays: number | null;
  notifyEmail: boolean;
  allowLikes: boolean;
  allowThreadedReplies: boolean;
  sortOrder: "newest" | "oldest" | "most_liked";
}

export default function Comments() {
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, spam: 0, deleted: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetching, setFetching] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | UiStatus>("all");
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [bulkActioning, setBulkActioning] = useState(false);
  const [settings, setSettings] = useState<CommentSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      if (data?.sites?.[0]) setSiteKey(data.sites[0].siteKey);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    setFetching(true);
    const params = new URLSearchParams({
      siteKey,
      page: String(page),
      per_page: "20",
    });
    const statusParam = selectedFilter === "all" ? "all" : uiToApiStatus(selectedFilter);
    params.set("status", statusParam);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    fetch(`/api/dashboard/comments?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setComments(data.comments || []);
          setTotal(data.total || 0);
        }
      })
      .finally(() => setFetching(false));
  }, [siteKey, selectedFilter, page, searchQuery]);

  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/dashboard/comments/count?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCounts(data);
      });
  }, [siteKey, comments]);

  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/dashboard/settings/comments?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setSettings({
            commentsEnabled: data.commentsEnabled ?? true,
            allowAnonymousComments: data.allowAnonymousComments ?? true,
            subscriberCommentsEnabled: data.subscriberCommentsEnabled ?? false,
            apiKeyVerified: data.apiKeyVerified ?? false,
            requireApproval: data.requireApproval ?? false,
            autoCloseAfterDays: data.autoCloseAfterDays ?? null,
            notifyEmail: data.notifyEmail ?? true,
            allowLikes: data.allowLikes ?? true,
            allowThreadedReplies: data.allowThreadedReplies ?? true,
            sortOrder: ["newest", "oldest", "most_liked"].includes(data.sortOrder)
              ? data.sortOrder
              : "newest",
          });
      });
  }, [siteKey]);

  const refreshCounts = () => {
    if (!siteKey) return;
    fetch(`/api/dashboard/comments/count?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCounts(data);
      });
  };

  const doBulkAction = async (action: "approve" | "spam" | "delete") => {
    if (selectedComments.size === 0) return;
    setBulkActioning(true);
    const status = action === "approve" ? "approved" : action === "spam" ? "spam" : "deleted";
    const promises = Array.from(selectedComments).map((id) =>
      fetch(`/api/dashboard/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
    );
    await Promise.all(promises);
    setSelectedComments(new Set());
    setComments((prev) => prev.filter((c) => !selectedComments.has(c.id)));
    setTotal((t) => Math.max(0, t - selectedComments.size));
    refreshCounts();
    toast.success(
      action === "approve"
        ? "Comments approved"
        : action === "spam"
          ? "Comments marked as spam"
          : "Comments deleted"
    );
    setBulkActioning(false);
  };

  const handleApprove = (c: Comment) => {
    fetch(`/api/dashboard/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "approved" }),
    }).then((r) => {
      if (r.ok) {
        toast.success("Comment approved");
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setTotal((t) => Math.max(0, t - 1));
        refreshCounts();
      }
    });
  };

  const handleSpam = (c: Comment) => {
    fetch(`/api/dashboard/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "spam" }),
    }).then((r) => {
      if (r.ok) {
        toast.success("Marked as spam");
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setTotal((t) => Math.max(0, t - 1));
        refreshCounts();
      }
    });
  };

  const handleDelete = (c: Comment) => {
    fetch(`/api/dashboard/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "deleted" }),
    }).then((r) => {
      if (r.ok) {
        toast.success("Comment deleted");
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setTotal((t) => Math.max(0, t - 1));
        refreshCounts();
      }
    });
  };

  const handleHide = (c: Comment) => {
    handleDelete(c);
  };

  const handleUnhide = (c: Comment) => {
    fetch(`/api/dashboard/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "approved" }),
    }).then((r) => {
      if (r.ok) {
        toast.success("Comment unhidden");
        setComments((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, status: "approved" as ApiStatus } : x))
        );
        refreshCounts();
      }
    });
  };

  const handleReply = async (commentId: string) => {
    if (replyingTo === commentId) {
      if (!replyText.trim()) return;
      setReplySending(true);
      const r = await fetch(`/api/dashboard/comments/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: replyText.trim() }),
      });
      setReplySending(false);
      if (r.ok) {
        toast.success("Reply posted");
        setReplyingTo(null);
        setReplyText("");
      }
    } else {
      setReplyingTo(commentId);
      setReplyText("");
    }
  };

  const toggleSelectComment = (id: string) => {
    const newSelected = new Set(selectedComments);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedComments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedComments.size === comments.length) setSelectedComments(new Set());
    else setSelectedComments(new Set(comments.map((c) => c.id)));
  };

  const updateSetting = async <K extends keyof CommentSettings>(
    key: K,
    value: CommentSettings[K]
  ) => {
    if (!siteKey || !settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSettingsSaving(true);
    const payload = {
      siteKey,
      commentsEnabled: next.commentsEnabled,
      allowAnonymousComments: next.allowAnonymousComments,
      subscriberCommentsEnabled: next.subscriberCommentsEnabled,
      requireApproval: next.requireApproval,
      autoCloseAfterDays: next.autoCloseAfterDays,
      notifyEmail: next.notifyEmail,
      allowLikes: next.allowLikes,
      allowThreadedReplies: next.allowThreadedReplies,
      sortOrder: next.sortOrder,
    };
    const r = await fetch("/api/dashboard/settings/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    setSettingsSaving(false);
    if (!r.ok) {
      setSettings(settings);
      const data = await r.json().catch(() => ({}));
      toast.error(data?.error ?? "Failed to save settings");
    } else {
      toast.success("Settings saved");
    }
  };

  const getStatusBadgeStyles = (status: UiStatus) => {
    switch (status) {
      case "published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "awaiting":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "hidden":
        return "bg-red-50 text-red-700 border-red-200";
      case "spam":
        return "bg-neutral-100 text-neutral-600 border-neutral-300";
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const totalCount = counts.pending + counts.approved + counts.spam + counts.deleted;

  const filters: { value: "all" | UiStatus; label: string; count: number }[] = [
    { value: "all", label: "All Comments", count: totalCount },
    { value: "published", label: "Published", count: counts.approved },
    { value: "awaiting", label: "Awaiting Review", count: counts.pending },
    { value: "hidden", label: "Hidden", count: counts.deleted },
    { value: "spam", label: "Spam", count: counts.spam },
  ];

  if (loading || !me) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#6b6b6b]" />
      </div>
    );
  }

  const sites = me.sites || [];
  if (sites.length === 0) {
    return (
      <div className="py-12">
        <h1 className="text-2xl font-semibold mb-4">Comments</h1>
        <p className="text-[#6b6b6b]">Add a blog to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full p-8">
      <div className="flex-1 flex flex-col">
        <div className="border-b border-neutral-200 bg-white">
          <div className="p-8 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-7 h-7 text-[#5B4FE8]" />
                <h1 className="font-heading text-4xl text-[#0a0a0a]">Comments</h1>
              </div>
              <div className="flex items-center gap-2">
                <Select value={siteKey ?? ""} onValueChange={setSiteKey}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select blog" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.siteKey ?? ""}>
                        {s.name || s.siteKey || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Search className="h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Search comments…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchQuery(search);
                        setPage(1);
                      }
                    }}
                    className="w-[180px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery(search);
                      setPage(1);
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-neutral-500 text-sm">Manage and moderate comments on your blog posts</p>
          </div>

          <div className="px-8 flex gap-6 border-t border-neutral-100 pt-4">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setSelectedFilter(f.value);
                  setPage(1);
                }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  selectedFilter === f.value
                    ? "border-[#5B4FE8] text-[#5B4FE8]"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {f.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    selectedFilter === f.value ? "bg-[#5B4FE8]/10 text-[#5B4FE8]" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedComments.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedComments.size} comment{selectedComments.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActioning}
                  onClick={() => doBulkAction("approve")}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActioning}
                  onClick={() => doBulkAction("spam")}
                  className="border-neutral-300"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Mark as Spam
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActioning}
                  onClick={() => doBulkAction("delete")}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
            <button
              onClick={() => setSelectedComments(new Set())}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium"
            >
              Clear selection
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#f7f6f3]">
          <div className="p-8">
            {fetching ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 text-sm">No comments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedComments.size === comments.length && comments.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-[#5B4FE8] border-neutral-300 rounded focus:ring-[#5B4FE8]"
                  />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Select All
                  </span>
                </div>

                {comments.map((comment) => {
                  const uiStatus = apiToUiStatus(comment.status);
                  return (
                    <div
                      key={comment.id}
                      className="bg-white rounded-lg border border-neutral-200 shadow-sm"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedComments.has(comment.id)}
                            onChange={() => toggleSelectComment(comment.id)}
                            className="mt-1 w-4 h-4 text-[#5B4FE8] border-neutral-300 rounded focus:ring-[#5B4FE8]"
                          />
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                            {comment.displayName?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-[#0a0a0a]">
                                    {comment.displayName}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusBadgeStyles(
                                      uiStatus
                                    )}`}
                                  >
                                    {uiStatus === "awaiting"
                                      ? "Awaiting Review"
                                      : uiStatus.charAt(0).toUpperCase() + uiStatus.slice(1)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                  {comment.email && <span>{comment.email}</span>}
                                  {comment.email && <span>•</span>}
                                  <span>{formatDate(comment.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="text-xs font-medium text-[#5B4FE8] mb-1">
                                On: {comment.postTitle ?? comment.postId}
                              </div>
                              <p className="text-sm text-neutral-700 leading-relaxed">
                                {comment.body}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5 text-neutral-500">
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-sm">{comment.likeCount}</span>
                              </div>
                              <button
                                onClick={() => handleReply(comment.id)}
                                className="text-sm font-medium text-[#5B4FE8] hover:text-[#4a3fd7] flex items-center gap-1.5"
                              >
                                <Reply className="w-4 h-4" />
                                Reply
                              </button>
                              {uiStatus === "awaiting" && (
                                <button
                                  onClick={() => handleApprove(comment)}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </button>
                              )}
                              {uiStatus === "published" && (
                                <button
                                  onClick={() => handleHide(comment)}
                                  className="text-sm font-medium text-neutral-600 hover:text-neutral-700 flex items-center gap-1.5"
                                >
                                  <EyeOff className="w-4 h-4" />
                                  Hide
                                </button>
                              )}
                              {uiStatus === "hidden" && (
                                <button
                                  onClick={() => handleUnhide(comment)}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
                                >
                                  <Eye className="w-4 h-4" />
                                  Unhide
                                </button>
                              )}
                              {uiStatus === "spam" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(comment)}
                                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
                                  >
                                    <Check className="w-4 h-4" />
                                    Publish
                                  </button>
                                  <button
                                    onClick={() => handleHide(comment)}
                                    className="text-sm font-medium text-neutral-600 hover:text-neutral-700 flex items-center gap-1.5"
                                  >
                                    <EyeOff className="w-4 h-4" />
                                    Hide
                                  </button>
                                </>
                              )}
                              {uiStatus !== "spam" && (
                                <button
                                  onClick={() => handleSpam(comment)}
                                  className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1.5"
                                >
                                  <Flag className="w-4 h-4" />
                                  Mark as Spam
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(comment)}
                                className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1.5 ml-auto"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>

                            {replyingTo === comment.id && (
                              <div className="mt-4 pt-4 border-t border-neutral-200">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write your reply..."
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B4FE8] focus:border-transparent resize-none"
                                  rows={3}
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    onClick={() => handleReply(comment.id)}
                                    disabled={!replyText.trim() || replySending}
                                  >
                                    {replySending ? "Posting…" : "Post Reply"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {total > 20 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  {total} comment{total !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * 20 >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="w-80 border-l border-neutral-200 bg-white p-6 overflow-auto">
        <h2 className="font-heading text-lg text-[#0a0a0a] mb-4">Comment Stats</h2>
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">
              Published
            </div>
            <div className="font-heading text-3xl text-emerald-900">{counts.approved}</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">
              Awaiting Review
            </div>
            <div className="font-heading text-3xl text-amber-900">{counts.pending}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
              Hidden
            </div>
            <div className="font-heading text-3xl text-red-900">{counts.deleted}</div>
          </div>
          <div className="p-4 bg-neutral-100 rounded-lg border border-neutral-300">
            <div className="text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1">
              Spam
            </div>
            <div className="font-heading text-3xl text-neutral-900">{counts.spam}</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-200">
          <h3 className="font-medium text-sm text-[#0a0a0a] mb-4">Settings</h3>
          {!settings && siteKey ? (
            <p className="text-sm text-neutral-500">Loading settings…</p>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Enable Comments</Label>
              <Switch
                checked={settings?.commentsEnabled ?? true}
                onCheckedChange={(v) => settings && updateSetting("commentsEnabled", v)}
                disabled={settingsSaving}
              />
            </div>
            {(settings?.commentsEnabled ?? true) && (
            <>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Allow Anonymous Comments</Label>
                <Switch
                  checked={settings?.allowAnonymousComments ?? true}
                  onCheckedChange={(v) => settings && updateSetting("allowAnonymousComments", v)}
                  disabled={settingsSaving}
                />
              </div>
              <p className="text-xs text-neutral-500">Readers can comment with name only.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Verified Subscriber Comments</Label>
                <Switch
                  checked={settings?.subscriberCommentsEnabled ?? false}
                  onCheckedChange={(v) => settings && updateSetting("subscriberCommentsEnabled", v)}
                  disabled={settingsSaving}
                />
              </div>
              <p className="text-xs text-neutral-500">Require email for paywalled posts, verified against your Squarespace member list.</p>
              {settings?.apiKeyVerified && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="font-mono text-neutral-500">••••••••••••••••</span>
                  <Link
                    to="/dashboard/configure"
                    className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700"
                    aria-label="Edit API key in Customize Blog"
                    title="Manage API key in Customize Blog"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              {!settings?.apiKeyVerified && settings && (
                <Link to="/dashboard/configure" className="text-xs text-[#5B4FE8] hover:underline">
                  Set up API key in Customize Blog
                </Link>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Require Approval Before Publishing</Label>
              <Switch
                checked={settings?.requireApproval ?? false}
                onCheckedChange={(v) => settings && updateSetting("requireApproval", v)}
                disabled={settingsSaving}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Close Comments After</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[settings?.autoCloseAfterDays ?? 0]}
                  onValueChange={([v]) =>
                    settings && updateSetting("autoCloseAfterDays", v === 0 ? null : v)
                  }
                  min={0}
                  max={365}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-neutral-500 w-14 shrink-0">
                  {(settings?.autoCloseAfterDays ?? 0) === 0
                    ? "Never"
                    : `${settings?.autoCloseAfterDays} days`}
                </span>
              </div>
              <p className="text-xs text-neutral-500">0 = Never, 1–365 = days after publish</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Email me new comments</Label>
                <Switch
                  checked={settings?.notifyEmail ?? true}
                  onCheckedChange={(v) => settings && updateSetting("notifyEmail", v)}
                  disabled={settingsSaving}
                />
              </div>
              <p className="text-xs text-neutral-500">Notifications go to your account email.</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Allow Comment Likes</Label>
              <Switch
                checked={settings?.allowLikes ?? true}
                onCheckedChange={(v) => settings && updateSetting("allowLikes", v)}
                disabled={settingsSaving}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Allow Threaded Replies</Label>
              <Switch
                checked={settings?.allowThreadedReplies ?? true}
                onCheckedChange={(v) => settings && updateSetting("allowThreadedReplies", v)}
                disabled={settingsSaving}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Default Sort</Label>
              <Select
                value={settings?.sortOrder ?? "newest"}
                onValueChange={(v) =>
                  settings &&
                  updateSetting("sortOrder", v as "newest" | "oldest" | "most_liked")
                }
                disabled={settingsSaving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="most_liked">Most Liked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </>
            )}
          </div>
          )}
        </div>
      </aside>
    </div>
  );
}

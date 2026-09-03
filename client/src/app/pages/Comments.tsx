import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useRevalidator } from "react-router";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getDashboardMe, type DashboardMe } from "@/api/auth";
import { NoBlogsPlaceholder } from "@/app/components/NoBlogsPlaceholder";
import { SquarespaceApiKeyModal, type SquarespaceApiKeyModalMode } from "@/app/components/SquarespaceApiKeyModal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

// Dashboard list: pending | approved | spam | hidden. Permanently deleted rows are never returned.
type ApiStatus = "pending" | "approved" | "spam" | "hidden";
type UiStatus = "published" | "awaiting" | "spam" | "hidden";

interface Comment {
  id: string;
  postId: string;
  postTitle?: string;
  parentId: string | null;
  displayName: string;
  email: string | null;
  verifiedSubscriber: boolean;
  squarespaceProfileId: string | null;
  body: string;
  status: ApiStatus;
  ipAddress: string | null;
  createdAt: string;
  likeCount: number;
}

/** Opens the commenter's profile in Squarespace site config when a profile id is known. */
function squarespaceProfileHref(siteUrl: string | null | undefined, profileId: string | null | undefined): string | null {
  try {
    const s = (siteUrl || "").trim();
    if (!s) return null;
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const id = profileId?.trim();
    if (!id) return null;
    return `${u.origin}/config/profiles/all/${encodeURIComponent(id)}`;
  } catch {
    return null;
  }
}

function apiToUiStatus(s: string): UiStatus {
  if (s === "approved") return "published";
  if (s === "pending") return "awaiting";
  if (s === "hidden") return "hidden";
  return "spam";
}

function statusBadgeLabel(ui: UiStatus): string {
  if (ui === "awaiting") return "Awaiting Review";
  if (ui === "published") return "Published";
  if (ui === "hidden") return "Hidden";
  return "Spam";
}

const ALL_API_STATUSES: ApiStatus[] = ["pending", "approved", "spam", "hidden"];

function emailLinkActionFromParams(params: URLSearchParams): { action: string; commentId: string } | null {
  const moderate = params.get("moderate");
  const commentId = params.get("commentId");
  const highlight = params.get("highlight");
  if (moderate && commentId && ["approve", "spam", "hide"].includes(moderate)) {
    return { action: moderate, commentId };
  }
  if (highlight) return { action: "view", commentId: highlight };
  return null;
}

function apiStatusFilterLabel(s: ApiStatus): string {
  if (s === "pending") return "Awaiting review";
  if (s === "approved") return "Published";
  if (s === "hidden") return "Hidden";
  return "Spam";
}

/** Keep moderated rows visible when their new status still matches active filters. */
function applyLocalCommentStatusUpdates(
  comments: Comment[],
  updates: { id: string; status: ApiStatus }[],
  visibleStatuses: Set<ApiStatus>
): { comments: Comment[]; totalDelta: number } {
  const updateById = new Map(updates.map((u) => [u.id, u.status]));
  let totalDelta = 0;
  const next = comments.flatMap((c) => {
    const newStatus = updateById.get(c.id);
    if (!newStatus) return [c];
    const wasVisible = visibleStatuses.has(c.status);
    const stillVisible = visibleStatuses.has(newStatus);
    if (stillVisible) return [{ ...c, status: newStatus }];
    if (wasVisible) totalDelta -= 1;
    return [];
  });
  return { comments: next, totalDelta };
}

interface Counts {
  pending: number;
  approved: number;
  spam: number;
  hidden: number;
}

interface CommentSettings {
  commentsEnabled: boolean;
  allowNewComments: boolean;
  allowAnonymousComments: boolean;
  subscriberCommentsEnabled: boolean;
  apiKeyVerified: boolean;
  apiKeyInvalid: boolean;
  requireApproval: boolean;
  autoCloseAfterDays: number | null;
  notifyEmail: boolean;
  allowLikes: boolean;
  allowThreadedReplies: boolean;
  sortOrder: "newest" | "oldest" | "most_liked";
}

export default function Comments() {
  const revalidator = useRevalidator();
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, spam: 0, hidden: 0 });
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<
    { mode: "single"; comment: Comment } | { mode: "bulk"; ids: string[] } | null
  >(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetching, setFetching] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ApiStatus>>(
    () => new Set(ALL_API_STATUSES)
  );
  const [authFilter, setAuthFilter] = useState<"all" | "authenticated" | "anonymous">("all");
  const [postFilterIds, setPostFilterIds] = useState<Set<string>>(() => new Set());
  const [postOptions, setPostOptions] = useState<{ postId: string; title: string }[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [bulkActioning, setBulkActioning] = useState(false);
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [settings, setSettings] = useState<CommentSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [squarespaceApiKeyModalOpen, setSquarespaceApiKeyModalOpen] = useState<SquarespaceApiKeyModalMode>(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailModerationAttempted = useRef<string | null>(null);
  const highlightHandled = useRef<string | null>(null);
  const highlightSetupRef = useRef<string | null>(null);
  const emailLinkVerifyKey = useRef<string | null>(null);
  const [emailLinkVerified, setEmailLinkVerified] = useState<boolean | null>(null);

  const syncCommentsAfterStatusChange = (updates: { id: string; status: ApiStatus }[]) => {
    setComments((prev) => {
      const { comments: next, totalDelta } = applyLocalCommentStatusUpdates(prev, updates, selectedStatuses);
      if (totalDelta !== 0) {
        setTotal((t) => Math.max(0, t + totalDelta));
      }
      return next;
    });
  };

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      if (data?.sites?.[0]) {
        let initialKey = data.sites[0].siteKey;
        try {
          const params = new URLSearchParams(window.location.search);
          const urlSk = params.get("siteKey");
          if (urlSk && data.sites.some((s) => s.siteKey === urlSk)) {
            initialKey = urlSk;
          }
        } catch {
          /* ignore */
        }
        setSiteKey(initialKey);
      }
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
    if (selectedStatuses.size > 0 && selectedStatuses.size < ALL_API_STATUSES.length) {
      params.set("statuses", ALL_API_STATUSES.filter((s) => selectedStatuses.has(s)).join(","));
    }
    if (authFilter !== "all") params.set("auth", authFilter);
    if (postFilterIds.size > 0) {
      params.set("postIds", Array.from(postFilterIds).join(","));
    }
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    fetch(`/api/dashboard/comments?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setComments(data.comments || []);
          setTotal(data.total || 0);
          const list = (data.comments || []) as Array<{
            id: string;
            displayName?: string;
            verifiedSubscriber?: boolean;
            email?: string | null;
            squarespaceProfileId?: string | null;
            status?: string;
          }>;
          console.log("[BetterBlog comments] dashboard list", {
            siteKey,
            total: data.total || 0,
            verifiedCount: list.filter((c) => c.verifiedSubscriber === true).length,
            anonymousCount: list.filter((c) => c.verifiedSubscriber !== true).length,
            comments: list.map((c) => ({
              id: c.id,
              displayName: c.displayName,
              verifiedSubscriber: Boolean(c.verifiedSubscriber),
              hasEmail: Boolean(c.email),
              email: c.email ?? null,
              squarespaceProfileId: c.squarespaceProfileId ?? null,
              status: c.status,
            })),
          });
        }
      })
      .finally(() => setFetching(false));
  }, [siteKey, selectedStatuses, authFilter, postFilterIds, page, searchQuery, listRefreshKey]);

  useEffect(() => {
    if (!siteKey) {
      setPostOptions([]);
      return;
    }
    setPostsLoading(true);
    fetch(`/api/dashboard/comments/posts?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.posts) setPostOptions(data.posts as { postId: string; title: string }[]);
        else setPostOptions([]);
      })
      .finally(() => setPostsLoading(false));
  }, [siteKey]);

  useEffect(() => {
    setPostFilterIds(new Set());
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/dashboard/comments/count?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setCounts({
            pending: data.pending ?? 0,
            approved: data.approved ?? 0,
            spam: data.spam ?? 0,
            hidden: data.hidden ?? 0,
          });
      });
  }, [siteKey, comments]);

  useEffect(() => {
    if (window.location.hash !== "#comment-settings") return;
    const el = document.getElementById("comment-settings");
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [siteKey, settings]);

  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/dashboard/settings/comments?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          console.log("[BetterBlog comments] dashboard settings", {
            siteKey,
            allowAnonymousComments: data.allowAnonymousComments ?? true,
            subscriberCommentsEnabled: data.subscriberCommentsEnabled ?? false,
            apiKeyVerified: data.apiKeyVerified ?? false,
            apiKeyInvalid: data.apiKeyInvalid ?? false,
            commentsEnabled: data.commentsEnabled ?? true,
            allowNewComments: data.allowNewComments ?? true,
          });
          setSettings({
            commentsEnabled: data.commentsEnabled ?? true,
            allowNewComments: data.allowNewComments ?? true,
            allowAnonymousComments: data.allowAnonymousComments ?? true,
            subscriberCommentsEnabled: data.subscriberCommentsEnabled ?? false,
            apiKeyVerified: data.apiKeyVerified ?? false,
            apiKeyInvalid: data.apiKeyInvalid ?? false,
            requireApproval: data.requireApproval ?? false,
            autoCloseAfterDays: data.autoCloseAfterDays ?? null,
            notifyEmail: data.notifyEmail ?? true,
            allowLikes: data.allowLikes ?? true,
            allowThreadedReplies: data.allowThreadedReplies ?? true,
            sortOrder: ["newest", "oldest", "most_liked"].includes(data.sortOrder)
              ? data.sortOrder
              : "newest",
          });
        }
      });
  }, [siteKey]);

  const refreshCounts = () => {
    if (!siteKey) return;
    fetch(`/api/dashboard/comments/count?siteKey=${encodeURIComponent(siteKey)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setCounts({
            pending: data.pending ?? 0,
            approved: data.approved ?? 0,
            spam: data.spam ?? 0,
            hidden: data.hidden ?? 0,
          });
      });
  };

  const clearCommentQueryKeys = (keys: string[]) => {
    const next = new URLSearchParams(searchParams);
    keys.forEach((k) => next.delete(k));
    const s = next.toString();
    navigate({ pathname: "/dashboard/comments", search: s ? `?${s}` : "" }, { replace: true });
  };

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    if (err === "invalid_token") toast.error("That link is invalid or expired.");
    else if (err === "not_found") toast.error("Comment not found.");
    else toast.error("Something went wrong.");
    clearCommentQueryKeys(["error"]);
  }, [searchParams, navigate]);

  useEffect(() => {
    const action = emailLinkActionFromParams(searchParams);
    if (!action) {
      setEmailLinkVerified(null);
      emailLinkVerifyKey.current = null;
      return;
    }
    const token = searchParams.get("token");
    const key = `${token}:${action.action}:${action.commentId}`;
    if (emailLinkVerifyKey.current === key) return;
    emailLinkVerifyKey.current = key;
    setEmailLinkVerified(null);

    let cancelled = false;
    (async () => {
      let valid = false;
      if (token) {
        const r = await fetch(`/api/comment-actions/verify?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        if (r.ok) {
          const data = (await r.json().catch(() => null)) as { commentId?: string; action?: string } | null;
          valid = data?.commentId === action.commentId && data?.action === action.action;
        }
      }
      if (cancelled) return;
      if (!valid) {
        toast.error("That link is invalid or expired.");
        clearCommentQueryKeys(["token", "moderate", "commentId", "highlight"]);
        setEmailLinkVerified(false);
        return;
      }
      setEmailLinkVerified(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  useEffect(() => {
    const approvedId = searchParams.get("approved");
    if (!approvedId) return;
    toast.success("Comment approved.");
    clearCommentQueryKeys(["approved"]);
    setListRefreshKey((k) => k + 1);
  }, [searchParams, navigate]);

  useEffect(() => {
    const spamId = searchParams.get("spam");
    if (!spamId) return;
    toast.success("Marked as spam.");
    clearCommentQueryKeys(["spam"]);
    setListRefreshKey((k) => k + 1);
  }, [searchParams, navigate]);

  useEffect(() => {
    const hid = searchParams.get("highlight");
    if (!hid) {
      highlightSetupRef.current = null;
      return;
    }
    if (emailLinkVerified !== true) return;
    if (!siteKey) return;
    if (highlightSetupRef.current === hid) return;
    highlightSetupRef.current = hid;
    setSelectedStatuses(new Set(ALL_API_STATUSES));
    setAuthFilter("all");
    setPostFilterIds(new Set());
    setPage(1);
    setSearchQuery("");
    setListRefreshKey((k) => k + 1);
  }, [searchParams, siteKey, emailLinkVerified]);

  useEffect(() => {
    if (!me || loading) return;
    const urlSk = searchParams.get("siteKey");
    const validKeys = new Set((me.sites || []).map((s) => s.siteKey).filter(Boolean));
    if (urlSk && !validKeys.has(urlSk)) {
      toast.error("This comment does not belong to your account.");
      clearCommentQueryKeys(["siteKey", "moderate", "commentId", "highlight", "token"]);
      return;
    }
    const moderate = searchParams.get("moderate");
    if (
      urlSk &&
      siteKey &&
      urlSk !== siteKey &&
      (moderate === "approve" || moderate === "spam" || moderate === "hide" || searchParams.get("highlight"))
    ) {
      setSiteKey(urlSk);
    }
  }, [me, loading, siteKey, searchParams, navigate]);

  useEffect(() => {
    if (!me || loading || !siteKey) return;
    if (emailLinkVerified !== true) return;
    const moderate = searchParams.get("moderate");
    const commentId = searchParams.get("commentId");
    if (!moderate || !commentId || !["approve", "spam", "hide"].includes(moderate)) return;
    const urlSk = searchParams.get("siteKey");
    if (urlSk && urlSk !== siteKey) return;

    const key = `${moderate}:${commentId}`;
    if (emailModerationAttempted.current === key) return;
    emailModerationAttempted.current = key;

    const status = moderate === "approve" ? "approved" : moderate === "hide" ? "hidden" : "spam";
    (async () => {
      const r = await fetch(`/api/dashboard/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        toast.success(
          status === "approved" ? "Comment approved" : status === "hidden" ? "Comment hidden" : "Marked as spam"
        );
        syncCommentsAfterStatusChange([{ id: commentId, status }]);
        refreshCounts();
        setListRefreshKey((k) => k + 1);
        clearCommentQueryKeys(["moderate", "commentId", "token"]);
      } else {
        emailModerationAttempted.current = null;
        const data = await r.json().catch(() => ({}));
        toast.error((data as { error?: string }).error ?? "Could not update comment");
        clearCommentQueryKeys(["moderate", "commentId", "token"]);
      }
    })();
  }, [me, loading, siteKey, searchParams, navigate, emailLinkVerified]);

  useEffect(() => {
    const hid = searchParams.get("highlight");
    if (!hid || fetching) return;
    if (emailLinkVerified !== true) return;
    if (highlightHandled.current === hid) return;
    const el = document.getElementById(`bb-comment-row-${hid}`);
    if (!el) return;
    highlightHandled.current = hid;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[#5B4FE8]", "ring-offset-2", "rounded-lg");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#5B4FE8]", "ring-offset-2", "rounded-lg");
    }, 4000);
    clearCommentQueryKeys(["highlight", "token"]);
    return () => window.clearTimeout(timer);
  }, [comments, fetching, searchParams, navigate, emailLinkVerified]);

  const doBulkAction = async (action: "approve" | "spam" | "hide") => {
    if (selectedComments.size === 0) return;
    setBulkActioning(true);
    const status = action === "approve" ? "approved" : action === "hide" ? "hidden" : "spam";
    const ids = Array.from(selectedComments);
    const promises = ids.map((id) =>
      fetch(`/api/dashboard/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
    );
    await Promise.all(promises);
    setSelectedComments(new Set());
    syncCommentsAfterStatusChange(ids.map((id) => ({ id, status })));
    refreshCounts();
    toast.success(
      action === "approve"
        ? "Comments approved"
        : action === "hide"
          ? "Comments hidden"
          : "Comments marked as spam"
    );
    setBulkActioning(false);
  };

  const openPermanentDeleteBulk = () => {
    if (selectedComments.size === 0) return;
    setPermanentDeleteTarget({ mode: "bulk", ids: Array.from(selectedComments) });
    setPermanentDeleteOpen(true);
  };

  const executePermanentDelete = async () => {
    const t = permanentDeleteTarget;
    if (!t) return;
    setPermanentDeleting(true);
    try {
      if (t.mode === "single") {
        const r = await fetch(`/api/dashboard/comments/${t.comment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "deleted" }),
        });
        if (r.ok) {
          toast.success("Comment deleted");
          setComments((prev) => prev.filter((x) => x.id !== t.comment.id));
          setTotal((n) => Math.max(0, n - 1));
          refreshCounts();
          setPermanentDeleteOpen(false);
          setPermanentDeleteTarget(null);
        } else {
          toast.error("Could not delete comment");
        }
      } else {
        const ids = t.ids;
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/dashboard/comments/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ status: "deleted" }),
            })
          )
        );
        const allOk = results.every((r) => r.ok);
        if (allOk) {
          setSelectedComments(new Set());
          setComments((prev) => prev.filter((c) => !ids.includes(c.id)));
          setTotal((n) => Math.max(0, n - ids.length));
          refreshCounts();
          toast.success("Comments deleted");
          setPermanentDeleteOpen(false);
          setPermanentDeleteTarget(null);
        } else {
          toast.error("Some comments could not be deleted");
        }
      }
    } finally {
      setPermanentDeleting(false);
    }
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
        syncCommentsAfterStatusChange([{ id: c.id, status: "approved" }]);
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
        syncCommentsAfterStatusChange([{ id: c.id, status: "spam" }]);
        refreshCounts();
      }
    });
  };

  const requestPermanentDelete = (c: Comment) => {
    setPermanentDeleteTarget({ mode: "single", comment: c });
    setPermanentDeleteOpen(true);
  };

  const handleHide = (c: Comment) => {
    fetch(`/api/dashboard/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "hidden" }),
    }).then((r) => {
      if (r.ok) {
        toast.success("Comment hidden");
        syncCommentsAfterStatusChange([{ id: c.id, status: "hidden" }]);
        refreshCounts();
      }
    });
  };

  const handleUnhide = (c: Comment) => {
    fetch(`/api/dashboard/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "approved" }),
    }).then((r) => {
      if (r.ok) {
        toast.success("Comment published");
        syncCommentsAfterStatusChange([{ id: c.id, status: "approved" }]);
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
      allowNewComments: next.allowNewComments,
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

  const statusCount = (s: ApiStatus): number => {
    if (s === "pending") return counts.pending;
    if (s === "approved") return counts.approved;
    if (s === "hidden") return counts.hidden;
    return counts.spam;
  };

  const setStatusFilterChecked = (s: ApiStatus, checked: boolean) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(s);
        return next;
      }
      if (next.size <= 1) return prev;
      next.delete(s);
      return next;
    });
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedStatuses(new Set(ALL_API_STATUSES));
    setAuthFilter("all");
    setPostFilterIds(new Set());
    setPage(1);
  };

  if (loading || !me) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#6b6b6b]" />
      </div>
    );
  }

  const sites = me.sites || [];
  if (sites.length === 0) {
    return <NoBlogsPlaceholder />;
  }

  return (
    <>
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

          <div className="px-8 border-t border-neutral-100 pt-4 pb-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Filters</span>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-neutral-600" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="space-y-2 min-w-0 flex-1">
                <Label className="text-xs text-neutral-500">Status</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="h-9 px-3 text-sm justify-between w-full sm:w-[260px] inline-flex items-center rounded-md border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8] focus-visible:ring-offset-1"
                  >
                    <span className="truncate">
                      {selectedStatuses.size === ALL_API_STATUSES.length
                        ? "All statuses"
                        : selectedStatuses.size === 1
                        ? apiStatusFilterLabel(Array.from(selectedStatuses)[0])
                        : `${selectedStatuses.size} statuses selected`}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {ALL_API_STATUSES.map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s}
                        checked={selectedStatuses.has(s)}
                        onCheckedChange={(v: boolean) => {
                          setStatusFilterChecked(s, v);
                        }}
                      >
                        <span className="flex-1">{apiStatusFilterLabel(s)}</span>
                        <span className="text-xs text-neutral-400 tabular-nums">
                          {statusCount(s)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2 w-full sm:w-auto sm:min-w-[200px]">
                <Label className="text-xs text-neutral-500">Audience</Label>
                <Select
                  value={authFilter}
                  onValueChange={(v) => {
                    setAuthFilter(v as "all" | "authenticated" | "anonymous");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All comments</SelectItem>
                    <SelectItem value="authenticated">Authenticated (member)</SelectItem>
                    <SelectItem value="anonymous">Anonymous / guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-full sm:w-auto sm:min-w-[240px] lg:min-w-[280px]">
                <Label className="text-xs text-neutral-500">Post</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={postsLoading}
                    className="h-9 px-3 text-sm justify-between w-full sm:w-[280px] inline-flex items-center rounded-md border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8] focus-visible:ring-offset-1"
                  >
                    <span className="truncate">
                      {postsLoading
                        ? "Loading posts…"
                        : postFilterIds.size === 0
                        ? "All posts"
                        : postFilterIds.size === 1
                        ? postOptions.find((p) => postFilterIds.has(p.postId))?.title ??
                          "1 post selected"
                        : `${postFilterIds.size} posts selected`}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80 max-h-80 overflow-auto">
                    <DropdownMenuCheckboxItem
                      checked={postFilterIds.size === 0}
                      onCheckedChange={(v) => {
                        if (!v) return;
                        setPostFilterIds(new Set());
                        setPage(1);
                      }}
                    >
                      <span className="flex-1">All posts</span>
                    </DropdownMenuCheckboxItem>
                    {postOptions.map((p) => (
                      <DropdownMenuCheckboxItem
                        key={p.postId}
                        checked={postFilterIds.has(p.postId)}
                        onCheckedChange={(v) => {
                          setPostFilterIds((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(p.postId);
                            else next.delete(p.postId);
                            return next;
                          });
                          setPage(1);
                        }}
                      >
                        <span className="truncate" title={p.title}>
                          {p.title}
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {(selectedStatuses.size < ALL_API_STATUSES.length || postFilterIds.size > 0) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {ALL_API_STATUSES.filter((s) => selectedStatuses.has(s)).length <
                  ALL_API_STATUSES.length &&
                  ALL_API_STATUSES.filter((s) => selectedStatuses.has(s)).map((s) => (
                    <span
                      key={`status-${s}`}
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                    >
                      <span>Status: {apiStatusFilterLabel(s)}</span>
                      <button
                        type="button"
                        onClick={() => setStatusFilterChecked(s, false)}
                        className="ml-0.5 text-neutral-500 hover:text-neutral-800"
                        aria-label={`Remove status ${apiStatusFilterLabel(s)}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                {Array.from(postFilterIds).map((id) => {
                  const title = postOptions.find((p) => p.postId === id)?.title ?? id;
                  return (
                    <span
                      key={`post-${id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                    >
                      <span className="truncate max-w-[200px]" title={title}>
                        Post: {title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPostFilterIds((prev) => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                          });
                          setPage(1);
                        }}
                        className="ml-0.5 text-neutral-500 hover:text-neutral-800"
                        aria-label={`Remove post ${title}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
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
                  onClick={() => doBulkAction("hide")}
                  className="border-neutral-300"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Hide
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActioning}
                  onClick={() => doBulkAction("spam")}
                  className="border-neutral-300"
                >
                  <Flag className="w-3.5 h-3.5 mr-1.5" />
                  Mark as Spam
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActioning}
                  onClick={openPermanentDeleteBulk}
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
                  const siteUrl =
                    me?.sites?.find((s) => s.siteKey === siteKey)?.url ?? me?.sites?.[0]?.url ?? null;
                  const isAuthenticated = comment.verifiedSubscriber === true;
                  const profileLink = squarespaceProfileHref(siteUrl, comment.squarespaceProfileId);
                  return (
                    <div
                      id={`bb-comment-row-${comment.id}`}
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
                            <div className="flex items-start justify-between mb-2 gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {profileLink ? (
                                    <a
                                      href={profileLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open Squarespace profile"
                                      className="font-medium text-[#0a0a0a] hover:text-[#5B4FE8] hover:underline"
                                    >
                                      {comment.displayName}
                                    </a>
                                  ) : (
                                    <span className="font-medium text-[#0a0a0a]">{comment.displayName}</span>
                                  )}
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${getStatusBadgeStyles(
                                      uiStatus
                                    )}`}
                                  >
                                    {statusBadgeLabel(uiStatus)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs mb-1 justify-start">
                                  {comment.email ? (
                                    <span className="text-neutral-600 truncate max-w-full">{comment.email}</span>
                                  ) : null}
                                  <span
                                    className={`shrink-0 px-2 py-0.5 rounded-full border font-medium ${
                                      isAuthenticated
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-neutral-200 bg-neutral-50 text-neutral-600"
                                    }`}
                                  >
                                    {isAuthenticated ? "Authenticated" : "Anonymous"}
                                  </span>
                                </div>
                                <div className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</div>
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
                              {(uiStatus === "published" || uiStatus === "awaiting") && (
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
                                onClick={() => requestPermanentDelete(comment)}
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
            <div className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">Hidden</div>
            <div className="font-heading text-3xl text-red-900">{counts.hidden}</div>
          </div>
          <div className="p-4 bg-neutral-100 rounded-lg border border-neutral-300">
            <div className="text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1">
              Spam
            </div>
            <div className="font-heading text-3xl text-neutral-900">{counts.spam}</div>
          </div>
        </div>

        <div id="comment-settings" className="mt-6 pt-6 border-t border-neutral-200 scroll-mt-8">
          <h3 className="font-medium text-sm text-[#0a0a0a] mb-4">Settings</h3>
          {!settings && siteKey ? (
            <p className="text-sm text-neutral-500">Loading settings…</p>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Show Comments</Label>
              <Switch
                checked={settings?.commentsEnabled ?? true}
                onCheckedChange={(v) => settings && updateSetting("commentsEnabled", v)}
                disabled={settingsSaving}
              />
            </div>
            {(settings?.commentsEnabled ?? true) && (
            <>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Allow New Comments</Label>
              <Switch
                checked={settings?.allowNewComments ?? true}
                onCheckedChange={(v) => settings && updateSetting("allowNewComments", v)}
                disabled={settingsSaving}
              />
            </div>
            {(settings?.allowNewComments ?? true) && (
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
              <p className="text-xs text-neutral-500">Readers can comment with a name only. When verification is also on, guests still see the comment form.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Verify subscriber comments</Label>
                <Switch
                  checked={settings?.subscriberCommentsEnabled ?? false}
                  onCheckedChange={(v) => settings && updateSetting("subscriberCommentsEnabled", v)}
                  disabled={settingsSaving || !settings?.apiKeyVerified}
                />
              </div>
              <p className="text-xs text-neutral-500">Require a member email, verified against your Squarespace member list. Failed checks are shown in a modal.</p>
              {settings?.apiKeyVerified && (
                <div className={settings.apiKeyInvalid ? "opacity-70" : undefined}>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-mono text-neutral-500">••••••••••••••••</span>
                    <button
                      type="button"
                      onClick={() => setSquarespaceApiKeyModalOpen("edit")}
                      className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700"
                      aria-label="Edit API key"
                      title="Edit API key"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {settings.apiKeyInvalid && (
                    <p className="text-xs text-amber-800 mt-1">
                      Squarespace rejected this key.{" "}
                      <button
                        type="button"
                        onClick={() => setSquarespaceApiKeyModalOpen("edit")}
                        className="text-[#5B4FE8] hover:underline"
                      >
                        Update it
                      </button>
                    </p>
                  )}
                </div>
              )}
              {!settings?.apiKeyVerified && settings && (
                <button
                  type="button"
                  onClick={() => setSquarespaceApiKeyModalOpen("setup")}
                  className="text-xs text-[#5B4FE8] hover:underline"
                >
                  Connect Squarespace API key to enable this setting
                </button>
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
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Allow Threaded Replies</Label>
                <Switch
                  checked={settings?.allowThreadedReplies ?? true}
                  onCheckedChange={(v) => settings && updateSetting("allowThreadedReplies", v)}
                  disabled={settingsSaving}
                />
              </div>
              <p className="text-xs text-neutral-500">Replies nest up to 4 levels.</p>
            </div>
            </>
            )}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Allow Comment Likes</Label>
              <Switch
                checked={settings?.allowLikes ?? true}
                onCheckedChange={(v) => settings && updateSetting("allowLikes", v)}
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

    <AlertDialog
      open={permanentDeleteOpen}
      onOpenChange={(open) => {
        if (!open && !permanentDeleting) {
          setPermanentDeleteOpen(false);
          setPermanentDeleteTarget(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The comment
            {permanentDeleteTarget?.mode === "bulk" ? "s" : ""} will be removed from your blog and will
            not appear in this dashboard again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={permanentDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={permanentDeleting}
            onClick={() => void executePermanentDelete()}
          >
            {permanentDeleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <SquarespaceApiKeyModal
      mode={squarespaceApiKeyModalOpen}
      onModeChange={setSquarespaceApiKeyModalOpen}
      siteKey={siteKey}
      onSaved={({ enableSubscriberComments }) => {
        setSettings((p) =>
          p
            ? {
                ...p,
                apiKeyVerified: true,
                apiKeyInvalid: false,
                subscriberCommentsEnabled: enableSubscriberComments ? true : p.subscriberCommentsEnabled,
              }
            : p
        );
        void revalidator.revalidate();
      }}
    />
    </>
  );
}

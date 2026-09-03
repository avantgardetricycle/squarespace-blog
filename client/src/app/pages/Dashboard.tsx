import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Settings,
  User,
  ArrowRight,
  Globe,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { toast } from "sonner";
import {
  getDashboardMe,
  createSite,
  deleteSite,
  updateSite,
  restoreSite,
  getPaywallReconcile,
  type DashboardMe,
  type CreatedSite,
  type PaywallReconcileMismatch,
} from "@/api/auth";
import { PaywallReconcileModal } from "@/app/components/PaywallReconcileModal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { getPlanDisplayName } from "@/lib/planLabels";
import { formatSubscriptionDate, hasActiveSubscription } from "@/lib/subscription";
import {
  InstallationInstructionsBody,
  InstallationInstructionsModal,
} from "@/app/components/InstallationInstructionsModal";
import {
  groupBlogsBySquarespaceOrigin,
  sameSquarespaceOrigin,
  squarespaceOriginFromUrl,
} from "@/lib/squarespaceSiteGroups";

const PAYWALL_RECONCILE_DISMISS_KEY = "bbPaywallReconcileDismissed";

function readPaywallReconcileDismissed(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(PAYWALL_RECONCILE_DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function rememberPaywallReconcileDismissed(siteKey: string, probedState: string) {
  const next = { ...readPaywallReconcileDismissed(), [siteKey]: probedState };
  try {
    sessionStorage.setItem(PAYWALL_RECONCILE_DISMISS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function isValidSignupPageUrl(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withScheme);
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

export default function Dashboard() {
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBlogModal, setShowAddBlogModal] = useState(false);
  const [installGroupOrigin, setInstallGroupOrigin] = useState<string | null>(null);
  const [justCreatedReplaceHeader, setJustCreatedReplaceHeader] = useState(false);
  const [newBlogName, setNewBlogName] = useState("");
  const [newBlogUrl, setNewBlogUrl] = useState("");
  const [blogUrlError, setBlogUrlError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [justCreatedSite, setJustCreatedSite] = useState<CreatedSite | null>(null);
  const [newBlogPaywalled, setNewBlogPaywalled] = useState<"yes" | "no">("no");
  const [newBlogSubscribeUrl, setNewBlogSubscribeUrl] = useState("");
  const [siteToDelete, setSiteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingSite, setEditingSite] = useState<DashboardMe["sites"][number] | null>(null);
  const [editBlogName, setEditBlogName] = useState("");
  const [editBlogRequiresLogin, setEditBlogRequiresLogin] = useState<"yes" | "no">("no");
  const [editBlogSubscribeUrl, setEditBlogSubscribeUrl] = useState("");
  const [savingBlogEdit, setSavingBlogEdit] = useState(false);
  const [blogUrlConflict, setBlogUrlConflict] = useState<
    | { kind: "active_duplicate"; existingSite: CreatedSite; message: string }
    | { kind: "deleted_previous"; existingSite: CreatedSite; message: string }
    | null
  >(null);
  const [paywallReconcileQueue, setPaywallReconcileQueue] = useState<PaywallReconcileMismatch[]>([]);
  const [paywallReconcileApplying, setPaywallReconcileApplying] = useState(false);
  const paywallReconcileStarted = useRef(false);

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading || !me || paywallReconcileStarted.current) return;
    if (me.sites.length === 0) return;
    paywallReconcileStarted.current = true;
    void getPaywallReconcile().then((data) => {
      if (!data?.mismatches?.length) return;
      const dismissed = readPaywallReconcileDismissed();
      const next = data.mismatches.filter((row) => dismissed[row.siteKey] !== row.probedState);
      if (next.length) setPaywallReconcileQueue(next);
    });
  }, [loading, me]);

  const blogLimit = me?.subscription?.maxSites ?? 3;
  const userPlan =
    me?.subscription != null
      ? me.subscription.planDisplay ?? getPlanDisplayName(me.subscription.plan)
      : "Professional";
  const subscriptionActive = hasActiveSubscription(me?.subscription);
  const subscriptionEndDate = formatSubscriptionDate(me?.subscription?.currentPeriodEnd);
  const sites = me?.sites ?? [];

  const getSiteUrl = (site: { url?: string | null }) => site.url ?? "";

  const performAddBlog = async (opts?: { purgeDeletedSiteId?: string }) => {
    if (!newBlogName.trim()) {
      toast.error("Please enter a blog name");
      return;
    }
    if (!newBlogUrl.trim()) {
      toast.error("Please enter a blog URL");
      return;
    }
    if (!me?.canCreateSite) {
      toast.error("You've reached your site limit");
      return;
    }
    if (newBlogPaywalled === "yes") {
      const su = newBlogSubscribeUrl.trim();
      if (su && !isValidSignupPageUrl(su)) {
        toast.error("Enter a valid signup URL (e.g. https://yoursite.com/subscribe).");
        return;
      }
    }
    setCreating(true);
    setBlogUrlError(null);
    try {
      const paywallDetectionState =
        newBlogPaywalled === "yes" ? "detected_paywalled" : "detected_unpaywalled";
      const subscribeArg = newBlogPaywalled === "yes" ? newBlogSubscribeUrl.trim() : undefined;
      const result = await createSite(newBlogName.trim(), newBlogUrl.trim(), paywallDetectionState, subscribeArg, {
        purgeDeletedSiteId: opts?.purgeDeletedSiteId,
      });
      if ("conflict" in result && result.conflict === "active_duplicate") {
        setBlogUrlConflict({
          kind: "active_duplicate",
          existingSite: result.existingSite,
          message: result.message,
        });
        return;
      }
      if ("conflict" in result && result.conflict === "deleted_previous") {
        setBlogUrlConflict({
          kind: "deleted_previous",
          existingSite: result.existingSite,
          message: result.message,
        });
        return;
      }
      if (result.site) {
        const site = result.site;
        const hadSiblingOnSameOrigin = sites.some(
          (s) => s.id !== site.id && sameSquarespaceOrigin(s.url, site.url),
        );
        setMe((prev) => {
          if (!prev) return prev;
          const newSites = [...prev.sites, site];
          const maxSites = prev.subscription?.maxSites ?? 1;
          return {
            ...prev,
            sites: newSites,
            canCreateSite:
              prev.subscription?.maxSites === null ||
              newSites.length < maxSites,
          };
        });
        setNewBlogName("");
        setNewBlogUrl("");
        setBlogUrlError(null);
        setNewBlogPaywalled("no");
        setNewBlogSubscribeUrl("");
        setJustCreatedSite(site);
        setJustCreatedReplaceHeader(hadSiblingOnSameOrigin);
      } else {
        const errorMessage = result.error ?? "Failed to create site";
        if ("code" in result && result.code === "blog_url_unreachable") {
          setBlogUrlError(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const handleAddBlog = () => void performAddBlog();

  const handleUseExistingBlogFromConflict = () => {
    if (!blogUrlConflict || blogUrlConflict.kind !== "active_duplicate") return;
    const { existingSite } = blogUrlConflict;
    setBlogUrlConflict(null);
    setShowAddBlogModal(false);
    setNewBlogName("");
    setNewBlogUrl("");
    setNewBlogPaywalled("no");
    setNewBlogSubscribeUrl("");
    setJustCreatedSite(null);
    setJustCreatedReplaceHeader(false);
    toast.success(
      `Using your existing blog "${existingSite.name ?? "Untitled"}" — all customization history is unchanged.`
    );
  };

  const handleRestoreDeletedBlog = async () => {
    if (!blogUrlConflict || blogUrlConflict.kind !== "deleted_previous") return;
    const { existingSite } = blogUrlConflict;
    setBlogUrlConflict(null);
    setCreating(true);
    try {
      const nameToUse = newBlogName.trim() || undefined;
      const r = await restoreSite(existingSite.id, nameToUse);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      const fresh = await getDashboardMe();
      if (fresh) setMe(fresh);
      setShowAddBlogModal(false);
      setNewBlogName("");
      setNewBlogUrl("");
      setNewBlogPaywalled("no");
      setNewBlogSubscribeUrl("");
      setJustCreatedSite(null);
      toast.success(
        `Restored "${r.site.name ?? "your blog"}" — your previous layout and settings are back.`
      );
    } finally {
      setCreating(false);
    }
  };

  const handlePurgeDeletedAndCreateNewBlog = () => {
    if (!blogUrlConflict || blogUrlConflict.kind !== "deleted_previous") return;
    const id = blogUrlConflict.existingSite.id;
    setBlogUrlConflict(null);
    void performAddBlog({ purgeDeletedSiteId: id });
  };

  const openEditBlog = (site: DashboardMe["sites"][number]) => {
    setEditingSite(site);
    setEditBlogName(site.name ?? "");
    setEditBlogRequiresLogin(site.paywallDetectionState === "detected_paywalled" ? "yes" : "no");
    setEditBlogSubscribeUrl(site.paywallSettings?.subscribeUrl ?? "");
  };

  const handleSaveBlogEdit = async () => {
    if (!editingSite) return;
    if (!editBlogName.trim()) {
      toast.error("Please enter a blog name");
      return;
    }
    if (editBlogRequiresLogin === "yes") {
      const su = editBlogSubscribeUrl.trim();
      if (su && !isValidSignupPageUrl(su)) {
        toast.error("Enter a valid signup URL (e.g. https://yoursite.com/subscribe).");
        return;
      }
    }
    setSavingBlogEdit(true);
    try {
      const paywallDetectionState =
        editBlogRequiresLogin === "yes" ? "detected_paywalled" : "detected_unpaywalled";
      const result = await updateSite(editingSite.siteKey, {
        name: editBlogName.trim(),
        paywallDetectionState,
        ...(editBlogRequiresLogin === "yes"
          ? { subscribeUrl: editBlogSubscribeUrl.trim() }
          : {}),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      const s = result.site;
      setMe((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sites: prev.sites.map((row) =>
            row.siteKey === s.siteKey
              ? {
                  ...row,
                  name: s.name,
                  paywallDetectionState: s.paywallDetectionState,
                  paywallDetectionSource: s.paywallDetectionSource,
                  paywallSettings: s.paywallSettings ?? row.paywallSettings,
                }
              : row
          ),
        };
      });
      toast.success("Blog settings saved");
      setEditingSite(null);
    } finally {
      setSavingBlogEdit(false);
    }
  };

  const otherDashboardDialogOpen =
    showAddBlogModal ||
    Boolean(editingSite) ||
    Boolean(siteToDelete) ||
    Boolean(justCreatedSite) ||
    Boolean(blogUrlConflict) ||
    Boolean(installGroupOrigin);
  const paywallReconcileMismatch =
    !otherDashboardDialogOpen && paywallReconcileQueue.length > 0 ? paywallReconcileQueue[0] : null;

  const advancePaywallReconcile = (siteKey: string, probedState: string) => {
    rememberPaywallReconcileDismissed(siteKey, probedState);
    setPaywallReconcileQueue((prev) => prev.filter((row) => row.siteKey !== siteKey));
  };

  const handleDismissPaywallReconcile = () => {
    if (!paywallReconcileMismatch) return;
    advancePaywallReconcile(paywallReconcileMismatch.siteKey, paywallReconcileMismatch.probedState);
  };

  const handleApplyPaywallReconcile = async () => {
    if (!paywallReconcileMismatch) return;
    setPaywallReconcileApplying(true);
    try {
      const result = await updateSite(paywallReconcileMismatch.siteKey, {
        paywallDetectionState: paywallReconcileMismatch.probedState,
        paywallDetectionSource: "json_probe",
      });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to update paywall settings");
        return;
      }
      const s = result.site;
      setMe((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sites: prev.sites.map((row) =>
            row.siteKey === s.siteKey
              ? {
                  ...row,
                  paywallDetectionState: s.paywallDetectionState,
                  paywallDetectionSource: s.paywallDetectionSource,
                  paywallSettings: s.paywallSettings ?? row.paywallSettings,
                }
              : row
          ),
        };
      });
      toast.success(
        paywallReconcileMismatch.probedState === "detected_paywalled"
          ? "BetterBlog now treats this blog as membership-gated. Adjust copy in Customize Blog → Paywall Settings."
          : "BetterBlog no longer treats this blog as membership-gated."
      );
      advancePaywallReconcile(paywallReconcileMismatch.siteKey, paywallReconcileMismatch.probedState);
    } finally {
      setPaywallReconcileApplying(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!siteToDelete) return;
    const siteId = siteToDelete.id;
    const deletedSite = sites.find((s) => s.id === siteId);
    const remainingSiblings = deletedSite
      ? sites.filter((s) => s.id !== siteId && sameSquarespaceOrigin(s.url, deletedSite.url))
      : [];
    const siblingHostname = remainingSiblings.length
      ? squarespaceOriginFromUrl(remainingSiblings[0].url)?.hostname
      : null;
    setDeleting(true);
    try {
      const ok = await deleteSite(siteId);
      if (ok) {
        setMe((prev) => {
          if (!prev) return prev;
          const newSites = prev.sites.filter((s) => s.id !== siteId);
          const maxSites = prev.subscription?.maxSites ?? 1;
          return {
            ...prev,
            sites: newSites,
            canCreateSite:
              prev.subscription?.maxSites === null ||
              newSites.length < maxSites,
          };
        });
        setSiteToDelete(null);
        if (remainingSiblings.length > 0 && siblingHostname) {
          toast.success(
            `Blog removed. Re-copy Installation instructions for ${siblingHostname} and replace the Header code.`,
          );
        } else {
          toast.success("Blog removed");
        }
      } else {
        toast.error("Failed to remove blog");
      }
    } catch {
      toast.error("Failed to remove blog");
    } finally {
      setDeleting(false);
    }
  };

  const getVerificationStatus = (site: (typeof sites)[0]) => {
    const url = getSiteUrl(site);
    const verified = site.status === "active" || site.status === "verified";
    if (verified) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        text: "Verified",
        color: "text-green-600",
      };
    }
    if (url) {
      return {
        icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
        text: "Pending",
        color: "text-amber-600",
      };
    }
      return {
        icon: <XCircle className="w-4 h-4 text-[#6b6b6b]" />,
        text: "Not configured",
        color: "text-[#6b6b6b]",
      };
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const capitalize = (s: string) =>
    s
      ? s
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      : s;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-[#6b6b6b]">Loading...</div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  const siteGroups = groupBlogsBySquarespaceOrigin(sites);
  const justCreatedOrigin = justCreatedSite
    ? squarespaceOriginFromUrl(justCreatedSite.url)
    : null;
  const justCreatedBlogs = justCreatedSite
    ? justCreatedOrigin
      ? sites.filter((s) => sameSquarespaceOrigin(s.url, justCreatedSite.url))
      : [justCreatedSite]
    : [];
  const installGroup = installGroupOrigin
    ? siteGroups.find((g) => g.origin === installGroupOrigin) ?? null
    : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-[#0a0a0a] flex items-center gap-2">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-[#5B4FE8] to-[#8F86F0] bg-clip-text text-transparent">
            BetterBlog
          </span>
        </h1>
        <p className="text-[#6b6b6b] text-lg">
          Manage your blog customization and Squarespace integration.
        </p>
      </div>

      {/* Add Blog Modal */}
      <Dialog
        open={showAddBlogModal}
        onOpenChange={(open) => {
          setShowAddBlogModal(open);
          if (!open) {
            setJustCreatedSite(null);
            setJustCreatedReplaceHeader(false);
            setBlogUrlError(null);
            setNewBlogPaywalled("no");
            setNewBlogSubscribeUrl("");
          }
        }}
      >
        <DialogContent className={`overflow-x-hidden ${justCreatedSite ? "sm:max-w-lg" : "sm:max-w-[500px]"}`}>
          {justCreatedSite ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {justCreatedReplaceHeader
                    ? "Blog added — update your install code"
                    : "Blog added successfully"}
                </DialogTitle>
                <DialogDescription>
                  {justCreatedReplaceHeader
                    ? `Replace the Header code for ${justCreatedOrigin?.hostname || "this site"} so every blog is covered.`
                    : "Install the code snippet on your Squarespace site to get started."}
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 min-w-0 overflow-hidden">
                <InstallationInstructionsBody
                  originLabel={justCreatedOrigin?.hostname || "this site"}
                  blogs={justCreatedBlogs}
                  variant={justCreatedReplaceHeader ? "added-replace" : "added-new-site"}
                  justAddedName={justCreatedSite.name || "Your blog"}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowAddBlogModal(false);
                    setJustCreatedSite(null);
                    setJustCreatedReplaceHeader(false);
                  }}
                  className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add New Blog</DialogTitle>
                <DialogDescription>
                  Connect a new Squarespace blog to customize with BetterBlog.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="blog-name">
                    Blog Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="blog-name"
                    placeholder="e.g., My Travel Blog"
                    value={newBlogName}
                    onChange={(e) => setNewBlogName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBlog();
                      }
                    }}
                  />
                  <p className="text-xs text-[#6b6b6b]">
                    A friendly name to identify this blog
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-url">
                    Blog URL <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6b6b6b]" />
                    <Input
                      id="blog-url"
                      placeholder="yoursite.squarespace.com/blog"
                      value={newBlogUrl}
                      onChange={(e) => {
                        setNewBlogUrl(e.target.value);
                        if (blogUrlError) setBlogUrlError(null);
                      }}
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBlog();
                        }
                      }}
                    />
                  </div>
                  {blogUrlError ? (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <span className="min-w-0 break-words">{blogUrlError}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6b6b6b]">
                      The full URL path to your blog page (e.g.,{" "}
                      <span className="font-mono">
                        https://yoursite.squarespace.com/blog
                      </span>
                      )
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Does this blog require a membership to view posts?</Label>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {(
                      [
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ] as const
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNewBlogPaywalled(value)}
                        className={[
                          "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                          newBlogPaywalled === value
                            ? "border-[#5B4FE8] bg-[#5B4FE8]/10 text-[#5B4FE8]"
                            : "border-[#e5e4e0] bg-white text-[#0a0a0a] hover:bg-[#f5f5f3]",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6b6b6b]">
                    This controls whether logged-in and logged-out display settings are available in Customize. You can
                    update this setting later if your blog&apos;s membership setup changes.
                  </p>
                </div>
                {newBlogPaywalled === "yes" ? (
                  <div className="space-y-2">
                    <Label htmlFor="blog-subscribe-url">
                      Signup / subscription page URL (optional)
                    </Label>
                    <Input
                      id="blog-subscribe-url"
                      placeholder="https://yoursite.com/membership"
                      value={newBlogSubscribeUrl}
                      onChange={(e) => setNewBlogSubscribeUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBlog();
                        }
                      }}
                    />
                    <p className="text-xs text-[#6b6b6b]">
                      Leave blank to link readers to your blog collection URL. Use a custom URL for a dedicated signup or membership page.
                    </p>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddBlogModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddBlog}
                  disabled={creating}
                  className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
                >
                  Add Blog
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!blogUrlConflict}
        onOpenChange={(open) => {
          if (!open) setBlogUrlConflict(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-[480px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blogUrlConflict?.kind === "deleted_previous"
                ? "Previously removed blog with this URL"
                : "This blog URL is already in use"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-[#6b6b6b]">
                <p>{blogUrlConflict?.message}</p>
                {blogUrlConflict?.existingSite?.url ? (
                  <p className="break-all font-mono text-xs text-[#0a0a0a]">
                    {blogUrlConflict.existingSite.url}
                  </p>
                ) : null}
                {blogUrlConflict?.kind === "active_duplicate" ? (
                  <p>
                    <span className="font-medium text-[#0a0a0a]">Use existing blog</span> opens that site below. You
                    cannot run two active BetterBlog sites on the same Squarespace blog URL.
                  </p>
                ) : (
                  <p>
                    <span className="font-medium text-[#0a0a0a]">Restore</span> brings back the same site key and all
                    saved layout and settings. <span className="font-medium text-[#0a0a0a]">Create new site</span>{" "}
                    permanently deletes the old removed record and its history, then creates a fresh BetterBlog site for
                    this URL.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0">Go back</AlertDialogCancel>
            {blogUrlConflict?.kind === "active_duplicate" ? (
              <Button type="button" variant="outline" onClick={handleUseExistingBlogFromConflict}>
                Use existing blog
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => void handleRestoreDeletedBlog()} disabled={creating}>
                  {creating ? "Restoring…" : "Restore removed blog"}
                </Button>
                <Button
                  type="button"
                  className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
                  onClick={handlePurgeDeletedAndCreateNewBlog}
                  disabled={creating}
                >
                  Create new site
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!siteToDelete} onOpenChange={(open) => !open && setSiteToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove blog</DialogTitle>
            <DialogDescription>
              Remove &quot;{siteToDelete?.name}&quot; from your dashboard? The Squarespace blog will no longer use
              BetterBlog until you add it again. We keep a private record so you can restore the same customization if
              you reconnect the same URL, or start fresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSiteToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSite}
        onOpenChange={(open) => {
          if (!open) setEditingSite(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit blog settings</DialogTitle>
            <DialogDescription>
              Change the display name and whether this blog expects visitors to log in before viewing posts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingSite?.url ? (
              <p className="text-xs text-[#6b6b6b] break-all">
                Blog URL:{" "}
                <span className="font-mono text-[#0a0a0a]">{editingSite.url}</span>
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="edit-blog-name">
                Blog name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-blog-name"
                value={editBlogName}
                onChange={(e) => setEditBlogName(e.target.value)}
                placeholder="e.g., My Travel Blog"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveBlogEdit();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Does this blog require a membership to view posts?</Label>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {(
                  [
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditBlogRequiresLogin(value)}
                    className={[
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      editBlogRequiresLogin === value
                        ? "border-[#5B4FE8] bg-[#5B4FE8]/10 text-[#5B4FE8]"
                        : "border-[#e5e4e0] bg-white text-[#0a0a0a] hover:bg-[#f5f5f3]",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#6b6b6b]">
                When set to Yes, Customize shows separate layout options for logged-in and logged-out visitors.
              </p>
            </div>
            {editBlogRequiresLogin === "yes" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-blog-subscribe-url">
                  Signup / subscription page URL (optional)
                </Label>
                <Input
                  id="edit-blog-subscribe-url"
                  placeholder="https://yoursite.com/membership"
                  value={editBlogSubscribeUrl}
                  onChange={(e) => setEditBlogSubscribeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSaveBlogEdit();
                    }
                  }}
                />
                <p className="text-xs text-[#6b6b6b]">
                  Leave blank to link readers to your blog collection URL. Use a custom URL for a dedicated signup or membership page.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSite(null)}
              disabled={savingBlogEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveBlogEdit()}
              disabled={savingBlogEdit}
              className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
            >
              {savingBlogEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaywallReconcileModal
        mismatch={paywallReconcileMismatch}
        applying={paywallReconcileApplying}
        onApply={() => void handleApplyPaywallReconcile()}
        onDismiss={handleDismissPaywallReconcile}
      />

      {/* My Blogs Section with Integrated Setup */}
      <Card className="border-[#e5e4e0] shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Blogs</CardTitle>
              <CardDescription>
                {sites.length} of {blogLimit} blog{blogLimit !== 1 ? "s" : ""}{" "}
                on your {subscriptionActive ? userPlan : `canceled ${userPlan}`} plan
              </CardDescription>
            </div>
            {me.canCreateSite && (
              <Button
                onClick={() => setShowAddBlogModal(true)}
                size="sm"
                className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Blog
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-6">
            {siteGroups.map((group) => (
              <div key={group.origin ?? "unconfigured"} className="space-y-2">
                <div className="flex items-center justify-between gap-3 px-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-[#5B4FE8] shrink-0" />
                    <h3 className="font-semibold text-[#0a0a0a] truncate">{group.originLabel}</h3>
                    <span className="text-xs text-[#6b6b6b] shrink-0">
                      {group.blogs.length} blog{group.blogs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {group.origin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setInstallGroupOrigin(group.origin)}
                    >
                      Installation instructions
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {group.blogs.map((site) => {
                    const status = getVerificationStatus(site);
                    const siteUrl = getSiteUrl(site);
                    return (
                      <div
                        key={site.id}
                        className="border border-[#e5e4e0] rounded-lg overflow-hidden hover:border-[#5B4FE8]/50 transition-all"
                      >
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-[#5B4FE8]/10 rounded-lg flex items-center justify-center shrink-0">
                              <Globe className="w-5 h-5 text-[#5B4FE8]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-[#0a0a0a]">
                                  {site.name || "Unnamed site"}
                                </h4>
                                <div className="flex items-center gap-1 text-xs">
                                  {status.icon}
                                  <span className={status.color}>{status.text}</span>
                                </div>
                              </div>
                              <p className="text-sm text-neutral-500 truncate">
                                {siteUrl || "No URL configured"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#6b6b6b] hidden sm:flex">
                              <span>{formatDate(site.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-[#5B4FE8] hover:bg-[#5B4FE8]/10 hover:text-[#5B4FE8]"
                              asChild
                            >
                              <Link
                                to={
                                  subscriptionActive
                                    ? `/dashboard/configure?siteKey=${site.siteKey}`
                                    : "/dashboard/account"
                                }
                              >
                                Customize
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#6b6b6b] hover:text-[#0a0a0a]"
                              aria-label="Edit blog settings"
                              onClick={() => openEditBlog(site)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Remove blog"
                              onClick={() =>
                                setSiteToDelete({ id: site.id, name: site.name || "Unnamed site" })
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {sites.length === 0 && (
            <div className="text-center py-8 text-[#6b6b6b]">
              <p className="mb-2">No blogs yet</p>
              {me.canCreateSite ? (
                <Button
                  onClick={() => setShowAddBlogModal(true)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first blog
                </Button>
              ) : subscriptionActive ? (
                <p>You&apos;ve reached your site limit.</p>
              ) : (
                <p>Restore your subscription to add blogs.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <InstallationInstructionsModal
        open={Boolean(installGroup && installGroup.origin)}
        onOpenChange={(open) => {
          if (!open) setInstallGroupOrigin(null);
        }}
        originLabel={installGroup?.originLabel ?? ""}
        blogs={installGroup?.blogs ?? []}
        variant="manage"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-[#e5e4e0] shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get straight to what matters.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to={subscriptionActive ? "/dashboard/configure" : "/dashboard/account"} className="block group">
              <div className="border border-[#e5e4e0] rounded-xl p-6 hover:border-[#5B4FE8] hover:shadow-md transition-all duration-200 h-full flex flex-col bg-white hover:bg-[#5B4FE8]/5">
                <div className="bg-[#5B4FE8]/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#5B4FE8] group-hover:text-white transition-colors text-[#5B4FE8]">
                  <Settings className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-[#0a0a0a]">
                  Customize Blog
                </h3>
                <p className="text-[#6b6b6b] text-sm mb-4 flex-1 group-hover:text-[#6b6b6b]">
                  Adjust layout, typography, and colors to match your brand
                  perfectly.
                </p>
                <div className="flex items-center text-sm font-medium text-[#5B4FE8] group-hover:translate-x-1 transition-transform">
                  Open Editor <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>

            <Link to="/dashboard/account" className="block group">
              <div className="border border-[#e5e4e0] rounded-xl p-6 hover:border-[#8F86F0] hover:shadow-md transition-all duration-200 h-full flex flex-col bg-white hover:bg-[#8F86F0]/5">
                <div className="bg-[#8F86F0]/20 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#8F86F0] group-hover:text-white transition-colors text-[#5B4FE8]">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-[#0a0a0a]">
                  Manage Account
                </h3>
                <p className="text-[#6b6b6b] text-sm mb-4 flex-1 group-hover:text-[#6b6b6b]">
                  Update your subscription, billing details, and personal
                  profile.
                </p>
                <div className="flex items-center text-sm font-medium text-[#8F86F0] group-hover:translate-x-1 transition-transform">
                  View Account <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-[#e5e4e0] shadow-sm bg-[#5B4FE8]/5">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#6b6b6b]">
                Subscription
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={
                    subscriptionActive
                      ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200"
                      : "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200"
                  }
                >
                  {me.subscription?.status ? capitalize(me.subscription.status) : "—"}
                </span>
                <span className="text-sm font-semibold">
                  {capitalize(userPlan)} Plan
                </span>
              </div>
              {!subscriptionActive && (
                <p className="text-sm text-[#6b6b6b]">
                  {subscriptionEndDate
                    ? `Access ended ${subscriptionEndDate}`
                    : "Access has ended"}
                </p>
              )}
            </div>

            <Separator className="bg-[#5B4FE8]/20" />

            <div className="space-y-1">
              <p className="text-sm font-medium text-[#6b6b6b]">Email</p>
              <p className="text-sm">{me.user.email}</p>
            </div>

            <Separator className="bg-[#5B4FE8]/20" />

            <div className="space-y-1">
              <p className="text-sm font-medium text-[#6b6b6b]">
                Member Since
              </p>
              <p className="text-sm">
                {formatDate(me.user.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

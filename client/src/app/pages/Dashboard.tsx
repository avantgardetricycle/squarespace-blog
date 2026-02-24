import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Settings,
  User,
  Copy,
  Check,
  ArrowRight,
  Globe,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
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
import { getDashboardMe, createSite, deleteSite, type DashboardMe, type CreatedSite } from "@/api/auth";

const LOADER_URL =
  "https://avantgardetricycle.github.io/squarespace-blog/loader.js";

export default function Dashboard() {
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [copiedSiteKey, setCopiedSiteKey] = useState<string | null>(null);
  const [showAddBlogModal, setShowAddBlogModal] = useState(false);
  const [newBlogName, setNewBlogName] = useState("");
  const [newBlogUrl, setNewBlogUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreatedSite, setJustCreatedSite] = useState<CreatedSite | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      setLoading(false);
    });
  }, []);

  const blogLimit = me?.subscription?.maxSites ?? 3;
  const userPlan = me?.subscription?.plan ?? "Pro";
  const sites = me?.sites ?? [];

  const handleCopy = (siteKey: string) => {
    const scriptTag = `<script src="${LOADER_URL}" data-site-key="${siteKey}"></script>`;
    navigator.clipboard.writeText(scriptTag);
    setCopiedSiteKey(siteKey);
    toast.success("Script code copied to clipboard!");
    setTimeout(() => setCopiedSiteKey(null), 2000);
  };

  const getSiteUrl = (site: { url?: string | null }) => site.url ?? "";

  const handleAddBlog = async () => {
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
    setCreating(true);
    try {
      const site = await createSite(newBlogName.trim(), newBlogUrl.trim());
      if (site) {
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
        setJustCreatedSite(site);
        setExpandedSiteId(site.id);
      } else {
        toast.error("Failed to create site");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!siteToDelete) return;
    const siteId = siteToDelete.id;
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
        if (expandedSiteId === siteId) setExpandedSiteId(null);
        setSiteToDelete(null);
        toast.success("Blog removed");
      } else {
        toast.error("Failed to remove blog");
      }
    } catch {
      toast.error("Failed to remove blog");
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (siteId: string) => {
    setExpandedSiteId((prev) => (prev === siteId ? null : siteId));
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
      icon: <XCircle className="w-4 h-4 text-neutral-400" />,
      text: "Not configured",
      color: "text-neutral-400",
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
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
            BetterBlog
          </span>
        </h1>
        <p className="text-neutral-500 text-lg">
          Manage your blog customization and Squarespace integration.
        </p>
      </div>

      {/* Add Blog Modal */}
      <Dialog
        open={showAddBlogModal}
        onOpenChange={(open) => {
          setShowAddBlogModal(open);
          if (!open) setJustCreatedSite(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] overflow-x-hidden">
          {justCreatedSite ? (
            <>
              <DialogHeader>
                <DialogTitle>Blog added successfully</DialogTitle>
                <DialogDescription>
                  Install the code snippet on your Squarespace site to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 min-w-0 overflow-hidden">
                <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm min-w-0">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                  <span className="min-w-0 break-words">
                    <strong>{justCreatedSite.name || "Your blog"}</strong> has been added. Copy the code below and add it to your site.
                  </span>
                </div>
                <div className="space-y-2 min-w-0">
                  <p className="text-sm text-neutral-600 break-words">
                    Paste this into your Squarespace site&apos;s{" "}
                    <span className="font-medium text-neutral-900">
                      Settings → Advanced → Code Injection → Header
                    </span>
                    .
                  </p>
                  <div className="relative min-w-0">
                    <div className="absolute right-2 top-2 z-10">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 px-2 bg-neutral-800 hover:bg-neutral-700 text-white border-none"
                        onClick={() => handleCopy(justCreatedSite.siteKey)}
                      >
                        {copiedSiteKey === justCreatedSite.siteKey ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-4 pr-24 text-sm text-blue-100 font-mono border border-neutral-800 shadow-inner min-w-0 max-w-full">
                      <code>{`<script src="${LOADER_URL}" data-site-key="${justCreatedSite.siteKey}"></script>`}</code>
                    </pre>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowAddBlogModal(false);
                    setJustCreatedSite(null);
                  }}
                  className="bg-gradient-to-r from-blue-700 to-green-600 hover:from-blue-800 hover:to-green-700"
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
                  <p className="text-xs text-neutral-500">
                    A friendly name to identify this blog
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-url">
                    Blog URL <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      id="blog-url"
                      placeholder="https://yoursite.squarespace.com/blog"
                      value={newBlogUrl}
                      onChange={(e) => setNewBlogUrl(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBlog();
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    The full URL path to your blog page (e.g.,{" "}
                    <span className="font-mono">
                      https://yoursite.squarespace.com/blog
                    </span>
                    )
                  </p>
                </div>
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
                  className="bg-gradient-to-r from-blue-700 to-green-600 hover:from-blue-800 hover:to-green-700"
                >
                  Add Blog
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!siteToDelete} onOpenChange={(open) => !open && setSiteToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove blog</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{siteToDelete?.name}&quot;? This will delete the site and its configuration. This action cannot be undone.
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

      {/* My Blogs Section with Integrated Setup */}
      <Card className="border-neutral-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Blogs</CardTitle>
              <CardDescription>
                {sites.length} of {blogLimit} blog{blogLimit !== 1 ? "s" : ""}{" "}
                on your {userPlan} plan
              </CardDescription>
            </div>
            {me.canCreateSite && (
              <Button
                onClick={() => setShowAddBlogModal(true)}
                size="sm"
                className="bg-gradient-to-r from-blue-700 to-green-600 hover:from-blue-800 hover:to-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Blog
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {sites.map((site) => {
              const isExpanded = expandedSiteId === site.id;
              const status = getVerificationStatus(site);
              const siteUrl = getSiteUrl(site);
              const scriptTag = `<script src="${LOADER_URL}" data-site-key="${site.siteKey}"></script>`;

              return (
                <div
                  key={site.id}
                  className="border border-neutral-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50/30 transition-colors"
                    onClick={() => toggleExpand(site.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-neutral-900">
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
                      <div className="flex items-center gap-2 text-xs text-neutral-400 hidden sm:flex">
                        <span>{formatDate(site.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        asChild
                      >
                        <Link to={`/dashboard/configure?siteKey=${site.siteKey}`}>
                          Customize
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSiteToDelete({ id: site.id, name: site.name || "Unnamed site" });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-neutral-200 bg-neutral-50 p-6 space-y-4">
                      <p className="text-sm text-neutral-600">
                        Copy the code below and paste it into your Squarespace
                        site&apos;s{" "}
                        <span className="font-medium text-neutral-900">
                          Settings → Advanced → Code Injection → Header
                        </span>
                        .
                      </p>
                      <div className="relative">
                        <div className="absolute right-2 top-2 z-10">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-2 bg-neutral-800 hover:bg-neutral-700 text-white border-none"
                            onClick={() => handleCopy(site.siteKey)}
                          >
                            {copiedSiteKey === site.siteKey ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                Copy Code
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-4 text-sm text-blue-100 font-mono border border-neutral-800 shadow-inner">
                          <code>{scriptTag}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sites.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
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
              ) : (
                <p>You&apos;ve reached your site limit.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get straight to what matters.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to="/dashboard/configure" className="block group">
              <div className="border border-neutral-200 rounded-xl p-6 hover:border-blue-600 hover:shadow-md transition-all duration-200 h-full flex flex-col bg-white hover:bg-blue-50/30">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-700">
                  <Settings className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-neutral-900">
                  Customize Blog
                </h3>
                <p className="text-neutral-500 text-sm mb-4 flex-1 group-hover:text-neutral-600">
                  Adjust layout, typography, and colors to match your brand
                  perfectly.
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                  Open Editor <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>

            <Link to="/dashboard/account" className="block group">
              <div className="border border-neutral-200 rounded-xl p-6 hover:border-green-600 hover:shadow-md transition-all duration-200 h-full flex flex-col bg-white hover:bg-green-50/30">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors text-green-700">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-neutral-900">
                  Manage Account
                </h3>
                <p className="text-neutral-500 text-sm mb-4 flex-1 group-hover:text-neutral-600">
                  Update your subscription, billing details, and personal
                  profile.
                </p>
                <div className="flex items-center text-sm font-medium text-green-600 group-hover:translate-x-1 transition-transform">
                  View Account <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-sm bg-blue-50/30">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">
                Subscription
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">
                  {me.subscription?.status ? capitalize(me.subscription.status) : "—"}
                </span>
                <span className="text-sm font-semibold">
                  {capitalize(userPlan)} Plan
                </span>
              </div>
            </div>

            <Separator className="bg-blue-100" />

            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">Email</p>
              <p className="text-sm">{me.user.email}</p>
            </div>

            <Separator className="bg-blue-100" />

            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">
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

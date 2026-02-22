import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Settings,
  User,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Globe,
  Plus,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Separator } from "@/app/components/ui/separator";
import { toast } from "sonner";
import { getDashboardMe, createSite, type DashboardMe } from "@/api/auth";

const LOADER_URL = "https://avantgardetricycle.github.io/squarespace-blog/loader.js";

export default function Dashboard() {
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [siteUrl, setSiteUrl] = useState("https://my-awesome-blog.squarespace.com");

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      setLoading(false);
    });
  }, []);

  const handleCopy = (siteKey: string) => {
    const scriptTag = `<script src="${LOADER_URL}" data-site-key="${siteKey}"></script>`;
    navigator.clipboard.writeText(scriptTag);
    setCopiedKey(siteKey);
    toast.success("Script code copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateSite = async () => {
    if (!me?.canCreateSite) return;
    setCreating(true);
    try {
      const site = await createSite();
      if (site) {
        toast.success("Site created! Copy the install snippet below.");
        setMe((prev) => {
          if (!prev) return prev;
          const newSites = [...prev.sites, site];
          const maxSites = prev.subscription?.maxSites ?? 1;
          return {
            ...prev,
            sites: newSites,
            canCreateSite:
              prev.subscription?.maxSites === null || newSites.length < maxSites,
          };
        });
      } else {
        toast.error("Failed to create site");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSaveUrl = () => {
    toast.success("Squarespace URL updated!");
  };

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
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

        {/* Account Info Card */}
        <Card className="border-neutral-200 shadow-sm bg-blue-50/30">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">Plan</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">
                  {me.subscription?.status ?? "—"}
                </span>
                <span className="text-sm font-semibold">
                  {me.subscription?.plan ?? "No plan"}
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
              <p className="text-sm font-medium text-neutral-500">Sites</p>
              <p className="text-sm">
                {me.sites.length}
                {me.subscription?.maxSites != null
                  ? ` / ${me.subscription.maxSites}`
                  : " (unlimited)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sites & Create Site Key */}
      <Card className="border-neutral-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Sites</CardTitle>
              <CardDescription>
                Create site keys and install the snippet on each Squarespace
                blog.
              </CardDescription>
            </div>
            {me.canCreateSite && (
              <Button
                onClick={handleCreateSite}
                disabled={creating}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Site Key
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {me.sites.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              {me.canCreateSite ? (
                <p className="mb-4">
                  You don&apos;t have any sites yet. Click &quot;Create Site
                  Key&quot; to get started.
                </p>
              ) : (
                <p>You&apos;ve reached your site limit. Upgrade your plan to add more.</p>
              )}
            </div>
          ) : (
            me.sites.map((site) => (
              <div
                key={site.id}
                className="border border-neutral-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {site.name || "Unnamed site"}
                    </p>
                    <p className="text-sm text-neutral-500 font-mono">
                      {site.siteKey}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link to={`/dashboard/configure?siteKey=${site.siteKey}`}>
                        Configure
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-neutral-800 hover:bg-neutral-700 text-white border-none"
                      onClick={() => handleCopy(site.siteKey)}
                    >
                      {copiedKey === site.siteKey ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy Snippet
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-blue-100 font-mono border border-neutral-800">
                  <code>{`<script src="${LOADER_URL}" data-site-key="${site.siteKey}"></script>`}</code>
                </pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="border-neutral-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50 border-b border-neutral-100">
          <CardTitle>Squarespace Integration</CardTitle>
          <CardDescription>
            Follow these steps to connect your custom blog design to your
            Squarespace site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="flex gap-4">
            <div className="flex-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm ring-4 ring-blue-50">
                1
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-neutral-900">
                Connect your site
              </h3>
              <p className="text-sm text-neutral-500">
                Enter the full URL of your Squarespace website so we can verify
                the installation.
              </p>
              <div className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                  <Input
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="pl-9 focus-visible:ring-blue-600"
                    placeholder="https://your-site.squarespace.com"
                  />
                </div>
                <Button
                  onClick={handleSaveUrl}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <div className="flex-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm ring-4 ring-blue-50">
                2
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-neutral-900">
                Install the code snippet
              </h3>
              <p className="text-sm text-neutral-500">
                Copy the snippet for each site above and paste it into your
                Squarespace site&apos;s{" "}
                <span className="font-medium text-neutral-900">
                  Settings → Advanced → Code Injection → Header
                </span>
                .
              </p>
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md border border-blue-100 flex gap-2 items-start">
                <div className="mt-0.5">ℹ️</div>
                <p>
                  Note: Code Injection is a premium feature on Squarespace. You
                  need a Business or Commerce plan to use this plugin.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <div className="flex-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white font-bold text-sm shadow-sm ring-4 ring-green-50">
                3
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-neutral-900">
                Verify Installation
              </h3>
              <p className="text-sm text-neutral-500">
                Once you&apos;ve added the code, visit your blog page to see your
                new design in action.
              </p>
              <Button
                variant="outline"
                className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-300"
                asChild
              >
                <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                  Open My Site <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

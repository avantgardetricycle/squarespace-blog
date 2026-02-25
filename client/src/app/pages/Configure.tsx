import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router";
import {
  Palette,
  Type,
  LayoutTemplate,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Undo2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Separator } from "@/app/components/ui/separator";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { toast } from "sonner";
import BlogPreviewRenderer from "@/app/components/BlogPreviewRenderer";
import { getDashboardMe, updateSite, type DashboardMe } from "@/api/auth";

export interface SiteConfigForm {
  showDate: boolean;
  showAuthor: boolean;
  progressBar: { show: boolean; position: "top" | "bottom" };
  tableOfContents: { show: boolean; position: "left" | "right" };
  recentPostsSidebar: { show: boolean; position: "left" | "right" };
}

const defaultSiteConfig: SiteConfigForm = {
  showDate: true,
  showAuthor: false,
  progressBar: { show: false, position: "top" },
  tableOfContents: { show: false, position: "left" },
  recentPostsSidebar: { show: false, position: "left" },
};

function configFromApi(data: Record<string, unknown>): SiteConfigForm {
  return {
    showDate: Boolean(data.showDate ?? true),
    showAuthor: Boolean(data.showAuthor ?? false),
    progressBar: {
      show: Boolean(data.showProgressBar ?? false),
      position: (data.progressBarPosition === "bottom" ? "bottom" : "top") as "top" | "bottom",
    },
    tableOfContents: {
      show: Boolean(data.showTableOfContents ?? false),
      position: (data.tableOfContentsPosition === "right" ? "right" : "left") as "left" | "right",
    },
    recentPostsSidebar: {
      show: Boolean(data.showRecentPostsSidebar ?? false),
      position: (data.sidebarPosition === "right" ? "right" : "left") as "left" | "right",
    },
  };
}

function configToApiPayload(config: SiteConfigForm): Record<string, unknown> {
  return {
    showDate: config.showDate,
    showAuthor: config.showAuthor,
    showProgressBar: config.progressBar.show,
    progressBarPosition: config.progressBar.position,
    showTableOfContents: config.tableOfContents.show,
    tableOfContentsPosition: config.tableOfContents.position,
    showRecentPostsSidebar: config.recentPostsSidebar.show,
    sidebarPosition: config.recentPostsSidebar.position,
  };
}

function configToRendererConfig(config: SiteConfigForm): Record<string, unknown> {
  return {
    showDate: config.showDate,
    showAuthor: config.showAuthor,
    showProgressBar: config.progressBar.show,
    progressBarPosition: config.progressBar.position,
    showTableOfContents: config.tableOfContents.show,
    tableOfContentsPosition: config.tableOfContents.position,
    showRecentPostsSidebar: config.recentPostsSidebar.show,
    sidebarPosition: config.recentPostsSidebar.position,
    recentPostsCount: 5,
  };
}

function configsEqual(a: SiteConfigForm, b: SiteConfigForm): boolean {
  return (
    a.showDate === b.showDate &&
    a.showAuthor === b.showAuthor &&
    a.progressBar.show === b.progressBar.show &&
    a.progressBar.position === b.progressBar.position &&
    a.tableOfContents.show === b.tableOfContents.show &&
    a.tableOfContents.position === b.tableOfContents.position &&
    a.recentPostsSidebar.show === b.recentPostsSidebar.show &&
    a.recentPostsSidebar.position === b.recentPostsSidebar.position
  );
}

export default function Configure() {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteKey = searchParams.get("siteKey");
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [config, setConfig] = useState<SiteConfigForm>(defaultSiteConfig);
  const [savedConfig, setSavedConfig] = useState<SiteConfigForm>(defaultSiteConfig);
  const [saving, setSaving] = useState(false);
  const [blogPassword, setBlogPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!me || me.sites.length === 0) return;
    if (!siteKey) {
      setSearchParams({ siteKey: me.sites[0].siteKey }, { replace: true });
      return;
    }
    const validSite = me.sites.some((s) => s.siteKey === siteKey);
    if (!validSite) {
      setSearchParams({ siteKey: me.sites[0].siteKey }, { replace: true });
    }
  }, [me, siteKey, setSearchParams]);

  useEffect(() => {
    if (!siteKey) return;
    setConfigLoading(true);
    fetch(`/api/config/${siteKey}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === "object") {
          const loaded = configFromApi(data as Record<string, unknown>);
          setConfig(loaded);
          setSavedConfig(loaded);
        } else {
          setConfig(defaultSiteConfig);
          setSavedConfig(defaultSiteConfig);
        }
      })
      .catch(() => {
        setConfig(defaultSiteConfig);
        setSavedConfig(defaultSiteConfig);
      })
      .finally(() => setConfigLoading(false));
  }, [siteKey]);

  const effectiveSite =
    me && me.sites.length > 0
      ? me.sites.find((s) => s.siteKey === siteKey) ?? me.sites[0]
      : null;
  const effectiveSiteKey = effectiveSite?.siteKey ?? null;

  useEffect(() => {
    setBlogPassword("");
  }, [effectiveSiteKey]);

  const isDirty = !configsEqual(config, savedConfig);
  const rendererConfig = useMemo(() => configToRendererConfig(config), [config]);

  const handleSave = useCallback(async () => {
    const keyToSave = effectiveSiteKey ?? siteKey;
    if (!keyToSave) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteKey: keyToSave,
          config: configToApiPayload(config),
        }),
      });
      if (res.ok) {
        setSavedConfig(config);
        toast.success("Configuration saved successfully!");
      } else {
        toast.error("Failed to save configuration.");
      }
    } catch {
      toast.error("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }, [effectiveSiteKey, siteKey, config]);

  const handleReset = () => {
    setConfig(savedConfig);
    toast.info("Changes reverted.");
  };

  const updateConfig = (path: string, value: unknown) => {
    setConfig((prev) => {
      const next = { ...prev };
      if (path === "showDate") next.showDate = value as boolean;
      else if (path === "showAuthor") next.showAuthor = value as boolean;
      else if (path === "progressBar.show") next.progressBar = { ...prev.progressBar, show: value as boolean };
      else if (path === "progressBar.position") next.progressBar = { ...prev.progressBar, position: value as "top" | "bottom" };
      else if (path === "tableOfContents.show") next.tableOfContents = { ...prev.tableOfContents, show: value as boolean };
      else if (path === "tableOfContents.position") next.tableOfContents = { ...prev.tableOfContents, position: value as "left" | "right" };
      else if (path === "recentPostsSidebar.show") next.recentPostsSidebar = { ...prev.recentPostsSidebar, show: value as boolean };
      else if (path === "recentPostsSidebar.position") next.recentPostsSidebar = { ...prev.recentPostsSidebar, position: value as "left" | "right" };
      return next;
    });
  };

  const handleBlogChange = (newSiteKey: string) => {
    setSearchParams({ siteKey: newSiteKey });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse text-neutral-500">Loading…</div>
      </div>
    );
  }

  if (!me || me.sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
        <p className="text-neutral-500">No blogs yet. Add a blog from the dashboard to get started.</p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-neutral-100">
      {/* Configuration Sidebar */}
      <aside className="w-80 bg-white border-r border-neutral-200 flex flex-col z-10 shadow-sm">
        <div className="p-4 border-b border-neutral-100 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-500">Customizing</Label>
            <Select value={effectiveSiteKey ?? undefined} onValueChange={handleBlogChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a blog" />
              </SelectTrigger>
              <SelectContent>
                {me.sites.map((site) => (
                  <SelectItem key={site.id} value={site.siteKey}>
                    {site.name || "Unnamed blog"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-password" className="text-xs font-medium text-neutral-500">
              Blog password
            </Label>
            <p className="text-xs text-neutral-500">
              Required if your blog is password protected on Squarespace.
            </p>
            <div className="flex gap-2">
              <Input
                id="blog-password"
                type="password"
                placeholder={effectiveSite?.hasBlogPassword ? "••••••••" : "Enter password"}
                value={blogPassword}
                onChange={(e) => setBlogPassword(e.target.value)}
                className="flex-1"
                autoComplete="off"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const site = effectiveSite;
                  if (!site) return;
                  setSavingPassword(true);
                  const result = await updateSite(site.siteKey, { blogPassword: blogPassword.trim() || "" });
                  setSavingPassword(false);
                  if (result.ok) {
                    const fresh = await getDashboardMe();
                    if (fresh) setMe(fresh);
                    setBlogPassword("");
                    setPreviewRefreshKey((k) => k + 1);
                    toast.success(blogPassword ? "Password saved" : "Password cleared");
                  } else {
                    toast.error(result.error ?? "Failed to save password");
                  }
                }}
                disabled={savingPassword}
              >
                {savingPassword ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          <h2 className="font-semibold text-lg">Settings</h2>
        </div>

        <Tabs defaultValue="layout" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="layout" className="flex gap-2">
                <LayoutTemplate className="h-4 w-4" />
                <span className="sr-only">Layout</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex gap-2 opacity-50" disabled>
                <Type className="h-4 w-4" />
                <span className="sr-only">Typography</span>
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex gap-2 opacity-50" disabled>
                <Palette className="h-4 w-4" />
                <span className="sr-only">Colors</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Layout Settings */}
              <TabsContent value="layout" className="space-y-6 mt-0">
                {configLoading ? (
                  <div className="text-sm text-neutral-500">Loading settings…</div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-date">Show Date</Label>
                      <Switch
                        id="show-date"
                        checked={config.showDate}
                        onCheckedChange={(v) => updateConfig("showDate", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-author">Show Author</Label>
                      <Switch
                        id="show-author"
                        checked={config.showAuthor}
                        onCheckedChange={(v) => updateConfig("showAuthor", v)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Progress Bar</Label>
                        <Switch
                          checked={config.progressBar.show}
                          onCheckedChange={(v) => updateConfig("progressBar.show", v)}
                        />
                      </div>
                      {config.progressBar.show && (
                        <div className="space-y-2">
                          <Label className="text-xs text-neutral-500">Position</Label>
                          <Select
                            value={config.progressBar.position}
                            onValueChange={(v) => updateConfig("progressBar.position", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Table of Contents</Label>
                        <Switch
                          checked={config.tableOfContents.show}
                          onCheckedChange={(v) => updateConfig("tableOfContents.show", v)}
                        />
                      </div>
                      {config.tableOfContents.show && (
                        <div className="space-y-2">
                          <Label className="text-xs text-neutral-500">Position</Label>
                          <Select
                            value={config.tableOfContents.position}
                            onValueChange={(v) => updateConfig("tableOfContents.position", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Recent Posts Sidebar</Label>
                        <Switch
                          checked={config.recentPostsSidebar.show}
                          onCheckedChange={(v) => updateConfig("recentPostsSidebar.show", v)}
                        />
                      </div>
                      {config.recentPostsSidebar.show && (
                        <div className="space-y-2">
                          <Label className="text-xs text-neutral-500">Position</Label>
                          <Select
                            value={config.recentPostsSidebar.position}
                            onValueChange={(v) => updateConfig("recentPostsSidebar.position", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Typography Settings - disabled for now */}
              <TabsContent value="typography" className="space-y-6 mt-0 opacity-50 pointer-events-none">
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500">Coming soon.</p>
                </div>
              </TabsContent>

              {/* Colors Settings - disabled for now */}
              <TabsContent value="colors" className="space-y-6 mt-0 opacity-50 pointer-events-none">
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500">Coming soon.</p>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </aside>

      {/* Preview Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-100/50">
        <div className="h-14 border-b border-neutral-200 bg-white px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-neutral-900">Live Preview</span>
            {isDirty ? (
              <>
                <span className="text-amber-600 text-sm">Unsaved changes</span>
                <Button variant="ghost" size="sm" onClick={handleReset} title="Revert changes">
                  <Undo2 className="h-4 w-4 mr-1.5" />
                  Undo
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <span className="text-neutral-500 text-sm">No unsaved changes</span>
            )}
          </div>

          <div className="flex items-center bg-neutral-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${device === "desktop" ? "bg-white shadow-sm" : "text-neutral-500"}`}
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${device === "tablet" ? "bg-white shadow-sm" : "text-neutral-500"}`}
              onClick={() => setDevice("tablet")}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${device === "mobile" ? "bg-white shadow-sm" : "text-neutral-500"}`}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <div
            className={`bg-white shadow-xl transition-all duration-300 origin-top overflow-hidden
              ${device === "desktop" ? "w-full h-full" : ""}
              ${device === "tablet" ? "w-[768px] h-[1024px] rounded-lg my-4 border-8 border-neutral-800" : ""}
              ${device === "mobile" ? "w-[375px] h-[812px] rounded-[2rem] my-4 border-8 border-neutral-800" : ""}
            `}
          >
            <div className="h-full w-full overflow-y-auto">
              {effectiveSiteKey && (
                <BlogPreviewRenderer
                  key={`${effectiveSiteKey}-${previewRefreshKey}`}
                  siteKey={effectiveSiteKey}
                  config={rendererConfig}
                  className="min-h-full"
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

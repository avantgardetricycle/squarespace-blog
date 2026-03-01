import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router";
import {
  Copy,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Undo2,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Slider } from "@/app/components/ui/slider";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/app/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { toast } from "sonner";
import BlogPreviewIframe, {
  buildBlogPreviewUrl,
  isSquarespaceUrl,
} from "@/app/components/BlogPreviewIframe";
import BlogPreviewRenderer from "@/app/components/BlogPreviewRenderer";
import { getDashboardMe, type DashboardMe } from "@/api/auth";

export interface BlogAuthorOption {
  id: string;
  name: string;
}

export interface SiteConfigForm {
  showDate: boolean;
  showAuthor: boolean;
  defaultAuthorIds: string[];
  postAuthorOverrides: Record<string, string[]>;
  progressBar: { show: boolean; position: "top" | "bottom"; thickness: number; color: string };
  tableOfContents: { show: boolean; position: "left" | "right" };
  recentPostsSidebar: { show: boolean; position: "left" | "right" };
}

const defaultSiteConfig: SiteConfigForm = {
  showDate: true,
  showAuthor: false,
  defaultAuthorIds: [],
  postAuthorOverrides: {},
  progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  tableOfContents: { show: false, position: "left" },
  recentPostsSidebar: { show: false, position: "left" },
};

function configFromApi(data: Record<string, unknown>): SiteConfigForm {
  const defaultAuthorIds = Array.isArray(data.defaultAuthorIds) ? data.defaultAuthorIds as string[] : [];
  const postAuthorOverrides = (data.postAuthorOverrides && typeof data.postAuthorOverrides === "object")
    ? (data.postAuthorOverrides as Record<string, string[]>) : {};
  return {
    showDate: Boolean(data.showDate ?? true),
    showAuthor: Boolean(data.showAuthor ?? false),
    defaultAuthorIds,
    postAuthorOverrides,
    progressBar: {
      show: Boolean(data.showProgressBar ?? false),
      position: (data.progressBarPosition === "bottom" ? "bottom" : "top") as "top" | "bottom",
      thickness: Math.min(12, Math.max(2, Number(data.progressBarThickness) || 6)),
      color: typeof data.progressBarColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(data.progressBarColor as string)
        ? (data.progressBarColor as string)
        : "#5B4FE8",
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
    defaultAuthorIds: config.defaultAuthorIds,
    postAuthorOverrides: config.postAuthorOverrides,
    showProgressBar: config.progressBar.show,
    progressBarPosition: config.progressBar.position,
    progressBarThickness: config.progressBar.thickness,
    progressBarColor: config.progressBar.color,
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
    defaultAuthorIds: config.defaultAuthorIds,
    postAuthorOverrides: config.postAuthorOverrides,
    showProgressBar: config.progressBar.show,
    progressBarPosition: config.progressBar.position,
    progressBarThickness: config.progressBar.thickness,
    progressBarColor: config.progressBar.color,
    showTableOfContents: config.tableOfContents.show,
    tableOfContentsPosition: config.tableOfContents.position,
    showRecentPostsSidebar: config.recentPostsSidebar.show,
    sidebarPosition: config.recentPostsSidebar.position,
    recentPostsCount: 5,
  };
}

function configsEqual(a: SiteConfigForm, b: SiteConfigForm): boolean {
  const defaultIdsEqual = a.defaultAuthorIds.length === b.defaultAuthorIds.length &&
    a.defaultAuthorIds.every((id, i) => id === b.defaultAuthorIds[i]);
  const overridesKeys = new Set([...Object.keys(a.postAuthorOverrides), ...Object.keys(b.postAuthorOverrides)]);
  const overridesEqual = [...overridesKeys].every((key) => {
    const aa = a.postAuthorOverrides[key] ?? [];
    const bb = b.postAuthorOverrides[key] ?? [];
    return aa.length === bb.length && aa.every((id, i) => id === bb[i]);
  });
  return (
    a.showDate === b.showDate &&
    a.showAuthor === b.showAuthor &&
    defaultIdsEqual &&
    overridesEqual &&
    a.progressBar.show === b.progressBar.show &&
    a.progressBar.position === b.progressBar.position &&
    a.progressBar.thickness === b.progressBar.thickness &&
    a.progressBar.color === b.progressBar.color &&
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
  const [copiedSiteKey, setCopiedSiteKey] = useState<string | null>(null);
  const [authors, setAuthors] = useState<BlogAuthorOption[]>([]);
  const [blogItems, setBlogItems] = useState<{ id: string; title: string; author?: { displayName?: string } }[]>([]);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [addAuthorModalOpen, setAddAuthorModalOpen] = useState(false);
  const [addAuthorContext, setAddAuthorContext] = useState<"default" | { postId: string }>("default");
  const [addAuthorAsDefault, setAddAuthorAsDefault] = useState(true);
  const [installationModalOpen, setInstallationModalOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(-1);
  const [sectionExpanded, setSectionExpanded] = useState({
    showAuthor: false,
    progressBar: false,
    tableOfContents: false,
    recentPostsSidebar: false,
  });

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

  // Fetch blog authors for the site
  useEffect(() => {
    if (!effectiveSiteKey) return;
    fetch(`/api/blog-authors/${effectiveSiteKey}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAuthors(Array.isArray(data) ? data : []))
      .catch(() => setAuthors([]));
  }, [effectiveSiteKey]);

  // Fetch blog JSON and sync authors from Squarespace; add ingested authors as default (runs after config loads)
  useEffect(() => {
    if (!effectiveSiteKey || !effectiveSite || configLoading) return;
    Promise.all([
      fetch(`/api/config/blog-preview/${encodeURIComponent(effectiveSiteKey)}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/blog-authors/${effectiveSiteKey}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(async ([json, existingAuthors]) => {
        const items = Array.isArray(json?.items) ? json.items : (json?.collection?.items ?? []);
        setBlogItems(items);
        const existingList = Array.isArray(existingAuthors) ? existingAuthors : [];
        const existingByName = new Map(existingList.map((a: { id?: string; name?: string }) => [a?.name ?? "", a?.id ?? ""]));
        const authorNames = new Set<string>();
        for (const item of items) {
          const a = item?.author;
          if (a?.displayName && typeof a.displayName === "string") authorNames.add(a.displayName.trim());
          const authorsArr = item?.authors ?? (a ? [a] : []);
          for (const au of authorsArr) {
            if (au?.displayName && typeof au.displayName === "string") authorNames.add(au.displayName.trim());
          }
        }
        const apiBase = typeof window !== "undefined" ? window.location.origin : "";
        const ingestedIds: string[] = [];
        for (const name of authorNames) {
          if (!name) continue;
          let id = existingByName.get(name);
          if (!id) {
            try {
              const res = await fetch(`${apiBase}/api/blog-authors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ siteKey: effectiveSiteKey, name }),
              });
              const data = await res.json();
              if (data?.id) {
                id = data.id;
                existingByName.set(name, id);
              }
            } catch {
              /* ignore */
            }
          }
          if (id) ingestedIds.push(id);
        }
        const freshAuthors = await fetch(`/api/blog-authors/${effectiveSiteKey}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : []));
        setAuthors(Array.isArray(freshAuthors) ? freshAuthors : []);
        return ingestedIds;
      })
      .then((ingestedIds) => {
        if (Array.isArray(ingestedIds) && ingestedIds.length > 0) {
          setConfig((prev) => ({
            ...prev,
            defaultAuthorIds: [...new Set([...prev.defaultAuthorIds, ...ingestedIds])],
          }));
        }
      })
      .catch(() => {});
  }, [effectiveSiteKey, effectiveSite, configLoading]);

  const isDirty = !configsEqual(config, savedConfig);
  const rendererConfig = useMemo(() => {
    const base = configToRendererConfig(config);
    const authorMap: Record<string, string> = {};
    for (const a of authors) authorMap[a.id] = a.name;
    return { ...base, authorMap };
  }, [config, authors]);

  const handleSave = useCallback(async () => {
    const keyToSave = effectiveSiteKey ?? siteKey;
    if (!keyToSave) return;
    setSaving(true);
    try {
      // Use absolute URL so the request always targets the app origin (avoids iframe base URL issues)
      const apiBase = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${apiBase}/api/config`, {
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
        const data = await res.json().catch(() => ({}));
        const message = data?.error ?? "Failed to save configuration.";
        toast.error(message);
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
      else if (path === "defaultAuthorIds") next.defaultAuthorIds = value as string[];
      else if (path === "postAuthorOverrides") next.postAuthorOverrides = value as Record<string, string[]>;
      else if (path.startsWith("postAuthorOverrides.")) {
        const postId = path.slice("postAuthorOverrides.".length);
        next.postAuthorOverrides = { ...prev.postAuthorOverrides, [postId]: value as string[] };
      }
      else if (path === "progressBar.show") next.progressBar = { ...prev.progressBar, show: value as boolean };
      else if (path === "progressBar.position") next.progressBar = { ...prev.progressBar, position: value as "top" | "bottom" };
      else if (path === "progressBar.thickness") next.progressBar = { ...prev.progressBar, thickness: value as number };
      else if (path === "progressBar.color") next.progressBar = { ...prev.progressBar, color: value as string };
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

  // Listen for selected post: hashchange (BlogPreviewRenderer) or postMessage (BlogPreviewIframe)
  useEffect(() => {
    const fromHash = () => {
      const m = (window.location.hash || "").match(/^#post-(\d+)$/);
      setSelectedPostIndex(m ? parseInt(m[1], 10) : -1);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "BETTERBLOG_PREVIEW_POST_SELECTED" && typeof e.data.postIndex === "number") {
        setSelectedPostIndex(e.data.postIndex);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse text-[#6b6b6b]">Loading…</div>
      </div>
    );
  }

  if (!me || me.sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
        <p className="text-[#6b6b6b]">No blogs yet. Add a blog from the dashboard to get started.</p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#f7f6f3]">
      {/* Configuration Sidebar */}
      <aside className="w-80 bg-white border-r border-[#e5e4e0] flex flex-col min-h-0 z-10 shadow-sm">
        <div className="p-4 border-b border-[#e5e4e0] space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#6b6b6b]">Customizing</Label>
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
          {effectiveSiteKey && (
            <Dialog open={installationModalOpen} onOpenChange={setInstallationModalOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-[#5B4FE8] hover:underline"
                >
                  Installation instructions
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Installation instructions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-[#6b6b6b]">
                    In Squarespace, go to Settings → Advanced → Code Injection. Add this code to the header of your blog page.
                  </p>
                  {(() => {
                    const base = typeof window !== "undefined" ? window.location.origin : "";
                    const snippet = `<script
  src="${base}/loader.js"
  data-site-key="${effectiveSiteKey}"
  data-api-base="${base}"
></script>`;
                    return (
                      <div className="space-y-2">
                        <pre className="text-xs bg-[#f7f6f3] p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all font-mono">
                          {snippet}
                        </pre>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(snippet);
                            setCopiedSiteKey(effectiveSiteKey);
                            toast.success("Code copied to clipboard");
                            setTimeout(() => setCopiedSiteKey(null), 2000);
                            setInstallationModalOpen(false);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          {copiedSiteKey === effectiveSiteKey ? "Copied!" : "Copy code"}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <h2 className="font-semibold text-lg">Settings</h2>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-2">
                {configLoading ? (
                  <div className="text-sm text-[#6b6b6b]">Loading settings…</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e4e0]">
                      <span className="font-medium">Show Date</span>
                      <div className="flex items-center gap-1">
                        <Switch
                          id="show-date"
                          checked={config.showDate}
                          onCheckedChange={(v) => updateConfig("showDate", v)}
                        />
                        <span className="w-6 h-6 shrink-0" aria-hidden />
                      </div>
                    </div>

                    {selectedPostIndex >= 0 && blogItems.length > 0 && selectedPostIndex < blogItems.length ? (
                      <div className="border-b border-[#e5e4e0] pb-4">
                        <span className="font-medium block py-3">Post Author(s)</span>
                        <div className="space-y-2">
                            {(() => {
                              const item = blogItems[selectedPostIndex];
                              const postId = (item as { id?: string; fullUrl?: string }).id ?? (item as { id?: string; fullUrl?: string }).fullUrl ?? `post-${selectedPostIndex}`;
                              const overrideIds = config.postAuthorOverrides[postId] ?? [];
                              const displayIds = overrideIds.length > 0 ? overrideIds : config.defaultAuthorIds;
                              const isOverridden = overrideIds.length > 0;
                              return (
                                <>
                                  <p className="text-xs text-[#6b6b6b]">
                                    {isOverridden ? "Override the default author(s) for this post." : "Default author(s) for this post. Add or remove to override."}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {displayIds.map((id) => {
                                      const author = authors.find((a) => a.id === id);
                                      return (
                                        <span
                                          key={id}
                                          className="inline-flex items-center gap-0.5 rounded bg-[#5B4FE8]/10 px-2 py-1 text-sm text-[#5B4FE8]"
                                        >
                                          {author?.name ?? id}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateConfig(
                                                `postAuthorOverrides.${postId}`,
                                                displayIds.filter((x) => x !== id)
                                              )
                                            }
                                            className="hover:opacity-70"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      );
                                    })}
                                    <Select
                                      value=""
                                      onValueChange={(v) => {
                                        if (v && v !== "__add_new__" && !displayIds.includes(v)) {
                                          updateConfig(`postAuthorOverrides.${postId}`, [...displayIds, v]);
                                        }
                                        if (v === "__add_new__") {
                                      setAddAuthorContext({ postId });
                                      setAddAuthorAsDefault(false);
                                      setAddAuthorModalOpen(true);
                                    }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 w-28 text-xs">
                                        <SelectValue placeholder="+ Add" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {authors.filter((a) => !displayIds.includes(a.id)).map((a) => (
                                          <SelectItem key={a.id} value={a.id}>
                                            {a.name}
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="__add_new__">
                                          <span className="flex items-center gap-1">
                                            <Plus className="h-3 w-3" /> Add New Author
                                          </span>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </>
                              );
                            })()}
                        </div>
                      </div>
                    ) : (
                      <div className="border-b border-[#e5e4e0]">
                        <div className="flex items-center justify-between py-3">
                          <span className="font-medium">Show Author(s)</span>
                          <div className="flex items-center gap-1">
                            <Switch
                              id="show-author"
                              checked={config.showAuthor}
                              onCheckedChange={(v) => {
                                updateConfig("showAuthor", v);
                                setSectionExpanded((p) => ({ ...p, showAuthor: v }));
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => config.showAuthor && setSectionExpanded((p) => ({ ...p, showAuthor: !p.showAuthor }))}
                              className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!config.showAuthor ? "invisible pointer-events-none" : ""}`}
                              aria-label={sectionExpanded.showAuthor ? "Collapse" : "Expand"}
                            >
                              {sectionExpanded.showAuthor ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Collapsible open={config.showAuthor && sectionExpanded.showAuthor}>
                          <CollapsibleContent>
                            <div className="pb-4 space-y-2">
                                <Label className="text-xs text-[#6b6b6b]">Default Author(s)</Label>
                                <div className="flex flex-wrap gap-2">
                                  {config.defaultAuthorIds.map((id) => {
                                    const author = authors.find((a) => a.id === id);
                                    return (
                                      <span
                                        key={id}
                                        className="inline-flex items-center gap-1 rounded-md bg-[#5B4FE8]/10 px-2 py-1 text-sm text-[#5B4FE8]"
                                      >
                                        {author?.name ?? id}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateConfig(
                                              "defaultAuthorIds",
                                              config.defaultAuthorIds.filter((x) => x !== id)
                                            )
                                          }
                                          className="hover:opacity-70"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                                <Select
                                  value=""
                                  onValueChange={(v) => {
                                  if (v === "__add_new__") {
                                    setAddAuthorContext("default");
                                    setAddAuthorAsDefault(true);
                                    setAddAuthorModalOpen(true);
                                    return;
                                  }
                                    if (v && !config.defaultAuthorIds.includes(v)) {
                                      updateConfig("defaultAuthorIds", [...config.defaultAuthorIds, v]);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Add author…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {authors
                                      .filter((a) => !config.defaultAuthorIds.includes(a.id))
                                      .map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                          {a.name}
                                        </SelectItem>
                                      ))}
                                    <SelectItem value="__add_new__">
                                      <span className="flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> Add New Author
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Progress Bar</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={config.progressBar.show}
                            onCheckedChange={(v) => {
                              updateConfig("progressBar.show", v);
                              setSectionExpanded((p) => ({ ...p, progressBar: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => config.progressBar.show && setSectionExpanded((p) => ({ ...p, progressBar: !p.progressBar }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!config.progressBar.show ? "invisible pointer-events-none" : ""}`}
                            aria-label={sectionExpanded.progressBar ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.progressBar ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={config.progressBar.show && sectionExpanded.progressBar}>
                        <CollapsibleContent>
                        <div className="pb-4 space-y-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Position</Label>
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
                          <div className="space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Thickness</Label>
                            <div className="flex items-center gap-3">
                              <Slider
                                value={[config.progressBar.thickness]}
                                onValueChange={([v]) => updateConfig("progressBar.thickness", v ?? 6)}
                                min={2}
                                max={12}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-xs text-[#6b6b6b] w-8 shrink-0">
                                {config.progressBar.thickness}px
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={config.progressBar.color}
                                onChange={(e) => updateConfig("progressBar.color", e.target.value)}
                                className="h-9 w-14 cursor-pointer rounded border border-[#e5e4e0] bg-white p-0"
                              />
                              <Input
                                value={config.progressBar.color}
                                onChange={(e) => updateConfig("progressBar.color", e.target.value)}
                                className="font-mono text-sm h-9 w-24"
                                placeholder="#5B4FE8"
                              />
                            </div>
                          </div>
                        </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    </div>

                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Table of Contents</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={config.tableOfContents.show}
                            onCheckedChange={(v) => {
                              updateConfig("tableOfContents.show", v);
                              setSectionExpanded((p) => ({ ...p, tableOfContents: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => config.tableOfContents.show && setSectionExpanded((p) => ({ ...p, tableOfContents: !p.tableOfContents }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!config.tableOfContents.show ? "invisible pointer-events-none" : ""}`}
                            aria-label={sectionExpanded.tableOfContents ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.tableOfContents ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={config.tableOfContents.show && sectionExpanded.tableOfContents}>
                        <CollapsibleContent>
                        <div className="pb-4 space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Position</Label>
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
                      </CollapsibleContent>
                    </Collapsible>
                    </div>

                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Recent Posts Sidebar</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={config.recentPostsSidebar.show}
                            onCheckedChange={(v) => {
                              updateConfig("recentPostsSidebar.show", v);
                              setSectionExpanded((p) => ({ ...p, recentPostsSidebar: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => config.recentPostsSidebar.show && setSectionExpanded((p) => ({ ...p, recentPostsSidebar: !p.recentPostsSidebar }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!config.recentPostsSidebar.show ? "invisible pointer-events-none" : ""}`}
                            aria-label={sectionExpanded.recentPostsSidebar ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.recentPostsSidebar ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={config.recentPostsSidebar.show && sectionExpanded.recentPostsSidebar}>
                        <CollapsibleContent>
                        <div className="pb-4 space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Position</Label>
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
                      </CollapsibleContent>
                    </Collapsible>
                    </div>
                  </>
                )}
          </div>
        </ScrollArea>

        <Dialog open={addAuthorModalOpen} onOpenChange={(open) => { setAddAuthorModalOpen(open); if (!open) setNewAuthorName(""); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Author</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
              <Input
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                placeholder="Author name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const name = newAuthorName.trim();
                    if (name && effectiveSiteKey) {
                      const apiBase = typeof window !== "undefined" ? window.location.origin : "";
                      fetch(`${apiBase}/api/blog-authors`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ siteKey: effectiveSiteKey, name }),
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          if (data?.id) {
                            setAuthors((prev) => [...prev, { id: data.id, name: data.name }]);
                            if (addAuthorContext === "default") {
                              updateConfig("defaultAuthorIds", [...config.defaultAuthorIds, data.id]);
                            } else {
                              const overrideIds = config.postAuthorOverrides[addAuthorContext.postId] ?? [];
                              updateConfig(`postAuthorOverrides.${addAuthorContext.postId}`, [...overrideIds, data.id]);
                              if (addAuthorAsDefault) {
                                updateConfig("defaultAuthorIds", [...config.defaultAuthorIds, data.id]);
                              }
                            }
                            setNewAuthorName("");
                            setAddAuthorModalOpen(false);
                          }
                        });
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  const name = newAuthorName.trim();
                  if (name && effectiveSiteKey) {
                    const apiBase = typeof window !== "undefined" ? window.location.origin : "";
                    fetch(`${apiBase}/api/blog-authors`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ siteKey: effectiveSiteKey, name }),
                    })
                      .then((res) => res.json())
                      .then((data) => {
                        if (data?.id) {
                            setAuthors((prev) => [...prev, { id: data.id, name: data.name }]);
                            if (addAuthorContext === "default") {
                              updateConfig("defaultAuthorIds", [...config.defaultAuthorIds, data.id]);
                            } else {
                              const overrideIds = config.postAuthorOverrides[addAuthorContext.postId] ?? [];
                              updateConfig(`postAuthorOverrides.${addAuthorContext.postId}`, [...overrideIds, data.id]);
                              if (addAuthorAsDefault) {
                                updateConfig("defaultAuthorIds", [...config.defaultAuthorIds, data.id]);
                              }
                            }
                          setNewAuthorName("");
                          setAddAuthorModalOpen(false);
                        }
                      });
                  }
                }}
              >
                Add
              </Button>
            </div>
              {addAuthorContext !== "default" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={addAuthorAsDefault}
                    onCheckedChange={(v) => setAddAuthorAsDefault(Boolean(v))}
                  />
                  <span className="text-sm">Default Author</span>
                </label>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </aside>

      {/* Preview Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f7f6f3]/50">
        <div className="h-14 border-b border-[#e5e4e0] bg-white px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-[#0a0a0a]">Live Preview</span>
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
              <span className="text-[#6b6b6b] text-sm">No unsaved changes</span>
            )}
          </div>

          <div className="flex items-center bg-[#f7f6f3] rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${device === "desktop" ? "bg-white shadow-sm" : "text-[#6b6b6b]"}`}
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${device === "tablet" ? "bg-white shadow-sm" : "text-[#6b6b6b]"}`}
              onClick={() => setDevice("tablet")}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${device === "mobile" ? "bg-white shadow-sm" : "text-[#6b6b6b]"}`}
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
              ${device === "tablet" ? "w-[768px] h-[1024px] rounded-lg my-4 border-8 border-[#8F86F0]/30" : ""}
              ${device === "mobile" ? "w-[375px] h-[812px] rounded-[2rem] my-4 border-8 border-[#8F86F0]/30" : ""}
            `}
          >
            <div className="h-full w-full overflow-hidden overflow-y-auto">
              {effectiveSite && (() => {
                const previewUrl = buildBlogPreviewUrl(effectiveSite);
                if (!previewUrl) {
                  return (
                    <div className="flex items-center justify-center h-full text-[#6b6b6b] p-8 text-center">
                      Add your blog URL in the dashboard to see a live preview.
                    </div>
                  );
                }
                if (isSquarespaceUrl(previewUrl)) {
                  return (
                    <div className="flex flex-col h-full">
                      <p className="text-xs text-[#6b6b6b] px-4 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
                        Squarespace blocks iframe embedding. Using a simplified preview.
                      </p>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <BlogPreviewRenderer
                          key={`${effectiveSite.siteKey}-${config.progressBar.thickness}-${config.progressBar.color}`}
                          siteKey={effectiveSite.siteKey}
                          config={rendererConfig}
                          className="min-h-full"
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <BlogPreviewIframe
                    key={effectiveSite.siteKey}
                    blogUrl={previewUrl}
                    config={rendererConfig}
                    className="min-h-full"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

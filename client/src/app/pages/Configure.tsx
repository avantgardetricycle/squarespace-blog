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
  GripVertical,
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

export const SIDEBAR_MODULE_TYPES = ["recentPosts", "relevantPosts", "tableOfContents"] as const;
export type SidebarModuleType = (typeof SIDEBAR_MODULE_TYPES)[number];

export interface SiteConfigForm {
  showDate: boolean;
  showAuthor: boolean;
  defaultAuthorIds: string[];
  postAuthorOverrides: Record<string, string[]>;
  progressBar: { show: boolean; position: "top" | "bottom"; thickness: number; color: string };
  leftSidebar: { show: boolean; modules: SidebarModuleType[]; width: number };
  rightSidebar: { show: boolean; modules: SidebarModuleType[]; width: number };
  headerContent: { show: boolean; tableOfContents: boolean; breadcrumbs: boolean };
}

const defaultSiteConfig: SiteConfigForm = {
  showDate: true,
  showAuthor: false,
  defaultAuthorIds: [],
  postAuthorOverrides: {},
  progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  leftSidebar: { show: false, modules: [], width: 240 },
  rightSidebar: { show: false, modules: [], width: 240 },
  headerContent: { show: false, tableOfContents: false, breadcrumbs: false },
};

function configFromApi(data: Record<string, unknown>): SiteConfigForm {
  const defaultAuthorIds = Array.isArray(data.defaultAuthorIds) ? data.defaultAuthorIds as string[] : [];
  const postAuthorOverrides = (data.postAuthorOverrides && typeof data.postAuthorOverrides === "object")
    ? (data.postAuthorOverrides as Record<string, string[]>) : {};
  const ls = data.leftSidebar && typeof data.leftSidebar === "object" ? data.leftSidebar as { show?: boolean; modules?: string[]; width?: number } : null;
  const rs = data.rightSidebar && typeof data.rightSidebar === "object" ? data.rightSidebar as { show?: boolean; modules?: string[]; width?: number } : null;
  const hc = data.headerContent && typeof data.headerContent === "object" ? data.headerContent as { show?: boolean; tableOfContents?: boolean; breadcrumbs?: boolean } : null;
  const validModules = (arr: unknown): SidebarModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarModuleType => SIDEBAR_MODULE_TYPES.includes(m as SidebarModuleType)) : [];
  let leftSidebar = ls ? { show: Boolean(ls.show ?? false), modules: validModules(ls.modules), width: Math.min(400, Math.max(160, Number(ls.width) || 240)) } : null;
  let rightSidebar = rs ? { show: Boolean(rs.show ?? false), modules: validModules(rs.modules), width: Math.min(400, Math.max(160, Number(rs.width) || 240)) } : null;
  let headerContent = hc ? { show: Boolean(hc.show ?? false), tableOfContents: Boolean(hc.tableOfContents ?? false), breadcrumbs: Boolean(hc.breadcrumbs ?? false) } : null;
  if (!leftSidebar || !rightSidebar || !headerContent) {
    const showToc = Boolean(data.showTableOfContents ?? false);
    const tocPos = (data.tableOfContentsPosition === "right" ? "right" : "left") as "left" | "right";
    const showRp = Boolean(data.showRecentPostsSidebar ?? false);
    const rpPos = (data.sidebarPosition === "right" ? "right" : "left") as "left" | "right";
    if (!leftSidebar) {
      const modules: SidebarModuleType[] = [];
      if (showToc && tocPos === "left") modules.push("tableOfContents");
      if (showRp && rpPos === "left") modules.push("recentPosts");
      leftSidebar = { show: modules.length > 0, modules, width: 240 };
    }
    if (!rightSidebar) {
      const modules: SidebarModuleType[] = [];
      if (showToc && tocPos === "right") modules.push("tableOfContents");
      if (showRp && rpPos === "right") modules.push("recentPosts");
      rightSidebar = { show: modules.length > 0, modules, width: 240 };
    }
    if (!headerContent) headerContent = { show: false, tableOfContents: false, breadcrumbs: false };
  }
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
    leftSidebar,
    rightSidebar,
    headerContent,
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
    leftSidebar: config.leftSidebar,
    rightSidebar: config.rightSidebar,
    headerContent: config.headerContent,
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
    leftSidebar: config.leftSidebar,
    rightSidebar: config.rightSidebar,
    headerContent: config.headerContent,
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
  const lsEqual = a.leftSidebar.show === b.leftSidebar.show &&
    a.leftSidebar.width === b.leftSidebar.width &&
    a.leftSidebar.modules.length === b.leftSidebar.modules.length &&
    a.leftSidebar.modules.every((m, i) => m === b.leftSidebar.modules[i]);
  const rsEqual = a.rightSidebar.show === b.rightSidebar.show &&
    a.rightSidebar.width === b.rightSidebar.width &&
    a.rightSidebar.modules.length === b.rightSidebar.modules.length &&
    a.rightSidebar.modules.every((m, i) => m === b.rightSidebar.modules[i]);
  const hcEqual = a.headerContent.show === b.headerContent.show &&
    a.headerContent.tableOfContents === b.headerContent.tableOfContents &&
    a.headerContent.breadcrumbs === b.headerContent.breadcrumbs;
  return (
    a.showDate === b.showDate &&
    a.showAuthor === b.showAuthor &&
    defaultIdsEqual &&
    overridesEqual &&
    a.progressBar.show === b.progressBar.show &&
    a.progressBar.position === b.progressBar.position &&
    a.progressBar.thickness === b.progressBar.thickness &&
    a.progressBar.color === b.progressBar.color &&
    lsEqual && rsEqual && hcEqual
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
    leftSidebar: false,
    rightSidebar: false,
    headerContent: false,
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
              const newId = data?.id;
              if (typeof newId === "string") {
                id = newId;
                existingByName.set(name, newId);
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
      else if (path === "leftSidebar.show") next.leftSidebar = { ...prev.leftSidebar, show: value as boolean };
      else if (path === "leftSidebar.modules") next.leftSidebar = { ...prev.leftSidebar, modules: value as SidebarModuleType[] };
      else if (path === "leftSidebar.width") next.leftSidebar = { ...prev.leftSidebar, width: value as number };
      else if (path === "rightSidebar.show") next.rightSidebar = { ...prev.rightSidebar, show: value as boolean };
      else if (path === "rightSidebar.modules") next.rightSidebar = { ...prev.rightSidebar, modules: value as SidebarModuleType[] };
      else if (path === "rightSidebar.width") next.rightSidebar = { ...prev.rightSidebar, width: value as number };
      else if (path === "headerContent.show") next.headerContent = { ...prev.headerContent, show: value as boolean };
      else if (path === "headerContent.tableOfContents") next.headerContent = { ...prev.headerContent, tableOfContents: value as boolean };
      else if (path === "headerContent.breadcrumbs") next.headerContent = { ...prev.headerContent, breadcrumbs: value as boolean };
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
                  {typeof window !== "undefined" && window.location.protocol === "http:" && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      Local dev (HTTP): If your blog is on HTTPS, the overlay may fail to load due to mixed content. Use a tunnel (e.g. ngrok) or deploy to test.
                    </p>
                  )}
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

                    {(() => {
                      const MODULE_LABELS: Record<SidebarModuleType, string> = {
                        recentPosts: "Recent Posts",
                        relevantPosts: "Relevant Posts",
                        tableOfContents: "Table of Contents",
                      };
                      const SidebarSection = ({ side }: { side: "left" | "right" }) => {
                        const cfg = side === "left" ? config.leftSidebar : config.rightSidebar;
                        const expanded = side === "left" ? sectionExpanded.leftSidebar : sectionExpanded.rightSidebar;
                        const setExpanded = (v: boolean) => setSectionExpanded((p) => ({ ...p, [side === "left" ? "leftSidebar" : "rightSidebar"]: v }));
                        const pathPrefix = side === "left" ? "leftSidebar" : "rightSidebar";
                        const moveModule = (fromIdx: number, toIdx: number) => {
                          const arr = [...cfg.modules];
                          const [removed] = arr.splice(fromIdx, 1);
                          arr.splice(toIdx, 0, removed);
                          updateConfig(`${pathPrefix}.modules`, arr);
                        };
                        const addModule = (m: SidebarModuleType) => {
                          if (!cfg.modules.includes(m)) updateConfig(`${pathPrefix}.modules`, [...cfg.modules, m]);
                        };
                        const removeModule = (idx: number) => {
                          updateConfig(`${pathPrefix}.modules`, cfg.modules.filter((_, i) => i !== idx));
                        };
                        const handleDragOver = (e: React.DragEvent) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        };
                        const handleDrop = (e: React.DragEvent, toIdx: number) => {
                          e.preventDefault();
                          const fromIdx = Number(e.dataTransfer.getData("text/plain"));
                          if (fromIdx !== toIdx && fromIdx >= 0) moveModule(fromIdx, toIdx);
                        };
                        const handleDragStart = (e: React.DragEvent, idx: number) => {
                          e.dataTransfer.setData("text/plain", String(idx));
                          e.dataTransfer.effectAllowed = "move";
                        };
                        return (
                          <div className="border-b border-[#e5e4e0]">
                            <div className="flex items-center justify-between py-3">
                              <span className="font-medium">{side === "left" ? "Left Sidebar" : "Right Sidebar"}</span>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={cfg.show}
                                  onCheckedChange={(v) => {
                                    updateConfig(`${pathPrefix}.show`, v);
                                    setExpanded(v);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => cfg.show && setExpanded(!expanded)}
                                  className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!cfg.show ? "invisible pointer-events-none" : ""}`}
                                  aria-label={expanded ? "Collapse" : "Expand"}
                                >
                                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <Collapsible open={cfg.show && expanded}>
                              <CollapsibleContent>
                                <div className="pb-4 space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Width</Label>
                                    <div className="flex items-center gap-3">
                                      <Slider
                                        value={[cfg.width]}
                                        onValueChange={([v]) => updateConfig(`${pathPrefix}.width`, v ?? 240)}
                                        min={160}
                                        max={400}
                                        step={20}
                                        className="flex-1"
                                      />
                                      <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{cfg.width}px</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Modules</Label>
                                    <Select
                                      key={cfg.modules.join(",")}
                                      value=""
                                      onValueChange={(v) => {
                                        if (v && SIDEBAR_MODULE_TYPES.includes(v as SidebarModuleType)) {
                                          addModule(v as SidebarModuleType);
                                        }
                                      }}
                                    >
                                      <SelectTrigger
                                        className="h-8 w-full justify-start text-xs focus:bg-[#5B4FE8]/10 focus:text-[#5B4FE8]"
                                        disabled={cfg.modules.length >= SIDEBAR_MODULE_TYPES.length}
                                      >
                                        <Plus className="h-3 w-3 shrink-0" />
                                        <SelectValue
                                          placeholder={
                                            cfg.modules.length >= SIDEBAR_MODULE_TYPES.length
                                              ? "All modules added"
                                              : "Add Module"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SIDEBAR_MODULE_TYPES.filter((m) => !cfg.modules.includes(m)).map((m) => (
                                          <SelectItem key={m} value={m}>
                                            {MODULE_LABELS[m]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="space-y-1.5">
                                      {cfg.modules.map((m, idx) => (
                                        <div
                                          key={`${m}-${idx}`}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, idx)}
                                          onDragOver={handleDragOver}
                                          onDrop={(e) => handleDrop(e, idx)}
                                          onDragEnd={(e) => { e.dataTransfer.clearData(); }}
                                          className="flex items-center gap-2 rounded-md border border-[#e5e4e0] bg-white px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical className="h-4 w-4 text-[#6b6b6b] shrink-0" />
                                          <span className="flex-1 min-w-0 truncate">{MODULE_LABELS[m]}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeModule(idx)}
                                            className="p-0.5 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                                            aria-label="Remove"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      };
                      return (
                        <>
                          <SidebarSection side="left" />
                          <SidebarSection side="right" />
                          <div className="border-b border-[#e5e4e0]">
                            <div className="flex items-center justify-between py-3">
                              <span className="font-medium">Header Content</span>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={config.headerContent.show}
                                  onCheckedChange={(v) => {
                                    updateConfig("headerContent.show", v);
                                    if (!v) {
                                      updateConfig("headerContent.tableOfContents", false);
                                      updateConfig("headerContent.breadcrumbs", false);
                                    } else {
                                      updateConfig("headerContent.tableOfContents", true);
                                    }
                                    setSectionExpanded((p) => ({ ...p, headerContent: v }));
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => config.headerContent.show && setSectionExpanded((p) => ({ ...p, headerContent: !p.headerContent }))}
                                  className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!config.headerContent.show ? "invisible pointer-events-none" : ""}`}
                                  aria-label={sectionExpanded.headerContent ? "Collapse" : "Expand"}
                                >
                                  {sectionExpanded.headerContent ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <Collapsible open={config.headerContent.show && sectionExpanded.headerContent}>
                              <CollapsibleContent>
                                <div className="pb-4 space-y-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={config.headerContent.tableOfContents}
                                      onCheckedChange={(v) => {
                                        updateConfig("headerContent.tableOfContents", Boolean(v));
                                        if (Boolean(v)) setSectionExpanded((p) => ({ ...p, headerContent: true }));
                                      }}
                                    />
                                    <span className="text-sm">Table of Contents</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={config.headerContent.breadcrumbs}
                                      onCheckedChange={(v) => {
                                        updateConfig("headerContent.breadcrumbs", Boolean(v));
                                        if (Boolean(v)) setSectionExpanded((p) => ({ ...p, headerContent: true }));
                                      }}
                                    />
                                    <span className="text-sm">Breadcrumbs</span>
                                  </label>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </>
                      );
                    })()}
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

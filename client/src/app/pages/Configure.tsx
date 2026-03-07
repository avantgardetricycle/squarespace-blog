import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

const LOADER_URL = "https://avantgardetricycle.github.io/squarespace-blog/loader.js";

export interface BlogAuthorOption {
  id: string;
  name: string;
}

export const SIDEBAR_COLLECTION_MODULES = ["filterByCategory", "filterByTag", "searchPosts", "postSort"] as const;
export type SidebarCollectionModuleType = (typeof SIDEBAR_COLLECTION_MODULES)[number];
export const SIDEBAR_POST_MODULES = ["tableOfContents"] as const;
export type SidebarPostModuleType = (typeof SIDEBAR_POST_MODULES)[number];

export const HEADER_COLLECTION_MODULES = ["filterByCategory", "filterByTag", "searchPosts", "postSort"] as const;
export type HeaderCollectionModuleType = (typeof HEADER_COLLECTION_MODULES)[number];
export const HEADER_POST_MODULES = ["breadcrumbs", "tableOfContents"] as const;
export type HeaderPostModuleType = (typeof HEADER_POST_MODULES)[number];

export const SOCIAL_PLATFORMS = ["facebook", "instagram", "x", "email", "reddit", "linkedin", "pinterest", "whatsapp"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type FeaturedImageLayoutMode = "fullBleed" | "leftJustified" | "rightJustified";
export type FeaturedImageAspectBehavior = "original" | "cropped";
export type FeaturedImageAspectRatio = "16:9" | "3:2" | "1:1";
export type FeaturedImageRoundedCorners = "off" | "small" | "large";
export type FeaturedImageVerticalSpacing = "tight" | "normal" | "spacious";

export interface FeaturedImageConfig {
  show: boolean;
  layoutMode: FeaturedImageLayoutMode;
  imageWidthPercent: number;
  aspectBehavior: FeaturedImageAspectBehavior;
  aspectRatio: FeaturedImageAspectRatio;
  roundedCorners: FeaturedImageRoundedCorners;
  shadow: boolean;
  showCaption: boolean;
  verticalSpacing: FeaturedImageVerticalSpacing;
}

export type ConfigLevel = "collection" | "post";

export interface BaseLevelConfig {
  showDate: boolean;
  showAuthor: boolean;
  showReadingTime: boolean;
  leftSidebar: { show: boolean; modules: string[]; width: number; spaceAbove: number; sticky: boolean };
  rightSidebar: { show: boolean; modules: string[]; width: number; spaceAbove: number; sticky: boolean };
  headerContent: { show: boolean; modules: string[]; height: number };
  socialMediaLinks: { show: boolean; platforms: SocialPlatform[] };
  featuredImage: FeaturedImageConfig;
}

export type PostSortOption = "date" | "az" | "popularity";

export type PostsPerPageOption = 5 | 10 | 20;

export interface CollectionLevelConfig extends BaseLevelConfig {
  postSort?: PostSortOption;
  pagination?: { show: boolean; postsPerPage: PostsPerPageOption };
}

export interface PostLevelConfig extends BaseLevelConfig {
  progressBar: { show: boolean; position: "top" | "bottom"; thickness: number; color: string };
}

export interface SiteConfigForm {
  defaultAuthorIds: string[];
  postAuthorOverrides: Record<string, string[]>;
  collectionConfig: CollectionLevelConfig;
  postConfig: PostLevelConfig;
}

const defaultFeaturedImage: FeaturedImageConfig = {
  show: true,
  layoutMode: "leftJustified",
  imageWidthPercent: 40,
  aspectBehavior: "original",
  aspectRatio: "16:9",
  roundedCorners: "off",
  shadow: false,
  showCaption: true,
  verticalSpacing: "normal",
};

const defaultCollectionConfig: CollectionLevelConfig = {
  showDate: true,
  showAuthor: false,
  showReadingTime: false,
  postSort: "date",
  pagination: { show: false, postsPerPage: 10 },
  leftSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
  rightSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
  headerContent: { show: false, modules: [], height: 48 },
  socialMediaLinks: { show: false, platforms: [] },
  featuredImage: defaultFeaturedImage,
};

const defaultPostConfig: PostLevelConfig = {
  ...defaultCollectionConfig,
  leftSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
  rightSidebar: { show: false, modules: [], width: 240, spaceAbove: 0, sticky: true },
  headerContent: { show: false, modules: [], height: 48 },
  progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
};

const defaultSiteConfig: SiteConfigForm = {
  defaultAuthorIds: [],
  postAuthorOverrides: {},
  collectionConfig: defaultCollectionConfig,
  postConfig: defaultPostConfig,
};

function parseLevelConfig(
  raw: Record<string, unknown> | null,
  level: "collection" | "post"
): CollectionLevelConfig | PostLevelConfig {
  const sm = raw?.socialMediaLinks && typeof raw.socialMediaLinks === "object" ? raw.socialMediaLinks as { show?: boolean; platforms?: unknown[] } : null;
  const validSocialPlatforms = (arr: unknown): SocialPlatform[] =>
    Array.isArray(arr) ? arr.filter((p): p is SocialPlatform => SOCIAL_PLATFORMS.includes(p as SocialPlatform)) : [];
  const socialMediaLinks = sm ? { show: Boolean(sm.show ?? false), platforms: validSocialPlatforms(sm.platforms) } : { show: false, platforms: [] };
  const fi = raw?.featuredImage && typeof raw.featuredImage === "object" ? raw.featuredImage as Record<string, unknown> : null;
  const featuredImage: FeaturedImageConfig = fi ? {
    show: Boolean(fi.show ?? true),
    layoutMode: (fi.layoutMode === "fullBleed" ? "fullBleed" : fi.layoutMode === "rightJustified" ? "rightJustified" : "leftJustified") as FeaturedImageLayoutMode,
    imageWidthPercent: Math.min(60, Math.max(25, Number(fi.imageWidthPercent) || 40)),
    aspectBehavior: fi.aspectBehavior === "cropped" ? "cropped" : "original",
    aspectRatio: (fi.aspectRatio === "3:2" ? "3:2" : fi.aspectRatio === "1:1" ? "1:1" : "16:9") as FeaturedImageAspectRatio,
    roundedCorners: (fi.roundedCorners === "small" ? "small" : fi.roundedCorners === "large" ? "large" : "off") as FeaturedImageRoundedCorners,
    shadow: Boolean(fi.shadow),
    showCaption: Boolean(fi.showCaption ?? true),
    verticalSpacing: (fi.verticalSpacing === "tight" ? "tight" : fi.verticalSpacing === "spacious" ? "spacious" : "normal") as FeaturedImageVerticalSpacing,
  } : defaultFeaturedImage;
  const ls = raw?.leftSidebar && typeof raw.leftSidebar === "object" ? raw.leftSidebar as { show?: boolean; modules?: unknown[]; width?: number; spaceAbove?: number; sticky?: boolean } : null;
  const rs = raw?.rightSidebar && typeof raw.rightSidebar === "object" ? raw.rightSidebar as { show?: boolean; modules?: unknown[]; width?: number; spaceAbove?: number; sticky?: boolean } : null;
  const hc = raw?.headerContent && typeof raw.headerContent === "object" ? raw.headerContent as { show?: boolean; modules?: unknown[]; height?: number } : null;
  const validSidebarCollection = (arr: unknown): SidebarCollectionModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarCollectionModuleType => SIDEBAR_COLLECTION_MODULES.includes(m as SidebarCollectionModuleType)) : [];
  const validSidebarPost = (arr: unknown): SidebarPostModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarPostModuleType => SIDEBAR_POST_MODULES.includes(m as SidebarPostModuleType)) : [];
  const validHeaderCollection = (arr: unknown): HeaderCollectionModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is HeaderCollectionModuleType => HEADER_COLLECTION_MODULES.includes(m as HeaderCollectionModuleType)) : [];
  const validHeaderPost = (arr: unknown): HeaderPostModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is HeaderPostModuleType => HEADER_POST_MODULES.includes(m as HeaderPostModuleType)) : [];
  const leftSidebar = ls
    ? { show: Boolean(ls.show ?? false), modules: level === "collection" ? validSidebarCollection(ls.modules) : validSidebarPost(ls.modules), width: Math.min(400, Math.max(160, Number(ls.width) || 240)), spaceAbove: Math.min(64, Math.max(0, Number(ls.spaceAbove) || 0)), sticky: ls.sticky !== false }
    : { show: false, modules: [] as SidebarCollectionModuleType[] & SidebarPostModuleType[], width: 240, spaceAbove: 0, sticky: true };
  const rightSidebar = rs
    ? { show: Boolean(rs.show ?? false), modules: level === "collection" ? validSidebarCollection(rs.modules) : validSidebarPost(rs.modules), width: Math.min(400, Math.max(160, Number(rs.width) || 240)), spaceAbove: Math.min(64, Math.max(0, Number(rs.spaceAbove) || 0)), sticky: rs.sticky !== false }
    : { show: false, modules: [] as SidebarCollectionModuleType[] & SidebarPostModuleType[], width: 240, spaceAbove: 0, sticky: true };
  const headerContent = hc
    ? { show: Boolean(hc.show ?? false), modules: level === "collection" ? validHeaderCollection(hc.modules) : validHeaderPost(hc.modules), height: Math.min(120, Math.max(32, Number(hc.height) || 48)) }
    : { show: false, modules: [] as HeaderCollectionModuleType[] & HeaderPostModuleType[], height: 48 };
  const postSort = (raw?.postSort === "az" || raw?.postSort === "popularity") ? raw.postSort as PostSortOption : "date";
  const pagRaw = raw?.pagination && typeof raw.pagination === "object" ? raw.pagination as { show?: boolean; postsPerPage?: number } : null;
  const validPostsPerPage = (v: unknown): PostsPerPageOption => (v === 5 || v === 10 || v === 20) ? v : 10;
  const pagination = pagRaw
    ? { show: Boolean(pagRaw.show ?? false), postsPerPage: validPostsPerPage(pagRaw.postsPerPage) }
    : { show: false, postsPerPage: 10 as PostsPerPageOption };
  const base: CollectionLevelConfig = {
    showDate: Boolean(raw?.showDate ?? true),
    showAuthor: Boolean(raw?.showAuthor ?? false),
    showReadingTime: Boolean(raw?.showReadingTime ?? false),
    postSort,
    pagination,
    leftSidebar: leftSidebar as { show: boolean; modules: SidebarCollectionModuleType[]; width: number; spaceAbove: number; sticky: boolean },
    rightSidebar: rightSidebar as { show: boolean; modules: SidebarCollectionModuleType[]; width: number; spaceAbove: number; sticky: boolean },
    headerContent: headerContent as { show: boolean; modules: HeaderCollectionModuleType[]; height: number },
    socialMediaLinks,
    featuredImage,
  };
  if (level === "post") {
    const pb = raw?.progressBar && typeof raw.progressBar === "object" ? raw.progressBar as { show?: boolean; position?: string; thickness?: number; color?: string } : null;
    return {
      ...base,
      leftSidebar: leftSidebar as { show: boolean; modules: SidebarPostModuleType[]; width: number; spaceAbove: number; sticky: boolean },
      rightSidebar: rightSidebar as { show: boolean; modules: SidebarPostModuleType[]; width: number; spaceAbove: number; sticky: boolean },
      headerContent: headerContent as { show: boolean; modules: HeaderPostModuleType[]; height: number },
      progressBar: pb ? {
        show: Boolean(pb.show ?? false),
        position: (pb.position === "bottom" ? "bottom" : "top") as "top" | "bottom",
        thickness: Math.min(12, Math.max(2, Number(pb.thickness) || 6)),
        color: (typeof pb.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(pb.color)) ? pb.color : "#5B4FE8",
      } : { show: false, position: "top" as const, thickness: 6, color: "#5B4FE8" },
    };
  }
  return base;
}

function configFromApi(data: Record<string, unknown>): SiteConfigForm {
  const defaultAuthorIds = Array.isArray(data.defaultAuthorIds) ? data.defaultAuthorIds as string[] : [];
  const postAuthorOverrides = (data.postAuthorOverrides && typeof data.postAuthorOverrides === "object")
    ? (data.postAuthorOverrides as Record<string, string[]>) : {};
  const cc = data.collectionConfig && typeof data.collectionConfig === "object" ? data.collectionConfig as Record<string, unknown> : null;
  const pc = data.postConfig && typeof data.postConfig === "object" ? data.postConfig as Record<string, unknown> : null;
  if (cc && pc) {
    return {
      defaultAuthorIds,
      postAuthorOverrides,
      collectionConfig: parseLevelConfig(cc, "collection"),
      postConfig: parseLevelConfig(pc, "post") as PostLevelConfig,
    };
  }
  const legacy: Record<string, unknown> = {
    showDate: data.showDate,
    showAuthor: data.showAuthor,
    showReadingTime: data.showReadingTime,
    leftSidebar: data.leftSidebar,
    rightSidebar: data.rightSidebar,
    headerContent: data.headerContent,
    socialMediaLinks: data.socialMediaLinks,
    featuredImage: data.featuredImage,
    progressBar: data.progressBar ?? { show: data.showProgressBar, position: data.progressBarPosition, thickness: data.progressBarThickness, color: data.progressBarColor },
  };
  const ls = data.leftSidebar as { modules?: string[] } | undefined;
  const hc = data.headerContent as { modules?: string[] } | undefined;
  const legacyModules = Array.isArray(ls?.modules) ? ls.modules : Array.isArray(hc?.modules) ? hc.modules : [];
  const hasToc = legacyModules.includes("tableOfContents") || Boolean(data.showTableOfContents);
  const hasBreadcrumbs = legacyModules.includes("breadcrumbs");
  const lsObj = legacy.leftSidebar && typeof legacy.leftSidebar === "object" ? legacy.leftSidebar as Record<string, unknown> : {};
  const rsObj = legacy.rightSidebar && typeof legacy.rightSidebar === "object" ? legacy.rightSidebar as Record<string, unknown> : {};
  const hcObj = legacy.headerContent && typeof legacy.headerContent === "object" ? legacy.headerContent as Record<string, unknown> : {};
  const migratedPost = { ...legacy, leftSidebar: { ...lsObj, modules: hasToc ? ["tableOfContents"] : [] }, rightSidebar: { ...rsObj, modules: hasToc ? ["tableOfContents"] : [] }, headerContent: { ...hcObj, modules: [...(hasBreadcrumbs ? ["breadcrumbs"] : []), ...(hasToc ? ["tableOfContents"] : [])] } };
  return {
    defaultAuthorIds,
    postAuthorOverrides,
    collectionConfig: parseLevelConfig(legacy, "collection"),
    postConfig: parseLevelConfig(migratedPost, "post") as PostLevelConfig,
  };
}

function configToApiPayload(config: SiteConfigForm): Record<string, unknown> {
  return {
    defaultAuthorIds: config.defaultAuthorIds,
    postAuthorOverrides: config.postAuthorOverrides,
    collectionConfig: config.collectionConfig,
    postConfig: config.postConfig,
  };
}

function configToRendererConfig(config: SiteConfigForm): Record<string, unknown> {
  return {
    defaultAuthorIds: config.defaultAuthorIds,
    postAuthorOverrides: config.postAuthorOverrides,
    collectionConfig: config.collectionConfig,
    postConfig: config.postConfig,
    recentPostsCount: 5,
  };
}

function levelConfigsEqual(a: BaseLevelConfig, b: BaseLevelConfig): boolean {
  const lsEqual = a.leftSidebar.show === b.leftSidebar.show &&
    a.leftSidebar.width === b.leftSidebar.width &&
    a.leftSidebar.spaceAbove === b.leftSidebar.spaceAbove &&
    a.leftSidebar.sticky === b.leftSidebar.sticky &&
    a.leftSidebar.modules.length === b.leftSidebar.modules.length &&
    a.leftSidebar.modules.every((m, i) => m === b.leftSidebar.modules[i]);
  const rsEqual = a.rightSidebar.show === b.rightSidebar.show &&
    a.rightSidebar.width === b.rightSidebar.width &&
    a.rightSidebar.spaceAbove === b.rightSidebar.spaceAbove &&
    a.rightSidebar.sticky === b.rightSidebar.sticky &&
    a.rightSidebar.modules.length === b.rightSidebar.modules.length &&
    a.rightSidebar.modules.every((m, i) => m === b.rightSidebar.modules[i]);
  const hcEqual = a.headerContent.show === b.headerContent.show &&
    a.headerContent.height === b.headerContent.height &&
    a.headerContent.modules.length === b.headerContent.modules.length &&
    a.headerContent.modules.every((m, i) => m === b.headerContent.modules[i]);
  const smEqual = a.socialMediaLinks.show === b.socialMediaLinks.show &&
    a.socialMediaLinks.platforms.length === b.socialMediaLinks.platforms.length &&
    a.socialMediaLinks.platforms.every((p, i) => p === b.socialMediaLinks.platforms[i]);
  const fiEqual = a.featuredImage.show === b.featuredImage.show &&
    a.featuredImage.layoutMode === b.featuredImage.layoutMode &&
    a.featuredImage.imageWidthPercent === b.featuredImage.imageWidthPercent &&
    a.featuredImage.aspectBehavior === b.featuredImage.aspectBehavior &&
    a.featuredImage.aspectRatio === b.featuredImage.aspectRatio &&
    a.featuredImage.roundedCorners === b.featuredImage.roundedCorners &&
    a.featuredImage.shadow === b.featuredImage.shadow &&
    a.featuredImage.showCaption === b.featuredImage.showCaption &&
    a.featuredImage.verticalSpacing === b.featuredImage.verticalSpacing;
  const postSortEqual = (a as CollectionLevelConfig).postSort === (b as CollectionLevelConfig).postSort;
  const pagEqual = (a as CollectionLevelConfig).pagination?.show === (b as CollectionLevelConfig).pagination?.show &&
    (a as CollectionLevelConfig).pagination?.postsPerPage === (b as CollectionLevelConfig).pagination?.postsPerPage;
  const base = a.showDate === b.showDate && a.showAuthor === b.showAuthor && a.showReadingTime === b.showReadingTime &&
    postSortEqual && pagEqual && lsEqual && rsEqual && hcEqual && smEqual && fiEqual;
  if ("progressBar" in a && "progressBar" in b) {
    const pa = (a as PostLevelConfig).progressBar;
    const pb = (b as PostLevelConfig).progressBar;
    return base && pa.show === pb.show && pa.position === pb.position && pa.thickness === pb.thickness && pa.color === pb.color;
  }
  return base;
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
  return defaultIdsEqual && overridesEqual &&
    levelConfigsEqual(a.collectionConfig, b.collectionConfig) &&
    levelConfigsEqual(a.postConfig, b.postConfig);
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
  const [selectedLevel, setSelectedLevel] = useState<ConfigLevel>("collection");
  const [sectionExpanded, setSectionExpanded] = useState({
    showAuthor: false,
    progressBar: false,
    pagination: false,
    featuredImage: false,
    leftSidebar: false,
    rightSidebar: false,
    headerContent: false,
    socialMediaLinks: false,
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
                body: JSON.stringify({ siteKey: effectiveSiteKey, name, ingestedFrom: "SQUARESPACE", isDefault: true }),
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
  const effectiveConfig = selectedLevel === "collection" ? config.collectionConfig : config.postConfig;
  const pathPrefix = selectedLevel === "collection" ? "collectionConfig" : "postConfig";
  const updateLevelConfigPath = (subPath: string, value: unknown) => updateConfig(`${pathPrefix}.${subPath}`, value);
  const rendererConfig = useMemo(() => {
    const base = configToRendererConfig(config);
    const authorMap: Record<string, string> = {};
    for (const a of authors) authorMap[a.id] = a.name;
    return {
      ...base,
      authorMap,
      baseUrl: typeof window !== "undefined" ? window.location.origin : "",
      siteKey: effectiveSiteKey ?? undefined,
      siteId: effectiveSite?.id ?? undefined,
      configUpdateCallback: (path: string, value: unknown) => updateConfigRef.current(path, value),
    };
  }, [config, authors, effectiveSiteKey, effectiveSite]);

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

  const updateConfigRef = useRef<(path: string, value: unknown) => void>(() => {});
  const updateConfig = (path: string, value: unknown) => {
    setConfig((prev) => {
      const next = { ...prev };
      if (path === "defaultAuthorIds") next.defaultAuthorIds = value as string[];
      else if (path === "postAuthorOverrides") next.postAuthorOverrides = value as Record<string, string[]>;
      else if (path.startsWith("postAuthorOverrides.")) {
        const postId = path.slice("postAuthorOverrides.".length);
        next.postAuthorOverrides = { ...prev.postAuthorOverrides, [postId]: value as string[] };
      } else if (path.startsWith("collectionConfig.")) {
        const sub = path.slice("collectionConfig.".length);
        next.collectionConfig = updateLevelConfig(prev.collectionConfig, sub, value);
      } else if (path.startsWith("postConfig.")) {
        const sub = path.slice("postConfig.".length);
        next.postConfig = updateLevelConfig(prev.postConfig, sub, value) as PostLevelConfig;
      }
      return next;
    });
  };
  updateConfigRef.current = updateConfig;

  function updateLevelConfig(cfg: CollectionLevelConfig | PostLevelConfig, path: string, value: unknown): CollectionLevelConfig | PostLevelConfig {
    if (path === "showDate") return { ...cfg, showDate: value as boolean };
    if (path === "showAuthor") return { ...cfg, showAuthor: value as boolean };
    if (path === "showReadingTime") return { ...cfg, showReadingTime: value as boolean };
    if (path === "leftSidebar.show") return { ...cfg, leftSidebar: { ...cfg.leftSidebar, show: value as boolean } };
    if (path === "leftSidebar.modules") return { ...cfg, leftSidebar: { ...cfg.leftSidebar, modules: value as string[] } };
    if (path === "leftSidebar.width") return { ...cfg, leftSidebar: { ...cfg.leftSidebar, width: value as number } };
    if (path === "leftSidebar.spaceAbove") return { ...cfg, leftSidebar: { ...cfg.leftSidebar, spaceAbove: value as number } };
    if (path === "leftSidebar.sticky") return { ...cfg, leftSidebar: { ...cfg.leftSidebar, sticky: value as boolean } };
    if (path === "rightSidebar.show") return { ...cfg, rightSidebar: { ...cfg.rightSidebar, show: value as boolean } };
    if (path === "rightSidebar.modules") return { ...cfg, rightSidebar: { ...cfg.rightSidebar, modules: value as string[] } };
    if (path === "rightSidebar.width") return { ...cfg, rightSidebar: { ...cfg.rightSidebar, width: value as number } };
    if (path === "rightSidebar.spaceAbove") return { ...cfg, rightSidebar: { ...cfg.rightSidebar, spaceAbove: value as number } };
    if (path === "rightSidebar.sticky") return { ...cfg, rightSidebar: { ...cfg.rightSidebar, sticky: value as boolean } };
    if (path === "headerContent.show") return { ...cfg, headerContent: { ...cfg.headerContent, show: value as boolean } };
    if (path === "headerContent.modules") return { ...cfg, headerContent: { ...cfg.headerContent, modules: value as string[] } };
    if (path === "headerContent.height") return { ...cfg, headerContent: { ...cfg.headerContent, height: value as number } };
    if (path === "postSort" && "postSort" in cfg) return { ...cfg, postSort: value as PostSortOption };
    if (path === "pagination.show") return { ...cfg, pagination: { ...((cfg as CollectionLevelConfig).pagination ?? { show: false, postsPerPage: 10 }), show: value as boolean } };
    if (path === "pagination.postsPerPage") return { ...cfg, pagination: { ...((cfg as CollectionLevelConfig).pagination ?? { show: false, postsPerPage: 10 }), postsPerPage: value as PostsPerPageOption } };
    if (path === "socialMediaLinks") return { ...cfg, socialMediaLinks: value as { show: boolean; platforms: SocialPlatform[] } };
    if (path === "socialMediaLinks.show") return { ...cfg, socialMediaLinks: { ...cfg.socialMediaLinks, show: value as boolean } };
    if (path === "socialMediaLinks.platforms") return { ...cfg, socialMediaLinks: { ...cfg.socialMediaLinks, platforms: value as SocialPlatform[] } };
    if (path === "featuredImage.show") return { ...cfg, featuredImage: { ...cfg.featuredImage, show: value as boolean } };
    if (path === "featuredImage.layoutMode") return { ...cfg, featuredImage: { ...cfg.featuredImage, layoutMode: value as FeaturedImageLayoutMode } };
    if (path === "featuredImage.imageWidthPercent") return { ...cfg, featuredImage: { ...cfg.featuredImage, imageWidthPercent: value as number } };
    if (path === "featuredImage.aspectBehavior") return { ...cfg, featuredImage: { ...cfg.featuredImage, aspectBehavior: value as FeaturedImageAspectBehavior } };
    if (path === "featuredImage.aspectRatio") return { ...cfg, featuredImage: { ...cfg.featuredImage, aspectRatio: value as FeaturedImageAspectRatio } };
    if (path === "featuredImage.roundedCorners") return { ...cfg, featuredImage: { ...cfg.featuredImage, roundedCorners: value as FeaturedImageRoundedCorners } };
    if (path === "featuredImage.shadow") return { ...cfg, featuredImage: { ...cfg.featuredImage, shadow: value as boolean } };
    if (path === "featuredImage.showCaption") return { ...cfg, featuredImage: { ...cfg.featuredImage, showCaption: value as boolean } };
    if (path === "featuredImage.verticalSpacing") return { ...cfg, featuredImage: { ...cfg.featuredImage, verticalSpacing: value as FeaturedImageVerticalSpacing } };
    if (path === "progressBar.show" && "progressBar" in cfg) return { ...cfg, progressBar: { ...(cfg as PostLevelConfig).progressBar, show: value as boolean } };
    if (path === "progressBar.position" && "progressBar" in cfg) return { ...cfg, progressBar: { ...(cfg as PostLevelConfig).progressBar, position: value as "top" | "bottom" } };
    if (path === "progressBar.thickness" && "progressBar" in cfg) return { ...cfg, progressBar: { ...(cfg as PostLevelConfig).progressBar, thickness: value as number } };
    if (path === "progressBar.color" && "progressBar" in cfg) return { ...cfg, progressBar: { ...(cfg as PostLevelConfig).progressBar, color: value as string } };
    return cfg;
  }

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
      if (e.data?.type === "BETTERBLOG_CONFIG_UPDATE" && typeof e.data.path === "string" && e.data.value !== undefined) {
        updateConfigRef.current(e.data.path, e.data.value);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // When switching to Post config level with no post selected, switch preview to single-post view
  // (BlogPreviewRenderer uses window hash; BlogPreviewIframe uses selectPostIndex prop)
  useEffect(() => {
    if (selectedLevel !== "post" || selectedPostIndex >= 0 || blogItems.length === 0 || !effectiveSite) return;
    const previewUrl = buildBlogPreviewUrl(effectiveSite);
    if (previewUrl && isSquarespaceUrl(previewUrl)) {
      window.location.hash = "#post-0";
    }
  }, [selectedLevel, selectedPostIndex, blogItems.length, effectiveSite]);

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
            {me.sites.length === 1 ? (
              <p className="text-sm font-medium text-[#0a0a0a] py-2">
                {effectiveSite?.name || "Unnamed blog"}
              </p>
            ) : (
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
            )}
            <div className="flex gap-1 p-1 rounded-lg bg-[#e5e4e0]/50">
              <button
                type="button"
                onClick={() => setSelectedLevel("collection")}
                className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors ${
                  selectedLevel === "collection" ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#6b6b6b] hover:text-[#0a0a0a]"
                }`}
              >
                Collection
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel("post")}
                className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors ${
                  selectedLevel === "post" ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#6b6b6b] hover:text-[#0a0a0a]"
                }`}
              >
                Post
              </button>
            </div>
          </div>
          {effectiveSiteKey && (
            <Dialog open={installationModalOpen} onOpenChange={setInstallationModalOpen}>
              <p className="text-xs text-[#6b6b6b]">
                Not seeing your changes? Make sure you've{" "}
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-[#5B4FE8] hover:underline text-xs font-normal cursor-pointer"
                  >
                    installed BetterBlog
                  </button>
                </DialogTrigger>
                .
              </p>
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
                    const apiBase = typeof window !== "undefined" ? window.location.origin : "";
                    const snippet = `<script
  src="${LOADER_URL}"
  data-site-key="${effectiveSiteKey}"
  data-api-base="${apiBase}"
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
                    {/* Reader Experience */}
                    <div className="pt-2 pb-1 text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#9a1a3e] border-b border-[rgba(154,26,62,0.2)]">
                      Reader Experience
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e4e0]">
                      <span className="font-medium">Show Date</span>
                      <div className="flex items-center gap-1">
                        <Switch
                          id="show-date"
                          checked={effectiveConfig.showDate}
                          onCheckedChange={(v) => updateLevelConfigPath("showDate", v)}
                        />
                        <span className="w-6 h-6 shrink-0" aria-hidden />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#e5e4e0]">
                      <span className="font-medium">Show Reading Time</span>
                      <div className="flex items-center gap-1">
                        <Switch
                          id="show-reading-time"
                          checked={effectiveConfig.showReadingTime}
                          onCheckedChange={(v) => updateLevelConfigPath("showReadingTime", v)}
                        />
                        <span className="w-6 h-6 shrink-0" aria-hidden />
                      </div>
                    </div>

                    {selectedLevel === "collection" && (
                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Pagination</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={(effectiveConfig as CollectionLevelConfig).pagination?.show ?? false}
                            onCheckedChange={(v) => {
                              updateLevelConfigPath("pagination.show", v);
                              setSectionExpanded((p) => ({ ...p, pagination: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => (effectiveConfig as CollectionLevelConfig).pagination?.show && setSectionExpanded((p) => ({ ...p, pagination: !p.pagination }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!(effectiveConfig as CollectionLevelConfig).pagination?.show ? "invisible pointer-events-none" : ""}`}
                            aria-label={sectionExpanded.pagination ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.pagination ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={(effectiveConfig as CollectionLevelConfig).pagination?.show && sectionExpanded.pagination}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Posts per page</Label>
                            <Select
                              value={String((effectiveConfig as CollectionLevelConfig).pagination?.postsPerPage ?? 10)}
                              onValueChange={(v) => updateLevelConfigPath("pagination.postsPerPage", parseInt(v, 10) as PostsPerPageOption)}
                            >
                              <SelectTrigger className="mt-2 w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    )}

                    {selectedLevel === "post" && (
                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Progress Bar</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={(effectiveConfig as PostLevelConfig).progressBar.show}
                            onCheckedChange={(v) => {
                              updateLevelConfigPath("progressBar.show", v);
                              setSectionExpanded((p) => ({ ...p, progressBar: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => (effectiveConfig as PostLevelConfig).progressBar.show && setSectionExpanded((p) => ({ ...p, progressBar: !p.progressBar }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!(effectiveConfig as PostLevelConfig).progressBar.show ? "invisible pointer-events-none" : ""}`}
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
                      <Collapsible open={(effectiveConfig as PostLevelConfig).progressBar.show && sectionExpanded.progressBar}>
                        <CollapsibleContent>
                        <div className="pb-4 space-y-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Position</Label>
                            <Select
                              value={(effectiveConfig as PostLevelConfig).progressBar.position}
                              onValueChange={(v) => updateLevelConfigPath("progressBar.position", v)}
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
                                value={[(effectiveConfig as PostLevelConfig).progressBar.thickness]}
                                onValueChange={([v]) => updateLevelConfigPath("progressBar.thickness", v ?? 6)}
                                min={2}
                                max={12}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-xs text-[#6b6b6b] w-8 shrink-0">
                                {(effectiveConfig as PostLevelConfig).progressBar.thickness}px
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-[#6b6b6b]">Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={(effectiveConfig as PostLevelConfig).progressBar.color}
                                onChange={(e) => updateLevelConfigPath("progressBar.color", e.target.value)}
                                className="h-9 w-14 cursor-pointer rounded border border-[#e5e4e0] bg-white p-0"
                              />
                              <Input
                                value={(effectiveConfig as PostLevelConfig).progressBar.color}
                                onChange={(e) => updateLevelConfigPath("progressBar.color", e.target.value)}
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
                    )}

                    {/* Publishing & Management */}
                    <div className="pt-4 pb-1 text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#7a4a1a] border-b border-[rgba(122,74,26,0.2)]">
                      Publishing & Management
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
                              checked={effectiveConfig.showAuthor}
                              onCheckedChange={(v) => {
                                updateLevelConfigPath("showAuthor", v);
                                setSectionExpanded((p) => ({ ...p, showAuthor: v }));
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => effectiveConfig.showAuthor && setSectionExpanded((p) => ({ ...p, showAuthor: !p.showAuthor }))}
                              className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!effectiveConfig.showAuthor ? "invisible pointer-events-none" : ""}`}
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
                        <Collapsible open={effectiveConfig.showAuthor && sectionExpanded.showAuthor}>
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

                    {/* Layout & Design */}
                    <div className="pt-4 pb-1 text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#5B4FE8] border-b border-[rgba(91,79,232,0.2)]">
                      Layout & Design
                    </div>
                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Featured Image</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={effectiveConfig.featuredImage.show}
                            onCheckedChange={(v) => {
                              updateLevelConfigPath("featuredImage.show", v);
                              setSectionExpanded((p) => ({ ...p, featuredImage: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => effectiveConfig.featuredImage.show && setSectionExpanded((p) => ({ ...p, featuredImage: !p.featuredImage }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!effectiveConfig.featuredImage.show ? "invisible pointer-events-none" : ""}`}
                            aria-label={sectionExpanded.featuredImage ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.featuredImage ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={effectiveConfig.featuredImage.show && sectionExpanded.featuredImage}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Layout mode</Label>
                              <Select
                                value={effectiveConfig.featuredImage.layoutMode}
                                onValueChange={(v) => updateLevelConfigPath("featuredImage.layoutMode", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fullBleed">Full Bleed</SelectItem>
                                  <SelectItem value="leftJustified">Left Justified</SelectItem>
                                  <SelectItem value="rightJustified">Right Justified</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(effectiveConfig.featuredImage.layoutMode === "leftJustified" || effectiveConfig.featuredImage.layoutMode === "rightJustified") && (
                              <div className="space-y-2">
                                <Label className="text-xs text-[#6b6b6b]">Image width</Label>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    value={[effectiveConfig.featuredImage.imageWidthPercent]}
                                    onValueChange={([v]) => updateLevelConfigPath("featuredImage.imageWidthPercent", v ?? 40)}
                                    min={25}
                                    max={60}
                                    step={5}
                                    className="flex-1"
                                  />
                                  <span className="text-xs text-[#6b6b6b] w-10 shrink-0">
                                    {effectiveConfig.featuredImage.imageWidthPercent}%
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Aspect behavior</Label>
                              <Select
                                value={effectiveConfig.featuredImage.aspectBehavior}
                                onValueChange={(v) => updateLevelConfigPath("featuredImage.aspectBehavior", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="original">Original ratio</SelectItem>
                                  <SelectItem value="cropped">Cropped</SelectItem>
                                </SelectContent>
                              </Select>
                              {effectiveConfig.featuredImage.aspectBehavior === "cropped" && (
                                <Select
                                  value={effectiveConfig.featuredImage.aspectRatio}
                                  onValueChange={(v) => updateLevelConfigPath("featuredImage.aspectRatio", v)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="16:9">16:9</SelectItem>
                                    <SelectItem value="3:2">3:2</SelectItem>
                                    <SelectItem value="1:1">1:1</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Rounded corners</Label>
                              <Select
                                value={effectiveConfig.featuredImage.roundedCorners}
                                onValueChange={(v) => updateLevelConfigPath("featuredImage.roundedCorners", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="off">Off</SelectItem>
                                  <SelectItem value="small">Small</SelectItem>
                                  <SelectItem value="large">Large</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-[#6b6b6b]">Shadow</Label>
                              <Switch
                                checked={effectiveConfig.featuredImage.shadow}
                                onCheckedChange={(v) => updateLevelConfigPath("featuredImage.shadow", v)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-[#6b6b6b]">Caption (if exists)</Label>
                              <Switch
                                checked={effectiveConfig.featuredImage.showCaption}
                                onCheckedChange={(v) => updateLevelConfigPath("featuredImage.showCaption", v)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Vertical spacing</Label>
                              <Select
                                value={effectiveConfig.featuredImage.verticalSpacing}
                                onValueChange={(v) => updateLevelConfigPath("featuredImage.verticalSpacing", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tight">Tight</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="spacious">Spacious</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {(() => {
                      const SIDEBAR_MODULE_LABELS: Record<string, string> = {
                        filterByCategory: "Filter by Category",
                        filterByTag: "Filter by Tag",
                        searchPosts: "Search Posts",
                        postSort: "Sort Posts",
                        tableOfContents: "Table of Contents",
                      };
                      const SIDEBAR_MODULES = selectedLevel === "collection" ? SIDEBAR_COLLECTION_MODULES : SIDEBAR_POST_MODULES;
                      const SidebarSection = ({ side }: { side: "left" | "right" }) => {
                        const cfg = side === "left" ? effectiveConfig.leftSidebar : effectiveConfig.rightSidebar;
                        const expanded = side === "left" ? sectionExpanded.leftSidebar : sectionExpanded.rightSidebar;
                        const setExpanded = (v: boolean) => setSectionExpanded((p) => ({ ...p, [side === "left" ? "leftSidebar" : "rightSidebar"]: v }));
                        const subPath = side === "left" ? "leftSidebar" : "rightSidebar";
                        const moveModule = (fromIdx: number, toIdx: number) => {
                          const arr = [...cfg.modules];
                          const [removed] = arr.splice(fromIdx, 1);
                          arr.splice(toIdx, 0, removed);
                          updateLevelConfigPath(`${subPath}.modules`, arr);
                        };
                        const addModule = (m: string) => {
                          if (!cfg.modules.includes(m)) updateLevelConfigPath(`${subPath}.modules`, [...cfg.modules, m]);
                        };
                        const removeModule = (idx: number) => {
                          updateLevelConfigPath(`${subPath}.modules`, cfg.modules.filter((_, i) => i !== idx));
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
                                    updateLevelConfigPath(`${subPath}.show`, v);
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
                                        onValueChange={([v]) => updateLevelConfigPath(`${subPath}.width`, v ?? 240)}
                                        min={160}
                                        max={400}
                                        step={20}
                                        className="flex-1"
                                      />
                                      <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{cfg.width}px</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Space above</Label>
                                    <div className="flex items-center gap-3">
                                      <Slider
                                        value={[cfg.spaceAbove ?? 0]}
                                        onValueChange={([v]) => updateLevelConfigPath(`${subPath}.spaceAbove`, v ?? 0)}
                                        min={0}
                                        max={64}
                                        step={4}
                                        className="flex-1"
                                      />
                                      <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{cfg.spaceAbove ?? 0}px</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-[#6b6b6b]">Sticky (move with scroll)</Label>
                                    <Switch
                                      checked={cfg.sticky !== false}
                                      onCheckedChange={(v) => updateLevelConfigPath(`${subPath}.sticky`, v)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Modules</Label>
                                    <Select
                                      key={cfg.modules.join(",")}
                                      value=""
                                      onValueChange={(v) => {
                                        if (v && SIDEBAR_MODULES.includes(v as never)) {
                                          addModule(v);
                                        }
                                      }}
                                    >
                                      <SelectTrigger
                                        className="h-8 w-full justify-start text-xs focus:bg-[#5B4FE8]/10 focus:text-[#5B4FE8]"
                                        disabled={cfg.modules.length >= SIDEBAR_MODULES.length}
                                      >
                                        <Plus className="h-3 w-3 shrink-0" />
                                        <SelectValue
                                          placeholder={
                                            cfg.modules.length >= SIDEBAR_MODULES.length
                                              ? "All modules added"
                                              : "Add Module"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SIDEBAR_MODULES.filter((m) => !cfg.modules.includes(m)).map((m) => (
                                          <SelectItem key={m} value={m}>
                                            {SIDEBAR_MODULE_LABELS[m]}
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
                                          <span className="flex-1 min-w-0 truncate">{SIDEBAR_MODULE_LABELS[m]}</span>
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
                          {/* Navigation & Discovery */}
                          <div className="pt-4 pb-1 text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#1a7a5e] border-b border-[rgba(26,122,94,0.2)]">
                            Navigation & Discovery
                          </div>
                          <div className="border-b border-[#e5e4e0]">
                            <div className="flex items-center justify-between py-3">
                              <span className="font-medium">Header Content</span>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={effectiveConfig.headerContent.show}
                                  onCheckedChange={(v) => {
                                    updateLevelConfigPath("headerContent.show", v);
                                    setSectionExpanded((p) => ({ ...p, headerContent: v }));
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => effectiveConfig.headerContent.show && setSectionExpanded((p) => ({ ...p, headerContent: !p.headerContent }))}
                                  className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!effectiveConfig.headerContent.show ? "invisible pointer-events-none" : ""}`}
                                  aria-label={sectionExpanded.headerContent ? "Collapse" : "Expand"}
                                >
                                  {sectionExpanded.headerContent ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <Collapsible open={effectiveConfig.headerContent.show && sectionExpanded.headerContent}>
                              <CollapsibleContent>
                                <div className="pb-4 space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Height</Label>
                                    <div className="flex items-center gap-3">
                                      <Slider
                                        value={[effectiveConfig.headerContent.height]}
                                        onValueChange={([v]) => updateLevelConfigPath("headerContent.height", v ?? 48)}
                                        min={32}
                                        max={120}
                                        step={8}
                                        className="flex-1"
                                      />
                                      <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{effectiveConfig.headerContent.height}px</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Modules</Label>
                                    <Select
                                      key={effectiveConfig.headerContent.modules.join(",")}
                                      value=""
                                      onValueChange={(v) => {
                                        if (v && (selectedLevel === "collection" ? HEADER_COLLECTION_MODULES : HEADER_POST_MODULES).includes(v as never)) {
                                          const addModule = (m: string) => {
                                            if (!effectiveConfig.headerContent.modules.includes(m)) {
                                              updateLevelConfigPath("headerContent.modules", [...effectiveConfig.headerContent.modules, m]);
                                            }
                                          };
                                          addModule(v);
                                        }
                                      }}
                                    >
                                      <SelectTrigger
                                        className="h-8 w-full justify-start text-xs focus:bg-[#5B4FE8]/10 focus:text-[#5B4FE8]"
                                        disabled={effectiveConfig.headerContent.modules.length >= (selectedLevel === "collection" ? HEADER_COLLECTION_MODULES : HEADER_POST_MODULES).length}
                                      >
                                        <Plus className="h-3 w-3 shrink-0" />
                                        <SelectValue
                                          placeholder={
                                            effectiveConfig.headerContent.modules.length >= (selectedLevel === "collection" ? HEADER_COLLECTION_MODULES : HEADER_POST_MODULES).length
                                              ? "All modules added"
                                              : "Add Module"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(selectedLevel === "collection" ? HEADER_COLLECTION_MODULES : HEADER_POST_MODULES).filter((m) => !effectiveConfig.headerContent.modules.includes(m)).map((m) => (
                                          <SelectItem key={m} value={m}>
                                            {m === "tableOfContents" ? "Table of Contents" : m === "breadcrumbs" ? "Breadcrumbs" : m === "filterByCategory" ? "Filter by Category" : m === "filterByTag" ? "Filter by Tag" : m === "searchPosts" ? "Search Posts" : m === "postSort" ? "Sort Posts" : m}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="space-y-1.5">
                                      {effectiveConfig.headerContent.modules.map((m, idx) => {
                                        const moveModule = (fromIdx: number, toIdx: number) => {
                                          const arr = [...effectiveConfig.headerContent.modules];
                                          const [removed] = arr.splice(fromIdx, 1);
                                          arr.splice(toIdx, 0, removed);
                                          updateLevelConfigPath("headerContent.modules", arr);
                                        };
                                        const removeModule = (i: number) => {
                                          updateLevelConfigPath("headerContent.modules", effectiveConfig.headerContent.modules.filter((_, j) => j !== i));
                                        };
                                        const label = m === "tableOfContents" ? "Table of Contents" : m === "breadcrumbs" ? "Breadcrumbs" : m === "searchPosts" ? "Search Posts" : m === "filterByCategory" ? "Filter by Category" : m === "filterByTag" ? "Filter by Tag" : m === "postSort" ? "Sort Posts" : "Filter by Tags & Categories";
                                        return (
                                          <div
                                            key={`${m}-${idx}`}
                                            draggable
                                            onDragStart={(e) => {
                                              e.dataTransfer.setData("text/plain", String(idx));
                                              e.dataTransfer.effectAllowed = "move";
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              e.dataTransfer.dropEffect = "move";
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              const fromIdx = Number(e.dataTransfer.getData("text/plain"));
                                              if (fromIdx !== idx && fromIdx >= 0) moveModule(fromIdx, idx);
                                            }}
                                            onDragEnd={(e) => { e.dataTransfer.clearData(); }}
                                            className="flex items-center gap-2 rounded-md border border-[#e5e4e0] bg-white px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing"
                                          >
                                            <GripVertical className="h-4 w-4 text-[#6b6b6b] shrink-0" />
                                            <span className="flex-1 min-w-0 truncate">{label}</span>
                                            <button
                                              type="button"
                                              onClick={() => removeModule(idx)}
                                              className="p-0.5 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                                              aria-label="Remove"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                          <div className="border-b border-[#e5e4e0]">
                            <div className="flex items-center justify-between py-3">
                              <span className="font-medium">Social Media Links</span>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={effectiveConfig.socialMediaLinks.show}
                                  onCheckedChange={(v) => {
                                    updateLevelConfigPath("socialMediaLinks", {
                                      show: v,
                                      platforms: v ? [...SOCIAL_PLATFORMS] : effectiveConfig.socialMediaLinks.platforms,
                                    });
                                    setSectionExpanded((p) => ({ ...p, socialMediaLinks: v }));
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => effectiveConfig.socialMediaLinks.show && setSectionExpanded((p) => ({ ...p, socialMediaLinks: !p.socialMediaLinks }))}
                                  className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!effectiveConfig.socialMediaLinks.show ? "invisible pointer-events-none" : ""}`}
                                  aria-label={sectionExpanded.socialMediaLinks ? "Collapse" : "Expand"}
                                >
                                  {sectionExpanded.socialMediaLinks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <Collapsible open={effectiveConfig.socialMediaLinks.show && sectionExpanded.socialMediaLinks}>
                              <CollapsibleContent>
                                <div className="pb-4 space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Platforms</Label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox
                                        checked={effectiveConfig.socialMediaLinks.platforms.length === SOCIAL_PLATFORMS.length}
                                        onCheckedChange={(v) => {
                                          updateLevelConfigPath("socialMediaLinks.platforms", v ? [...SOCIAL_PLATFORMS] : []);
                                        }}
                                      />
                                      <span className="text-sm">All</span>
                                    </label>
                                    {SOCIAL_PLATFORMS.map((p) => (
                                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={effectiveConfig.socialMediaLinks.platforms.includes(p)}
                                          onCheckedChange={(v) => {
                                            const next = v
                                              ? [...effectiveConfig.socialMediaLinks.platforms, p]
                                              : effectiveConfig.socialMediaLinks.platforms.filter((x) => x !== p);
                                            updateLevelConfigPath("socialMediaLinks.platforms", next);
                                          }}
                                        />
                                        <span className="text-sm">
                                          {p === "x" ? "X" : p === "whatsapp" ? "WhatsApp" : p.charAt(0).toUpperCase() + p.slice(1)}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
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
                        body: JSON.stringify({ siteKey: effectiveSiteKey, name, ingestedFrom: "BETTER_BLOG", isDefault: addAuthorContext === "default" ? true : addAuthorAsDefault }),
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
                      body: JSON.stringify({ siteKey: effectiveSiteKey, name, ingestedFrom: "BETTER_BLOG", isDefault: addAuthorContext === "default" ? true : addAuthorAsDefault }),
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
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={addAuthorContext === "default" ? true : addAuthorAsDefault}
                  onCheckedChange={(v) => setAddAuthorAsDefault(Boolean(v))}
                  disabled={addAuthorContext === "default"}
                />
                <span className="text-sm">
                  {addAuthorContext === "default" ? "Default author (added to site defaults)" : "Also add as default author"}
                </span>
              </label>
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
                    selectPostIndex={
                      selectedLevel === "post" && selectedPostIndex === -1 && blogItems.length > 0
                        ? 0
                        : undefined
                    }
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

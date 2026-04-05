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
  Pencil,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";
import BlogPreviewIframe, {
  buildBlogPreviewUrl,
  isSquarespaceUrl,
} from "@/app/components/BlogPreviewIframe";
import BlogPreviewRenderer from "@/app/components/BlogPreviewRenderer";
import { AuthorImageUpload } from "@/app/components/AuthorImageUpload";
import { TemplateModal, type Template } from "@/app/components/TemplateModal";
import { getDashboardMe, type DashboardMe } from "@/api/auth";

const LOADER_URL = "https://avantgardetricycle.github.io/squarespace-blog/loader.js";

function isPreviewDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.search.includes("bbPreviewDebug=1") || sessionStorage.getItem("bbPreviewDebug") === "1";
}

/** Match renderer.js / blog-preview proxy: Squarespace JSON uses several keys for “featured”. */
function blogItemLooksSquarespaceFeatured(item: {
  featured?: unknown;
  isFeatured?: unknown;
  Featured?: unknown;
  starred?: unknown;
  isStarred?: unknown;
  pinned?: unknown;
  isPinned?: unknown;
  promoted?: unknown;
  isPromoted?: unknown;
}): boolean {
  const truthy = (v: unknown) =>
    v === true ||
    v === 1 ||
    (typeof v === "string" && ["true", "1", "yes"].includes(v.trim().toLowerCase()));
  return (
    truthy(item.featured) ||
    truthy(item.isFeatured) ||
    truthy(item.Featured) ||
    truthy(item.starred) ||
    truthy(item.isStarred) ||
    truthy(item.pinned) ||
    truthy(item.isPinned) ||
    truthy(item.promoted) ||
    truthy(item.isPromoted)
  );
}

export interface BlogAuthorOption {
  id: string;
  name: string;
  imageUrl?: string | null;
  bio?: string | null;
  bioLong?: string | null;
  email?: string | null;
  socialLinks?: Record<string, string>;
}

function resolveInitialAuthorForProfileEdit(
  authorList: BlogAuthorOption[],
  preferredAuthorId: string | undefined,
  fallbackAuthorIds: string[] | undefined
): BlogAuthorOption | null {
  if (preferredAuthorId) {
    const preferred = authorList.find((a) => a.id === preferredAuthorId);
    if (preferred) return preferred;
  }
  for (const id of fallbackAuthorIds ?? []) {
    const hit = authorList.find((a) => a.id === id);
    if (hit) return hit;
  }
  return authorList[0] ?? null;
}

export const SIDEBAR_COLLECTION_MODULES = ["filterByCategory", "filterByTag", "filterByTagsAndCategories", "searchPosts", "postSort", "recentPosts", "emailCapture", "leadMagnet"] as const;
export type SidebarCollectionModuleType = (typeof SIDEBAR_COLLECTION_MODULES)[number];
export const SIDEBAR_POST_MODULES = ["tableOfContents", "authorProfiles", "popularPosts", "relevantPosts", "filterByTagsAndCategories", "emailCapture", "leadMagnet"] as const;
export type SidebarPostModuleType = (typeof SIDEBAR_POST_MODULES)[number];

export const HEADER_COLLECTION_MODULES = ["filterByCategory", "filterByTag", "filterByTagsAndCategories", "searchPosts", "postSort", "emailCapture", "leadMagnet"] as const;
export type HeaderCollectionModuleType = (typeof HEADER_COLLECTION_MODULES)[number];
export const HEADER_POST_MODULES = ["breadcrumbs", "tableOfContents", "authorProfiles", "relevantPosts", "emailCapture", "leadMagnet"] as const;
export type HeaderPostModuleType = (typeof HEADER_POST_MODULES)[number];

/** Position for a discovery/navigation module */
export type ModulePosition = "header" | "leftSidebar" | "rightSidebar" | "footer" | "none";

export type TocStyle = "numbered" | "connectedDots" | "bookmark";

/** Filter type: which filter module to show (derived from filterByTags + filterByCategories) */
export type FilterTypeOption = "category" | "tag" | "tagsAndCategories";

/** Explicit config for collection-level discovery modules. Zone placement is via header/footer/sidebar moduleOrder. */
export interface CollectionModulesConfig {
  filter: { filterByTags: boolean; filterByCategories: boolean };
  sort: Record<string, never>;
  search: Record<string, never>;
  recentPosts: Record<string, never>;
  emailCapture: { header: string; byline?: string; buttonText: string };
  leadMagnet: { resourceTitle: string; description: string; buttonText: string };
}

/** Explicit config for post-level discovery modules */
export interface PostModulesConfig {
  tableOfContents: { enabled: boolean; position: ModulePosition; style: TocStyle };
  breadcrumbs: { enabled: boolean; position: ModulePosition };
  authorProfiles: { enabled: boolean; position: ModulePosition };
  popularPosts: { enabled: boolean; position: ModulePosition; count: number };
  relevantPosts: { enabled: boolean; position: ModulePosition };
  emailCapture: { enabled: boolean; position: ModulePosition; header: string; byline?: string; buttonText: string };
  leadMagnet: { enabled: boolean; position: ModulePosition; resourceTitle: string; description: string; buttonText: string };
}

export const SOCIAL_PLATFORMS = ["facebook", "instagram", "x", "email", "reddit", "linkedin", "pinterest", "whatsapp"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type FeaturedImageLayoutMode = "fullBleed" | "leftJustified" | "rightJustified";

export type PostHeaderImagePosition = "fullBleed" | "leftOfInfo" | "rightOfInfo" | "belowInfo";
export type PostHeaderContentAlignment = "left" | "center" | "right";

export type PostHeaderFullBleedLayout = "overlay" | "stacked";

export interface PostHeaderConfig {
  imagePosition: PostHeaderImagePosition;
  contentAlignment: PostHeaderContentAlignment;
  /** When imagePosition is fullBleed: overlay = title on hero image; stacked = title block above full-bleed image */
  fullBleedLayout?: PostHeaderFullBleedLayout;
  /** Horizontal padding for single-post header zone when image is side-by-side */
  sideGap?: number;
  showBreadcrumbs?: boolean;
  showTags?: boolean;
  showCategories?: boolean;
  /** Lead sentence / excerpt line after title, before byline meta */
  showByline?: boolean;
}
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
  leftSidebar: { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean };
  rightSidebar: { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean };
  headerContent: { show: boolean; modules: string[]; moduleOrder: string[]; height: number };
  footerContent: { show: boolean; modules: string[]; moduleOrder: string[]; topPadding: number };
  socialMediaLinks: { show: boolean; platforms: SocialPlatform[] };
  featuredImage: FeaturedImageConfig;
}

export type PostSortOption = "date" | "az" | "popularity";

export type PostsPerPageOption = 5 | 10 | 20;
export type ViewerMode = "loggedOut" | "loggedIn";
export type PaywallDetectionState = "unknown" | "detected_paywalled" | "detected_unpaywalled";

export type PaginationMode = "pages" | "infiniteScroll";

export type CollectionLayoutMode = "grid" | "listRows" | "editorial" | "showcase" | "digest";

export type GridColumnsOption = 2 | 3;

export type FeaturedArticlePosition = "header" | "inLayout";

export interface FeaturedArticleConfig {
  show: boolean;
  position: FeaturedArticlePosition;
  /**
   * When set to a post key (id, fullUrl, or title — same as renderer `displayPostKey`), that post is featured.
   * When null/omitted, the live blog uses Squarespace featured flags, then the first post in the sorted list
   * (newest when sorted by date).
   */
  featuredPostId?: string | null;
}

/** Map filterByTags + filterByCategories to the actual module ID used by renderer */
export function filterConfigToModuleId(filterByTags: boolean, filterByCategories: boolean): string {
  if (filterByTags && filterByCategories) return "filterByTagsAndCategories";
  if (filterByTags) return "filterByTag";
  return "filterByCategory";
}

export interface CollectionLevelConfig extends BaseLevelConfig {
  postSort?: PostSortOption;
  pagination?: { show: boolean; mode: PaginationMode; postsPerPage: PostsPerPageOption };
  collectionLayout?: CollectionLayoutMode;
  gridColumns?: GridColumnsOption;
  collectionModules?: CollectionModulesConfig;
  featuredArticle?: FeaturedArticleConfig;
}

function blogPreviewItemTimestampMs(item: {
  publishedOn?: unknown;
  publishOn?: unknown;
  addedOn?: unknown;
}): number {
  const v = item.publishedOn ?? item.publishOn ?? item.addedOn;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

function collectionHasPostSortModule(cfg: CollectionLevelConfig): boolean {
  const zoneHas = (zone: { modules?: string[] } | null | undefined) =>
    Array.isArray(zone?.modules) && zone.modules.includes("postSort");
  return (
    zoneHas(cfg.leftSidebar) ||
    zoneHas(cfg.rightSidebar) ||
    zoneHas(cfg.headerContent)
  );
}

/** Same ordering the renderer uses for the featured-article candidate pool (sortedItems). */
function sortBlogItemsForFeaturedPool<T extends { title?: string; publishedOn?: unknown; publishOn?: unknown; addedOn?: unknown }>(
  items: T[],
  collectionCfg: CollectionLevelConfig
): T[] {
  const sorted = items.slice();
  const hasMod = collectionHasPostSortModule(collectionCfg);
  const postSort =
    hasMod && (collectionCfg.postSort === "az" || collectionCfg.postSort === "popularity")
      ? collectionCfg.postSort
      : "date";
  if (postSort === "az") {
    sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else {
    sorted.sort((a, b) => blogPreviewItemTimestampMs(b) - blogPreviewItemTimestampMs(a));
  }
  return sorted;
}

export const FEATURED_POST_SELECT_AUTO = "__auto__";

export type FeaturedArticleEffectiveSource = "betterblog" | "squarespace" | "recent";

export function resolveEffectiveFeaturedArticle<T extends { title?: string }>(args: {
  sortedPool: T[];
  featuredPostId: string | null | undefined;
  getKey: (item: T, idx: number) => string;
}): { post: T | null; source: FeaturedArticleEffectiveSource } {
  const { sortedPool, featuredPostId, getKey } = args;
  if (sortedPool.length === 0) return { post: null, source: "recent" };
  if (typeof featuredPostId === "string" && featuredPostId.trim()) {
    const id = featuredPostId.trim();
    const idx = sortedPool.findIndex((item, i) => getKey(item, i) === id);
    if (idx >= 0) return { post: sortedPool[idx], source: "betterblog" };
  }
  const idxSq = sortedPool.findIndex((item) => blogItemLooksSquarespaceFeatured(item as Parameters<typeof blogItemLooksSquarespaceFeatured>[0]));
  if (idxSq >= 0) return { post: sortedPool[idxSq], source: "squarespace" };
  return { post: sortedPool[0], source: "recent" };
}

export interface PostLevelConfig extends BaseLevelConfig {
  progressBar: { show: boolean; position: "top" | "bottom"; thickness: number; color: string };
  postModules?: PostModulesConfig;
  postHeader?: PostHeaderConfig;
}

export interface ContextBuckets<T> {
  loggedOut: T;
  loggedIn: T;
}

export interface SiteConfigForm {
  defaultAuthorIds: string[];
  postAuthorOverrides: Record<string, string[]>;
  collectionConfig: ContextBuckets<CollectionLevelConfig>;
  postConfig: ContextBuckets<PostLevelConfig>;
  collectionTemplateId?: string | null;
  postTemplateId?: string | null;
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

const defaultCollectionModules: CollectionModulesConfig = {
  filter: { filterByTags: false, filterByCategories: true },
  sort: {},
  search: {},
  recentPosts: {},
  emailCapture: { header: "Subscribe to our newsletter", buttonText: "Subscribe" },
  leadMagnet: { resourceTitle: "", description: "", buttonText: "Get it free" },
};

const defaultPostModules: PostModulesConfig = {
  tableOfContents: { enabled: false, position: "none", style: "numbered" as TocStyle },
  breadcrumbs: { enabled: false, position: "none" },
  authorProfiles: { enabled: false, position: "none" },
  popularPosts: { enabled: false, position: "none", count: 5 },
  relevantPosts: { enabled: false, position: "none" },
  emailCapture: { enabled: false, position: "none", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
  leadMagnet: { enabled: false, position: "none", resourceTitle: "", description: "", buttonText: "Get it free" },
};

const defaultFeaturedArticle: FeaturedArticleConfig = {
  show: false,
  position: "header",
};

const defaultCollectionConfig: CollectionLevelConfig = {
  showDate: true,
  showAuthor: false,
  showReadingTime: false,
  postSort: "date",
  pagination: { show: false, mode: "pages" as PaginationMode, postsPerPage: 10 },
  collectionLayout: "grid",
  gridColumns: 3,
  collectionModules: defaultCollectionModules,
  featuredArticle: defaultFeaturedArticle,
  leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: true },
  rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: true },
  headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
  footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
  socialMediaLinks: { show: false, platforms: [] },
  featuredImage: defaultFeaturedImage,
};

const defaultPostHeader: PostHeaderConfig = {
  imagePosition: "fullBleed",
  contentAlignment: "left",
  sideGap: 24,
  showBreadcrumbs: false,
  showTags: false,
  showCategories: false,
  showByline: false,
};

const defaultPostConfig: PostLevelConfig = {
  ...defaultCollectionConfig,
  postModules: defaultPostModules,
  postHeader: defaultPostHeader,
  leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: true },
  rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: true },
  headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
  footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
  progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
};

const defaultSiteConfig: SiteConfigForm = {
  defaultAuthorIds: [],
  postAuthorOverrides: {},
  collectionConfig: {
    loggedOut: JSON.parse(JSON.stringify(defaultCollectionConfig)) as CollectionLevelConfig,
    loggedIn: JSON.parse(JSON.stringify(defaultCollectionConfig)) as CollectionLevelConfig,
  },
  postConfig: {
    loggedOut: JSON.parse(JSON.stringify(defaultPostConfig)) as PostLevelConfig,
    loggedIn: JSON.parse(JSON.stringify(defaultPostConfig)) as PostLevelConfig,
  },
  collectionTemplateId: null,
  postTemplateId: null,
};

const POST_SIDEBAR_MODULES = ["tableOfContents", "authorProfiles", "popularPosts", "relevantPosts", "filterByTagsAndCategories", "emailCapture", "leadMagnet"] as const;
const POST_FOOTER_MODULES = ["authorProfiles", "relevantPosts", "prevNextArticle", "emailCapture", "leadMagnet"] as const;

const COLLECTION_HEADER_MODULES = ["filterByCategory", "filterByTag", "filterByTagsAndCategories", "searchPosts", "postSort", "emailCapture", "leadMagnet"] as const;
const COLLECTION_SIDEBAR_MODULES = ["filterByCategory", "filterByTag", "filterByTagsAndCategories", "searchPosts", "postSort", "recentPosts", "emailCapture", "leadMagnet"] as const;
const COLLECTION_FOOTER_MODULES = ["emailCapture", "leadMagnet"] as const;
const COLLECTION_FILTER_IDS = ["filterByCategory", "filterByTag", "filterByTagsAndCategories"] as const;
type FeatureModuleLocation = Exclude<ModulePosition, "none">;
type PostHeaderModuleKey = "tableOfContents" | "authorProfiles" | "relevantPosts" | "emailCapture" | "leadMagnet";
const FEATURE_LOCATION_LABELS: Record<FeatureModuleLocation, string> = {
  header: "Header",
  leftSidebar: "Left Sidebar",
  rightSidebar: "Right Sidebar",
  footer: "Footer",
};

/**
 * Zone list for derive: prefer non-empty moduleOrder. If moduleOrder is [] or missing, use modules.
 * (Empty array is not nullish, so `moduleOrder ?? modules` incorrectly kept [] and dropped all sidebar/footer modules.)
 */
function effectiveZoneModuleOrder(moduleOrder: string[] | undefined, modules: string[] | undefined): string[] {
  if (Array.isArray(moduleOrder) && moduleOrder.length > 0) return moduleOrder;
  if (Array.isArray(modules) && modules.length > 0) return modules;
  if (Array.isArray(moduleOrder)) return moduleOrder;
  return [];
}

/**
 * Derive modules arrays for each zone from zone moduleOrder (zone-driven). For collection, filter ID is resolved from filter config.
 */
function deriveCollectionModules(
  cm: CollectionModulesConfig,
  headerOrder: string[],
  leftOrder: string[],
  rightOrder: string[],
  footerOrder: string[]
): { header: string[]; left: string[]; right: string[]; footer: string[] } {
  const filterId = filterConfigToModuleId(cm.filter.filterByTags, cm.filter.filterByCategories);
  const replaceFilter = (arr: string[]): string[] => {
    let seenFilter = false;
    return arr
      .filter((m) => {
        if (COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number])) {
          if (seenFilter) return false;
          seenFilter = true;
          return true;
        }
        return true;
      })
      .map((m) => (COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number]) ? filterId : m));
  };
  const header = replaceFilter(headerOrder.filter((m): m is string => COLLECTION_HEADER_MODULES.includes(m as (typeof COLLECTION_HEADER_MODULES)[number]) || COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number])));
  const left = replaceFilter(leftOrder.filter((m): m is string => COLLECTION_SIDEBAR_MODULES.includes(m as (typeof COLLECTION_SIDEBAR_MODULES)[number]) || COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number])));
  const right = replaceFilter(rightOrder.filter((m): m is string => COLLECTION_SIDEBAR_MODULES.includes(m as (typeof COLLECTION_SIDEBAR_MODULES)[number]) || COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number])));
  const footer = footerOrder.filter((m): m is string => COLLECTION_FOOTER_MODULES.includes(m as (typeof COLLECTION_FOOTER_MODULES)[number]));
  return { header, left, right, footer };
}

/**
 * Derive modules arrays for each zone from explicit postModules config + moduleOrder.
 * For post level: left/right/footer use zone moduleOrder directly (zone-driven). Header still uses postModules + postHeader.
 */
function derivePostModules(
  pm: PostModulesConfig,
  pc: { postHeader?: PostHeaderConfig } | undefined,
  headerOrder: string[],
  leftOrder: string[],
  rightOrder: string[],
  footerOrder: string[]
): { header: string[]; left: string[]; right: string[]; footer: string[] } {
  const header: string[] = [];
  const ph = pc?.postHeader;
  if (ph && ph.showBreadcrumbs) header.push("breadcrumbs");
  if (pm.tableOfContents.enabled && pm.tableOfContents.position !== "none" && pm.tableOfContents.position === "header") header.push("tableOfContents");
  if (pm.authorProfiles.enabled && pm.authorProfiles.position !== "none" && pm.authorProfiles.position === "header") header.push("authorProfiles");
  if (pm.relevantPosts.enabled && pm.relevantPosts.position !== "none" && pm.relevantPosts.position === "header") header.push("relevantPosts");
  if (pm.emailCapture.enabled && pm.emailCapture.position !== "none" && pm.emailCapture.position === "header") header.push("emailCapture");
  if (pm.leadMagnet.enabled && pm.leadMagnet.position !== "none" && pm.leadMagnet.position === "header") header.push("leadMagnet");
  const orderModules = (order: string[], available: string[]): string[] => {
    const set = new Set(available);
    const fromOrder = order.filter((m) => set.has(m));
    const remaining = available.filter((m) => !order.includes(m));
    return [...fromOrder, ...remaining];
  };
  const left = leftOrder.filter((m): m is string => POST_SIDEBAR_MODULES.includes(m as (typeof POST_SIDEBAR_MODULES)[number]));
  const right = rightOrder.filter((m): m is string => POST_SIDEBAR_MODULES.includes(m as (typeof POST_SIDEBAR_MODULES)[number]));
  const footer = footerOrder.filter((m): m is string => POST_FOOTER_MODULES.includes(m as (typeof POST_FOOTER_MODULES)[number]));
  return {
    header: orderModules(headerOrder, header),
    left,
    right,
    footer,
  };
}

/**
 * Sync moduleOrder in each zone when explicit module config changes.
 * Adds/removes module IDs from zone moduleOrder based on position.
 */
function syncModuleOrderFromExplicit(
  cc?: CollectionLevelConfig,
  cm?: CollectionModulesConfig,
  pc?: PostLevelConfig,
  pm?: PostModulesConfig
): CollectionLevelConfig | PostLevelConfig {
  const cfg = (cc ?? pc) as CollectionLevelConfig | PostLevelConfig;
  if (!cfg) return cfg;
  const addToOrder = (order: string[], modId: string): string[] =>
    order.includes(modId) ? order : [...order, modId];
  const removeFromOrder = (order: string[], modId: string): string[] =>
    order.filter((m) => m !== modId);
  if (cm && cc) {
    const filterId = filterConfigToModuleId(cm.filter.filterByTags, cm.filter.filterByCategories);
    const replaceFilter = (order: string[]): string[] =>
      order.map((m) => (m === "filterByCategory" || m === "filterByTag" || m === "filterByTagsAndCategories") ? filterId : m);
    const h = replaceFilter(cc.headerContent.moduleOrder ?? []);
    const l = replaceFilter(cc.leftSidebar.moduleOrder ?? []);
    const r = replaceFilter(cc.rightSidebar.moduleOrder ?? []);
    const f = cc.footerContent?.moduleOrder ?? [];
    return { ...cc, collectionModules: cm, headerContent: { ...cc.headerContent, moduleOrder: h }, leftSidebar: { ...cc.leftSidebar, moduleOrder: l }, rightSidebar: { ...cc.rightSidebar, moduleOrder: r }, footerContent: { ...(cc.footerContent ?? { show: false, modules: [], moduleOrder: [], topPadding: 16 }), moduleOrder: f } };
  }
  if (pm && pc) {
    // Post level: left/right/footer are zone-driven (moduleOrder is source of truth). Only sync header from postModules.
    let h = pc.headerContent.moduleOrder ?? [];
    h = removeFromOrder(removeFromOrder(removeFromOrder(removeFromOrder(removeFromOrder(h, "tableOfContents"), "breadcrumbs"), "authorProfiles"), "emailCapture"), "leadMagnet");
    h = removeFromOrder(h, "relevantPosts");
    if (pm.tableOfContents.enabled && pm.tableOfContents.position === "header") h = addToOrder(h, "tableOfContents");
    if (pc.postHeader?.showBreadcrumbs) h = addToOrder(h, "breadcrumbs");
    if (pm.authorProfiles.enabled && pm.authorProfiles.position === "header") h = addToOrder(h, "authorProfiles");
    if (pm.relevantPosts.enabled && pm.relevantPosts.position === "header") h = addToOrder(h, "relevantPosts");
    if (pm.emailCapture.enabled && pm.emailCapture.position === "header") h = addToOrder(h, "emailCapture");
    if (pm.leadMagnet.enabled && pm.leadMagnet.position === "header") h = addToOrder(h, "leadMagnet");
    return { ...pc, postModules: pm, headerContent: { ...pc.headerContent, moduleOrder: h } };
  }
  return cfg;
}

/**
 * Apply derived modules to config for renderer. Mutates in place for collection/post config.
 */
function applyDerivedModules(config: SiteConfigForm): void {
  const contexts: ViewerMode[] = ["loggedOut", "loggedIn"];
  for (const context of contexts) {
    const cc = config.collectionConfig[context];
    const pc = config.postConfig[context];
    const cm = cc.collectionModules ?? defaultCollectionModules;
    const pm = pc.postModules ?? defaultPostModules;
    const coll = deriveCollectionModules(
      cm,
      effectiveZoneModuleOrder(cc.headerContent.moduleOrder, cc.headerContent.modules),
      effectiveZoneModuleOrder(cc.leftSidebar.moduleOrder, cc.leftSidebar.modules),
      effectiveZoneModuleOrder(cc.rightSidebar.moduleOrder, cc.rightSidebar.modules),
      effectiveZoneModuleOrder(cc.footerContent?.moduleOrder, cc.footerContent?.modules)
    );
    cc.headerContent.modules = coll.header;
    cc.headerContent.moduleOrder = [...coll.header];
    cc.leftSidebar.modules = coll.left;
    cc.leftSidebar.moduleOrder = [...coll.left];
    cc.rightSidebar.modules = coll.right;
    cc.rightSidebar.moduleOrder = [...coll.right];
    cc.footerContent = { ...(cc.footerContent ?? { show: false, modules: [], moduleOrder: [], topPadding: 16 }), modules: coll.footer, moduleOrder: [...coll.footer], show: coll.footer.length > 0 };
    cc.headerContent.show = coll.header.length > 0;
    cc.leftSidebar.show = coll.left.length > 0;
    cc.rightSidebar.show = coll.right.length > 0;
    const post = derivePostModules(
      pm,
      pc,
      effectiveZoneModuleOrder(pc.headerContent.moduleOrder, pc.headerContent.modules),
      effectiveZoneModuleOrder(pc.leftSidebar.moduleOrder, pc.leftSidebar.modules),
      effectiveZoneModuleOrder(pc.rightSidebar.moduleOrder, pc.rightSidebar.modules),
      effectiveZoneModuleOrder(pc.footerContent?.moduleOrder, pc.footerContent?.modules)
    );
    pc.headerContent.modules = post.header;
    pc.headerContent.moduleOrder = [...post.header];
    pc.leftSidebar.modules = post.left;
    pc.leftSidebar.moduleOrder = [...post.left];
    pc.rightSidebar.modules = post.right;
    pc.rightSidebar.moduleOrder = [...post.right];
    pc.footerContent = { ...(pc.footerContent ?? { show: false, modules: [], moduleOrder: [], topPadding: 16 }), modules: post.footer, moduleOrder: [...post.footer], show: post.footer.length > 0 };
    pc.headerContent.show = post.header.length > 0;
    pc.leftSidebar.show = post.left.length > 0;
    pc.rightSidebar.show = post.right.length > 0;
  }
}

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
  const ls = raw?.leftSidebar && typeof raw.leftSidebar === "object" ? raw.leftSidebar as { show?: boolean; modules?: unknown[]; moduleOrder?: unknown[]; width?: number; spaceAbove?: number; sticky?: boolean } : null;
  const rs = raw?.rightSidebar && typeof raw.rightSidebar === "object" ? raw.rightSidebar as { show?: boolean; modules?: unknown[]; moduleOrder?: unknown[]; width?: number; spaceAbove?: number; sticky?: boolean } : null;
  const hc = raw?.headerContent && typeof raw.headerContent === "object" ? raw.headerContent as { show?: boolean; modules?: unknown[]; moduleOrder?: unknown[]; height?: number } : null;
  const fc = raw?.footerContent && typeof raw.footerContent === "object" ? raw.footerContent as { show?: boolean; modules?: unknown[]; moduleOrder?: unknown[]; topPadding?: number; height?: number } : null;
  const validSidebarCollection = (arr: unknown): SidebarCollectionModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarCollectionModuleType => SIDEBAR_COLLECTION_MODULES.includes(m as SidebarCollectionModuleType)) : [];
  const validSidebarPost = (arr: unknown): SidebarPostModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarPostModuleType => SIDEBAR_POST_MODULES.includes(m as SidebarPostModuleType)) : [];
  const validHeaderCollection = (arr: unknown): HeaderCollectionModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is HeaderCollectionModuleType => HEADER_COLLECTION_MODULES.includes(m as HeaderCollectionModuleType)) : [];
  const validHeaderPost = (arr: unknown): HeaderPostModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is HeaderPostModuleType => HEADER_POST_MODULES.includes(m as HeaderPostModuleType)) : [];
  const lsOrderSource = effectiveZoneModuleOrder(
    Array.isArray(ls?.moduleOrder) ? ls.moduleOrder as string[] : undefined,
    Array.isArray(ls?.modules) ? ls.modules as string[] : undefined
  );
  const lsModuleOrder = level === "collection" ? validSidebarCollection(lsOrderSource) : validSidebarPost(lsOrderSource);
  const rsOrderSource = effectiveZoneModuleOrder(
    Array.isArray(rs?.moduleOrder) ? rs.moduleOrder as string[] : undefined,
    Array.isArray(rs?.modules) ? rs.modules as string[] : undefined
  );
  const rsModuleOrder = level === "collection" ? validSidebarCollection(rsOrderSource) : validSidebarPost(rsOrderSource);
  const hcOrderSource = effectiveZoneModuleOrder(
    Array.isArray(hc?.moduleOrder) ? hc.moduleOrder as string[] : undefined,
    Array.isArray(hc?.modules) ? hc.modules as string[] : undefined
  );
  const hcModuleOrder = level === "collection" ? validHeaderCollection(hcOrderSource) : validHeaderPost(hcOrderSource);
  const leftSidebar = ls
    ? { show: Boolean(ls.show ?? false), modules: lsModuleOrder as string[], moduleOrder: lsModuleOrder as string[], width: Math.min(400, Math.max(160, Number(ls.width) || 240)), spaceAbove: Math.min(64, Math.max(0, Number(ls.spaceAbove) || 0)), sticky: ls.sticky !== false }
    : { show: false, modules: [] as SidebarCollectionModuleType[] & SidebarPostModuleType[], moduleOrder: [] as string[], width: 240, spaceAbove: 0, sticky: true };
  const rightSidebar = rs
    ? { show: Boolean(rs.show ?? false), modules: rsModuleOrder as string[], moduleOrder: rsModuleOrder as string[], width: Math.min(400, Math.max(160, Number(rs.width) || 240)), spaceAbove: Math.min(64, Math.max(0, Number(rs.spaceAbove) || 0)), sticky: rs.sticky !== false }
    : { show: false, modules: [] as SidebarCollectionModuleType[] & SidebarPostModuleType[], moduleOrder: [] as string[], width: 240, spaceAbove: 0, sticky: true };
  const headerContent = hc
    ? { show: Boolean(hc.show ?? false), modules: hcModuleOrder as string[], moduleOrder: hcModuleOrder as string[], height: Math.min(120, Math.max(32, Number(hc.height) || 48)) }
    : { show: false, modules: [] as HeaderCollectionModuleType[] & HeaderPostModuleType[], moduleOrder: [] as string[], height: 48 };
  const validFooterCollection = (arr: unknown): string[] => Array.isArray(arr) ? arr.filter((m): m is string => m === "emailCapture" || m === "leadMagnet") : [];
  const validFooterPost = (arr: unknown): string[] => Array.isArray(arr) ? arr.filter((m): m is string => m === "relevantPosts" || m === "authorProfiles" || m === "prevNextArticle" || m === "emailCapture" || m === "leadMagnet") : [];
  const fcOrderSource = effectiveZoneModuleOrder(
    Array.isArray(fc?.moduleOrder) ? fc.moduleOrder as string[] : undefined,
    Array.isArray(fc?.modules) ? fc.modules as string[] : undefined
  );
  const fcModuleOrder = level === "collection" ? validFooterCollection(fcOrderSource) : validFooterPost(fcOrderSource);
  const topPadding = fc
    ? (typeof fc.topPadding === "number"
      ? Math.min(120, Math.max(0, Number(fc.topPadding) || 0))
      : Math.min(120, Math.max(0, Number(fc.height) || 16)))
    : 16;
  const footerContent = fc
    ? {
        show: Boolean(fc.show ?? false),
        modules: fcModuleOrder,
        moduleOrder: fcModuleOrder,
        topPadding,
      }
    : { show: false, modules: [] as string[], moduleOrder: [] as string[], topPadding: 16 };
  const postSort = (raw?.postSort === "az" || raw?.postSort === "popularity") ? raw.postSort as PostSortOption : "date";
  const pagRaw = raw?.pagination && typeof raw.pagination === "object" ? raw.pagination as { show?: boolean; mode?: string; postsPerPage?: number } : null;
  const validPostsPerPage = (v: unknown): PostsPerPageOption => (v === 5 || v === 10 || v === 20) ? v : 10;
  const validPaginationMode = (v: unknown): PaginationMode => (v === "infiniteScroll") ? "infiniteScroll" : "pages";
  const pagination = pagRaw
    ? { show: Boolean(pagRaw.show ?? false), mode: validPaginationMode(pagRaw.mode), postsPerPage: validPostsPerPage(pagRaw.postsPerPage) }
    : { show: false, mode: "pages" as PaginationMode, postsPerPage: 10 as PostsPerPageOption };
  const validCollectionLayout = (v: unknown): CollectionLayoutMode =>
    (v === "grid" || v === "listRows" || v === "editorial" || v === "showcase" || v === "digest") ? v : "grid";
  const validGridColumns = (v: unknown): GridColumnsOption =>
    (v === 2 || v === 3) ? v : 3;
  const validModulePosition = (v: unknown): ModulePosition =>
    (v === "header" || v === "leftSidebar" || v === "rightSidebar" || v === "footer") ? v : "none";
  const collectionLayout = validCollectionLayout(raw?.collectionLayout);
  const gridColumns = validGridColumns(raw?.gridColumns);
  const cmRaw = raw?.collectionModules && typeof raw.collectionModules === "object" ? raw.collectionModules as Record<string, unknown> : null;
  const pmRaw = raw?.postModules && typeof raw.postModules === "object" ? raw.postModules as Record<string, unknown> : null;
  const parseCollectionModules = (): CollectionModulesConfig => {
    if (cmRaw) {
      const f = cmRaw.filter && typeof cmRaw.filter === "object" ? cmRaw.filter as Record<string, unknown> : {};
      const ec = cmRaw.emailCapture && typeof cmRaw.emailCapture === "object" ? cmRaw.emailCapture as Record<string, unknown> : {};
      const lm = cmRaw.leadMagnet && typeof cmRaw.leadMagnet === "object" ? cmRaw.leadMagnet as Record<string, unknown> : {};
      const filterByTags = Boolean(f.filterByTags ?? (f.filterType === "tag" || f.filterType === "tagsAndCategories"));
      const filterByCategories = Boolean(f.filterByCategories ?? (f.filterType === "category" || f.filterType === "tagsAndCategories"));
      return {
        filter: {
          filterByTags,
          filterByCategories: filterByCategories || (!filterByTags && !filterByCategories),
        },
        sort: {},
        search: {},
        recentPosts: {},
        emailCapture: {
          header: typeof ec.header === "string" ? ec.header : "Subscribe to our newsletter",
          byline: typeof ec.byline === "string" ? ec.byline : undefined,
          buttonText: typeof ec.buttonText === "string" ? ec.buttonText : "Subscribe",
        },
        leadMagnet: {
          resourceTitle: typeof lm.resourceTitle === "string" ? lm.resourceTitle : "",
          description: typeof lm.description === "string" ? lm.description : "",
          buttonText: typeof lm.buttonText === "string" ? lm.buttonText : "Get it free",
        },
      };
    }
    const mods: string[] = [...(hcModuleOrder as string[]), ...(lsModuleOrder as string[]), ...(rsModuleOrder as string[]), ...(fcModuleOrder as string[])];
    const hasFilterByCategory = mods.includes("filterByCategory");
    const hasFilterByTag = mods.includes("filterByTag");
    const hasFilterByTagsAndCategories = mods.includes("filterByTagsAndCategories");
    const filterByTags = hasFilterByTag || hasFilterByTagsAndCategories;
    const filterByCategories = hasFilterByCategory || hasFilterByTagsAndCategories;
    return {
      filter: { filterByTags, filterByCategories },
      sort: {},
      search: {},
      recentPosts: {},
      emailCapture: { header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { resourceTitle: "", description: "", buttonText: "Get it free" },
    };
  };
  const migrateCollectionModuleOrder = (): { header: string[]; left: string[]; right: string[]; footer: string[] } | null => {
    if (!cmRaw || level !== "collection") return null;
    const f = cmRaw.filter && typeof cmRaw.filter === "object" ? cmRaw.filter as Record<string, unknown> : {};
    const s = cmRaw.sort && typeof cmRaw.sort === "object" ? cmRaw.sort as Record<string, unknown> : {};
    const sr = cmRaw.search && typeof cmRaw.search === "object" ? cmRaw.search as Record<string, unknown> : {};
    const rp = cmRaw.recentPosts && typeof cmRaw.recentPosts === "object" ? cmRaw.recentPosts as Record<string, unknown> : {};
    const ec = cmRaw.emailCapture && typeof cmRaw.emailCapture === "object" ? cmRaw.emailCapture as Record<string, unknown> : {};
    const lm = cmRaw.leadMagnet && typeof cmRaw.leadMagnet === "object" ? cmRaw.leadMagnet as Record<string, unknown> : {};
    const filterId = filterConfigToModuleId(Boolean(f.filterByTags ?? (f.filterType === "tag" || f.filterType === "tagsAndCategories")), Boolean(f.filterByCategories ?? ((f.filterType === "category" || f.filterType === "tagsAndCategories") || (!f.filterByTags && !f.filterByCategories))));
    const pos = (p: unknown, def: ModulePosition) => (p === "header" || p === "leftSidebar" || p === "rightSidebar" || p === "footer") ? p : def;
    const filterPos = pos(f.position, "header");
    const sortPos = pos(s.position, "header");
    const searchPos = pos(sr.position, "header");
    const recentPos = pos(rp.position, "rightSidebar");
    const ecPos = pos(ec.position, "footer");
    const lmPos = pos(lm.position, "footer");
    const header: string[] = [];
    const left: string[] = [];
    const right: string[] = [];
    const footer: string[] = [];
    if (Boolean(f.enabled ?? false) && filterPos !== "none") {
      if (filterPos === "header") header.push(filterId);
      else if (filterPos === "leftSidebar") left.push(filterId);
      else if (filterPos === "rightSidebar") right.push(filterId);
    }
    if (Boolean(s.enabled ?? false) && sortPos !== "none") {
      if (sortPos === "header") header.push("postSort");
      else if (sortPos === "leftSidebar") left.push("postSort");
      else if (sortPos === "rightSidebar") right.push("postSort");
    }
    if (Boolean(sr.enabled ?? false) && searchPos !== "none") {
      if (searchPos === "header") header.push("searchPosts");
      else if (searchPos === "leftSidebar") left.push("searchPosts");
      else if (searchPos === "rightSidebar") right.push("searchPosts");
    }
    if (Boolean(rp.enabled ?? false) && recentPos !== "none") {
      if (recentPos === "leftSidebar") left.push("recentPosts");
      else if (recentPos === "rightSidebar") right.push("recentPosts");
    }
    if (Boolean(ec.enabled ?? false) && ecPos !== "none") {
      if (ecPos === "header") header.push("emailCapture");
      else if (ecPos === "leftSidebar") left.push("emailCapture");
      else if (ecPos === "rightSidebar") right.push("emailCapture");
      else if (ecPos === "footer") footer.push("emailCapture");
    }
    if (Boolean(lm.enabled ?? false) && lmPos !== "none") {
      if (lmPos === "header") header.push("leadMagnet");
      else if (lmPos === "leftSidebar") left.push("leadMagnet");
      else if (lmPos === "rightSidebar") right.push("leadMagnet");
      else if (lmPos === "footer") footer.push("leadMagnet");
    }
    if (header.length === 0 && left.length === 0 && right.length === 0 && footer.length === 0) return null;
    return { header, left, right, footer };
  };
  const parsePostModules = (): PostModulesConfig => {
    if (pmRaw) {
      const toc = pmRaw.tableOfContents && typeof pmRaw.tableOfContents === "object" ? pmRaw.tableOfContents as Record<string, unknown> : {};
      const bc = pmRaw.breadcrumbs && typeof pmRaw.breadcrumbs === "object" ? pmRaw.breadcrumbs as Record<string, unknown> : {};
      const ap = pmRaw.authorProfiles && typeof pmRaw.authorProfiles === "object" ? pmRaw.authorProfiles as Record<string, unknown> : {};
      const pop = pmRaw.popularPosts && typeof pmRaw.popularPosts === "object" ? pmRaw.popularPosts as Record<string, unknown> : {};
      const rel = pmRaw.relevantPosts && typeof pmRaw.relevantPosts === "object" ? pmRaw.relevantPosts as Record<string, unknown> : {};
      const ec = pmRaw.emailCapture && typeof pmRaw.emailCapture === "object" ? pmRaw.emailCapture as Record<string, unknown> : {};
      const lm = pmRaw.leadMagnet && typeof pmRaw.leadMagnet === "object" ? pmRaw.leadMagnet as Record<string, unknown> : {};
      const validTocStyle = (v: unknown): TocStyle => (v === "numbered" || v === "connectedDots" || v === "bookmark") ? v : "numbered";
      return {
        tableOfContents: { enabled: Boolean(toc.enabled ?? false), position: validModulePosition(toc.position), style: validTocStyle(toc.style) },
        breadcrumbs: { enabled: Boolean(bc.enabled ?? false), position: validModulePosition(bc.position) },
        authorProfiles: { enabled: Boolean(ap.enabled ?? false), position: validModulePosition(ap.position) },
        popularPosts: {
          enabled: Boolean(pop.enabled ?? false),
          position: validModulePosition(pop.position),
          count: Math.min(20, Math.max(1, Number(pop.count) || 5)),
        },
        relevantPosts: { enabled: Boolean(rel.enabled ?? false), position: validModulePosition(rel.position) },
        emailCapture: {
          enabled: Boolean(ec.enabled ?? false),
          position: validModulePosition(ec.position),
          header: typeof ec.header === "string" ? ec.header : "Subscribe to our newsletter",
          byline: typeof ec.byline === "string" ? ec.byline : undefined,
          buttonText: typeof ec.buttonText === "string" ? ec.buttonText : "Subscribe",
        },
        leadMagnet: {
          enabled: Boolean(lm.enabled ?? false),
          position: validModulePosition(lm.position),
          resourceTitle: typeof lm.resourceTitle === "string" ? lm.resourceTitle : "",
          description: typeof lm.description === "string" ? lm.description : "",
          buttonText: typeof lm.buttonText === "string" ? lm.buttonText : "Get it free",
        },
      };
    }
    const modsPost: string[] = [...(hcModuleOrder as string[]), ...(lsModuleOrder as string[]), ...(rsModuleOrder as string[]), ...(fcModuleOrder as string[])];
    const tocPos: ModulePosition = modsPost.includes("tableOfContents") ? ((hcModuleOrder as string[]).includes("tableOfContents") ? "header" : (lsModuleOrder as string[]).includes("tableOfContents") ? "leftSidebar" : "rightSidebar") : "none";
    const bcPos: ModulePosition = modsPost.includes("breadcrumbs") ? ((hcModuleOrder as string[]).includes("breadcrumbs") ? "header" : (lsModuleOrder as string[]).includes("breadcrumbs") ? "leftSidebar" : "rightSidebar") : "none";
    const apPos: ModulePosition = modsPost.includes("authorProfiles") ? ((hcModuleOrder as string[]).includes("authorProfiles") ? "header" : (lsModuleOrder as string[]).includes("authorProfiles") ? "leftSidebar" : (rsModuleOrder as string[]).includes("authorProfiles") ? "rightSidebar" : (fcModuleOrder as string[]).includes("authorProfiles") ? "footer" : "none") : "none";
    const popPos: ModulePosition = modsPost.includes("popularPosts") ? ((hcModuleOrder as string[]).includes("popularPosts") ? "header" : (lsModuleOrder as string[]).includes("popularPosts") ? "leftSidebar" : (rsModuleOrder as string[]).includes("popularPosts") ? "rightSidebar" : "none") : "none";
    const relPos: ModulePosition = modsPost.includes("relevantPosts") ? ((hcModuleOrder as string[]).includes("relevantPosts") ? "header" : (lsModuleOrder as string[]).includes("relevantPosts") ? "leftSidebar" : (rsModuleOrder as string[]).includes("relevantPosts") ? "rightSidebar" : (fcModuleOrder as string[]).includes("relevantPosts") ? "footer" : "none") : "none";
    const ecPos: ModulePosition = modsPost.includes("emailCapture") ? ((hcModuleOrder as string[]).includes("emailCapture") ? "header" : (lsModuleOrder as string[]).includes("emailCapture") ? "leftSidebar" : (rsModuleOrder as string[]).includes("emailCapture") ? "rightSidebar" : (fcModuleOrder as string[]).includes("emailCapture") ? "footer" : "none") : "none";
    const lmPos: ModulePosition = modsPost.includes("leadMagnet") ? ((hcModuleOrder as string[]).includes("leadMagnet") ? "header" : (lsModuleOrder as string[]).includes("leadMagnet") ? "leftSidebar" : (rsModuleOrder as string[]).includes("leadMagnet") ? "rightSidebar" : (fcModuleOrder as string[]).includes("leadMagnet") ? "footer" : "none") : "none";
    return {
      tableOfContents: { enabled: tocPos !== "none", position: tocPos, style: "numbered" as TocStyle },
      breadcrumbs: { enabled: bcPos !== "none", position: bcPos },
      authorProfiles: { enabled: apPos !== "none", position: apPos },
      popularPosts: { enabled: popPos !== "none", position: popPos, count: 5 },
      relevantPosts: { enabled: relPos !== "none", position: relPos },
      emailCapture: { enabled: ecPos !== "none", position: ecPos, header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: lmPos !== "none", position: lmPos, resourceTitle: "", description: "", buttonText: "Get it free" },
    };
  };
  const collectionModules = parseCollectionModules();
  const postModules = level === "post" ? parsePostModules() : defaultPostModules;
  const migrated = migrateCollectionModuleOrder();
  const finalHcOrder = (level === "collection" && migrated) ? migrated.header : hcModuleOrder;
  const finalLsOrder = (level === "collection" && migrated) ? migrated.left : lsModuleOrder;
  const finalRsOrder = (level === "collection" && migrated) ? migrated.right : rsModuleOrder;
  const finalFcOrder = (level === "collection" && migrated) ? migrated.footer : fcModuleOrder;
  const phRaw = level === "post" && raw?.postHeader && typeof raw.postHeader === "object" ? raw.postHeader as Record<string, unknown> : null;
  const validImagePosition = (v: unknown): PostHeaderImagePosition =>
    (v === "fullBleed" || v === "leftOfInfo" || v === "rightOfInfo" || v === "belowInfo") ? v : "fullBleed";
  const validContentAlignment = (v: unknown): PostHeaderContentAlignment =>
    (v === "left" || v === "center" || v === "right") ? v : "left";
  const validFullBleedLayout = (v: unknown): PostHeaderFullBleedLayout | undefined =>
    (v === "stacked" || v === "overlay") ? v : undefined;
  const validSideGap = (v: unknown): number => Math.min(120, Math.max(0, Number(v) || 24));
  const postHeaderForDerive: PostHeaderConfig | undefined = level === "post"
    ? (phRaw ? {
        imagePosition: validImagePosition(phRaw.imagePosition),
        contentAlignment: validContentAlignment(phRaw.contentAlignment),
        fullBleedLayout: validFullBleedLayout(phRaw.fullBleedLayout),
        sideGap: validSideGap(phRaw.sideGap),
        showBreadcrumbs: Boolean(phRaw.showBreadcrumbs ?? false),
        showTags: Boolean(phRaw.showTags ?? false),
        showCategories: Boolean(phRaw.showCategories ?? false),
        showByline: Boolean(phRaw.showByline ?? false),
      } : defaultPostHeader)
    : undefined;
  const collDerived = deriveCollectionModules(collectionModules, finalHcOrder, finalLsOrder, finalRsOrder, finalFcOrder);
  const postDerived = derivePostModules(postModules, postHeaderForDerive ? { postHeader: postHeaderForDerive } : undefined, finalHcOrder, finalLsOrder, finalRsOrder, finalFcOrder);
  const base: CollectionLevelConfig = {
    showDate: Boolean(raw?.showDate ?? true),
    showAuthor: Boolean(raw?.showAuthor ?? false),
    showReadingTime: Boolean(raw?.showReadingTime ?? false),
    postSort,
    pagination,
    collectionLayout,
    gridColumns,
    collectionModules,
    leftSidebar: { ...leftSidebar, modules: collDerived.left, moduleOrder: finalLsOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
    rightSidebar: { ...rightSidebar, modules: collDerived.right, moduleOrder: finalRsOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
    headerContent: { ...headerContent, modules: collDerived.header, moduleOrder: finalHcOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; height: number },
    footerContent: { ...footerContent, modules: collDerived.footer, moduleOrder: finalFcOrder },
    socialMediaLinks,
    featuredImage,
  };
  if (level === "collection") {
    const faRaw = raw?.featuredArticle && typeof raw.featuredArticle === "object" ? raw.featuredArticle as Record<string, unknown> : null;
    if (faRaw) {
      const fa: FeaturedArticleConfig = {
        show: Boolean(faRaw.show ?? false),
        position: (faRaw.position === "inLayout" ? "inLayout" : "header") as FeaturedArticlePosition,
      };
      if ("featuredPostId" in faRaw) {
        const v = faRaw.featuredPostId;
        if (v === null) fa.featuredPostId = null;
        else if (typeof v === "string" && v.trim()) fa.featuredPostId = v.trim();
      }
      (base as CollectionLevelConfig).featuredArticle = fa;
    } else {
      (base as CollectionLevelConfig).featuredArticle = defaultFeaturedArticle;
    }
  }
  if (level === "post") {
    const pb = raw?.progressBar && typeof raw.progressBar === "object" ? raw.progressBar as { show?: boolean; position?: string; thickness?: number; color?: string } : null;
    const postHeader: PostHeaderConfig = postHeaderForDerive ?? defaultPostHeader;
    return {
      ...base,
      postModules,
      postHeader,
      leftSidebar: { ...leftSidebar, modules: postDerived.left, moduleOrder: [...postDerived.left] } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
      rightSidebar: { ...rightSidebar, modules: postDerived.right, moduleOrder: [...postDerived.right] } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
      headerContent: { ...headerContent, modules: postDerived.header, moduleOrder: [...postDerived.header] } as { show: boolean; modules: string[]; moduleOrder: string[]; height: number },
      footerContent: { ...footerContent, modules: postDerived.footer, moduleOrder: [...postDerived.footer] },
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

function cloneLevelConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T;
}

function normalizeContextBuckets(
  raw: Record<string, unknown> | null,
  level: "collection" | "post"
): ContextBuckets<CollectionLevelConfig> | ContextBuckets<PostLevelConfig> {
  const parse = (input: Record<string, unknown> | null) =>
    parseLevelConfig(input, level) as CollectionLevelConfig | PostLevelConfig;
  const loggedOutRaw =
    raw && typeof raw.loggedOut === "object" ? (raw.loggedOut as Record<string, unknown>) : null;
  const loggedInRaw =
    raw && typeof raw.loggedIn === "object" ? (raw.loggedIn as Record<string, unknown>) : null;

  if (loggedOutRaw || loggedInRaw) {
    const loggedOutParsed = parse(loggedOutRaw ?? loggedInRaw);
    const loggedInParsed = parse(loggedInRaw ?? loggedOutRaw);
    return {
      loggedOut: loggedOutParsed,
      loggedIn: loggedInParsed,
    } as ContextBuckets<CollectionLevelConfig> | ContextBuckets<PostLevelConfig>;
  }

  const parsed = parse(raw);
  return {
    loggedOut: cloneLevelConfig(parsed),
    loggedIn: cloneLevelConfig(parsed),
  } as ContextBuckets<CollectionLevelConfig> | ContextBuckets<PostLevelConfig>;
}

function configFromApi(data: Record<string, unknown>): SiteConfigForm {
  const defaultAuthorIds = Array.isArray(data.defaultAuthorIds) ? data.defaultAuthorIds as string[] : [];
  const postAuthorOverrides = (data.postAuthorOverrides && typeof data.postAuthorOverrides === "object")
    ? (data.postAuthorOverrides as Record<string, string[]>) : {};
  const cc = data.collectionConfig && typeof data.collectionConfig === "object" ? data.collectionConfig as Record<string, unknown> : null;
  const pc = data.postConfig && typeof data.postConfig === "object" ? data.postConfig as Record<string, unknown> : null;
  if (cc && pc) {
    const collectionTemplateId = data.collectionTemplateId as string | null | undefined;
    const postTemplateId = data.postTemplateId as string | null | undefined;
    return {
      defaultAuthorIds,
      postAuthorOverrides,
      collectionConfig: normalizeContextBuckets(cc, "collection") as ContextBuckets<CollectionLevelConfig>,
      postConfig: normalizeContextBuckets(pc, "post") as ContextBuckets<PostLevelConfig>,
      collectionTemplateId: collectionTemplateId ?? null,
      postTemplateId: postTemplateId ?? null,
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
  const migratedPost = {
    ...legacy,
    leftSidebar: { ...lsObj, modules: hasToc ? ["tableOfContents"] : [] },
    rightSidebar: { ...rsObj, modules: hasToc ? ["tableOfContents"] : [] },
    headerContent: { ...hcObj, modules: [...(hasBreadcrumbs ? ["breadcrumbs"] : []), ...(hasToc ? ["tableOfContents"] : [])] },
    postHeader: hasBreadcrumbs ? { ...defaultPostHeader, showBreadcrumbs: true } : undefined,
  };
  const collectionTemplateId = data.collectionTemplateId as string | null | undefined;
  const postTemplateId = data.postTemplateId as string | null | undefined;
  return {
    defaultAuthorIds,
    postAuthorOverrides,
    collectionConfig: {
      loggedOut: parseLevelConfig(legacy, "collection") as CollectionLevelConfig,
      loggedIn: parseLevelConfig(legacy, "collection") as CollectionLevelConfig,
    },
    postConfig: {
      loggedOut: parseLevelConfig(migratedPost, "post") as PostLevelConfig,
      loggedIn: parseLevelConfig(migratedPost, "post") as PostLevelConfig,
    },
    collectionTemplateId: collectionTemplateId ?? null,
    postTemplateId: postTemplateId ?? null,
  };
}

/** Module section with only expand/collapse (no on/off toggle). For zone-driven modules. */
function ModuleSettingSectionCollapseOnly({
  title,
  expanded,
  onToggle,
  content,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  content: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#e5e4e0]">
      <div className="flex items-center justify-between py-3">
        <span className="font-medium">{title}</span>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      <Collapsible open={expanded}>
        <CollapsibleContent>
          <div className="pb-4 space-y-3">{content}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function configToApiPayload(config: SiteConfigForm): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(config)) as SiteConfigForm;
  applyDerivedModules(copy);
  return {
    defaultAuthorIds: copy.defaultAuthorIds,
    postAuthorOverrides: copy.postAuthorOverrides,
    collectionConfig: copy.collectionConfig,
    postConfig: copy.postConfig,
    collectionTemplateId: copy.collectionTemplateId ?? null,
    postTemplateId: copy.postTemplateId ?? null,
  };
}

function configToRendererConfig(config: SiteConfigForm): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(config)) as SiteConfigForm;
  applyDerivedModules(copy);
  return {
    defaultAuthorIds: copy.defaultAuthorIds,
    postAuthorOverrides: copy.postAuthorOverrides,
    collectionConfig: copy.collectionConfig,
    postConfig: copy.postConfig,
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
  const fcEqual = (a.footerContent?.show ?? false) === (b.footerContent?.show ?? false) &&
    (a.footerContent?.topPadding ?? 16) === (b.footerContent?.topPadding ?? 16) &&
    (a.footerContent?.modules?.length ?? 0) === (b.footerContent?.modules?.length ?? 0) &&
    (a.footerContent?.modules ?? []).every((m, i) => m === (b.footerContent?.modules ?? [])[i]);
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
    (a as CollectionLevelConfig).pagination?.mode === (b as CollectionLevelConfig).pagination?.mode &&
    (a as CollectionLevelConfig).pagination?.postsPerPage === (b as CollectionLevelConfig).pagination?.postsPerPage;
  const collLayoutEqual = (a as CollectionLevelConfig).collectionLayout === (b as CollectionLevelConfig).collectionLayout;
  const gridColsEqual = (a as CollectionLevelConfig).gridColumns === (b as CollectionLevelConfig).gridColumns;
  const faA = (a as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle;
  const faB = (b as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle;
  const faEqual = faA.show === faB.show &&
    faA.position === faB.position &&
    faA.featuredPostId === faB.featuredPostId;
  const cmEqual = JSON.stringify((a as CollectionLevelConfig).collectionModules ?? defaultCollectionModules) === JSON.stringify((b as CollectionLevelConfig).collectionModules ?? defaultCollectionModules);
  const pmEqual = JSON.stringify((a as PostLevelConfig).postModules ?? defaultPostModules) === JSON.stringify((b as PostLevelConfig).postModules ?? defaultPostModules);
  const moduleOrderEqual =
    (a.leftSidebar.moduleOrder ?? []).every((m, i) => m === (b.leftSidebar.moduleOrder ?? [])[i]) &&
    (a.rightSidebar.moduleOrder ?? []).every((m, i) => m === (b.rightSidebar.moduleOrder ?? [])[i]) &&
    (a.headerContent.moduleOrder ?? []).every((m, i) => m === (b.headerContent.moduleOrder ?? [])[i]) &&
    (a.footerContent?.moduleOrder ?? []).every((m, i) => m === (b.footerContent?.moduleOrder ?? [])[i]);
  const base = a.showDate === b.showDate && a.showAuthor === b.showAuthor && a.showReadingTime === b.showReadingTime &&
    postSortEqual && pagEqual && collLayoutEqual && gridColsEqual && faEqual && cmEqual && pmEqual && moduleOrderEqual && fcEqual && lsEqual && rsEqual && hcEqual && smEqual && fiEqual;
  if ("progressBar" in a && "progressBar" in b) {
    const pa = (a as PostLevelConfig).progressBar;
    const pb = (b as PostLevelConfig).progressBar;
    const phA = (a as PostLevelConfig).postHeader ?? defaultPostHeader;
    const phB = (b as PostLevelConfig).postHeader ?? defaultPostHeader;
    const phEqual = phA.imagePosition === phB.imagePosition && phA.contentAlignment === phB.contentAlignment &&
      (phA.fullBleedLayout ?? "overlay") === (phB.fullBleedLayout ?? "overlay") &&
      (phA.sideGap ?? 24) === (phB.sideGap ?? 24) &&
      (phA.showBreadcrumbs ?? false) === (phB.showBreadcrumbs ?? false) &&
      (phA.showTags ?? false) === (phB.showTags ?? false) &&
      (phA.showCategories ?? false) === (phB.showCategories ?? false) &&
      (phA.showByline ?? false) === (phB.showByline ?? false);
    return base && pa.show === pb.show && pa.position === pb.position && pa.thickness === pb.thickness && pa.color === pb.color && phEqual;
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
  const templateIdsEqual =
    (a.collectionTemplateId ?? null) === (b.collectionTemplateId ?? null) &&
    (a.postTemplateId ?? null) === (b.postTemplateId ?? null);
  return defaultIdsEqual && overridesEqual && templateIdsEqual &&
    levelConfigsEqual(a.collectionConfig.loggedOut, b.collectionConfig.loggedOut) &&
    levelConfigsEqual(a.collectionConfig.loggedIn, b.collectionConfig.loggedIn) &&
    levelConfigsEqual(a.postConfig.loggedOut, b.postConfig.loggedOut) &&
    levelConfigsEqual(a.postConfig.loggedIn, b.postConfig.loggedIn);
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
  const [blogItems, setBlogItems] = useState<Array<{
    id?: string;
    fullUrl?: string;
    title?: string;
    featured?: boolean;
    isFeatured?: boolean;
    starred?: boolean;
    author?: { displayName?: string };
  }>>([]);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorImageUrl, setNewAuthorImageUrl] = useState<string | null>(null);
  const [newAuthorBio, setNewAuthorBio] = useState("");
  const [newAuthorBioLong, setNewAuthorBioLong] = useState("");
  const [newAuthorEmail, setNewAuthorEmail] = useState("");
  const [newAuthorSocials, setNewAuthorSocials] = useState<Record<string, string>>({});
  const [addAuthorModalOpen, setAddAuthorModalOpen] = useState(false);
  const [addAuthorContext, setAddAuthorContext] = useState<"default" | { postId: string }>("default");
  const [addAuthorAsDefault, setAddAuthorAsDefault] = useState(true);
  const [editAuthor, setEditAuthor] = useState<BlogAuthorOption | null>(null);
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
  const [installationModalOpen, setInstallationModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [clearSettingsModalOpen, setClearSettingsModalOpen] = useState(false);
  const [clearSettingsCollection, setClearSettingsCollection] = useState(false);
  const [clearSettingsPost, setClearSettingsPost] = useState(false);
  /** Cached API templates for comparing config to applied template (name + equality). */
  const [templateCatalogCollection, setTemplateCatalogCollection] = useState<Template[]>([]);
  const [templateCatalogPost, setTemplateCatalogPost] = useState<Template[]>([]);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(-1);
  const [selectedLevel, setSelectedLevel] = useState<ConfigLevel>("collection");
  const [viewerMode, setViewerMode] = useState<ViewerMode>("loggedOut");
  const [commentSettings, setCommentSettings] = useState<{
    commentsEnabled: boolean;
    allowAnonymousComments: boolean;
    subscriberCommentsEnabled: boolean;
    apiKeyVerified: boolean;
    requireApproval: boolean;
    autoCloseAfterDays: number | null;
    notifyEmail: boolean;
    notificationEmail: string | null;
    allowLikes: boolean;
    allowThreadedReplies: boolean;
    sortOrder: "newest" | "oldest" | "most_liked";
  } | null>(null);
  const [commentSettingsLoading, setCommentSettingsLoading] = useState(false);
  const [commentSettingsSaving, setCommentSettingsSaving] = useState(false);
  const [savedCommentSettings, setSavedCommentSettings] = useState<typeof commentSettings>(null);
  const [commentApiKeyInput, setCommentApiKeyInput] = useState("");
  const [squarespaceApiKeyModalOpen, setSquarespaceApiKeyModalOpen] = useState<false | "setup" | "edit">(false);
  const [commentApiKeyStatus, setCommentApiKeyStatus] = useState<
    "unverified" | "verifying" | "verified" | "invalid" | "missing_permission"
  >("unverified");
  const [sectionExpanded, setSectionExpanded] = useState({
    showAuthor: false,
    authorProfiles: false,
    progressBar: false,
    pagination: false,
    collectionLayout: false,
    featuredArticle: false,
    featuredImage: false,
    filtering: false,
    sorting: false,
    search: false,
    recentPosts: false,
    popularPosts: false,
    relevantPosts: false,
    emailCapture: false,
    leadMagnet: false,
    tableOfContents: false,
    breadcrumbs: false,
    authorProfilesModule: false,
    leftSidebar: false,
    rightSidebar: false,
    headerContent: false,
    footerContent: false,
    socialMediaLinks: false,
    postHeader: false,
    comments: false,
  });
  const previewDebugEnabled = useMemo(() => isPreviewDebugEnabled(), []);

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
          setViewerMode("loggedOut");
        } else {
          setConfig(defaultSiteConfig);
          setSavedConfig(defaultSiteConfig);
          setViewerMode("loggedOut");
        }
      })
      .catch(() => {
        setConfig(defaultSiteConfig);
        setSavedConfig(defaultSiteConfig);
        setViewerMode("loggedOut");
      })
      .finally(() => setConfigLoading(false));
  }, [siteKey]);

  const effectiveSite =
    me && me.sites.length > 0
      ? me.sites.find((s) => s.siteKey === siteKey) ?? me.sites[0]
      : null;
  const effectiveSiteKey = effectiveSite?.siteKey ?? null;
  const paywallDetectionState = (effectiveSite?.paywallDetectionState ?? "unknown") as PaywallDetectionState;
  const shouldShowViewerModeToggle = paywallDetectionState === "detected_paywalled";

  useEffect(() => {
    if (!shouldShowViewerModeToggle) setViewerMode("loggedOut");
  }, [shouldShowViewerModeToggle]);

  useEffect(() => {
    if (!effectiveSiteKey) return;
    setCommentSettingsLoading(true);
    fetch(`/api/dashboard/settings/comments?siteKey=${encodeURIComponent(effectiveSiteKey)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const settings = data && typeof data === "object" ? {
          commentsEnabled: data.commentsEnabled ?? true,
          allowAnonymousComments: data.allowAnonymousComments ?? true,
          subscriberCommentsEnabled: data.subscriberCommentsEnabled ?? false,
          apiKeyVerified: data.apiKeyVerified ?? false,
          requireApproval: data.requireApproval ?? false,
          autoCloseAfterDays: (data.autoCloseAfterDays ?? null) as number | null,
          notifyEmail: data.notifyEmail ?? true,
          notificationEmail: (data.notificationEmail ?? null) as string | null,
          allowLikes: data.allowLikes ?? true,
          allowThreadedReplies: data.allowThreadedReplies ?? true,
          sortOrder: (["newest", "oldest", "most_liked"].includes(data.sortOrder) ? data.sortOrder : "newest") as "newest" | "oldest" | "most_liked",
        } : {
          commentsEnabled: true,
          allowAnonymousComments: true,
          subscriberCommentsEnabled: false,
          apiKeyVerified: false,
          requireApproval: false,
          autoCloseAfterDays: null as number | null,
          notifyEmail: true,
          notificationEmail: null as string | null,
          allowLikes: true,
          allowThreadedReplies: true,
          sortOrder: "newest" as "newest" | "oldest" | "most_liked",
        };
        setCommentSettings(settings);
        setSavedCommentSettings(settings);
        setCommentApiKeyStatus(settings.apiKeyVerified ? "verified" : "unverified");
      })
      .catch(() => {
        const settings = {
          commentsEnabled: true,
          allowAnonymousComments: true,
          subscriberCommentsEnabled: false,
          apiKeyVerified: false,
          requireApproval: false,
          autoCloseAfterDays: null as number | null,
          notifyEmail: true,
          notificationEmail: null as string | null,
          allowLikes: true,
          allowThreadedReplies: true,
          sortOrder: "newest" as "newest" | "oldest" | "most_liked",
        };
        setCommentSettings(settings);
        setSavedCommentSettings(settings);
      })
      .finally(() => setCommentSettingsLoading(false));
  }, [effectiveSiteKey]);

  // Fetch blog authors for the site
  useEffect(() => {
    if (!effectiveSiteKey) return;
    fetch(`/api/blog-authors/${effectiveSiteKey}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAuthors(Array.isArray(data) ? data : []))
      .catch(() => setAuthors([]));
  }, [effectiveSiteKey]);

  const openEditAuthor = useCallback((author: BlogAuthorOption) => {
    setEditAuthor(author);
    setAddAuthorContext("default");
    setNewAuthorName(author.name);
    setNewAuthorImageUrl(author.imageUrl ?? null);
    setNewAuthorBio(author.bio ?? "");
    setNewAuthorBioLong(author.bioLong ?? "");
    setNewAuthorEmail(author.email ?? "");
    setNewAuthorSocials(author.socialLinks ?? {});
    setAddAuthorModalOpen(true);
  }, []);

  const openEditAuthorProfiles = useCallback(
    (opts?: { preferredAuthorId?: string; fallbackAuthorIds?: string[] }) => {
      const author = resolveInitialAuthorForProfileEdit(
        authors,
        opts?.preferredAuthorId,
        opts?.fallbackAuthorIds
      );
      if (!author) return;
      openEditAuthor(author);
    },
    [authors, openEditAuthor]
  );

  // Fetch blog JSON and sync authors from Squarespace; add ingested authors as default (runs after config loads)
  useEffect(() => {
    if (!effectiveSiteKey || !effectiveSite || configLoading) return;
    Promise.all([
      fetch(
        `/api/config/blog-preview/${encodeURIComponent(effectiveSiteKey)}${previewDebugEnabled ? "?bbFeaturedDebug=1" : ""}`,
        { credentials: "include" }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/blog-authors/${effectiveSiteKey}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(async ([json, existingAuthors]) => {
        const rawItems = Array.isArray(json?.items) ? json.items : (json?.collection?.items ?? []);
        // Squarespace can return null entries for member-area-gated posts — filter them out
        // to prevent null-access crashes when a post is selected in the Configure panel.
        const items = rawItems.filter((item: unknown) => item != null && typeof item === 'object');
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
  }, [effectiveSiteKey, effectiveSite, configLoading, previewDebugEnabled]);

  const commentSettingsDirty = commentSettings && savedCommentSettings &&
    (commentSettings.commentsEnabled !== savedCommentSettings.commentsEnabled ||
     commentSettings.allowAnonymousComments !== savedCommentSettings.allowAnonymousComments ||
     commentSettings.subscriberCommentsEnabled !== savedCommentSettings.subscriberCommentsEnabled ||
     commentSettings.requireApproval !== savedCommentSettings.requireApproval ||
     (commentSettings.autoCloseAfterDays ?? null) !== (savedCommentSettings.autoCloseAfterDays ?? null) ||
     commentSettings.notifyEmail !== savedCommentSettings.notifyEmail ||
     commentSettings.allowLikes !== savedCommentSettings.allowLikes ||
     commentSettings.allowThreadedReplies !== savedCommentSettings.allowThreadedReplies ||
     commentSettings.sortOrder !== savedCommentSettings.sortOrder);
  const isDirty = !configsEqual(config, savedConfig) || !!commentSettingsDirty;
  const effectiveConfig = selectedLevel === "collection"
    ? config.collectionConfig[viewerMode]
    : config.postConfig[viewerMode];

  useEffect(() => {
    if (!me || me.sites.length === 0) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/templates?level=collection", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : { templates: [] }
      ),
      fetch("/api/templates?level=post", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : { templates: [] }
      ),
    ])
      .then(([coll, post]) => {
        if (cancelled) return;
        setTemplateCatalogCollection(Array.isArray(coll?.templates) ? coll.templates : []);
        setTemplateCatalogPost(Array.isArray(post?.templates) ? post.templates : []);
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateCatalogCollection([]);
          setTemplateCatalogPost([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [me]);

  const unmodifiedTemplateInUse = useMemo((): { name: string; kind: "collection" | "post" } | null => {
    if (selectedLevel === "collection") {
      const tid = config.collectionTemplateId;
      if (!tid) return null;
      const t = templateCatalogCollection.find((x) => x.id === tid);
      if (!t?.collectionConfig || typeof t.collectionConfig !== "object") return null;
      const parsed = parseLevelConfig(t.collectionConfig as Record<string, unknown>, "collection");
      if (!levelConfigsEqual(config.collectionConfig[viewerMode], parsed)) return null;
      return { name: t.name, kind: "collection" };
    }
    const tid = config.postTemplateId;
    if (!tid) return null;
    const t = templateCatalogPost.find((x) => x.id === tid);
    if (!t?.postConfig || typeof t.postConfig !== "object") return null;
    const parsed = parseLevelConfig(t.postConfig as Record<string, unknown>, "post") as PostLevelConfig;
    if (!levelConfigsEqual(config.postConfig[viewerMode], parsed)) return null;
    return { name: t.name, kind: "post" };
  }, [
    selectedLevel,
    config.collectionConfig,
    config.collectionTemplateId,
    config.postConfig,
    config.postTemplateId,
    templateCatalogCollection,
    templateCatalogPost,
    viewerMode,
  ]);
  const pathPrefix = selectedLevel === "collection"
    ? `collectionConfig.${viewerMode}`
    : `postConfig.${viewerMode}`;
  const updateLevelConfigPath = (subPath: string, value: unknown) => updateConfig(`${pathPrefix}.${subPath}`, value);
  const moduleOrderPathForLocation = useCallback((loc: FeatureModuleLocation): "headerContent.moduleOrder" | "leftSidebar.moduleOrder" | "rightSidebar.moduleOrder" | "footerContent.moduleOrder" => {
    if (loc === "header") return "headerContent.moduleOrder";
    if (loc === "leftSidebar") return "leftSidebar.moduleOrder";
    if (loc === "rightSidebar") return "rightSidebar.moduleOrder";
    return "footerContent.moduleOrder";
  }, []);
  const moduleOrderForLocation = useCallback((cfg: BaseLevelConfig, loc: FeatureModuleLocation): string[] => {
    if (loc === "header") return cfg.headerContent.moduleOrder ?? [];
    if (loc === "leftSidebar") return cfg.leftSidebar.moduleOrder ?? [];
    if (loc === "rightSidebar") return cfg.rightSidebar.moduleOrder ?? [];
    return cfg.footerContent?.moduleOrder ?? [];
  }, []);
  const isModuleInFeatureLocation = useCallback(
    (moduleId: string, loc: FeatureModuleLocation, postHeaderModuleKey?: PostHeaderModuleKey): boolean => {
      if (selectedLevel === "post" && loc === "header" && postHeaderModuleKey) {
        const pm = (effectiveConfig as PostLevelConfig).postModules?.[postHeaderModuleKey];
        if (!pm || typeof pm !== "object" || !("enabled" in pm) || !("position" in pm)) return false;
        return Boolean((pm as { enabled?: boolean }).enabled) && (pm as { position?: ModulePosition }).position === "header";
      }
      return moduleOrderForLocation(effectiveConfig, loc).includes(moduleId);
    },
    [effectiveConfig, moduleOrderForLocation, selectedLevel]
  );
  const addFeatureLocation = useCallback(
    (moduleId: string, loc: FeatureModuleLocation, postHeaderModuleKey?: PostHeaderModuleKey) => {
      if (selectedLevel === "post" && loc === "header" && postHeaderModuleKey) {
        updateLevelConfigPath(`postModules.${postHeaderModuleKey}.enabled`, true);
        updateLevelConfigPath(`postModules.${postHeaderModuleKey}.position`, "header");
        const headerOrder = effectiveConfig.headerContent.moduleOrder ?? [];
        if (!headerOrder.includes(moduleId)) {
          updateLevelConfigPath("headerContent.moduleOrder", [moduleId, ...headerOrder.filter((m) => m !== moduleId)]);
        }
        return;
      }
      const zonePath = moduleOrderPathForLocation(loc);
      const order = moduleOrderForLocation(effectiveConfig, loc);
      if (order.includes(moduleId)) return;
      updateLevelConfigPath(zonePath, [moduleId, ...order.filter((m) => m !== moduleId)]);
    },
    [effectiveConfig, moduleOrderForLocation, moduleOrderPathForLocation, selectedLevel]
  );
  const removeFeatureLocation = useCallback(
    (moduleId: string, loc: FeatureModuleLocation, postHeaderModuleKey?: PostHeaderModuleKey) => {
      if (selectedLevel === "post" && loc === "header" && postHeaderModuleKey) {
        updateLevelConfigPath(`postModules.${postHeaderModuleKey}.position`, "none");
        return;
      }
      const zonePath = moduleOrderPathForLocation(loc);
      const order = moduleOrderForLocation(effectiveConfig, loc);
      updateLevelConfigPath(zonePath, order.filter((m) => m !== moduleId));
    },
    [effectiveConfig, moduleOrderForLocation, moduleOrderPathForLocation, selectedLevel]
  );
  const renderFeatureLocationControl = useCallback((
    moduleId: string,
    allowedLocations: FeatureModuleLocation[],
    postHeaderModuleKey?: PostHeaderModuleKey,
  ) => {
    const selectedLocations = allowedLocations.filter((loc) => isModuleInFeatureLocation(moduleId, loc, postHeaderModuleKey));
    const availableLocations = allowedLocations.filter((loc) => !selectedLocations.includes(loc));
    return (
      <div className="space-y-2">
        <Label className="text-xs text-[#6b6b6b]">Location</Label>
        <div className="flex flex-wrap items-center gap-2">
          {selectedLocations.map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center gap-1 rounded-full border border-[#e5e4e0] bg-white px-2 py-0.5 text-xs text-[#4a4a4a]"
            >
              {FEATURE_LOCATION_LABELS[loc]}
              <button
                type="button"
                onClick={() => removeFeatureLocation(moduleId, loc, postHeaderModuleKey)}
                className="rounded p-0.5 hover:bg-red-100 hover:text-red-600"
                aria-label={`Remove ${FEATURE_LOCATION_LABELS[loc]}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {availableLocations.length > 0 && (
            <Select value="" onValueChange={(v) => v && addFeatureLocation(moduleId, v as FeatureModuleLocation, postHeaderModuleKey)}>
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue placeholder="Add location..." />
              </SelectTrigger>
              <SelectContent>
                {availableLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{FEATURE_LOCATION_LABELS[loc]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    );
  }, [addFeatureLocation, isModuleInFeatureLocation, removeFeatureLocation]);
  /** Aligns with iframe postMessage: collection tab = list; post tab = single post (default first post if none selected). */
  const previewSelectedPostIndex =
    selectedLevel === "collection" ? -1 : selectedPostIndex >= 0 ? selectedPostIndex : 0;
  const getFeaturedPostKey = useCallback((item: { id?: string; fullUrl?: string; title?: string }, idx: number): string => {
    const key = item.id ?? item.fullUrl ?? item.title;
    if (typeof key === "string" && key.trim()) return key.trim();
    return `idx:${idx}`;
  }, []);
  const featuredArticleOptions = useMemo(
    () => blogItems.map((item, idx) => ({
      value: getFeaturedPostKey(item, idx),
      label: (item.title && item.title.trim()) ? item.title.trim() : `Untitled post ${idx + 1}`,
    })),
    [blogItems, getFeaturedPostKey]
  );
  const sortedBlogItemsForFeatured = useMemo(
    () => sortBlogItemsForFeaturedPool(blogItems, config.collectionConfig[viewerMode]),
    [blogItems, config.collectionConfig, viewerMode]
  );
  const effectiveFeaturedArticle = useMemo(() => {
    const fa = config.collectionConfig[viewerMode].featuredArticle ?? defaultFeaturedArticle;
    return resolveEffectiveFeaturedArticle({
      sortedPool: sortedBlogItemsForFeatured,
      featuredPostId: fa.featuredPostId,
      getKey: getFeaturedPostKey,
    });
  }, [config.collectionConfig, viewerMode, sortedBlogItemsForFeatured, getFeaturedPostKey]);
  const featuredPostSelectValue = useMemo(() => {
    const fpId = (config.collectionConfig[viewerMode].featuredArticle ?? defaultFeaturedArticle).featuredPostId;
    if (fpId === null || fpId === undefined || (typeof fpId === "string" && !fpId.trim())) {
      return FEATURED_POST_SELECT_AUTO;
    }
    const trimmed = String(fpId).trim();
    const idx = blogItems.findIndex((item, i) => getFeaturedPostKey(item, i) === trimmed);
    return idx >= 0 ? getFeaturedPostKey(blogItems[idx], idx) : FEATURED_POST_SELECT_AUTO;
  }, [config.collectionConfig, viewerMode, blogItems, getFeaturedPostKey]);
  const rendererConfig = useMemo(() => {
    const base = configToRendererConfig(config);
    const authorMap: Record<string, string> = {};
    const authorProfiles: Record<string, { name: string; imageUrl: string | null; bio: string | null; bioLong: string | null; email: string | null; socialLinks: Record<string, string> }> = {};
    for (const a of authors) {
      authorMap[a.id] = a.name;
      authorProfiles[a.id] = {
        name: a.name,
        imageUrl: a.imageUrl ?? null,
        bio: a.bio ?? null,
        bioLong: a.bioLong ?? null,
        email: a.email ?? null,
        socialLinks: a.socialLinks ?? {},
      };
    }
    return {
      ...base,
      authorMap,
      authorProfiles,
      baseUrl: typeof window !== "undefined" ? window.location.origin : "",
      siteKey: effectiveSiteKey ?? undefined,
      siteId: effectiveSite?.id ?? undefined,
      viewerMode,
      paywallMode: effectiveSite?.paywallMode ?? "auto",
      previewSelectedPostIndex,
      previewFeaturedDebug: previewDebugEnabled,
      previewDevice: device,
      configUpdateCallback: (path: string, value: unknown) => updateConfigRef.current(path, value),
    };
  }, [config, authors, effectiveSiteKey, effectiveSite, viewerMode, previewSelectedPostIndex, previewDebugEnabled, device]);

  // Stable signature so preview components reliably detect config changes (avoids stale effect deps)
  const configSignature = useMemo(
    () =>
      JSON.stringify({
        post: config.postConfig,
        collection: config.collectionConfig,
        viewerMode,
        paywallMode: effectiveSite?.paywallMode ?? "auto",
        previewSelectedPostIndex,
      }),
    [config.postConfig, config.collectionConfig, viewerMode, effectiveSite?.paywallMode, previewSelectedPostIndex]
  );

  useEffect(() => {
    if (!previewDebugEnabled) return;
    const levelCfg = selectedLevel === "collection" ? config.collectionConfig[viewerMode] : config.postConfig[viewerMode];
    console.log("[Configure] Preview state", {
      selectedLevel,
      selectedPostIndex,
      previewSelectedPostIndex,
      configSignature,
      leftSidebar: levelCfg.leftSidebar,
      rightSidebar: levelCfg.rightSidebar,
      headerContent: levelCfg.headerContent,
      footerContent: levelCfg.footerContent,
    });
  }, [previewDebugEnabled, selectedLevel, selectedPostIndex, previewSelectedPostIndex, configSignature, config.collectionConfig, config.postConfig, viewerMode]);

  const handleSave = useCallback(async () => {
    const keyToSave = effectiveSiteKey ?? siteKey;
    if (!keyToSave) return;
    setSaving(true);
    const apiBase = typeof window !== "undefined" ? window.location.origin : "";
    try {
      // For sites without a paywall distinction, the viewer mode toggle is never shown
      // and all edits go to the loggedOut bucket only. Mirror loggedOut → loggedIn so
      // both branches in the DB stay identical and the live blog uses correct settings
      // regardless of which context the renderer resolves.
      const configToSave: SiteConfigForm = !shouldShowViewerModeToggle
        ? {
            ...config,
            collectionConfig: {
              loggedOut: config.collectionConfig.loggedOut,
              loggedIn: config.collectionConfig.loggedOut,
            },
            postConfig: {
              loggedOut: config.postConfig.loggedOut,
              loggedIn: config.postConfig.loggedOut,
            },
          }
        : config;
      const [configRes, commentsRes] = await Promise.all([
        fetch(`${apiBase}/api/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ siteKey: keyToSave, config: configToApiPayload(configToSave) }),
        }),
        commentSettings
          ? fetch(`${apiBase}/api/dashboard/settings/comments`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                siteKey: keyToSave,
                commentsEnabled: commentSettings.commentsEnabled,
                allowAnonymousComments: commentSettings.allowAnonymousComments,
                subscriberCommentsEnabled: commentSettings.subscriberCommentsEnabled,
                requireApproval: commentSettings.requireApproval,
                autoCloseAfterDays: commentSettings.autoCloseAfterDays,
                notifyEmail: commentSettings.notifyEmail,
                notificationEmail: null,
                allowLikes: commentSettings.allowLikes,
                allowThreadedReplies: commentSettings.allowThreadedReplies,
                sortOrder: commentSettings.sortOrder,
              }),
            })
          : Promise.resolve({ ok: true } as Response),
      ]);
      const configOk = configRes.ok;
      const commentsOk = !commentSettings || (commentsRes as Response).ok;
      if (configOk) setSavedConfig(config);
      if (commentsOk && commentSettings) setSavedCommentSettings(commentSettings);
      if (configOk && commentsOk) {
        toast.success("Configuration saved successfully!");
      } else {
        if (!configOk) {
          const data = await configRes.json().catch(() => ({}));
          toast.error(data?.error ?? "Failed to save configuration.");
        } else if (!commentsOk && commentSettings) {
          const data = await (commentsRes as Response).json().catch(() => ({}));
          toast.error(data?.error ?? "Failed to save comment settings.");
        }
      }
    } catch {
      toast.error("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }, [effectiveSiteKey, siteKey, config, commentSettings, shouldShowViewerModeToggle]);

  const handleReset = () => {
    setConfig(savedConfig);
    if (savedCommentSettings) setCommentSettings(savedCommentSettings);
    toast.info("Changes reverted.");
  };

  const handleConfirmClearSettings = useCallback(() => {
    if (!clearSettingsCollection && !clearSettingsPost) return;
    setConfig((prev) => {
      const next: SiteConfigForm = { ...prev };
      if (clearSettingsCollection) {
        next.collectionConfig = {
          loggedOut: JSON.parse(JSON.stringify(defaultCollectionConfig)) as CollectionLevelConfig,
          loggedIn: JSON.parse(JSON.stringify(defaultCollectionConfig)) as CollectionLevelConfig,
        };
        next.collectionTemplateId = null;
      }
      if (clearSettingsPost) {
        next.postConfig = {
          loggedOut: JSON.parse(JSON.stringify(defaultPostConfig)) as PostLevelConfig,
          loggedIn: JSON.parse(JSON.stringify(defaultPostConfig)) as PostLevelConfig,
        };
        next.postTemplateId = null;
      }
      const copy = JSON.parse(JSON.stringify(next)) as SiteConfigForm;
      applyDerivedModules(copy);
      return copy;
    });
    setClearSettingsModalOpen(false);
    setClearSettingsCollection(false);
    setClearSettingsPost(false);
    toast.success("Selected layout settings were reset to defaults. Save to publish on your blog.");
  }, [clearSettingsCollection, clearSettingsPost]);

  const handleSelectTemplate = useCallback(
    (template: Template, level: "collection" | "post") => {
      if (level === "collection" && template.collectionConfig && typeof template.collectionConfig === "object") {
        const parsedCollection = parseLevelConfig(template.collectionConfig as Record<string, unknown>, "collection") as CollectionLevelConfig;
        setConfig((prev) => ({
          ...prev,
          collectionConfig: shouldShowViewerModeToggle
            ? { ...prev.collectionConfig, [viewerMode]: parsedCollection }
            : { loggedOut: parsedCollection, loggedIn: parsedCollection },
          collectionTemplateId: template.id,
        }));
        if (previewDebugEnabled) {
          console.log("[Configure] Applied collection template", {
            templateId: template.id,
            templateName: template.name,
            leftSidebar: parsedCollection.leftSidebar,
            rightSidebar: parsedCollection.rightSidebar,
            headerContent: parsedCollection.headerContent,
            footerContent: parsedCollection.footerContent,
          });
        }
        toast.success(`Applied "${template.name}" collection template.`);
      } else if (level === "post" && template.postConfig && typeof template.postConfig === "object") {
        const parsedPost = parseLevelConfig(template.postConfig as Record<string, unknown>, "post") as PostLevelConfig;
        setConfig((prev) => ({
          ...prev,
          postConfig: shouldShowViewerModeToggle
            ? { ...prev.postConfig, [viewerMode]: parsedPost }
            : { loggedOut: parsedPost, loggedIn: parsedPost },
          postTemplateId: template.id,
        }));
        if (previewDebugEnabled) {
          console.log("[Configure] Applied post template", {
            templateId: template.id,
            templateName: template.name,
            leftSidebar: parsedPost.leftSidebar,
            rightSidebar: parsedPost.rightSidebar,
            headerContent: parsedPost.headerContent,
            footerContent: parsedPost.footerContent,
            postHeader: parsedPost.postHeader,
          });
        }
        toast.success(`Applied "${template.name}" post template.`);
      }
    },
    [previewDebugEnabled, viewerMode, shouldShowViewerModeToggle]
  );

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
        const rest = path.slice("collectionConfig.".length);
        const [context, ...subParts] = rest.split(".");
        const targetContext = context === "loggedOut" || context === "loggedIn" ? context : viewerMode;
        const sub = context === "loggedOut" || context === "loggedIn" ? subParts.join(".") : rest;
        next.collectionConfig = {
          ...prev.collectionConfig,
          [targetContext]: updateLevelConfig(prev.collectionConfig[targetContext], sub, value) as CollectionLevelConfig,
        };
      } else if (path.startsWith("postConfig.")) {
        const rest = path.slice("postConfig.".length);
        const [context, ...subParts] = rest.split(".");
        const targetContext = context === "loggedOut" || context === "loggedIn" ? context : viewerMode;
        const sub = context === "loggedOut" || context === "loggedIn" ? subParts.join(".") : rest;
        next.postConfig = {
          ...prev.postConfig,
          [targetContext]: updateLevelConfig(prev.postConfig[targetContext], sub, value) as PostLevelConfig,
        };
      } else if (path === "collectionTemplateId") next.collectionTemplateId = value as string | null;
      else if (path === "postTemplateId") next.postTemplateId = value as string | null;
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
    if (path === "pagination.show") return { ...cfg, pagination: { ...((cfg as CollectionLevelConfig).pagination ?? { show: false, mode: "pages", postsPerPage: 10 }), show: value as boolean } };
    if (path === "pagination.mode") return { ...cfg, pagination: { ...((cfg as CollectionLevelConfig).pagination ?? { show: false, mode: "pages", postsPerPage: 10 }), mode: value as PaginationMode } };
    if (path === "pagination.postsPerPage") return { ...cfg, pagination: { ...((cfg as CollectionLevelConfig).pagination ?? { show: false, mode: "pages", postsPerPage: 10 }), postsPerPage: value as PostsPerPageOption } };
    if (path === "collectionLayout" && "collectionLayout" in cfg) return { ...cfg, collectionLayout: value as CollectionLayoutMode };
    if (path === "gridColumns" && "gridColumns" in cfg) return { ...cfg, gridColumns: value as GridColumnsOption };
    if (path === "featuredArticle.show" && "featuredArticle" in cfg) return { ...cfg, featuredArticle: { ...((cfg as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle), show: value as boolean } };
    if (path === "featuredArticle.position" && "featuredArticle" in cfg) return { ...cfg, featuredArticle: { ...((cfg as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle), position: value as FeaturedArticlePosition } };
    if (path === "featuredArticle.featuredPostId" && "featuredArticle" in cfg) {
      const prevFa = { ...((cfg as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle) };
      if (value === undefined) {
        const { featuredPostId: _omit, ...restFa } = prevFa;
        return { ...cfg, featuredArticle: restFa };
      }
      return { ...cfg, featuredArticle: { ...prevFa, featuredPostId: value as string | null } };
    }
    if (path.startsWith("collectionModules.") && "collectionModules" in cfg) {
      const cm = { ...(cfg as CollectionLevelConfig).collectionModules } as CollectionModulesConfig;
      if (path === "collectionModules.filter.filterByTags") cm.filter = { ...cm.filter, filterByTags: value as boolean };
      else if (path === "collectionModules.filter.filterByCategories") cm.filter = { ...cm.filter, filterByCategories: value as boolean };
      else if (path === "collectionModules.emailCapture.header") cm.emailCapture = { ...cm.emailCapture, header: value as string };
      else if (path === "collectionModules.emailCapture.byline") cm.emailCapture = { ...cm.emailCapture, byline: value as string | undefined };
      else if (path === "collectionModules.emailCapture.buttonText") cm.emailCapture = { ...cm.emailCapture, buttonText: value as string };
      else if (path === "collectionModules.leadMagnet.resourceTitle") cm.leadMagnet = { ...cm.leadMagnet, resourceTitle: value as string };
      else if (path === "collectionModules.leadMagnet.description") cm.leadMagnet = { ...cm.leadMagnet, description: value as string };
      else if (path === "collectionModules.leadMagnet.buttonText") cm.leadMagnet = { ...cm.leadMagnet, buttonText: value as string };
      else return cfg;
      return syncModuleOrderFromExplicit(cfg as CollectionLevelConfig, cm, undefined) as typeof cfg;
    }
    if (path.startsWith("postModules.") && "postModules" in cfg) {
      const pm = { ...(cfg as PostLevelConfig).postModules } as PostModulesConfig;
      if (path === "postModules.tableOfContents.enabled") pm.tableOfContents = { ...pm.tableOfContents, enabled: value as boolean };
      else if (path === "postModules.tableOfContents.position") pm.tableOfContents = { ...pm.tableOfContents, position: value as ModulePosition };
      else if (path === "postModules.tableOfContents.style") pm.tableOfContents = { ...pm.tableOfContents, style: value as TocStyle };
      else if (path === "postModules.breadcrumbs.enabled") pm.breadcrumbs = { ...pm.breadcrumbs, enabled: value as boolean };
      else if (path === "postModules.breadcrumbs.position") pm.breadcrumbs = { ...pm.breadcrumbs, position: value as ModulePosition };
      else if (path === "postModules.authorProfiles.enabled") pm.authorProfiles = { ...pm.authorProfiles, enabled: value as boolean };
      else if (path === "postModules.authorProfiles.position") pm.authorProfiles = { ...pm.authorProfiles, position: value as ModulePosition };
      else if (path === "postModules.popularPosts.enabled") pm.popularPosts = { ...pm.popularPosts, enabled: value as boolean };
      else if (path === "postModules.popularPosts.position") pm.popularPosts = { ...pm.popularPosts, position: value as ModulePosition };
      else if (path === "postModules.popularPosts.count") pm.popularPosts = { ...pm.popularPosts, count: Math.min(20, Math.max(1, Number(value) || 5)) };
      else if (path === "postModules.relevantPosts.enabled") pm.relevantPosts = { ...pm.relevantPosts, enabled: value as boolean };
      else if (path === "postModules.relevantPosts.position") pm.relevantPosts = { ...pm.relevantPosts, position: value as ModulePosition };
      else if (path === "postModules.emailCapture.enabled") pm.emailCapture = { ...pm.emailCapture, enabled: value as boolean };
      else if (path === "postModules.emailCapture.position") pm.emailCapture = { ...pm.emailCapture, position: value as ModulePosition };
      else if (path === "postModules.emailCapture.header") pm.emailCapture = { ...pm.emailCapture, header: value as string };
      else if (path === "postModules.emailCapture.byline") pm.emailCapture = { ...pm.emailCapture, byline: value as string | undefined };
      else if (path === "postModules.emailCapture.buttonText") pm.emailCapture = { ...pm.emailCapture, buttonText: value as string };
      else if (path === "postModules.leadMagnet.enabled") pm.leadMagnet = { ...pm.leadMagnet, enabled: value as boolean };
      else if (path === "postModules.leadMagnet.position") pm.leadMagnet = { ...pm.leadMagnet, position: value as ModulePosition };
      else if (path === "postModules.leadMagnet.resourceTitle") pm.leadMagnet = { ...pm.leadMagnet, resourceTitle: value as string };
      else if (path === "postModules.leadMagnet.description") pm.leadMagnet = { ...pm.leadMagnet, description: value as string };
      else if (path === "postModules.leadMagnet.buttonText") pm.leadMagnet = { ...pm.leadMagnet, buttonText: value as string };
      else return cfg;
      return syncModuleOrderFromExplicit(undefined, undefined, cfg as PostLevelConfig, pm) as typeof cfg;
    }
    if (path === "leftSidebar.moduleOrder") return { ...cfg, leftSidebar: { ...cfg.leftSidebar, moduleOrder: value as string[] } };
    if (path === "rightSidebar.moduleOrder") return { ...cfg, rightSidebar: { ...cfg.rightSidebar, moduleOrder: value as string[] } };
    if (path === "headerContent.moduleOrder") return { ...cfg, headerContent: { ...cfg.headerContent, moduleOrder: value as string[] } };
    if (path === "footerContent.topPadding") return { ...cfg, footerContent: { ...cfg.footerContent, topPadding: value as number } };
    if (path === "footerContent.moduleOrder") return { ...cfg, footerContent: { ...cfg.footerContent, moduleOrder: value as string[] } };
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
    if (path === "postHeader.imagePosition" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, imagePosition: value as PostHeaderImagePosition } };
    if (path === "postHeader.contentAlignment" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, contentAlignment: value as PostHeaderContentAlignment } };
    if (path === "postHeader.fullBleedLayout" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, fullBleedLayout: value as PostHeaderFullBleedLayout } };
    if (path === "postHeader.sideGap" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, sideGap: value as number } };
    if (path === "postHeader.showBreadcrumbs" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, showBreadcrumbs: value as boolean } };
    if (path === "postHeader.showTags" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, showTags: value as boolean } };
    if (path === "postHeader.showCategories" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, showCategories: value as boolean } };
    if (path === "postHeader.showByline" && "postHeader" in cfg) return { ...cfg, postHeader: { ...(cfg as PostLevelConfig).postHeader!, showByline: value as boolean } };
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
      <aside className="relative z-20 flex w-80 min-w-0 max-w-80 shrink-0 flex-col overflow-x-hidden bg-white border-r border-[#e5e4e0] min-h-0 shadow-sm">
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
            {shouldShowViewerModeToggle && (
              <div className="flex gap-1 p-1 rounded-lg bg-[#e5e4e0]/50">
                <button
                  type="button"
                  onClick={() => setViewerMode("loggedOut")}
                  className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors ${
                    viewerMode === "loggedOut" ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#6b6b6b] hover:text-[#0a0a0a]"
                  }`}
                >
                  Logged out
                </button>
                <button
                  type="button"
                  onClick={() => setViewerMode("loggedIn")}
                  className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors ${
                    viewerMode === "loggedIn" ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#6b6b6b] hover:text-[#0a0a0a]"
                  }`}
                >
                  Logged in
                </button>
              </div>
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
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setTemplateModalOpen(true)}
            >
              Use a template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[#9a1a3e] border-[#e5e4e0] hover:bg-[#fef2f4] hover:text-[#7a1532]"
              disabled={configLoading || !effectiveSiteKey}
              onClick={() => {
                setClearSettingsCollection(false);
                setClearSettingsPost(false);
                setClearSettingsModalOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Clear all settings
            </Button>
            <Dialog
              open={clearSettingsModalOpen}
              onOpenChange={(open) => {
                setClearSettingsModalOpen(open);
                if (!open) {
                  setClearSettingsCollection(false);
                  setClearSettingsPost(false);
                }
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Clear layout settings?</DialogTitle>
                  <DialogDescription>
                    This resets BetterBlog layout options to their defaults for the levels you choose. Default authors and comment settings are not changed. Use Save when you are ready to update your live blog.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <label className="flex items-start gap-3 cursor-pointer rounded-md border border-[#e5e4e0] p-3 hover:bg-[#f7f6f3]/80">
                    <Checkbox
                      className="mt-0.5"
                      checked={clearSettingsCollection}
                      onCheckedChange={(v) => setClearSettingsCollection(Boolean(v))}
                    />
                    <span>
                      <span className="text-sm font-medium text-[#0a0a0a] block">Collection</span>
                      <span className="text-xs text-[#6b6b6b]">Blog index: layout, sidebars, modules, featured article, pagination, etc.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer rounded-md border border-[#e5e4e0] p-3 hover:bg-[#f7f6f3]/80">
                    <Checkbox
                      className="mt-0.5"
                      checked={clearSettingsPost}
                      onCheckedChange={(v) => setClearSettingsPost(Boolean(v))}
                    />
                    <span>
                      <span className="text-sm font-medium text-[#0a0a0a] block">Post</span>
                      <span className="text-xs text-[#6b6b6b]">Single post: header, progress bar, post modules, sidebars, etc.</span>
                    </span>
                  </label>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClearSettingsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!clearSettingsCollection && !clearSettingsPost}
                    onClick={handleConfirmClearSettings}
                  >
                    Clear selected
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {unmodifiedTemplateInUse && (
              <p className="text-xs text-[#6b6b6b] leading-snug">
                {unmodifiedTemplateInUse.kind === "collection" ? "Collection" : "Post"} template in use:{" "}
                <span className="font-medium text-[#0a0a0a]">{unmodifiedTemplateInUse.name}</span>
              </p>
            )}
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
          <TemplateModal
            open={templateModalOpen}
            onOpenChange={setTemplateModalOpen}
            onSelectTemplate={handleSelectTemplate}
          />
          <h2 className="font-semibold text-lg">Settings</h2>
        </div>

        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="min-w-0 space-y-2 p-6">
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

                    {selectedLevel === "post" && (
                    <div className="flex items-center justify-between py-3 border-b border-[#e5e4e0]">
                      <span className="font-medium">Show Author(s)</span>
                      <div className="flex items-center gap-1">
                        <Switch
                          id="show-author-post"
                          checked={effectiveConfig.showAuthor}
                          onCheckedChange={(v) => updateLevelConfigPath("showAuthor", v)}
                        />
                        <span className="w-6 h-6 shrink-0" aria-hidden />
                      </div>
                    </div>
                    )}

                    {selectedLevel === "collection" && (
                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium">Collection Layout</span>
                          <span className="text-xs text-[#6b6b6b] truncate">
                            {(() => {
                              const layout = (effectiveConfig as CollectionLevelConfig).collectionLayout ?? "grid";
                              if (layout === "grid") return "Masthead";
                              if (layout === "listRows") return "Newsroom";
                              if (layout === "editorial") return "Editorial";
                              if (layout === "showcase") return "Showcase";
                              if (layout === "digest") return "Digest";
                              return "Masthead";
                            })()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSectionExpanded((p) => ({ ...p, collectionLayout: !p.collectionLayout }))}
                          className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                          aria-label={sectionExpanded.collectionLayout ? "Collapse" : "Expand"}
                        >
                          {sectionExpanded.collectionLayout ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                      <Collapsible open={sectionExpanded.collectionLayout}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Layout</Label>
                              <Select
                                value={(effectiveConfig as CollectionLevelConfig).collectionLayout ?? "grid"}
                                onValueChange={(v) => updateLevelConfigPath("collectionLayout", v as CollectionLayoutMode)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="grid">Masthead</SelectItem>
                                  <SelectItem value="listRows">Newsroom</SelectItem>
                                  <SelectItem value="editorial">Editorial</SelectItem>
                                  <SelectItem value="showcase">Showcase</SelectItem>
                                  <SelectItem value="digest">Digest</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    )}

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
                            <Label className="text-xs text-[#6b6b6b]">Mode</Label>
                            <Select
                              value={(effectiveConfig as CollectionLevelConfig).pagination?.mode ?? "pages"}
                              onValueChange={(v) => updateLevelConfigPath("pagination.mode", v as PaginationMode)}
                            >
                              <SelectTrigger className="mt-2 w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pages">Numbered pages</SelectItem>
                                <SelectItem value="infiniteScroll">Infinite scroll</SelectItem>
                              </SelectContent>
                            </Select>
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

                    {selectedLevel === "collection" && (
                    <div className="min-w-0 border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Featured Article</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={((effectiveConfig as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle).show}
                            onCheckedChange={(v) => {
                              updateLevelConfigPath("featuredArticle.show", v);
                              setSectionExpanded((p) => ({ ...p, featuredArticle: v }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => ((effectiveConfig as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle).show && setSectionExpanded((p) => ({ ...p, featuredArticle: !p.featuredArticle }))}
                            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!((effectiveConfig as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle).show ? "invisible pointer-events-none" : ""}`}
                            aria-label={sectionExpanded.featuredArticle ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.featuredArticle ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={((effectiveConfig as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle).show && sectionExpanded.featuredArticle}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-4">
                            <div className="min-w-0 space-y-2 rounded-md border border-[#e5e4e0] bg-[#fafaf9] px-3 py-2.5">
                              <Label className="text-xs text-[#6b6b6b]">Currently featured</Label>
                              <p className="text-sm font-medium text-[#0a0a0a] break-words">
                                {effectiveFeaturedArticle.post
                                  ? (effectiveFeaturedArticle.post.title?.trim() || "Untitled")
                                  : blogItems.length === 0
                                    ? "No posts loaded yet"
                                    : "—"}
                              </p>
                              <p className="text-xs text-[#6b6b6b]">
                                {effectiveFeaturedArticle.post
                                  ? effectiveFeaturedArticle.source === "betterblog"
                                    ? "Pinned in BetterBlog"
                                    : effectiveFeaturedArticle.source === "squarespace"
                                      ? "From Squarespace"
                                      : "Newest in sort order (fallback)"
                                  : null}
                              </p>
                            </div>
                            <div className="min-w-0 space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Featured post</Label>
                              <Select
                                value={featuredPostSelectValue}
                                onValueChange={(v) => {
                                  if (v === FEATURED_POST_SELECT_AUTO) {
                                    updateLevelConfigPath("featuredArticle.featuredPostId", null);
                                    return;
                                  }
                                  updateLevelConfigPath("featuredArticle.featuredPostId", v);
                                }}
                              >
                                <SelectTrigger className="w-full min-w-0 max-w-full whitespace-normal">
                                  <SelectValue placeholder="Choose featured post" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={FEATURED_POST_SELECT_AUTO}>
                                    Automatic (Squarespace, else newest)
                                  </SelectItem>
                                  {featuredArticleOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="min-w-0 space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Position</Label>
                              <Select
                                value={((effectiveConfig as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle).position}
                                onValueChange={(v) => updateLevelConfigPath("featuredArticle.position", v as FeaturedArticlePosition)}
                              >
                                <SelectTrigger className="w-full min-w-0 max-w-full whitespace-normal">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="header">Header (hero image with overlay)</SelectItem>
                                  <SelectItem value="inLayout">In-layout (at top with indicator)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
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
                    {selectedPostIndex >= 0 && blogItems.length > 0 && selectedPostIndex < blogItems.length && blogItems[selectedPostIndex] != null ? (
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
                                  <div className="space-y-2 w-full">
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
                                            onClick={() => author && openEditAuthor(author)}
                                            className="hover:opacity-70"
                                            aria-label="Edit author"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
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
                                    <DropdownMenu open={authorDropdownOpen} onOpenChange={setAuthorDropdownOpen}>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="h-8 w-28 text-xs flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                                        >
                                          <Plus className="h-3 w-3" /> Add
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="min-w-[180px]">
                                        {authors.map((a) => (
                                          <DropdownMenuItem
                                            key={a.id}
                                            onSelect={() => {
                                              if (!displayIds.includes(a.id)) {
                                                updateConfig(`postAuthorOverrides.${postId}`, [...displayIds, a.id]);
                                              }
                                            }}
                                            className="flex items-center justify-between gap-2"
                                          >
                                            <span className="truncate">{a.name}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                openEditAuthor(a);
                                                setAuthorDropdownOpen(false);
                                              }}
                                              className="shrink-0 p-0.5 rounded hover:bg-[#e5e4e0]/50"
                                              aria-label={`Edit ${a.name}`}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </button>
                                          </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuItem
                                          onSelect={() => {
                                            setEditAuthor(null);
                                            setAddAuthorContext({ postId });
                                            setAddAuthorAsDefault(false);
                                            setAddAuthorModalOpen(true);
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                          Add New Author
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={authors.length === 0}
                                    onClick={() =>
                                      openEditAuthorProfiles({ fallbackAuthorIds: displayIds })
                                    }
                                  >
                                    Edit Author Profiles
                                  </Button>
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
                                          onClick={() => author && openEditAuthor(author)}
                                          className="hover:opacity-70"
                                          aria-label="Edit author"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
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
                                <DropdownMenu open={authorDropdownOpen} onOpenChange={setAuthorDropdownOpen}>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="w-full h-9 flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    >
                                      <span>Add author…</span>
                                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                    {authors.map((a) => (
                                      <DropdownMenuItem
                                        key={a.id}
                                        onSelect={() => {
                                          if (!config.defaultAuthorIds.includes(a.id)) {
                                            updateConfig("defaultAuthorIds", [...config.defaultAuthorIds, a.id]);
                                          }
                                        }}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <span className="truncate">{a.name}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openEditAuthor(a);
                                            setAuthorDropdownOpen(false);
                                          }}
                                          className="shrink-0 p-0.5 rounded hover:bg-[#e5e4e0]/50"
                                          aria-label={`Edit ${a.name}`}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setEditAuthor(null);
                                        setAddAuthorContext("default");
                                        setAddAuthorAsDefault(true);
                                        setAddAuthorModalOpen(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add New Author
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={authors.length === 0}
                                  onClick={() =>
                                    openEditAuthorProfiles({
                                      fallbackAuthorIds: config.defaultAuthorIds,
                                    })
                                  }
                                >
                                  Edit Author Profiles
                                </Button>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    {/* Comments */}
                    {selectedLevel === "post" && (
                    <div className="pt-4 pb-1 text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#7a4a1a] border-b border-[rgba(122,74,26,0.2)]">
                      Comments
                    </div>
                    )}
                    {selectedLevel === "post" && (commentSettingsLoading ? (
                      <div className="border-b border-[#e5e4e0] py-4 text-sm text-[#6b6b6b]">Loading comment settings…</div>
                    ) : commentSettings && (
                    <div className="border-b border-[#e5e4e0] pb-4">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Show Comments</span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={commentSettings.commentsEnabled}
                            onCheckedChange={(v) => setCommentSettings((p) => p ? { ...p, commentsEnabled: v } : p)}
                          />
                          <button
                            type="button"
                            onClick={() => setSectionExpanded((p) => ({ ...p, comments: !p.comments }))}
                            className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                            aria-label={sectionExpanded.comments ? "Collapse" : "Expand"}
                          >
                            {sectionExpanded.comments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Collapsible open={commentSettings.commentsEnabled && sectionExpanded.comments}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Allow Anonymous Comments</Label>
                                <Switch
                                  checked={commentSettings.allowAnonymousComments}
                                  onCheckedChange={(v) => setCommentSettings((p) => p ? { ...p, allowAnonymousComments: v } : p)}
                                />
                              </div>
                              <p className="text-xs text-[#6b6b6b]">Readers can comment with name only.</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Verified Subscriber Comments</Label>
                                <Switch
                                  checked={commentSettings.subscriberCommentsEnabled}
                                  onCheckedChange={(v) => {
                                    if (!commentSettings.apiKeyVerified) return;
                                    if (v) {
                                      setCommentSettings((p) => p ? { ...p, subscriberCommentsEnabled: true } : p);
                                    } else {
                                      setCommentSettings((p) => p ? { ...p, subscriberCommentsEnabled: false } : p);
                                    }
                                  }}
                                  disabled={!commentSettings.apiKeyVerified}
                                />
                              </div>
                              <p className="text-xs text-[#6b6b6b]">Require email for paywalled posts, verified against your Squarespace member list.</p>
                              {commentSettings.apiKeyVerified && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-mono text-[#6b6b6b]">••••••••••••••••</span>
                                  <button
                                    type="button"
                                    onClick={() => setSquarespaceApiKeyModalOpen("edit")}
                                    className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] hover:text-[#0a0a0a]"
                                    aria-label="Edit API key"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                              {!commentSettings.apiKeyVerified && (
                                <button
                                  type="button"
                                  onClick={() => setSquarespaceApiKeyModalOpen("setup")}
                                  className="text-xs text-[#5B4FE8] hover:underline"
                                >
                                  Connect Squarespace API key to enable this setting
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Require Approval Before Publishing</Label>
                                <Switch
                                  checked={commentSettings.requireApproval}
                                  onCheckedChange={(v) => setCommentSettings((p) => p ? { ...p, requireApproval: v } : p)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Close Comments After</Label>
                              <div className="flex items-center gap-3">
                                <Slider
                                  value={[commentSettings.autoCloseAfterDays ?? 0]}
                                  onValueChange={([v]) => setCommentSettings((p) => p ? { ...p, autoCloseAfterDays: v === 0 ? null : v } : p)}
                                  min={0}
                                  max={365}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-xs text-[#6b6b6b] w-20 shrink-0">
                                  {commentSettings.autoCloseAfterDays === null || commentSettings.autoCloseAfterDays === 0
                                    ? "Never"
                                    : `${commentSettings.autoCloseAfterDays} days`}
                                </span>
                              </div>
                              <p className="text-xs text-[#6b6b6b]">0 = Never, 1–365 = days after publish</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Email me new comments</Label>
                                <Switch
                                  checked={commentSettings.notifyEmail}
                                  onCheckedChange={(v) => setCommentSettings((p) => p ? { ...p, notifyEmail: v } : p)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Allow Comment Likes</Label>
                                <Switch
                                  checked={commentSettings.allowLikes}
                                  onCheckedChange={(v) => setCommentSettings((p) => p ? { ...p, allowLikes: v } : p)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Allow Threaded Replies</Label>
                                <Switch
                                  checked={commentSettings.allowThreadedReplies}
                                  onCheckedChange={(v) => setCommentSettings((p) => p ? { ...p, allowThreadedReplies: v } : p)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Default Sort</Label>
                              <Select
                                value={commentSettings.sortOrder}
                                onValueChange={(v) => setCommentSettings((p) => p ? { ...p, sortOrder: v as "newest" | "oldest" | "most_liked" } : p)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="newest">Newest First</SelectItem>
                                  <SelectItem value="oldest">Oldest First</SelectItem>
                                  <SelectItem value="most_liked">Most Liked</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    ))}

                    {/* Layout & Design */}
                    <div className="pt-4 pb-1 text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#5B4FE8] border-b border-[rgba(91,79,232,0.2)]">
                      Layout & Design
                    </div>
                    {selectedLevel === "post" && (
                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Post Header</span>
                        <button
                          type="button"
                          onClick={() => setSectionExpanded((p) => ({ ...p, postHeader: !p.postHeader }))}
                          className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                          aria-label={sectionExpanded.postHeader ? "Collapse" : "Expand"}
                        >
                          {sectionExpanded.postHeader ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                      <Collapsible open={sectionExpanded.postHeader}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Image position</Label>
                              <Select
                                value={(effectiveConfig as PostLevelConfig).postHeader?.imagePosition ?? "fullBleed"}
                                onValueChange={(v) => updateLevelConfigPath("postHeader.imagePosition", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fullBleed">Full bleed</SelectItem>
                                  <SelectItem value="leftOfInfo">Left of post info</SelectItem>
                                  <SelectItem value="rightOfInfo">Right of post info</SelectItem>
                                  <SelectItem value="belowInfo">Below post info</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {((effectiveConfig as PostLevelConfig).postHeader?.imagePosition === "fullBleed") && (
                              <div className="space-y-2">
                                <Label className="text-xs text-[#6b6b6b]">Full bleed layout</Label>
                                <p className="text-[10px] text-[#6b6b6b]">Hero places the title on the image; stacked places it above a full-width image</p>
                                <Select
                                  value={(effectiveConfig as PostLevelConfig).postHeader?.fullBleedLayout ?? "overlay"}
                                  onValueChange={(v) => updateLevelConfigPath("postHeader.fullBleedLayout", v as PostHeaderFullBleedLayout)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="overlay">Hero (text on image)</SelectItem>
                                    <SelectItem value="stacked">Stacked (text above image)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-xs text-[#6b6b6b]">Show featured image</Label>
                                <p className="text-[10px] text-[#6b6b6b]">Display the post's featured image in the header</p>
                              </div>
                              <Switch
                                checked={effectiveConfig.featuredImage.show}
                                onCheckedChange={(v) => updateLevelConfigPath("featuredImage.show", v)}
                              />
                            </div>
                            {((effectiveConfig as PostLevelConfig).postHeader?.imagePosition !== "fullBleed") && (
                              <>
                                {((effectiveConfig as PostLevelConfig).postHeader?.imagePosition === "leftOfInfo" || (effectiveConfig as PostLevelConfig).postHeader?.imagePosition === "rightOfInfo") && (
                                  <>
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
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Side gap</Label>
                                      <p className="text-[10px] text-[#6b6b6b]">Horizontal space at the left and right edges of the post header zone</p>
                                      <div className="flex items-center gap-3">
                                        <Slider
                                          value={[((effectiveConfig as PostLevelConfig).postHeader?.sideGap ?? 24)]}
                                          onValueChange={([v]) => updateLevelConfigPath("postHeader.sideGap", v ?? 24)}
                                          min={0}
                                          max={80}
                                          step={2}
                                          className="flex-1"
                                        />
                                        <span className="text-xs text-[#6b6b6b] w-12 shrink-0">
                                          {((effectiveConfig as PostLevelConfig).postHeader?.sideGap ?? 24)}px
                                        </span>
                                      </div>
                                    </div>
                                  </>
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
                              </>
                            )}
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Content alignment</Label>
                              <p className="text-[10px] text-[#6b6b6b]">Breadcrumbs and post info (title, author, date, etc.)</p>
                              <Select
                                value={(effectiveConfig as PostLevelConfig).postHeader?.contentAlignment ?? "left"}
                                onValueChange={(v) => updateLevelConfigPath("postHeader.contentAlignment", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-xs text-[#6b6b6b]">Show breadcrumbs</Label>
                                <p className="text-[10px] text-[#6b6b6b]">Display breadcrumb trail above the post title</p>
                              </div>
                              <Switch
                                checked={(effectiveConfig as PostLevelConfig).postHeader?.showBreadcrumbs ?? false}
                                onCheckedChange={(v) => updateLevelConfigPath("postHeader.showBreadcrumbs", v)}
                              />
                            </div>
                              <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Show Tags & Categories</Label>
                              <p className="text-[10px] text-[#6b6b6b]">Display tags and categories after breadcrumbs, before the title</p>
                              <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={(effectiveConfig as PostLevelConfig).postHeader?.showTags ?? false}
                                    onCheckedChange={(v) => updateLevelConfigPath("postHeader.showTags", Boolean(v))}
                                  />
                                  <span className="text-xs text-[#6b6b6b]">Tags</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={(effectiveConfig as PostLevelConfig).postHeader?.showCategories ?? false}
                                    onCheckedChange={(v) => updateLevelConfigPath("postHeader.showCategories", Boolean(v))}
                                  />
                                  <span className="text-xs text-[#6b6b6b]">Categories</span>
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-xs text-[#6b6b6b]">Show post byline</Label>
                                <p className="text-[10px] text-[#6b6b6b]">Lead line from the excerpt after the title, before author and date</p>
                              </div>
                              <Switch
                                checked={(effectiveConfig as PostLevelConfig).postHeader?.showByline ?? false}
                                onCheckedChange={(v) => updateLevelConfigPath("postHeader.showByline", v)}
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    )}
                    {selectedLevel === "collection" && (
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
                            {selectedLevel === "collection" && (
                            <>
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
                            </>
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
                    )}
                    {selectedLevel === "collection" && (
                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Header Content</span>
                        <button
                          type="button"
                          onClick={() => setSectionExpanded((p) => ({ ...p, headerContent: !p.headerContent }))}
                          className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                          aria-label={sectionExpanded.headerContent ? "Collapse" : "Expand"}
                        >
                          {sectionExpanded.headerContent ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                      <Collapsible open={sectionExpanded.headerContent}>
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
                              <Label className="text-xs text-[#6b6b6b]">Module order</Label>
                              <p className="text-[10px] text-[#6b6b6b]">Drag to reorder. Remove a module to disable that feature.</p>
                              {(() => {
                                const headerDerived = selectedLevel === "collection"
                                  ? deriveCollectionModules(
                                      (effectiveConfig as CollectionLevelConfig).collectionModules ?? defaultCollectionModules,
                                      effectiveConfig.headerContent.moduleOrder ?? [],
                                      effectiveConfig.leftSidebar.moduleOrder ?? [],
                                      effectiveConfig.rightSidebar.moduleOrder ?? [],
                                      effectiveConfig.footerContent?.moduleOrder ?? []
                                    ).header
                                  : derivePostModules(
                                      (effectiveConfig as PostLevelConfig).postModules ?? defaultPostModules,
                                      effectiveConfig as PostLevelConfig,
                                      effectiveConfig.headerContent.moduleOrder ?? [],
                                      effectiveConfig.leftSidebar.moduleOrder ?? [],
                                      effectiveConfig.rightSidebar.moduleOrder ?? [],
                                      effectiveConfig.footerContent?.moduleOrder ?? []
                                    ).header;
                                const headerModules = headerDerived;
                                const order = effectiveConfig.headerContent.moduleOrder ?? [];
                                const orderedHeader = (() => {
                                  const set = new Set(headerModules);
                                  const fromOrder = order.filter((m) => set.has(m));
                                  const remaining = headerModules.filter((m) => !order.includes(m));
                                  return [...fromOrder, ...remaining];
                                })();
                                const moveModule = (fromIdx: number, toIdx: number) => {
                                  // Must reorder the same list as the UI (orderedHeader). Using only `order` filtered
                                  // by headerModules drops canonical IDs when moduleOrder still has legacy filter ids
                                  // after a template load — indices then point at the wrong row and a module vanishes.
                                  const list = orderedHeader.slice();
                                  const [removed] = list.splice(fromIdx, 1);
                                  list.splice(toIdx, 0, removed);
                                  updateLevelConfigPath("headerContent.moduleOrder", list);
                                };
                                const handleRemoveHeader = (moduleId: string) => {
                                  if (selectedLevel === "collection") {
                                    const order = effectiveConfig.headerContent.moduleOrder ?? [];
                                    updateLevelConfigPath("headerContent.moduleOrder", order.filter((m) => m !== moduleId));
                                  } else {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules;
                                    if (moduleId === "tableOfContents" && pm?.tableOfContents) {
                                      updateLevelConfigPath("postModules.tableOfContents.enabled", false);
                                    } else if (moduleId === "breadcrumbs") {
                                      updateLevelConfigPath("postHeader.showBreadcrumbs", false);
                                    } else if (moduleId === "authorProfiles" && pm?.authorProfiles) {
                                      updateLevelConfigPath("postModules.authorProfiles.enabled", false);
                                    } else if (moduleId === "relevantPosts" && pm?.relevantPosts) {
                                      updateLevelConfigPath("postModules.relevantPosts.enabled", false);
                                    } else if (moduleId === "emailCapture" && pm?.emailCapture) {
                                      updateLevelConfigPath("postModules.emailCapture.enabled", false);
                                    } else if (moduleId === "leadMagnet" && pm?.leadMagnet) {
                                      updateLevelConfigPath("postModules.leadMagnet.enabled", false);
                                    }
                                  }
                                };
                                const handleAddHeader = (moduleId: string) => {
                                  if (selectedLevel !== "collection") return;
                                  const order = effectiveConfig.headerContent.moduleOrder ?? [];
                                  if (order.includes(moduleId)) return;
                                  updateLevelConfigPath("headerContent.moduleOrder", [...order, moduleId]);
                                };
                                const HEADER_LABELS: Record<string, string> = {
                                  tableOfContents: "Table of Contents",
                                  breadcrumbs: "Breadcrumbs",
                                  filterByCategory: "Filter by Category",
                                  filterByTag: "Filter by Tag",
                                  filterByTagsAndCategories: "Filter by Tags & Categories",
                                  searchPosts: "Search Posts",
                                  postSort: "Sort Posts",
                                  authorProfiles: "Author Profiles",
                                  relevantPosts: "Related Posts",
                                  prevNextArticle: "Previous/Next Article",
                                  emailCapture: "Email Capture",
                                  leadMagnet: "Lead Magnet",
                                };
                                const headerAvailable = selectedLevel === "collection"
                                  ? (() => {
                                      const order = effectiveConfig.headerContent.moduleOrder ?? [];
                                      const filterId = filterConfigToModuleId((effectiveConfig as CollectionLevelConfig).collectionModules?.filter?.filterByTags ?? false, (effectiveConfig as CollectionLevelConfig).collectionModules?.filter?.filterByCategories ?? true);
                                      return [...COLLECTION_HEADER_MODULES].filter((m) =>
                                        COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number])
                                          ? m === filterId && !order.includes(filterId)
                                          : !order.includes(m)
                                      );
                                    })()
                                  : [];
                                return (
                                  <div className="space-y-1.5">
                                    {selectedLevel === "collection" && headerAvailable.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value=""
                                          onValueChange={(v) => { if (v) handleAddHeader(v); }}
                                        >
                                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Add module…" /></SelectTrigger>
                                          <SelectContent>
                                            {headerAvailable.map((m) => (
                                              <SelectItem key={m} value={m}>{HEADER_LABELS[m] ?? m}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    {orderedHeader.length === 0 ? (
                                      <p className="text-xs text-[#6b6b6b] py-2">
                                        {selectedLevel === "collection" ? "No modules in header. Add modules above." : "No modules in header. Enable modules in Navigation &amp; Discovery and choose header position."}
                                      </p>
                                    ) : (
                                      orderedHeader.map((m, idx) => (
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
                                          <span className="flex-1 min-w-0 truncate">{HEADER_LABELS[m] ?? m}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveHeader(m); }}
                                            className="p-1 rounded hover:bg-red-100 text-[#6b6b6b] hover:text-red-600 shrink-0"
                                            aria-label={`Remove ${HEADER_LABELS[m] ?? m}`}
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    )}

                    <div className="border-b border-[#e5e4e0]">
                      <div className="flex items-center justify-between py-3">
                        <span className="font-medium">Footer Content</span>
                        <button
                          type="button"
                          onClick={() => setSectionExpanded((p) => ({ ...p, footerContent: !p.footerContent }))}
                          className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                          aria-label={sectionExpanded.footerContent ? "Collapse" : "Expand"}
                        >
                          {sectionExpanded.footerContent ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                      <Collapsible open={sectionExpanded.footerContent}>
                        <CollapsibleContent>
                          <div className="pb-4 space-y-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Top padding</Label>
                              <div className="flex items-center gap-3">
                                <Slider
                                  value={[effectiveConfig.footerContent?.topPadding ?? 16]}
                                  onValueChange={([v]) => updateLevelConfigPath("footerContent.topPadding", v ?? 16)}
                                  min={0}
                                  max={120}
                                  step={4}
                                  className="flex-1"
                                />
                                <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{effectiveConfig.footerContent?.topPadding ?? 16}px</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Module order</Label>
                              <p className="text-[10px] text-[#6b6b6b]">Drag to reorder. Remove a module to disable that feature.</p>
                              {(() => {
                                const footerDerived = selectedLevel === "collection"
                                  ? deriveCollectionModules(
                                      (effectiveConfig as CollectionLevelConfig).collectionModules ?? defaultCollectionModules,
                                      effectiveConfig.headerContent.moduleOrder ?? [],
                                      effectiveConfig.leftSidebar.moduleOrder ?? [],
                                      effectiveConfig.rightSidebar.moduleOrder ?? [],
                                      effectiveConfig.footerContent?.moduleOrder ?? []
                                    ).footer
                                  : derivePostModules(
                                      (effectiveConfig as PostLevelConfig).postModules ?? defaultPostModules,
                                      effectiveConfig as PostLevelConfig,
                                      effectiveConfig.headerContent.moduleOrder ?? [],
                                      effectiveConfig.leftSidebar.moduleOrder ?? [],
                                      effectiveConfig.rightSidebar.moduleOrder ?? [],
                                      effectiveConfig.footerContent?.moduleOrder ?? []
                                    ).footer;
                                const footerModules = footerDerived;
                                const order = effectiveConfig.footerContent?.moduleOrder ?? [];
                                const orderedFooter = (() => {
                                  const set = new Set(footerModules);
                                  const fromOrder = order.filter((m) => set.has(m));
                                  const remaining = footerModules.filter((m) => !order.includes(m));
                                  return [...fromOrder, ...remaining];
                                })();
                                const moveModule = (fromIdx: number, toIdx: number) => {
                                  const list = orderedFooter.slice();
                                  const [removed] = list.splice(fromIdx, 1);
                                  list.splice(toIdx, 0, removed);
                                  updateLevelConfigPath("footerContent.moduleOrder", list);
                                };
                                const handleRemoveFooter = (moduleId: string) => {
                                  const order = effectiveConfig.footerContent?.moduleOrder ?? [];
                                  updateLevelConfigPath("footerContent.moduleOrder", order.filter((m) => m !== moduleId));
                                };
                                const handleAddFooter = (moduleId: string) => {
                                  const order = effectiveConfig.footerContent?.moduleOrder ?? [];
                                  if (order.includes(moduleId)) return;
                                  updateLevelConfigPath("footerContent.moduleOrder", [...order, moduleId]);
                                };
                                const FOOTER_LABELS: Record<string, string> = {
                                  relevantPosts: "Related Posts",
                                  authorProfiles: "Author Profiles",
                                  prevNextArticle: "Previous/Next Article",
                                  emailCapture: "Email Capture",
                                  leadMagnet: "Lead Magnet",
                                };
                                const footerAvailable = (selectedLevel === "collection" ? [...COLLECTION_FOOTER_MODULES] : [...POST_FOOTER_MODULES]).filter((m) => {
                                  const ord = effectiveConfig.footerContent?.moduleOrder ?? [];
                                  return !ord.includes(m);
                                });
                                return (
                                  <div className="space-y-1.5">
                                    {footerAvailable.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value=""
                                          onValueChange={(v) => { if (v) handleAddFooter(v); }}
                                        >
                                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Add module…" /></SelectTrigger>
                                          <SelectContent>
                                            {footerAvailable.map((m) => (
                                              <SelectItem key={m} value={m}>{FOOTER_LABELS[m] ?? m}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    {orderedFooter.length === 0 ? (
                                      <p className="text-xs text-[#6b6b6b] py-2">No modules in footer. Add modules above.</p>
                                    ) : (
                                      orderedFooter.map((m, idx) => (
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
                                          <span className="flex-1 min-w-0 truncate">{FOOTER_LABELS[m] ?? m}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFooter(m); }}
                                            className="p-1 rounded hover:bg-red-100 text-[#6b6b6b] hover:text-red-600 shrink-0"
                                            aria-label={`Remove ${FOOTER_LABELS[m] ?? m}`}
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {(() => {
                      const SIDEBAR_MODULE_LABELS: Record<string, string> = {
                        filterByCategory: "Filter by Category",
                        filterByTag: "Filter by Tag",
                        filterByTagsAndCategories: "Filter by Tags & Categories",
                        searchPosts: "Search Posts",
                        postSort: "Sort Posts",
                        recentPosts: "Recent Posts",
                        popularPosts: "Popular Posts",
                        relevantPosts: "Related Posts",
                        prevNextArticle: "Previous/Next Article",
                        tableOfContents: "Table of Contents",
                        authorProfiles: "Author Profiles",
                        emailCapture: "Email Capture",
                        leadMagnet: "Lead Magnet",
                      };
                      const derivedModules =
                        selectedLevel === "collection"
                          ? deriveCollectionModules(
                              (effectiveConfig as CollectionLevelConfig).collectionModules ?? defaultCollectionModules,
                              effectiveConfig.headerContent.moduleOrder ?? [],
                              effectiveConfig.leftSidebar.moduleOrder ?? [],
                              effectiveConfig.rightSidebar.moduleOrder ?? [],
                              effectiveConfig.footerContent?.moduleOrder ?? []
                            )
                          : derivePostModules(
                              (effectiveConfig as PostLevelConfig).postModules ?? defaultPostModules,
                              effectiveConfig as PostLevelConfig,
                              effectiveConfig.headerContent.moduleOrder ?? [],
                              effectiveConfig.leftSidebar.moduleOrder ?? [],
                              effectiveConfig.rightSidebar.moduleOrder ?? [],
                              effectiveConfig.footerContent?.moduleOrder ?? []
                            );
                      const zoneModules = (side: "left" | "right") => (side === "left" ? derivedModules.left : derivedModules.right);
                      const SidebarSection = ({ side }: { side: "left" | "right" }) => {
                        const cfg = side === "left" ? effectiveConfig.leftSidebar : effectiveConfig.rightSidebar;
                        const modules = zoneModules(side);
                        const expanded = side === "left" ? sectionExpanded.leftSidebar : sectionExpanded.rightSidebar;
                        const setExpanded = (v: boolean) => setSectionExpanded((p) => ({ ...p, [side === "left" ? "leftSidebar" : "rightSidebar"]: v }));
                        const subPath = side === "left" ? "leftSidebar" : "rightSidebar";
                        const orderedModules = (() => {
                          const order = cfg.moduleOrder ?? [];
                          const set = new Set(modules);
                          const fromOrder = order.filter((m) => set.has(m));
                          const remaining = modules.filter((m) => !order.includes(m));
                          return [...fromOrder, ...remaining];
                        })();
                        const moveModule = (fromIdx: number, toIdx: number) => {
                          const list = orderedModules.slice();
                          const [removed] = list.splice(fromIdx, 1);
                          list.splice(toIdx, 0, removed);
                          updateLevelConfigPath(`${subPath}.moduleOrder`, list);
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
                        const handleRemove = (moduleId: string) => {
                          const order = [...(cfg.moduleOrder ?? [])];
                          updateLevelConfigPath(`${subPath}.moduleOrder`, order.filter((m) => m !== moduleId));
                        };
                        const handleAddSidebar = (moduleId: string) => {
                          const order = cfg.moduleOrder ?? [];
                          if (order.includes(moduleId)) return;
                          updateLevelConfigPath(`${subPath}.moduleOrder`, [...order, moduleId]);
                        };
                        return (
                          <div className="border-b border-[#e5e4e0]">
                            <div className="flex items-center justify-between py-3">
                              <span className="font-medium">{side === "left" ? "Left Sidebar" : "Right Sidebar"}</span>
                              <button
                                type="button"
                                onClick={() => setExpanded(!expanded)}
                                className="p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0"
                                aria-label={expanded ? "Collapse" : "Expand"}
                              >
                                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </div>
                            <Collapsible open={expanded}>
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
                                    <Label className="text-xs text-[#6b6b6b]">Module order</Label>
                                    <p className="text-[10px] text-[#6b6b6b]">Drag to reorder. Remove a module to disable that feature.</p>
                                    {(() => {
                                      const available = selectedLevel === "collection"
                                        ? (() => {
                                            const order = cfg.moduleOrder ?? [];
                                            const filterId = filterConfigToModuleId((effectiveConfig as CollectionLevelConfig).collectionModules?.filter?.filterByTags ?? false, (effectiveConfig as CollectionLevelConfig).collectionModules?.filter?.filterByCategories ?? true);
                                            return [...COLLECTION_SIDEBAR_MODULES].filter((m) =>
                                              COLLECTION_FILTER_IDS.includes(m as (typeof COLLECTION_FILTER_IDS)[number])
                                                ? m === filterId && !order.includes(filterId)
                                                : !order.includes(m)
                                            );
                                          })()
                                        : [...POST_SIDEBAR_MODULES].filter((m) => !orderedModules.includes(m));
                                      return available.length > 0 ? (
                                        <div className="flex items-center gap-2 mb-2">
                                          <Select value="" onValueChange={(v) => { if (v) handleAddSidebar(v); }}>
                                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Add module…" /></SelectTrigger>
                                            <SelectContent>
                                              {available.map((m) => (
                                                <SelectItem key={m} value={m}>{SIDEBAR_MODULE_LABELS[m] ?? m}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : null;
                                    })()}
                                    <div className="space-y-1.5">
                                      {orderedModules.length === 0 ? (
                                        <p className="text-xs text-[#6b6b6b] py-2">No modules in this sidebar. Add modules above.</p>
                                      ) : (
                                        orderedModules.map((m, idx) => (
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
                                            <span className="flex-1 min-w-0 truncate">{SIDEBAR_MODULE_LABELS[m] ?? m}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleRemove(m); }}
                                              className="p-1 rounded hover:bg-red-100 text-[#6b6b6b] hover:text-red-600 shrink-0"
                                              aria-label={`Remove ${SIDEBAR_MODULE_LABELS[m] ?? m}`}
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </div>
                                        ))
                                      )}
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
                          {selectedLevel === "collection" && (
                            <>
                              <ModuleSettingSectionCollapseOnly
                                title="Filtering"
                                expanded={sectionExpanded.filtering}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, filtering: !p.filtering }))}
                                content={
                                  <div className="space-y-2">
                                    {renderFeatureLocationControl(
                                      filterConfigToModuleId(
                                        (effectiveConfig as CollectionLevelConfig).collectionModules?.filter?.filterByTags ?? false,
                                        (effectiveConfig as CollectionLevelConfig).collectionModules?.filter?.filterByCategories ?? true
                                      ),
                                      ["header", "leftSidebar", "rightSidebar"]
                                    )}
                                    <Label className="text-xs text-[#6b6b6b]">Filter by</Label>
                                    <div className="flex flex-wrap gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.filter.filterByCategories ?? true}
                                          onCheckedChange={(v) => updateLevelConfigPath("collectionModules.filter.filterByCategories", !!v)}
                                        />
                                        <span className="text-sm">Categories</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.filter.filterByTags ?? false}
                                          onCheckedChange={(v) => updateLevelConfigPath("collectionModules.filter.filterByTags", !!v)}
                                        />
                                        <span className="text-sm">Tags</span>
                                      </label>
                                    </div>
                                    <p className="text-[10px] text-[#6b6b6b]">Style is determined by position: header = pills, sidebar = dropdown.</p>
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Email Capture"
                                expanded={sectionExpanded.emailCapture}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, emailCapture: !p.emailCapture }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("emailCapture", ["header", "leftSidebar", "rightSidebar", "footer"])}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Section header</Label>
                                      <Input
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture.header ?? "Subscribe to our newsletter"}
                                        onChange={(e) => updateLevelConfigPath("collectionModules.emailCapture.header", e.target.value)}
                                        placeholder="Subscribe to our newsletter"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Section byline (optional)</Label>
                                      <Input
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture.byline ?? ""}
                                        onChange={(e) => updateLevelConfigPath("collectionModules.emailCapture.byline", e.target.value || undefined)}
                                        placeholder="Get the latest posts delivered to your inbox"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Button text</Label>
                                      <Input
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture.buttonText ?? "Subscribe"}
                                        onChange={(e) => updateLevelConfigPath("collectionModules.emailCapture.buttonText", e.target.value)}
                                        placeholder="Subscribe"
                                      />
                                    </div>
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Lead Magnet"
                                expanded={sectionExpanded.leadMagnet}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, leadMagnet: !p.leadMagnet }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("leadMagnet", ["header", "leftSidebar", "rightSidebar", "footer"])}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Resource title</Label>
                                      <Input
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet.resourceTitle ?? ""}
                                        onChange={(e) => updateLevelConfigPath("collectionModules.leadMagnet.resourceTitle", e.target.value)}
                                        placeholder="Free eBook"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Description</Label>
                                      <textarea
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet.description ?? ""}
                                        onChange={(e) => updateLevelConfigPath("collectionModules.leadMagnet.description", e.target.value)}
                                        placeholder="Subscribe to get our free guide"
                                        className="flex min-h-[80px] w-full rounded-md border border-[#e5e4e0] bg-white px-3 py-2 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Button text</Label>
                                      <Input
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet.buttonText ?? "Get it free"}
                                        onChange={(e) => updateLevelConfigPath("collectionModules.leadMagnet.buttonText", e.target.value)}
                                        placeholder="Get it free"
                                      />
                                    </div>
                                  </div>
                                }
                              />
                            </>
                          )}
                          {selectedLevel === "post" && (
                            <>
                              <ModuleSettingSectionCollapseOnly
                                title="Table of Contents"
                                expanded={sectionExpanded.tableOfContents}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, tableOfContents: !p.tableOfContents }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("tableOfContents", ["header", "leftSidebar", "rightSidebar"], "tableOfContents")}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Style</Label>
                                      <Select
                                        value={(effectiveConfig as PostLevelConfig).postModules?.tableOfContents.style ?? "numbered"}
                                        onValueChange={(v) => updateLevelConfigPath("postModules.tableOfContents.style", v as TocStyle)}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="numbered">Numbered</SelectItem>
                                          <SelectItem value="connectedDots">Connected dots</SelectItem>
                                          <SelectItem value="bookmark">Bookmark</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <p className="text-[10px] text-[#6b6b6b]">
                                        {((effectiveConfig as PostLevelConfig).postModules?.tableOfContents.style ?? "numbered") === "numbered" && "Sections are numbered (1, 2, 3…)"}
                                        {((effectiveConfig as PostLevelConfig).postModules?.tableOfContents.style ?? "numbered") === "connectedDots" && "Vertical line with dots for each section"}
                                        {((effectiveConfig as PostLevelConfig).postModules?.tableOfContents.style ?? "numbered") === "bookmark" && "Current section highlighted with theme color"}
                                      </p>
                                    </div>
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Popular Posts"
                                expanded={sectionExpanded.popularPosts}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, popularPosts: !p.popularPosts }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("popularPosts", ["leftSidebar", "rightSidebar"])}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Number of posts shown</Label>
                                      <div className="flex items-center gap-3">
                                        <Slider
                                          value={[(effectiveConfig as PostLevelConfig).postModules?.popularPosts?.count ?? 5]}
                                          onValueChange={([v]) => updateLevelConfigPath("postModules.popularPosts.count", v ?? 5)}
                                          min={1}
                                          max={20}
                                          step={1}
                                          className="flex-1"
                                        />
                                        <span className="text-xs text-[#6b6b6b] w-8 shrink-0 tabular-nums">
                                          {(effectiveConfig as PostLevelConfig).postModules?.popularPosts?.count ?? 5}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-[#6b6b6b]">
                                      Uses view counts when your blog is sorted by popularity or analytics provides them; otherwise shows most recent posts. Add the Popular Posts module to a sidebar under Left/Right Sidebar.
                                    </p>
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Author Profiles"
                                expanded={sectionExpanded.authorProfiles}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, authorProfiles: !p.authorProfiles }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("authorProfiles", ["header", "leftSidebar", "rightSidebar", "footer"], "authorProfiles")}
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Related Posts"
                                expanded={sectionExpanded.relevantPosts}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, relevantPosts: !p.relevantPosts }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("relevantPosts", ["header", "leftSidebar", "rightSidebar", "footer"], "relevantPosts")}
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Email Capture"
                                expanded={sectionExpanded.emailCapture}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, emailCapture: !p.emailCapture }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("emailCapture", ["header", "leftSidebar", "rightSidebar", "footer"], "emailCapture")}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Section header</Label>
                                      <Input
                                        value={(effectiveConfig as PostLevelConfig).postModules?.emailCapture.header ?? "Subscribe to our newsletter"}
                                        onChange={(e) => updateLevelConfigPath("postModules.emailCapture.header", e.target.value)}
                                        placeholder="Subscribe to our newsletter"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Section byline (optional)</Label>
                                      <Input
                                        value={(effectiveConfig as PostLevelConfig).postModules?.emailCapture.byline ?? ""}
                                        onChange={(e) => updateLevelConfigPath("postModules.emailCapture.byline", e.target.value || undefined)}
                                        placeholder="Get the latest posts delivered to your inbox"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Button text</Label>
                                      <Input
                                        value={(effectiveConfig as PostLevelConfig).postModules?.emailCapture.buttonText ?? "Subscribe"}
                                        onChange={(e) => updateLevelConfigPath("postModules.emailCapture.buttonText", e.target.value)}
                                        placeholder="Subscribe"
                                      />
                                    </div>
                                  </div>
                                }
                              />
                              <ModuleSettingSectionCollapseOnly
                                title="Lead Magnet"
                                expanded={sectionExpanded.leadMagnet}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, leadMagnet: !p.leadMagnet }))}
                                content={
                                  <div className="space-y-3">
                                    {renderFeatureLocationControl("leadMagnet", ["header", "leftSidebar", "rightSidebar", "footer"], "leadMagnet")}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Resource title</Label>
                                      <Input
                                        value={(effectiveConfig as PostLevelConfig).postModules?.leadMagnet.resourceTitle ?? ""}
                                        onChange={(e) => updateLevelConfigPath("postModules.leadMagnet.resourceTitle", e.target.value)}
                                        placeholder="Free eBook"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Description</Label>
                                      <textarea
                                        value={(effectiveConfig as PostLevelConfig).postModules?.leadMagnet.description ?? ""}
                                        onChange={(e) => updateLevelConfigPath("postModules.leadMagnet.description", e.target.value)}
                                        placeholder="Subscribe to get our free guide"
                                        className="flex min-h-[80px] w-full rounded-md border border-[#e5e4e0] bg-white px-3 py-2 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Button text</Label>
                                      <Input
                                        value={(effectiveConfig as PostLevelConfig).postModules?.leadMagnet.buttonText ?? "Get it free"}
                                        onChange={(e) => updateLevelConfigPath("postModules.leadMagnet.buttonText", e.target.value)}
                                        placeholder="Get it free"
                                      />
                                    </div>
                                  </div>
                                }
                              />
                            </>
                          )}
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

        <Dialog
          open={addAuthorModalOpen}
          onOpenChange={(open) => {
            setAddAuthorModalOpen(open);
            if (!open) {
              setEditAuthor(null);
              setNewAuthorName("");
              setNewAuthorImageUrl(null);
              setNewAuthorBio("");
              setNewAuthorBioLong("");
              setNewAuthorEmail("");
              setNewAuthorSocials({});
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editAuthor ? "Edit Author" : "Add New Author"}</DialogTitle>
              {editAuthor && (
                <Select
                  value={editAuthor.id}
                  onValueChange={(id) => {
                    const a = authors.find((x) => x.id === id);
                    if (a) {
                      setEditAuthor(a);
                      setNewAuthorName(a.name);
                      setNewAuthorImageUrl(a.imageUrl ?? null);
                      setNewAuthorBio(a.bio ?? "");
                      setNewAuthorBioLong(a.bioLong ?? "");
                      setNewAuthorEmail(a.email ?? "");
                      setNewAuthorSocials(a.socialLinks ?? {});
                    }
                  }}
                >
                  <SelectTrigger aria-label="Author to edit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </DialogHeader>
            <form
              className="space-y-4 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newAuthorName.trim();
                if (!name || !effectiveSiteKey) return;
                const socialLinks: Record<string, string> = {};
                for (const k of ["instagram", "facebook", "linkedin"] as const) {
                  const v = newAuthorSocials[k]?.trim();
                  if (v) socialLinks[k] = v;
                }
                const apiBase = typeof window !== "undefined" ? window.location.origin : "";
                if (editAuthor) {
                  fetch(`${apiBase}/api/blog-authors/${editAuthor.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      name,
                      imageUrl: newAuthorImageUrl,
                      bio: newAuthorBio.trim() || null,
                      bioLong: newAuthorBioLong.trim() || null,
                      email: newAuthorEmail.trim() || null,
                      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
                    }),
                  })
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data) => {
                      if (data) {
                        setAuthors((prev) =>
                          prev.map((a) => (a.id === editAuthor.id ? { ...a, ...data } : a))
                        );
                        setEditAuthor(null);
                        setNewAuthorName("");
                        setNewAuthorImageUrl(null);
                        setNewAuthorBio("");
                        setNewAuthorBioLong("");
                        setNewAuthorEmail("");
                        setNewAuthorSocials({});
                        setAddAuthorModalOpen(false);
                      }
                    });
                } else {
                  fetch(`${apiBase}/api/blog-authors`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      siteKey: effectiveSiteKey,
                      name,
                      ingestedFrom: "BETTER_BLOG",
                      isDefault: addAuthorContext === "default" ? true : addAuthorAsDefault,
                      imageUrl: newAuthorImageUrl,
                      bio: newAuthorBio.trim() || null,
                      bioLong: newAuthorBioLong.trim() || null,
                      email: newAuthorEmail.trim() || null,
                      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
                    }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data?.id) {
                        setAuthors((prev) => [
                          ...prev,
                          {
                            id: data.id,
                            name: data.name,
                            imageUrl: data.imageUrl ?? null,
                            bio: data.bio ?? null,
                            bioLong: data.bioLong ?? null,
                            email: data.email ?? null,
                            socialLinks: data.socialLinks ?? {},
                          },
                        ]);
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
                        setNewAuthorImageUrl(null);
                        setNewAuthorBio("");
                        setNewAuthorBioLong("");
                        setNewAuthorEmail("");
                        setNewAuthorSocials({});
                        setAddAuthorModalOpen(false);
                      }
                    });
                }
              }}
            >
              <div className="space-y-2">
                <Label className="text-xs text-[#6b6b6b]">Name</Label>
                <Input
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  placeholder="Author name"
                  className="flex-1"
                />
              </div>
              <AuthorImageUpload
                value={newAuthorImageUrl}
                onChange={setNewAuthorImageUrl}
                authorName={newAuthorName}
              />
              <div className="space-y-2">
                <Label className="text-xs text-[#6b6b6b]">Short bio (max 200 characters)</Label>
                <textarea
                  value={newAuthorBio}
                  onChange={(e) => setNewAuthorBio(e.target.value.slice(0, 200))}
                  placeholder="A brief description for sidebar..."
                  className="w-full min-h-[60px] px-3 py-2 text-sm border border-[#e5e4e0] rounded-md resize-y"
                  maxLength={200}
                />
                <span className="text-xs text-[#6b6b6b]">{newAuthorBio.length}/200</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#6b6b6b]">Longer bio (max 1000 characters)</Label>
                <textarea
                  value={newAuthorBioLong}
                  onChange={(e) => setNewAuthorBioLong(e.target.value.slice(0, 1000))}
                  placeholder="Extended bio for footer..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm border border-[#e5e4e0] rounded-md resize-y"
                  maxLength={1000}
                />
                <span className="text-xs text-[#6b6b6b]">{newAuthorBioLong.length}/1000</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#6b6b6b]">Email</Label>
                <Input
                  type="email"
                  value={newAuthorEmail}
                  onChange={(e) => setNewAuthorEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#6b6b6b]">Social links (optional)</Label>
                <div className="space-y-1.5">
                  {(["instagram", "facebook", "linkedin"] as const).map((platform) => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="text-xs text-[#6b6b6b] w-20 shrink-0 capitalize">
                        {platform === "instagram" ? "Instagram" : platform === "facebook" ? "Facebook" : "LinkedIn"}
                      </span>
                      <Input
                        value={newAuthorSocials[platform] ?? ""}
                        onChange={(e) =>
                          setNewAuthorSocials((p) => ({ ...p, [platform]: e.target.value }))
                        }
                        placeholder={
                          platform === "instagram"
                            ? "https://instagram.com/username"
                            : platform === "facebook"
                              ? "https://facebook.com/username"
                              : "https://linkedin.com/in/username"
                        }
                        className="h-8 text-sm flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
              {!editAuthor && (
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
              )}
              <Button type="submit" className="w-full" disabled={!newAuthorName.trim()}>
                {editAuthor ? "Save Changes" : "Add Author"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Squarespace API Key Modal */}
        <Dialog
          open={squarespaceApiKeyModalOpen !== false}
          onOpenChange={(open) => {
            if (!open) {
              setSquarespaceApiKeyModalOpen(false);
              setCommentApiKeyInput("");
              setCommentApiKeyStatus("unverified");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {squarespaceApiKeyModalOpen === "setup" ? "Connect Squarespace API" : "Update Squarespace API Key"}
              </DialogTitle>
              <DialogDescription>
                {squarespaceApiKeyModalOpen === "setup"
                  ? "Connect your Squarespace API to verify subscriber emails for paywalled comment threads."
                  : "Replace your Squarespace API key."}
              </DialogDescription>
            </DialogHeader>
            {squarespaceApiKeyModalOpen === "edit" && (
              <p className="text-sm text-[#6b6b6b] -mt-2">Required permission: Profiles (Read).</p>
            )}
            {squarespaceApiKeyModalOpen === "setup" && (
              <div className="text-sm text-[#6b6b6b] space-y-2 -mt-2">
                <p>To generate an API key:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>In Squarespace, go to Settings → Developer Tools → Developer API Keys (or Settings → Advanced → Developer API Keys)</li>
                  <li>Generate a new API key</li>
                  <li>Enable the <strong>Profiles (Read)</strong> permission</li>
                  <li>Copy the key and paste it below</li>
                </ol>
              </div>
            )}
            <form
              className="space-y-4 pt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!effectiveSiteKey || !commentApiKeyInput.trim() || commentApiKeyStatus !== "verified") return;
                setCommentSettingsSaving(true);
                try {
                  const res = await fetch("/api/dashboard/settings/comments", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      siteKey: effectiveSiteKey,
                      squarespaceApiKey: commentApiKeyInput.trim(),
                      ...(squarespaceApiKeyModalOpen === "setup" ? { subscriberCommentsEnabled: true } : {}),
                    }),
                  });
                  if (res.ok) {
                    toast.success(squarespaceApiKeyModalOpen === "setup" ? "Squarespace API connected!" : "API key updated!");
                    setCommentSettings((p) =>
                      p ? { ...p, apiKeyVerified: true, subscriberCommentsEnabled: squarespaceApiKeyModalOpen === "setup" ? true : p.subscriberCommentsEnabled } : p
                    );
                    setSquarespaceApiKeyModalOpen(false);
                    setCommentApiKeyInput("");
                    setCommentApiKeyStatus("unverified");
                  } else {
                    const data = await res.json().catch(() => ({}));
                    toast.error(data?.error ?? "Failed to save");
                  }
                } finally {
                  setCommentSettingsSaving(false);
                }
              }}
            >
              <div className="space-y-2">
                <Label className="text-sm">Squarespace API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Paste your Squarespace API key"
                    value={commentApiKeyInput}
                    onChange={(e) => {
                      setCommentApiKeyInput(e.target.value);
                      setCommentApiKeyStatus("unverified");
                    }}
                    className="flex-1 font-mono text-sm"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!commentApiKeyInput.trim() || commentApiKeyStatus === "verifying"}
                    onClick={async () => {
                      if (!effectiveSiteKey || !commentApiKeyInput.trim()) return;
                      setCommentApiKeyStatus("verifying");
                      const res = await fetch("/api/dashboard/settings/comments/verify-api-key", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ siteKey: effectiveSiteKey, apiKey: commentApiKeyInput.trim() }),
                      });
                      const data = await res.json();
                      if (data?.valid) {
                        setCommentApiKeyStatus("verified");
                      } else if (data?.error === "MISSING_PERMISSION") {
                        setCommentApiKeyStatus("missing_permission");
                      } else {
                        setCommentApiKeyStatus("invalid");
                      }
                    }}
                  >
                    {commentApiKeyStatus === "verifying" ? "Verifying…" : "Verify"}
                  </Button>
                </div>
                <p className="text-xs">
                  {commentApiKeyStatus === "verified" && <span className="text-green-600">Verified ✓</span>}
                  {commentApiKeyStatus === "invalid" && <span className="text-red-600">Invalid key ✗</span>}
                  {commentApiKeyStatus === "missing_permission" && <span className="text-red-600">Missing Profiles permission ✗</span>}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSquarespaceApiKeyModalOpen(false);
                    setCommentApiKeyInput("");
                    setCommentApiKeyStatus("unverified");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={commentApiKeyStatus !== "verified" || commentSettingsSaving}
                >
                  {commentSettingsSaving ? "Saving…" : squarespaceApiKeyModalOpen === "setup" ? "Connect" : "Save Key"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </aside>

      {/* Preview Area */}
      <main className="isolate flex-1 flex flex-col min-w-0 bg-[#f7f6f3]/50">
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
              {configLoading ? (
                <div className="flex items-center justify-center h-full text-[#6b6b6b] p-8 text-center">
                  Loading settings…
                </div>
              ) : effectiveSite && (() => {
                const previewDebug =
                  typeof window !== "undefined" &&
                  (window.location.search.includes("bbPreviewDebug=1") ||
                    sessionStorage.getItem("bbPreviewDebug") === "1");
                const previewUrl = buildBlogPreviewUrl(effectiveSite, undefined, previewDebug, viewerMode);
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
                          configSignature={configSignature}
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
                    configSignature={configSignature}
                    selectPostIndex={previewSelectedPostIndex}
                    viewerMode={viewerMode}
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

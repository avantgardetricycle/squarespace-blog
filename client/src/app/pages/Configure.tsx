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

export interface BlogAuthorOption {
  id: string;
  name: string;
  imageUrl?: string | null;
  bio?: string | null;
  email?: string | null;
  socialLinks?: Record<string, string>;
}

export const SIDEBAR_COLLECTION_MODULES = ["filterByCategory", "filterByTag", "filterByTagsAndCategories", "searchPosts", "postSort", "recentPosts", "emailCapture", "leadMagnet"] as const;
export type SidebarCollectionModuleType = (typeof SIDEBAR_COLLECTION_MODULES)[number];
export const SIDEBAR_POST_MODULES = ["tableOfContents", "authorProfiles", "relevantPosts", "emailCapture", "leadMagnet"] as const;
export type SidebarPostModuleType = (typeof SIDEBAR_POST_MODULES)[number];

export const HEADER_COLLECTION_MODULES = ["filterByCategory", "filterByTag", "filterByTagsAndCategories", "searchPosts", "postSort", "emailCapture", "leadMagnet"] as const;
export type HeaderCollectionModuleType = (typeof HEADER_COLLECTION_MODULES)[number];
export const HEADER_POST_MODULES = ["breadcrumbs", "tableOfContents", "authorProfiles", "relevantPosts", "emailCapture", "leadMagnet"] as const;
export type HeaderPostModuleType = (typeof HEADER_POST_MODULES)[number];

/** Position for a discovery/navigation module */
export type ModulePosition = "header" | "leftSidebar" | "rightSidebar" | "footer" | "none";

/** Filter type: which filter module to show (derived from filterByTags + filterByCategories) */
export type FilterTypeOption = "category" | "tag" | "tagsAndCategories";

/** Explicit config for collection-level discovery modules */
export interface CollectionModulesConfig {
  filter: { enabled: boolean; filterByTags: boolean; filterByCategories: boolean; position: ModulePosition };
  sort: { enabled: boolean; position: ModulePosition };
  search: { enabled: boolean; position: ModulePosition };
  recentPosts: { enabled: boolean; position: ModulePosition };
  emailCapture: { enabled: boolean; position: ModulePosition; header: string; byline?: string; buttonText: string };
  leadMagnet: { enabled: boolean; position: ModulePosition; resourceTitle: string; description: string; buttonText: string };
}

/** Explicit config for post-level discovery modules */
export interface PostModulesConfig {
  tableOfContents: { enabled: boolean; position: ModulePosition };
  breadcrumbs: { enabled: boolean; position: ModulePosition };
  authorProfiles: { enabled: boolean; position: ModulePosition };
  relevantPosts: { enabled: boolean; position: ModulePosition };
  emailCapture: { enabled: boolean; position: ModulePosition; header: string; byline?: string; buttonText: string };
  leadMagnet: { enabled: boolean; position: ModulePosition; resourceTitle: string; description: string; buttonText: string };
}

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
  leftSidebar: { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean };
  rightSidebar: { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean };
  headerContent: { show: boolean; modules: string[]; moduleOrder: string[]; height: number };
  footerContent: { show: boolean; modules: string[]; moduleOrder: string[]; height: number; sideMargin: number };
  socialMediaLinks: { show: boolean; platforms: SocialPlatform[] };
  featuredImage: FeaturedImageConfig;
}

export type PostSortOption = "date" | "az" | "popularity";

export type PostsPerPageOption = 5 | 10 | 20;

export type PaginationMode = "pages" | "infiniteScroll";

export type CollectionLayoutMode = "grid" | "listRows" | "editorial" | "showcase" | "digest";

export type GridColumnsOption = 2 | 3;

export type FeaturedArticlePosition = "header" | "inLayout";

export interface FeaturedArticleConfig {
  show: boolean;
  position: FeaturedArticlePosition;
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

export interface PostLevelConfig extends BaseLevelConfig {
  progressBar: { show: boolean; position: "top" | "bottom"; thickness: number; color: string };
  postModules?: PostModulesConfig;
}

export interface SiteConfigForm {
  defaultAuthorIds: string[];
  postAuthorOverrides: Record<string, string[]>;
  collectionConfig: CollectionLevelConfig;
  postConfig: PostLevelConfig;
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
  filter: { enabled: false, filterByTags: false, filterByCategories: true, position: "none" },
  sort: { enabled: false, position: "none" },
  search: { enabled: false, position: "none" },
  recentPosts: { enabled: false, position: "none" },
  emailCapture: { enabled: false, position: "none", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
  leadMagnet: { enabled: false, position: "none", resourceTitle: "", description: "", buttonText: "Get it free" },
};

const defaultPostModules: PostModulesConfig = {
  tableOfContents: { enabled: false, position: "none" },
  breadcrumbs: { enabled: false, position: "none" },
  authorProfiles: { enabled: false, position: "none" },
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
  footerContent: { show: false, modules: [], moduleOrder: [], height: 48, sideMargin: 0 },
  socialMediaLinks: { show: false, platforms: [] },
  featuredImage: defaultFeaturedImage,
};

const defaultPostConfig: PostLevelConfig = {
  ...defaultCollectionConfig,
  postModules: defaultPostModules,
  leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: true },
  rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: true },
  headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
  footerContent: { show: false, modules: [], moduleOrder: [], height: 48, sideMargin: 0 },
  progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
};

const defaultSiteConfig: SiteConfigForm = {
  defaultAuthorIds: [],
  postAuthorOverrides: {},
  collectionConfig: defaultCollectionConfig,
  postConfig: defaultPostConfig,
  collectionTemplateId: null,
  postTemplateId: null,
};

/**
 * Derive modules arrays for each zone from explicit collectionModules config + moduleOrder.
 * Returns the module IDs in order for header, leftSidebar, rightSidebar, footer.
 */
function deriveCollectionModules(
  cm: CollectionModulesConfig,
  headerOrder: string[],
  leftOrder: string[],
  rightOrder: string[],
  footerOrder: string[]
): { header: string[]; left: string[]; right: string[]; footer: string[] } {
  const filterId = filterConfigToModuleId(cm.filter.filterByTags, cm.filter.filterByCategories);
  const header: string[] = [];
  const left: string[] = [];
  const right: string[] = [];
  const footer: string[] = [];
  if (cm.filter.enabled && cm.filter.position !== "none") {
    if (cm.filter.position === "header") header.push(filterId);
    else if (cm.filter.position === "leftSidebar") left.push(filterId);
    else if (cm.filter.position === "rightSidebar") right.push(filterId);
  }
  if (cm.sort.enabled && cm.sort.position !== "none") {
    if (cm.sort.position === "header") header.push("postSort");
    else if (cm.sort.position === "leftSidebar") left.push("postSort");
    else if (cm.sort.position === "rightSidebar") right.push("postSort");
  }
  if (cm.search.enabled && cm.search.position !== "none") {
    if (cm.search.position === "header") header.push("searchPosts");
    else if (cm.search.position === "leftSidebar") left.push("searchPosts");
    else if (cm.search.position === "rightSidebar") right.push("searchPosts");
  }
  if (cm.recentPosts.enabled && cm.recentPosts.position !== "none") {
    if (cm.recentPosts.position === "leftSidebar") left.push("recentPosts");
    else if (cm.recentPosts.position === "rightSidebar") right.push("recentPosts");
  }
  if (cm.emailCapture.enabled && cm.emailCapture.position !== "none") {
    if (cm.emailCapture.position === "header") header.push("emailCapture");
    else if (cm.emailCapture.position === "leftSidebar") left.push("emailCapture");
    else if (cm.emailCapture.position === "rightSidebar") right.push("emailCapture");
    else if (cm.emailCapture.position === "footer") footer.push("emailCapture");
  }
  if (cm.leadMagnet.enabled && cm.leadMagnet.position !== "none") {
    if (cm.leadMagnet.position === "header") header.push("leadMagnet");
    else if (cm.leadMagnet.position === "leftSidebar") left.push("leadMagnet");
    else if (cm.leadMagnet.position === "rightSidebar") right.push("leadMagnet");
    else if (cm.leadMagnet.position === "footer") footer.push("leadMagnet");
  }
  const orderModules = (order: string[], available: string[]): string[] => {
    const set = new Set(available);
    const fromOrder = order.filter((m) => set.has(m));
    const remaining = available.filter((m) => !order.includes(m));
    return [...fromOrder, ...remaining];
  };
  return {
    header: orderModules(headerOrder, header),
    left: orderModules(leftOrder, left),
    right: orderModules(rightOrder, right),
    footer: orderModules(footerOrder, footer),
  };
}

/**
 * Derive modules arrays for each zone from explicit postModules config + moduleOrder.
 */
function derivePostModules(
  pm: PostModulesConfig,
  headerOrder: string[],
  leftOrder: string[],
  rightOrder: string[],
  footerOrder: string[]
): { header: string[]; left: string[]; right: string[]; footer: string[] } {
  const header: string[] = [];
  const left: string[] = [];
  const right: string[] = [];
  const footer: string[] = [];
  if (pm.tableOfContents.enabled && pm.tableOfContents.position !== "none") {
    if (pm.tableOfContents.position === "header") header.push("tableOfContents");
    else if (pm.tableOfContents.position === "leftSidebar") left.push("tableOfContents");
    else if (pm.tableOfContents.position === "rightSidebar") right.push("tableOfContents");
  }
  if (pm.breadcrumbs.enabled && pm.breadcrumbs.position !== "none") {
    if (pm.breadcrumbs.position === "header") header.push("breadcrumbs");
    else if (pm.breadcrumbs.position === "leftSidebar") left.push("breadcrumbs");
    else if (pm.breadcrumbs.position === "rightSidebar") right.push("breadcrumbs");
  }
  if (pm.authorProfiles.enabled && pm.authorProfiles.position !== "none") {
    if (pm.authorProfiles.position === "header") header.push("authorProfiles");
    else if (pm.authorProfiles.position === "leftSidebar") left.push("authorProfiles");
    else if (pm.authorProfiles.position === "rightSidebar") right.push("authorProfiles");
    else if (pm.authorProfiles.position === "footer") footer.push("authorProfiles");
  }
  if (pm.relevantPosts.enabled && pm.relevantPosts.position !== "none") {
    if (pm.relevantPosts.position === "header") header.push("relevantPosts");
    else if (pm.relevantPosts.position === "leftSidebar") left.push("relevantPosts");
    else if (pm.relevantPosts.position === "rightSidebar") right.push("relevantPosts");
    else if (pm.relevantPosts.position === "footer") footer.push("relevantPosts");
  }
  if (pm.emailCapture.enabled && pm.emailCapture.position !== "none") {
    if (pm.emailCapture.position === "header") header.push("emailCapture");
    else if (pm.emailCapture.position === "leftSidebar") left.push("emailCapture");
    else if (pm.emailCapture.position === "rightSidebar") right.push("emailCapture");
    else if (pm.emailCapture.position === "footer") footer.push("emailCapture");
  }
  if (pm.leadMagnet.enabled && pm.leadMagnet.position !== "none") {
    if (pm.leadMagnet.position === "header") header.push("leadMagnet");
    else if (pm.leadMagnet.position === "leftSidebar") left.push("leadMagnet");
    else if (pm.leadMagnet.position === "rightSidebar") right.push("leadMagnet");
    else if (pm.leadMagnet.position === "footer") footer.push("leadMagnet");
  }
  const orderModules = (order: string[], available: string[]): string[] => {
    const set = new Set(available);
    const fromOrder = order.filter((m) => set.has(m));
    const remaining = available.filter((m) => !order.includes(m));
    return [...fromOrder, ...remaining];
  };
  return {
    header: orderModules(headerOrder, header),
    left: orderModules(leftOrder, left),
    right: orderModules(rightOrder, right),
    footer: orderModules(footerOrder, footer),
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
    let h = cc.headerContent.moduleOrder ?? [];
    let l = cc.leftSidebar.moduleOrder ?? [];
    let r = cc.rightSidebar.moduleOrder ?? [];
    let f = cc.footerContent?.moduleOrder ?? [];
    const removeAllFilters = (order: string[]) =>
      order.filter((m) => m !== "filterByCategory" && m !== "filterByTag" && m !== "filterByTagsAndCategories");
    [h, l, r, f] = [h, l, r, f].map((o) => removeFromOrder(removeFromOrder(removeFromOrder(removeFromOrder(removeFromOrder(removeAllFilters(o), "postSort"), "searchPosts"), "recentPosts"), "emailCapture"), "leadMagnet"));
    if (cm.filter.enabled && cm.filter.position === "header") h = addToOrder(h, filterId);
    else if (cm.filter.enabled && cm.filter.position === "leftSidebar") l = addToOrder(l, filterId);
    else if (cm.filter.enabled && cm.filter.position === "rightSidebar") r = addToOrder(r, filterId);
    if (cm.sort.enabled && cm.sort.position === "header") h = addToOrder(h, "postSort");
    else if (cm.sort.enabled && cm.sort.position === "leftSidebar") l = addToOrder(l, "postSort");
    else if (cm.sort.enabled && cm.sort.position === "rightSidebar") r = addToOrder(r, "postSort");
    if (cm.search.enabled && cm.search.position === "header") h = addToOrder(h, "searchPosts");
    else if (cm.search.enabled && cm.search.position === "leftSidebar") l = addToOrder(l, "searchPosts");
    else if (cm.search.enabled && cm.search.position === "rightSidebar") r = addToOrder(r, "searchPosts");
    if (cm.recentPosts.enabled && cm.recentPosts.position === "leftSidebar") l = addToOrder(l, "recentPosts");
    else if (cm.recentPosts.enabled && cm.recentPosts.position === "rightSidebar") r = addToOrder(r, "recentPosts");
    if (cm.emailCapture.enabled && cm.emailCapture.position === "header") h = addToOrder(h, "emailCapture");
    else if (cm.emailCapture.enabled && cm.emailCapture.position === "leftSidebar") l = addToOrder(l, "emailCapture");
    else if (cm.emailCapture.enabled && cm.emailCapture.position === "rightSidebar") r = addToOrder(r, "emailCapture");
    else if (cm.emailCapture.enabled && cm.emailCapture.position === "footer") f = addToOrder(f, "emailCapture");
    if (cm.leadMagnet.enabled && cm.leadMagnet.position === "header") h = addToOrder(h, "leadMagnet");
    else if (cm.leadMagnet.enabled && cm.leadMagnet.position === "leftSidebar") l = addToOrder(l, "leadMagnet");
    else if (cm.leadMagnet.enabled && cm.leadMagnet.position === "rightSidebar") r = addToOrder(r, "leadMagnet");
    else if (cm.leadMagnet.enabled && cm.leadMagnet.position === "footer") f = addToOrder(f, "leadMagnet");
    return { ...cc, collectionModules: cm, headerContent: { ...cc.headerContent, moduleOrder: h }, leftSidebar: { ...cc.leftSidebar, moduleOrder: l }, rightSidebar: { ...cc.rightSidebar, moduleOrder: r }, footerContent: { ...(cc.footerContent ?? { show: false, modules: [], moduleOrder: [], height: 48, sideMargin: 0 }), moduleOrder: f } };
  }
  if (pm && pc) {
    let h = pc.headerContent.moduleOrder ?? [];
    let l = pc.leftSidebar.moduleOrder ?? [];
    let r = pc.rightSidebar.moduleOrder ?? [];
    let f = pc.footerContent?.moduleOrder ?? [];
    [h, l, r, f] = [h, l, r, f].map((o) => removeFromOrder(removeFromOrder(removeFromOrder(removeFromOrder(removeFromOrder(o, "tableOfContents"), "breadcrumbs"), "authorProfiles"), "emailCapture"), "leadMagnet"));
    f = removeFromOrder(f, "relevantPosts");
    if (pm.tableOfContents.enabled && pm.tableOfContents.position === "header") h = addToOrder(h, "tableOfContents");
    else if (pm.tableOfContents.enabled && pm.tableOfContents.position === "leftSidebar") l = addToOrder(l, "tableOfContents");
    else if (pm.tableOfContents.enabled && pm.tableOfContents.position === "rightSidebar") r = addToOrder(r, "tableOfContents");
    if (pm.breadcrumbs.enabled && pm.breadcrumbs.position === "header") h = addToOrder(h, "breadcrumbs");
    else if (pm.breadcrumbs.enabled && pm.breadcrumbs.position === "leftSidebar") l = addToOrder(l, "breadcrumbs");
    else if (pm.breadcrumbs.enabled && pm.breadcrumbs.position === "rightSidebar") r = addToOrder(r, "breadcrumbs");
    if (pm.authorProfiles.enabled && pm.authorProfiles.position === "header") h = addToOrder(h, "authorProfiles");
    else if (pm.authorProfiles.enabled && pm.authorProfiles.position === "leftSidebar") l = addToOrder(l, "authorProfiles");
    else if (pm.authorProfiles.enabled && pm.authorProfiles.position === "rightSidebar") r = addToOrder(r, "authorProfiles");
    else if (pm.authorProfiles.enabled && pm.authorProfiles.position === "footer") f = addToOrder(f, "authorProfiles");
    if (pm.relevantPosts.enabled && pm.relevantPosts.position === "header") h = addToOrder(h, "relevantPosts");
    else if (pm.relevantPosts.enabled && pm.relevantPosts.position === "leftSidebar") l = addToOrder(l, "relevantPosts");
    else if (pm.relevantPosts.enabled && pm.relevantPosts.position === "rightSidebar") r = addToOrder(r, "relevantPosts");
    else if (pm.relevantPosts.enabled && pm.relevantPosts.position === "footer") f = addToOrder(f, "relevantPosts");
    if (pm.emailCapture.enabled && pm.emailCapture.position === "header") h = addToOrder(h, "emailCapture");
    else if (pm.emailCapture.enabled && pm.emailCapture.position === "leftSidebar") l = addToOrder(l, "emailCapture");
    else if (pm.emailCapture.enabled && pm.emailCapture.position === "rightSidebar") r = addToOrder(r, "emailCapture");
    else if (pm.emailCapture.enabled && pm.emailCapture.position === "footer") f = addToOrder(f, "emailCapture");
    if (pm.leadMagnet.enabled && pm.leadMagnet.position === "header") h = addToOrder(h, "leadMagnet");
    else if (pm.leadMagnet.enabled && pm.leadMagnet.position === "leftSidebar") l = addToOrder(l, "leadMagnet");
    else if (pm.leadMagnet.enabled && pm.leadMagnet.position === "rightSidebar") r = addToOrder(r, "leadMagnet");
    else if (pm.leadMagnet.enabled && pm.leadMagnet.position === "footer") f = addToOrder(f, "leadMagnet");
    return { ...pc, postModules: pm, headerContent: { ...pc.headerContent, moduleOrder: h }, leftSidebar: { ...pc.leftSidebar, moduleOrder: l }, rightSidebar: { ...pc.rightSidebar, moduleOrder: r }, footerContent: { ...(pc.footerContent ?? { show: false, modules: [], moduleOrder: [], height: 48, sideMargin: 0 }), moduleOrder: f } };
  }
  return cfg;
}

/**
 * Apply derived modules to config for renderer. Mutates in place for collection/post config.
 */
function applyDerivedModules(config: SiteConfigForm): void {
  const cc = config.collectionConfig;
  const pc = config.postConfig;
  const cm = cc.collectionModules ?? defaultCollectionModules;
  const pm = pc.postModules ?? defaultPostModules;
  const coll = deriveCollectionModules(
    cm,
    cc.headerContent.moduleOrder ?? cc.headerContent.modules ?? [],
    cc.leftSidebar.moduleOrder ?? cc.leftSidebar.modules ?? [],
    cc.rightSidebar.moduleOrder ?? cc.rightSidebar.modules ?? [],
    cc.footerContent?.moduleOrder ?? cc.footerContent?.modules ?? []
  );
  cc.headerContent.modules = coll.header;
  cc.leftSidebar.modules = coll.left;
  cc.rightSidebar.modules = coll.right;
  cc.footerContent = { ...(cc.footerContent ?? { show: false, modules: [], moduleOrder: [], height: 48, sideMargin: 0 }), modules: coll.footer, show: coll.footer.length > 0 };
  cc.headerContent.show = coll.header.length > 0;
  cc.leftSidebar.show = coll.left.length > 0;
  cc.rightSidebar.show = coll.right.length > 0;
  const post = derivePostModules(
    pm,
    pc.headerContent.moduleOrder ?? pc.headerContent.modules ?? [],
    pc.leftSidebar.moduleOrder ?? pc.leftSidebar.modules ?? [],
    pc.rightSidebar.moduleOrder ?? pc.rightSidebar.modules ?? [],
    pc.footerContent?.moduleOrder ?? pc.footerContent?.modules ?? []
  );
  pc.headerContent.modules = post.header;
  pc.leftSidebar.modules = post.left;
  pc.rightSidebar.modules = post.right;
  pc.footerContent = { ...(pc.footerContent ?? { show: false, modules: [], moduleOrder: [], height: 48, sideMargin: 0 }), modules: post.footer, show: post.footer.length > 0 };
  pc.headerContent.show = post.header.length > 0;
  pc.leftSidebar.show = post.left.length > 0;
  pc.rightSidebar.show = post.right.length > 0;
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
  const fc = raw?.footerContent && typeof raw.footerContent === "object" ? raw.footerContent as { show?: boolean; modules?: unknown[]; moduleOrder?: unknown[]; height?: number; sideMargin?: number } : null;
  const validSidebarCollection = (arr: unknown): SidebarCollectionModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarCollectionModuleType => SIDEBAR_COLLECTION_MODULES.includes(m as SidebarCollectionModuleType)) : [];
  const validSidebarPost = (arr: unknown): SidebarPostModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is SidebarPostModuleType => SIDEBAR_POST_MODULES.includes(m as SidebarPostModuleType)) : [];
  const validHeaderCollection = (arr: unknown): HeaderCollectionModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is HeaderCollectionModuleType => HEADER_COLLECTION_MODULES.includes(m as HeaderCollectionModuleType)) : [];
  const validHeaderPost = (arr: unknown): HeaderPostModuleType[] =>
    Array.isArray(arr) ? arr.filter((m): m is HeaderPostModuleType => HEADER_POST_MODULES.includes(m as HeaderPostModuleType)) : [];
  const lsModules = level === "collection" ? validSidebarCollection(ls?.modules) : validSidebarPost(ls?.modules);
  const rsModules = level === "collection" ? validSidebarCollection(rs?.modules) : validSidebarPost(rs?.modules);
  const hcModules = level === "collection" ? validHeaderCollection(hc?.modules) : validHeaderPost(hc?.modules);
  const lsModuleOrder = Array.isArray(ls?.moduleOrder) ? (level === "collection" ? validSidebarCollection(ls.moduleOrder) : validSidebarPost(ls.moduleOrder)) : lsModules;
  const rsModuleOrder = Array.isArray(rs?.moduleOrder) ? (level === "collection" ? validSidebarCollection(rs.moduleOrder) : validSidebarPost(rs.moduleOrder)) : rsModules;
  const hcModuleOrder = Array.isArray(hc?.moduleOrder) ? (level === "collection" ? validHeaderCollection(hc.moduleOrder) : validHeaderPost(hc.moduleOrder)) : hcModules;
  const leftSidebar = ls
    ? { show: Boolean(ls.show ?? false), modules: lsModules, moduleOrder: lsModuleOrder, width: Math.min(400, Math.max(160, Number(ls.width) || 240)), spaceAbove: Math.min(64, Math.max(0, Number(ls.spaceAbove) || 0)), sticky: ls.sticky !== false }
    : { show: false, modules: [] as SidebarCollectionModuleType[] & SidebarPostModuleType[], moduleOrder: [] as string[], width: 240, spaceAbove: 0, sticky: true };
  const rightSidebar = rs
    ? { show: Boolean(rs.show ?? false), modules: rsModules, moduleOrder: rsModuleOrder, width: Math.min(400, Math.max(160, Number(rs.width) || 240)), spaceAbove: Math.min(64, Math.max(0, Number(rs.spaceAbove) || 0)), sticky: rs.sticky !== false }
    : { show: false, modules: [] as SidebarCollectionModuleType[] & SidebarPostModuleType[], moduleOrder: [] as string[], width: 240, spaceAbove: 0, sticky: true };
  const headerContent = hc
    ? { show: Boolean(hc.show ?? false), modules: hcModules, moduleOrder: hcModuleOrder, height: Math.min(120, Math.max(32, Number(hc.height) || 48)) }
    : { show: false, modules: [] as HeaderCollectionModuleType[] & HeaderPostModuleType[], moduleOrder: [] as string[], height: 48 };
  const validFooterCollection = (arr: unknown): string[] => Array.isArray(arr) ? arr.filter((m): m is string => m === "emailCapture" || m === "leadMagnet") : [];
  const validFooterPost = (arr: unknown): string[] => Array.isArray(arr) ? arr.filter((m): m is string => m === "relevantPosts" || m === "authorProfiles" || m === "emailCapture" || m === "leadMagnet") : [];
  const fcModules = level === "collection" ? validFooterCollection(fc?.modules) : validFooterPost(fc?.modules);
  const fcModuleOrder = Array.isArray(fc?.moduleOrder) ? (level === "collection" ? validFooterCollection(fc.moduleOrder) : validFooterPost(fc.moduleOrder)) : fcModules;
  const footerContent = fc
    ? { show: Boolean(fc.show ?? false), modules: fcModules, moduleOrder: fcModuleOrder, height: Math.min(120, Math.max(32, Number(fc.height) || 48)), sideMargin: Math.min(80, Math.max(0, Number(fc.sideMargin) ?? 0)) }
    : { show: false, modules: [] as string[], moduleOrder: [] as string[], height: 48, sideMargin: 0 };
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
      const s = cmRaw.sort && typeof cmRaw.sort === "object" ? cmRaw.sort as Record<string, unknown> : {};
      const sr = cmRaw.search && typeof cmRaw.search === "object" ? cmRaw.search as Record<string, unknown> : {};
      const rp = cmRaw.recentPosts && typeof cmRaw.recentPosts === "object" ? cmRaw.recentPosts as Record<string, unknown> : {};
      const ec = cmRaw.emailCapture && typeof cmRaw.emailCapture === "object" ? cmRaw.emailCapture as Record<string, unknown> : {};
      const lm = cmRaw.leadMagnet && typeof cmRaw.leadMagnet === "object" ? cmRaw.leadMagnet as Record<string, unknown> : {};
      const filterByTags = Boolean(f.filterByTags ?? (f.filterType === "tag" || f.filterType === "tagsAndCategories"));
      const filterByCategories = Boolean(f.filterByCategories ?? (f.filterType === "category" || f.filterType === "tagsAndCategories"));
      return {
        filter: {
          enabled: Boolean(f.enabled ?? false),
          filterByTags,
          filterByCategories: filterByCategories || (!filterByTags && !filterByCategories),
          position: validModulePosition(f.position),
        },
        sort: { enabled: Boolean(s.enabled ?? false), position: validModulePosition(s.position) },
        search: { enabled: Boolean(sr.enabled ?? false), position: validModulePosition(sr.position) },
        recentPosts: { enabled: Boolean(rp.enabled ?? false), position: validModulePosition(rp.position) },
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
    const mods: string[] = [...(hcModules as string[]), ...(lsModules as string[]), ...(rsModules as string[]), ...(fcModules as string[])];
    const hasFilterByCategory = mods.includes("filterByCategory");
    const hasFilterByTag = mods.includes("filterByTag");
    const hasFilterByTagsAndCategories = mods.includes("filterByTagsAndCategories");
    const filterByTags = hasFilterByTag || hasFilterByTagsAndCategories;
    const filterByCategories = hasFilterByCategory || hasFilterByTagsAndCategories;
    const filterMod = hasFilterByTagsAndCategories ? "filterByTagsAndCategories" : hasFilterByTag ? "filterByTag" : hasFilterByCategory ? "filterByCategory" : null;
    const h = hcModules as string[];
    const l = lsModules as string[];
    const r = rsModules as string[];
    const filterPos: ModulePosition = h.includes(filterMod ?? "") ? "header" : l.includes(filterMod ?? "") ? "leftSidebar" : r.includes(filterMod ?? "") ? "rightSidebar" : "none";
    const sortPos: ModulePosition = h.includes("postSort") ? "header" : l.includes("postSort") ? "leftSidebar" : r.includes("postSort") ? "rightSidebar" : "none";
    const searchPos: ModulePosition = h.includes("searchPosts") ? "header" : l.includes("searchPosts") ? "leftSidebar" : r.includes("searchPosts") ? "rightSidebar" : "none";
    const recentPos: ModulePosition = l.includes("recentPosts") ? "leftSidebar" : r.includes("recentPosts") ? "rightSidebar" : "none";
    const ecPos: ModulePosition = h.includes("emailCapture") ? "header" : l.includes("emailCapture") ? "leftSidebar" : r.includes("emailCapture") ? "rightSidebar" : (fcModules as string[]).includes("emailCapture") ? "footer" : "none";
    const lmPos: ModulePosition = h.includes("leadMagnet") ? "header" : l.includes("leadMagnet") ? "leftSidebar" : r.includes("leadMagnet") ? "rightSidebar" : (fcModules as string[]).includes("leadMagnet") ? "footer" : "none";
    return {
      filter: { enabled: !!filterMod, filterByTags, filterByCategories, position: filterPos },
      sort: { enabled: sortPos !== "none", position: sortPos },
      search: { enabled: searchPos !== "none", position: searchPos },
      recentPosts: { enabled: recentPos !== "none", position: recentPos },
      emailCapture: { enabled: ecPos !== "none", position: ecPos, header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: lmPos !== "none", position: lmPos, resourceTitle: "", description: "", buttonText: "Get it free" },
    };
  };
  const parsePostModules = (): PostModulesConfig => {
    if (pmRaw) {
      const toc = pmRaw.tableOfContents && typeof pmRaw.tableOfContents === "object" ? pmRaw.tableOfContents as Record<string, unknown> : {};
      const bc = pmRaw.breadcrumbs && typeof pmRaw.breadcrumbs === "object" ? pmRaw.breadcrumbs as Record<string, unknown> : {};
      const ap = pmRaw.authorProfiles && typeof pmRaw.authorProfiles === "object" ? pmRaw.authorProfiles as Record<string, unknown> : {};
      const rel = pmRaw.relevantPosts && typeof pmRaw.relevantPosts === "object" ? pmRaw.relevantPosts as Record<string, unknown> : {};
      const ec = pmRaw.emailCapture && typeof pmRaw.emailCapture === "object" ? pmRaw.emailCapture as Record<string, unknown> : {};
      const lm = pmRaw.leadMagnet && typeof pmRaw.leadMagnet === "object" ? pmRaw.leadMagnet as Record<string, unknown> : {};
      return {
        tableOfContents: { enabled: Boolean(toc.enabled ?? false), position: validModulePosition(toc.position) },
        breadcrumbs: { enabled: Boolean(bc.enabled ?? false), position: validModulePosition(bc.position) },
        authorProfiles: { enabled: Boolean(ap.enabled ?? false), position: validModulePosition(ap.position) },
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
    const modsPost: string[] = [...(hcModules as string[]), ...(lsModules as string[]), ...(rsModules as string[]), ...(fcModules as string[])];
    const tocPos: ModulePosition = modsPost.includes("tableOfContents") ? ((hcModules as string[]).includes("tableOfContents") ? "header" : (lsModules as string[]).includes("tableOfContents") ? "leftSidebar" : "rightSidebar") : "none";
    const bcPos: ModulePosition = modsPost.includes("breadcrumbs") ? ((hcModules as string[]).includes("breadcrumbs") ? "header" : (lsModules as string[]).includes("breadcrumbs") ? "leftSidebar" : "rightSidebar") : "none";
    const apPos: ModulePosition = modsPost.includes("authorProfiles") ? ((hcModules as string[]).includes("authorProfiles") ? "header" : (lsModules as string[]).includes("authorProfiles") ? "leftSidebar" : (rsModules as string[]).includes("authorProfiles") ? "rightSidebar" : (fcModules as string[]).includes("authorProfiles") ? "footer" : "none") : "none";
    const relPos: ModulePosition = modsPost.includes("relevantPosts") ? ((hcModules as string[]).includes("relevantPosts") ? "header" : (lsModules as string[]).includes("relevantPosts") ? "leftSidebar" : (rsModules as string[]).includes("relevantPosts") ? "rightSidebar" : (fcModules as string[]).includes("relevantPosts") ? "footer" : "none") : "none";
    const ecPos: ModulePosition = modsPost.includes("emailCapture") ? ((hcModules as string[]).includes("emailCapture") ? "header" : (lsModules as string[]).includes("emailCapture") ? "leftSidebar" : (rsModules as string[]).includes("emailCapture") ? "rightSidebar" : (fcModules as string[]).includes("emailCapture") ? "footer" : "none") : "none";
    const lmPos: ModulePosition = modsPost.includes("leadMagnet") ? ((hcModules as string[]).includes("leadMagnet") ? "header" : (lsModules as string[]).includes("leadMagnet") ? "leftSidebar" : (rsModules as string[]).includes("leadMagnet") ? "rightSidebar" : (fcModules as string[]).includes("leadMagnet") ? "footer" : "none") : "none";
    return {
      tableOfContents: { enabled: tocPos !== "none", position: tocPos },
      breadcrumbs: { enabled: bcPos !== "none", position: bcPos },
      authorProfiles: { enabled: apPos !== "none", position: apPos },
      relevantPosts: { enabled: relPos !== "none", position: relPos },
      emailCapture: { enabled: ecPos !== "none", position: ecPos, header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: lmPos !== "none", position: lmPos, resourceTitle: "", description: "", buttonText: "Get it free" },
    };
  };
  const collectionModules = parseCollectionModules();
  const postModules = level === "post" ? parsePostModules() : defaultPostModules;
  const collDerived = deriveCollectionModules(collectionModules, hcModuleOrder, lsModuleOrder, rsModuleOrder, fcModuleOrder);
  const postDerived = derivePostModules(postModules, hcModuleOrder, lsModuleOrder, rsModuleOrder, fcModuleOrder);
  const base: CollectionLevelConfig = {
    showDate: Boolean(raw?.showDate ?? true),
    showAuthor: Boolean(raw?.showAuthor ?? false),
    showReadingTime: Boolean(raw?.showReadingTime ?? false),
    postSort,
    pagination,
    collectionLayout,
    gridColumns,
    collectionModules,
    leftSidebar: { ...leftSidebar, modules: collDerived.left, moduleOrder: lsModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
    rightSidebar: { ...rightSidebar, modules: collDerived.right, moduleOrder: rsModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
    headerContent: { ...headerContent, modules: collDerived.header, moduleOrder: hcModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; height: number },
    footerContent: { ...footerContent, modules: collDerived.footer, moduleOrder: fcModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; height: number; sideMargin: number },
    socialMediaLinks,
    featuredImage,
  };
  if (level === "collection") {
    const faRaw = raw?.featuredArticle && typeof raw.featuredArticle === "object" ? raw.featuredArticle as Record<string, unknown> : null;
    (base as CollectionLevelConfig).featuredArticle = faRaw ? {
      show: Boolean(faRaw.show ?? false),
      position: (faRaw.position === "inLayout" ? "inLayout" : "header") as FeaturedArticlePosition,
    } : defaultFeaturedArticle;
  }
  if (level === "post") {
    const pb = raw?.progressBar && typeof raw.progressBar === "object" ? raw.progressBar as { show?: boolean; position?: string; thickness?: number; color?: string } : null;
    return {
      ...base,
      postModules,
      leftSidebar: { ...leftSidebar, modules: postDerived.left, moduleOrder: lsModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
      rightSidebar: { ...rightSidebar, modules: postDerived.right, moduleOrder: rsModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; width: number; spaceAbove: number; sticky: boolean },
      headerContent: { ...headerContent, modules: postDerived.header, moduleOrder: hcModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; height: number },
      footerContent: { ...footerContent, modules: postDerived.footer, moduleOrder: fcModuleOrder } as { show: boolean; modules: string[]; moduleOrder: string[]; height: number; sideMargin: number },
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
    const collectionTemplateId = data.collectionTemplateId as string | null | undefined;
    const postTemplateId = data.postTemplateId as string | null | undefined;
    return {
      defaultAuthorIds,
      postAuthorOverrides,
      collectionConfig: parseLevelConfig(cc, "collection"),
      postConfig: parseLevelConfig(pc, "post") as PostLevelConfig,
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
  const migratedPost = { ...legacy, leftSidebar: { ...lsObj, modules: hasToc ? ["tableOfContents"] : [] }, rightSidebar: { ...rsObj, modules: hasToc ? ["tableOfContents"] : [] }, headerContent: { ...hcObj, modules: [...(hasBreadcrumbs ? ["breadcrumbs"] : []), ...(hasToc ? ["tableOfContents"] : [])] } };
  const collectionTemplateId = data.collectionTemplateId as string | null | undefined;
  const postTemplateId = data.postTemplateId as string | null | undefined;
  return {
    defaultAuthorIds,
    postAuthorOverrides,
    collectionConfig: parseLevelConfig(legacy, "collection"),
    postConfig: parseLevelConfig(migratedPost, "post") as PostLevelConfig,
    collectionTemplateId: collectionTemplateId ?? null,
    postTemplateId: postTemplateId ?? null,
  };
}

function ModuleSettingSection({
  title,
  checked,
  onCheckedChange,
  expanded,
  onToggle,
  content,
}: {
  title: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
  content: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#e5e4e0]">
      <div className="flex items-center justify-between py-3">
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-1">
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
          <button
            type="button"
            onClick={() => checked && onToggle()}
            className={`p-1 rounded hover:bg-[#e5e4e0]/50 text-[#6b6b6b] shrink-0 ${!checked ? "invisible pointer-events-none" : ""}`}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Collapsible open={checked && expanded}>
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
    (a.footerContent?.height ?? 48) === (b.footerContent?.height ?? 48) &&
    (a.footerContent?.sideMargin ?? 0) === (b.footerContent?.sideMargin ?? 0) &&
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
  const faEqual = faA.show === faB.show && faA.position === faB.position;
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
  const templateIdsEqual =
    (a.collectionTemplateId ?? null) === (b.collectionTemplateId ?? null) &&
    (a.postTemplateId ?? null) === (b.postTemplateId ?? null);
  return defaultIdsEqual && overridesEqual && templateIdsEqual &&
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
  const [newAuthorImageUrl, setNewAuthorImageUrl] = useState<string | null>(null);
  const [newAuthorBio, setNewAuthorBio] = useState("");
  const [newAuthorEmail, setNewAuthorEmail] = useState("");
  const [newAuthorSocials, setNewAuthorSocials] = useState<Record<string, string>>({});
  const [addAuthorModalOpen, setAddAuthorModalOpen] = useState(false);
  const [addAuthorContext, setAddAuthorContext] = useState<"default" | { postId: string }>("default");
  const [addAuthorAsDefault, setAddAuthorAsDefault] = useState(true);
  const [editAuthor, setEditAuthor] = useState<BlogAuthorOption | null>(null);
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
  const [installationModalOpen, setInstallationModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(-1);
  const [selectedLevel, setSelectedLevel] = useState<ConfigLevel>("collection");
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

  const openEditAuthor = useCallback((author: BlogAuthorOption) => {
    setEditAuthor(author);
    setAddAuthorContext("default");
    setNewAuthorName(author.name);
    setNewAuthorImageUrl(author.imageUrl ?? null);
    setNewAuthorBio(author.bio ?? "");
    setNewAuthorEmail(author.email ?? "");
    setNewAuthorSocials(author.socialLinks ?? {});
    setAddAuthorModalOpen(true);
  }, []);

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
    const authorProfiles: Record<string, { name: string; imageUrl: string | null; bio: string | null; email: string | null; socialLinks: Record<string, string> }> = {};
    for (const a of authors) {
      authorMap[a.id] = a.name;
      authorProfiles[a.id] = {
        name: a.name,
        imageUrl: a.imageUrl ?? null,
        bio: a.bio ?? null,
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

  const handleSelectTemplate = useCallback(
    (template: Template, level: "collection" | "post") => {
      if (level === "collection" && template.collectionConfig && typeof template.collectionConfig === "object") {
        setConfig((prev) => ({
          ...prev,
          collectionConfig: parseLevelConfig(template.collectionConfig as Record<string, unknown>, "collection"),
          collectionTemplateId: template.id,
        }));
        toast.success(`Applied "${template.name}" collection template.`);
      } else if (level === "post" && template.postConfig && typeof template.postConfig === "object") {
        setConfig((prev) => ({
          ...prev,
          postConfig: parseLevelConfig(template.postConfig as Record<string, unknown>, "post") as PostLevelConfig,
          postTemplateId: template.id,
        }));
        toast.success(`Applied "${template.name}" post template.`);
      }
    },
    []
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
        const sub = path.slice("collectionConfig.".length);
        next.collectionConfig = updateLevelConfig(prev.collectionConfig, sub, value);
      } else if (path.startsWith("postConfig.")) {
        const sub = path.slice("postConfig.".length);
        next.postConfig = updateLevelConfig(prev.postConfig, sub, value) as PostLevelConfig;
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
    if (path.startsWith("collectionModules.") && "collectionModules" in cfg) {
      const cm = { ...(cfg as CollectionLevelConfig).collectionModules } as CollectionModulesConfig;
      if (path === "collectionModules.filter.enabled") cm.filter = { ...cm.filter, enabled: value as boolean };
      else if (path === "collectionModules.filter.filterByTags") cm.filter = { ...cm.filter, filterByTags: value as boolean };
      else if (path === "collectionModules.filter.filterByCategories") cm.filter = { ...cm.filter, filterByCategories: value as boolean };
      else if (path === "collectionModules.filter.position") cm.filter = { ...cm.filter, position: value as ModulePosition };
      else if (path === "collectionModules.sort.enabled") cm.sort = { ...cm.sort, enabled: value as boolean };
      else if (path === "collectionModules.sort.position") cm.sort = { ...cm.sort, position: value as ModulePosition };
      else if (path === "collectionModules.search.enabled") cm.search = { ...cm.search, enabled: value as boolean };
      else if (path === "collectionModules.search.position") cm.search = { ...cm.search, position: value as ModulePosition };
      else if (path === "collectionModules.recentPosts.enabled") cm.recentPosts = { ...cm.recentPosts, enabled: value as boolean };
      else if (path === "collectionModules.recentPosts.position") cm.recentPosts = { ...cm.recentPosts, position: value as ModulePosition };
      else if (path === "collectionModules.emailCapture.enabled") cm.emailCapture = { ...cm.emailCapture, enabled: value as boolean };
      else if (path === "collectionModules.emailCapture.position") cm.emailCapture = { ...cm.emailCapture, position: value as ModulePosition };
      else if (path === "collectionModules.emailCapture.header") cm.emailCapture = { ...cm.emailCapture, header: value as string };
      else if (path === "collectionModules.emailCapture.byline") cm.emailCapture = { ...cm.emailCapture, byline: value as string | undefined };
      else if (path === "collectionModules.emailCapture.buttonText") cm.emailCapture = { ...cm.emailCapture, buttonText: value as string };
      else if (path === "collectionModules.leadMagnet.enabled") cm.leadMagnet = { ...cm.leadMagnet, enabled: value as boolean };
      else if (path === "collectionModules.leadMagnet.position") cm.leadMagnet = { ...cm.leadMagnet, position: value as ModulePosition };
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
      else if (path === "postModules.breadcrumbs.enabled") pm.breadcrumbs = { ...pm.breadcrumbs, enabled: value as boolean };
      else if (path === "postModules.breadcrumbs.position") pm.breadcrumbs = { ...pm.breadcrumbs, position: value as ModulePosition };
      else if (path === "postModules.authorProfiles.enabled") pm.authorProfiles = { ...pm.authorProfiles, enabled: value as boolean };
      else if (path === "postModules.authorProfiles.position") pm.authorProfiles = { ...pm.authorProfiles, position: value as ModulePosition };
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
    if (path === "footerContent.height") return { ...cfg, footerContent: { ...cfg.footerContent, height: value as number } };
    if (path === "footerContent.sideMargin") return { ...cfg, footerContent: { ...cfg.footerContent, sideMargin: value as number } };
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
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setTemplateModalOpen(true)}
            >
              Use a template
            </Button>
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
                    <div className="border-b border-[#e5e4e0]">
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
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Position</Label>
                              <Select
                                value={((effectiveConfig as CollectionLevelConfig).featuredArticle ?? defaultFeaturedArticle).position}
                                onValueChange={(v) => updateLevelConfigPath("featuredArticle.position", v as FeaturedArticlePosition)}
                              >
                                <SelectTrigger>
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
                            {selectedLevel !== "collection" && (
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
                                  const valid = order.filter((m) => headerModules.includes(m));
                                  const [removed] = valid.splice(fromIdx, 1);
                                  valid.splice(toIdx, 0, removed);
                                  updateLevelConfigPath("headerContent.moduleOrder", valid);
                                };
                                const handleRemoveHeader = (moduleId: string) => {
                                  if (selectedLevel === "collection") {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules;
                                    if (["filterByCategory", "filterByTag", "filterByTagsAndCategories"].includes(moduleId) && cm?.filter) {
                                      updateLevelConfigPath("collectionModules.filter.enabled", false);
                                    } else if (moduleId === "postSort" && cm?.sort) {
                                      updateLevelConfigPath("collectionModules.sort.enabled", false);
                                    } else if (moduleId === "searchPosts" && cm?.search) {
                                      updateLevelConfigPath("collectionModules.search.enabled", false);
                                    } else if (moduleId === "emailCapture" && cm?.emailCapture) {
                                      updateLevelConfigPath("collectionModules.emailCapture.enabled", false);
                                    } else if (moduleId === "leadMagnet" && cm?.leadMagnet) {
                                      updateLevelConfigPath("collectionModules.leadMagnet.enabled", false);
                                    }
                                  } else {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules;
                                    if (moduleId === "tableOfContents" && pm?.tableOfContents) {
                                      updateLevelConfigPath("postModules.tableOfContents.enabled", false);
                                    } else if (moduleId === "breadcrumbs" && pm?.breadcrumbs) {
                                      updateLevelConfigPath("postModules.breadcrumbs.enabled", false);
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
                                  emailCapture: "Email Capture",
                                  leadMagnet: "Lead Magnet",
                                };
                                return (
                                  <div className="space-y-1.5">
                                    {orderedHeader.length === 0 ? (
                                      <p className="text-xs text-[#6b6b6b] py-2">No modules in header. Enable modules in Navigation &amp; Discovery and choose header position.</p>
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
                              <Label className="text-xs text-[#6b6b6b]">Height</Label>
                              <div className="flex items-center gap-3">
                                <Slider
                                  value={[effectiveConfig.footerContent?.height ?? 48]}
                                  onValueChange={([v]) => updateLevelConfigPath("footerContent.height", v ?? 48)}
                                  min={32}
                                  max={120}
                                  step={8}
                                  className="flex-1"
                                />
                                <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{effectiveConfig.footerContent?.height ?? 48}px</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-[#6b6b6b]">Side margin</Label>
                              <div className="flex items-center gap-3">
                                <Slider
                                  value={[effectiveConfig.footerContent?.sideMargin ?? 0]}
                                  onValueChange={([v]) => updateLevelConfigPath("footerContent.sideMargin", v ?? 0)}
                                  min={0}
                                  max={80}
                                  step={4}
                                  className="flex-1"
                                />
                                <span className="text-xs text-[#6b6b6b] w-10 shrink-0">{effectiveConfig.footerContent?.sideMargin ?? 0}px</span>
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
                                  const valid = order.filter((m) => footerModules.includes(m));
                                  const [removed] = valid.splice(fromIdx, 1);
                                  valid.splice(toIdx, 0, removed);
                                  updateLevelConfigPath("footerContent.moduleOrder", valid);
                                };
                                const handleRemoveFooter = (moduleId: string) => {
                                  if (selectedLevel === "post") {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules;
                                    if (moduleId === "relevantPosts" && pm?.relevantPosts) updateLevelConfigPath("postModules.relevantPosts.enabled", false);
                                    else if (moduleId === "authorProfiles" && pm?.authorProfiles) updateLevelConfigPath("postModules.authorProfiles.enabled", false);
                                    else if (moduleId === "emailCapture" && pm?.emailCapture) updateLevelConfigPath("postModules.emailCapture.enabled", false);
                                    else if (moduleId === "leadMagnet" && pm?.leadMagnet) updateLevelConfigPath("postModules.leadMagnet.enabled", false);
                                  } else {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules;
                                    if (moduleId === "emailCapture" && cm?.emailCapture) updateLevelConfigPath("collectionModules.emailCapture.enabled", false);
                                    else if (moduleId === "leadMagnet" && cm?.leadMagnet) updateLevelConfigPath("collectionModules.leadMagnet.enabled", false);
                                  }
                                };
                                const FOOTER_LABELS: Record<string, string> = {
                                  relevantPosts: "Related Posts",
                                  authorProfiles: "Author Profiles",
                                  emailCapture: "Email Capture",
                                  leadMagnet: "Lead Magnet",
                                };
                                return (
                                  <div className="space-y-1.5">
                                    {orderedFooter.length === 0 ? (
                                      <p className="text-xs text-[#6b6b6b] py-2">No modules in footer. Enable modules in Navigation &amp; Discovery and choose footer position.</p>
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
                        relevantPosts: "Related Posts",
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
                        const moveModule = (fromIdx: number, toIdx: number) => {
                          const order = [...(cfg.moduleOrder ?? [])];
                          const valid = order.filter((m) => modules.includes(m));
                          const [removed] = valid.splice(fromIdx, 1);
                          valid.splice(toIdx, 0, removed);
                          updateLevelConfigPath(`${subPath}.moduleOrder`, valid);
                        };
                        const orderedModules = (() => {
                          const order = cfg.moduleOrder ?? [];
                          const set = new Set(modules);
                          const fromOrder = order.filter((m) => set.has(m));
                          const remaining = modules.filter((m) => !order.includes(m));
                          return [...fromOrder, ...remaining];
                        })();
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
                          if (selectedLevel === "collection") {
                            const cm = (effectiveConfig as CollectionLevelConfig).collectionModules;
                            if (["filterByCategory", "filterByTag", "filterByTagsAndCategories"].includes(moduleId) && cm?.filter) {
                              updateLevelConfigPath("collectionModules.filter.enabled", false);
                            } else if (moduleId === "postSort" && cm?.sort) {
                              updateLevelConfigPath("collectionModules.sort.enabled", false);
                            } else if (moduleId === "searchPosts" && cm?.search) {
                              updateLevelConfigPath("collectionModules.search.enabled", false);
                            } else if (moduleId === "recentPosts" && cm?.recentPosts) {
                              updateLevelConfigPath("collectionModules.recentPosts.enabled", false);
                            }
                          } else {
                            const pm = (effectiveConfig as PostLevelConfig).postModules;
                            if (moduleId === "tableOfContents" && pm?.tableOfContents) {
                              updateLevelConfigPath("postModules.tableOfContents.enabled", false);
                            } else if (moduleId === "breadcrumbs" && pm?.breadcrumbs) {
                              updateLevelConfigPath("postModules.breadcrumbs.enabled", false);
                            } else if (moduleId === "authorProfiles" && pm?.authorProfiles) {
                              updateLevelConfigPath("postModules.authorProfiles.enabled", false);
                            } else if (moduleId === "relevantPosts" && pm?.relevantPosts) {
                              updateLevelConfigPath("postModules.relevantPosts.enabled", false);
                            }
                          }
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
                                    <div className="space-y-1.5">
                                      {orderedModules.length === 0 ? (
                                        <p className="text-xs text-[#6b6b6b] py-2">No modules in this sidebar. Enable modules above and choose this position.</p>
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
                              <ModuleSettingSection
                                title="Filtering"
                                checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.filter.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("collectionModules.filter.enabled", v);
                                  if (v) {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules?.filter;
                                    if (cm?.position === "none") updateLevelConfigPath("collectionModules.filter.position", "header");
                                    setSectionExpanded((p) => ({ ...p, filtering: true }));
                                  }
                                }}
                                expanded={sectionExpanded.filtering}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, filtering: !p.filtering }))}
                                content={
                                  <>
                                    <div className="space-y-2">
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
                                    <div className="space-y-2">
                                          <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                          <Select
                                            value={(effectiveConfig as CollectionLevelConfig).collectionModules?.filter.position === "none" ? "header" : ((effectiveConfig as CollectionLevelConfig).collectionModules?.filter.position ?? "header")}
                                            onValueChange={(v) => updateLevelConfigPath("collectionModules.filter.position", v as ModulePosition)}
                                          >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="header">Header</SelectItem>
                                              <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                              <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                  </>
                                }
                              />
                              <ModuleSettingSection
                                title="Sorting"
                                checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.sort.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("collectionModules.sort.enabled", v);
                                  if (v) {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules?.sort;
                                    if (cm?.position === "none") updateLevelConfigPath("collectionModules.sort.position", "header");
                                    setSectionExpanded((p) => ({ ...p, sorting: true }));
                                  }
                                }}
                                expanded={sectionExpanded.sorting}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, sorting: !p.sorting }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                        <Select
                                          value={(effectiveConfig as CollectionLevelConfig).collectionModules?.sort.position === "none" ? "header" : ((effectiveConfig as CollectionLevelConfig).collectionModules?.sort.position ?? "header")}
                                          onValueChange={(v) => updateLevelConfigPath("collectionModules.sort.position", v as ModulePosition)}
                                        >
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="header">Header</SelectItem>
                                            <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                            <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          </SelectContent>
                                        </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Search"
                                checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.search.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("collectionModules.search.enabled", v);
                                  if (v) {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules?.search;
                                    if (cm?.position === "none") updateLevelConfigPath("collectionModules.search.position", "header");
                                    setSectionExpanded((p) => ({ ...p, search: true }));
                                  }
                                }}
                                expanded={sectionExpanded.search}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, search: !p.search }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                        <Select
                                          value={(effectiveConfig as CollectionLevelConfig).collectionModules?.search.position === "none" ? "header" : ((effectiveConfig as CollectionLevelConfig).collectionModules?.search.position ?? "header")}
                                          onValueChange={(v) => updateLevelConfigPath("collectionModules.search.position", v as ModulePosition)}
                                        >
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="header">Header</SelectItem>
                                            <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                            <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          </SelectContent>
                                        </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Recent Posts"
                                checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.recentPosts.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("collectionModules.recentPosts.enabled", v);
                                  if (v) {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules?.recentPosts;
                                    if (cm?.position === "none") updateLevelConfigPath("collectionModules.recentPosts.position", "rightSidebar");
                                    setSectionExpanded((p) => ({ ...p, recentPosts: true }));
                                  }
                                }}
                                expanded={sectionExpanded.recentPosts}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, recentPosts: !p.recentPosts }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                    <Select
                                      value={(effectiveConfig as CollectionLevelConfig).collectionModules?.recentPosts.position === "none" ? "rightSidebar" : ((effectiveConfig as CollectionLevelConfig).collectionModules?.recentPosts.position ?? "rightSidebar")}
                                      onValueChange={(v) => updateLevelConfigPath("collectionModules.recentPosts.position", v as ModulePosition)}
                                    >
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                        <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Email Capture"
                                checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("collectionModules.emailCapture.enabled", v);
                                  if (v) {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture;
                                    if (cm?.position === "none") updateLevelConfigPath("collectionModules.emailCapture.position", "footer");
                                    setSectionExpanded((p) => ({ ...p, emailCapture: true }));
                                  }
                                }}
                                expanded={sectionExpanded.emailCapture}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, emailCapture: !p.emailCapture }))}
                                content={
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                      <Select
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture.position === "none" ? "footer" : ((effectiveConfig as CollectionLevelConfig).collectionModules?.emailCapture.position ?? "footer")}
                                        onValueChange={(v) => updateLevelConfigPath("collectionModules.emailCapture.position", v as ModulePosition)}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="header">Header</SelectItem>
                                          <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                          <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          <SelectItem value="footer">Footer</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
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
                              <ModuleSettingSection
                                title="Lead Magnet"
                                checked={(effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("collectionModules.leadMagnet.enabled", v);
                                  if (v) {
                                    const cm = (effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet;
                                    if (cm?.position === "none") updateLevelConfigPath("collectionModules.leadMagnet.position", "footer");
                                    setSectionExpanded((p) => ({ ...p, leadMagnet: true }));
                                  }
                                }}
                                expanded={sectionExpanded.leadMagnet}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, leadMagnet: !p.leadMagnet }))}
                                content={
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                      <Select
                                        value={(effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet.position === "none" ? "footer" : ((effectiveConfig as CollectionLevelConfig).collectionModules?.leadMagnet.position ?? "footer")}
                                        onValueChange={(v) => updateLevelConfigPath("collectionModules.leadMagnet.position", v as ModulePosition)}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="header">Header</SelectItem>
                                          <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                          <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          <SelectItem value="footer">Footer</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
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
                              <ModuleSettingSection
                                title="Table of Contents"
                                checked={(effectiveConfig as PostLevelConfig).postModules?.tableOfContents.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("postModules.tableOfContents.enabled", v);
                                  if (v) {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules?.tableOfContents;
                                    if (pm?.position === "none") updateLevelConfigPath("postModules.tableOfContents.position", "leftSidebar");
                                    setSectionExpanded((p) => ({ ...p, tableOfContents: true }));
                                  }
                                }}
                                expanded={sectionExpanded.tableOfContents}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, tableOfContents: !p.tableOfContents }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                        <Select
                                          value={(effectiveConfig as PostLevelConfig).postModules?.tableOfContents.position === "none" ? "leftSidebar" : ((effectiveConfig as PostLevelConfig).postModules?.tableOfContents.position ?? "leftSidebar")}
                                          onValueChange={(v) => updateLevelConfigPath("postModules.tableOfContents.position", v as ModulePosition)}
                                        >
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="header">Header</SelectItem>
                                            <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                            <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          </SelectContent>
                                        </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Breadcrumbs"
                                checked={(effectiveConfig as PostLevelConfig).postModules?.breadcrumbs.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("postModules.breadcrumbs.enabled", v);
                                  if (v) {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules?.breadcrumbs;
                                    if (pm?.position === "none") updateLevelConfigPath("postModules.breadcrumbs.position", "header");
                                    setSectionExpanded((p) => ({ ...p, breadcrumbs: true }));
                                  }
                                }}
                                expanded={sectionExpanded.breadcrumbs}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, breadcrumbs: !p.breadcrumbs }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                        <Select
                                          value={(effectiveConfig as PostLevelConfig).postModules?.breadcrumbs.position === "none" ? "header" : ((effectiveConfig as PostLevelConfig).postModules?.breadcrumbs.position ?? "header")}
                                          onValueChange={(v) => updateLevelConfigPath("postModules.breadcrumbs.position", v as ModulePosition)}
                                        >
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="header">Header</SelectItem>
                                            <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                            <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          </SelectContent>
                                        </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Author Profiles"
                                checked={(effectiveConfig as PostLevelConfig).postModules?.authorProfiles.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("postModules.authorProfiles.enabled", v);
                                  if (v) {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules?.authorProfiles;
                                    if (pm?.position === "none") updateLevelConfigPath("postModules.authorProfiles.position", "rightSidebar");
                                    setSectionExpanded((p) => ({ ...p, authorProfilesModule: true }));
                                  }
                                }}
                                expanded={sectionExpanded.authorProfilesModule}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, authorProfilesModule: !p.authorProfilesModule }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                        <Select
                                          value={(effectiveConfig as PostLevelConfig).postModules?.authorProfiles.position === "none" ? "rightSidebar" : ((effectiveConfig as PostLevelConfig).postModules?.authorProfiles.position ?? "rightSidebar")}
                                          onValueChange={(v) => updateLevelConfigPath("postModules.authorProfiles.position", v as ModulePosition)}
                                        >
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="header">Header</SelectItem>
                                            <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                            <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                            <SelectItem value="footer">Footer</SelectItem>
                                          </SelectContent>
                                        </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Related Posts"
                                checked={(effectiveConfig as PostLevelConfig).postModules?.relevantPosts.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("postModules.relevantPosts.enabled", v);
                                  if (v) {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules?.relevantPosts;
                                    if (pm?.position === "none") updateLevelConfigPath("postModules.relevantPosts.position", "footer");
                                    setSectionExpanded((p) => ({ ...p, relevantPosts: true }));
                                  }
                                }}
                                expanded={sectionExpanded.relevantPosts}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, relevantPosts: !p.relevantPosts }))}
                                content={
                                  <div className="space-y-2">
                                    <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                    <Select
                                      value={(effectiveConfig as PostLevelConfig).postModules?.relevantPosts.position === "none" ? "rightSidebar" : ((effectiveConfig as PostLevelConfig).postModules?.relevantPosts.position ?? "rightSidebar")}
                                      onValueChange={(v) => updateLevelConfigPath("postModules.relevantPosts.position", v as ModulePosition)}
                                    >
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="header">Header</SelectItem>
                                        <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                        <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                        <SelectItem value="footer">Footer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                }
                              />
                              <ModuleSettingSection
                                title="Email Capture"
                                checked={(effectiveConfig as PostLevelConfig).postModules?.emailCapture.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("postModules.emailCapture.enabled", v);
                                  if (v) {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules?.emailCapture;
                                    if (pm?.position === "none") updateLevelConfigPath("postModules.emailCapture.position", "footer");
                                    setSectionExpanded((p) => ({ ...p, emailCapture: true }));
                                  }
                                }}
                                expanded={sectionExpanded.emailCapture}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, emailCapture: !p.emailCapture }))}
                                content={
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                      <Select
                                        value={(effectiveConfig as PostLevelConfig).postModules?.emailCapture.position === "none" ? "footer" : ((effectiveConfig as PostLevelConfig).postModules?.emailCapture.position ?? "footer")}
                                        onValueChange={(v) => updateLevelConfigPath("postModules.emailCapture.position", v as ModulePosition)}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="header">Header</SelectItem>
                                          <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                          <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          <SelectItem value="footer">Footer</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
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
                              <ModuleSettingSection
                                title="Lead Magnet"
                                checked={(effectiveConfig as PostLevelConfig).postModules?.leadMagnet.enabled ?? false}
                                onCheckedChange={(v) => {
                                  updateLevelConfigPath("postModules.leadMagnet.enabled", v);
                                  if (v) {
                                    const pm = (effectiveConfig as PostLevelConfig).postModules?.leadMagnet;
                                    if (pm?.position === "none") updateLevelConfigPath("postModules.leadMagnet.position", "footer");
                                    setSectionExpanded((p) => ({ ...p, leadMagnet: true }));
                                  }
                                }}
                                expanded={sectionExpanded.leadMagnet}
                                onToggle={() => setSectionExpanded((p) => ({ ...p, leadMagnet: !p.leadMagnet }))}
                                content={
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs text-[#6b6b6b]">Position</Label>
                                      <Select
                                        value={(effectiveConfig as PostLevelConfig).postModules?.leadMagnet.position === "none" ? "footer" : ((effectiveConfig as PostLevelConfig).postModules?.leadMagnet.position ?? "footer")}
                                        onValueChange={(v) => updateLevelConfigPath("postModules.leadMagnet.position", v as ModulePosition)}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="header">Header</SelectItem>
                                          <SelectItem value="leftSidebar">Left Sidebar</SelectItem>
                                          <SelectItem value="rightSidebar">Right Sidebar</SelectItem>
                                          <SelectItem value="footer">Footer</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
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
              setNewAuthorEmail("");
              setNewAuthorSocials({});
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editAuthor ? "Edit Author" : "Add New Author"}</DialogTitle>
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
                  placeholder="A brief description..."
                  className="w-full min-h-[60px] px-3 py-2 text-sm border border-[#e5e4e0] rounded-md resize-y"
                  maxLength={200}
                />
                <span className="text-xs text-[#6b6b6b]">{newAuthorBio.length}/200</span>
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
              {configLoading ? (
                <div className="flex items-center justify-center h-full text-[#6b6b6b] p-8 text-center">
                  Loading settings…
                </div>
              ) : effectiveSite && (() => {
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

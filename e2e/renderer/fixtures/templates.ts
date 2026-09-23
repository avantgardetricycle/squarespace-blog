/**
 * Detection fields copied from the canonical objects in server/src/routes/templates.ts.
 * Do not import that module — it loads Prisma.
 */

type Json = Record<string, unknown>;

const sidebar = (show: boolean, modules: string[], width: number, sticky = false): Json => ({
  show,
  modules: modules.slice(),
  moduleOrder: modules.slice(),
  width,
  spaceAbove: 0,
  sticky,
});

const off = sidebar(false, [], 240);

export const postTemplates = {
  feature: {
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    postHeader: {
      imagePosition: "fullBleed",
      contentAlignment: "center",
      contentVerticalAlignment: "bottom",
      fullBleedLayout: "stacked",
      showBreadcrumbs: true,
      showTags: true,
      showCategories: true,
      showByline: true,
      showDecorativeAccentLine: false,
    },
    leftSidebar: sidebar(true, ["tableOfContents"], 240, true),
    rightSidebar: sidebar(true, ["authorProfiles", "relevantPosts", "popularPosts"], 280),
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: {
      show: true,
      modules: ["authorProfiles", "relevantPosts", "emailCapture", "prevNextArticle"],
      moduleOrder: ["authorProfiles", "relevantPosts", "emailCapture", "prevNextArticle"],
      topPadding: 16,
      sideMargins: "fullScreen",
    },
    socialMediaLinks: { show: true, platforms: ["facebook", "x", "linkedin", "email"] },
    featuredImage: { show: true, layoutMode: "fullBleed", aspectRatio: "21:8", showCaption: true },
    postModules: {
      tableOfContents: { enabled: true, position: "leftSidebar", style: "bookmark" },
      breadcrumbs: { enabled: true, position: "none" },
      authorProfiles: { enabled: true, position: "rightSidebar" },
      popularPosts: { enabled: true, position: "rightSidebar", count: 3 },
      relevantPosts: { enabled: true, position: "rightSidebar" },
      emailCapture: { enabled: true, position: "footer", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "Free resource", description: "A guide.", buttonText: "Get it free" },
    },
    progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  },
  reporter: {
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    postHeader: {
      imagePosition: "rightOfInfo",
      contentAlignment: "left",
      contentVerticalAlignment: "top",
      showBreadcrumbs: true,
      showTags: true,
      showCategories: false,
      showByline: true,
      showDecorativeAccentLine: true,
    },
    leftSidebar: off,
    rightSidebar: sidebar(true, ["authorProfiles", "relevantPosts"], 280),
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: {
      show: true,
      modules: ["authorProfiles", "relevantPosts", "emailCapture", "prevNextArticle"],
      moduleOrder: ["authorProfiles", "relevantPosts", "emailCapture", "prevNextArticle"],
      topPadding: 16,
      sideMargins: "postBody",
    },
    socialMediaLinks: { show: false, platforms: [] },
    featuredImage: { show: true, layoutMode: "rightJustified", imageWidthPercent: 60, aspectRatio: "3:2", showCaption: true },
    progressBar: { show: true, position: "top", thickness: 6, color: "#5B4FE8" },
    postModules: {
      tableOfContents: { enabled: true, position: "rightSidebar", style: "numbered" },
      breadcrumbs: { enabled: true, position: "none" },
      authorProfiles: { enabled: true, position: "rightSidebar" },
      popularPosts: { enabled: false, position: "none", count: 3 },
      relevantPosts: { enabled: true, position: "rightSidebar" },
      emailCapture: { enabled: true, position: "footer", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "Free resource", description: "A guide.", buttonText: "Get it free" },
    },
  },
  writer: {
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    postHeader: {
      imagePosition: "belowInfo",
      contentAlignment: "center",
      contentVerticalAlignment: "top",
      showBreadcrumbs: true,
      showTags: false,
      showCategories: true,
      showByline: true,
      showDecorativeAccentLine: true,
    },
    leftSidebar: sidebar(false, [], 200),
    rightSidebar: off,
    footerContent: {
      show: true,
      modules: ["authorProfiles", "prevNextArticle", "emailCapture"],
      moduleOrder: ["authorProfiles", "prevNextArticle", "emailCapture"],
      topPadding: 16,
      sideMargins: "fullScreen",
    },
    featuredImage: { show: false },
    postModules: {
      authorProfiles: { enabled: true, position: "footer" },
      emailCapture: { enabled: true, position: "footer", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
    },
    progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  },
  story: {
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    postHeader: {
      imagePosition: "leftOfInfo",
      contentAlignment: "left",
      contentVerticalAlignment: "top",
      backgroundColor: "#000000",
      showBreadcrumbs: true,
      showTags: true,
      showCategories: true,
      showByline: true,
      showDecorativeAccentLine: true,
    },
    leftSidebar: off,
    rightSidebar: off,
    headerContent: { show: false, modules: [], moduleOrder: [], height: 56 },
    footerContent: {
      show: true,
      modules: ["authorProfiles", "emailCapture", "prevNextArticle"],
      moduleOrder: ["authorProfiles", "emailCapture", "prevNextArticle"],
      topPadding: 16,
      sideMargins: "postBody",
    },
    socialMediaLinks: { show: true, platforms: ["facebook", "x", "linkedin", "email"] },
    featuredImage: { show: true, layoutMode: "leftJustified", imageWidthPercent: 60, aspectRatio: "3:2", showCaption: true },
    postModules: {
      breadcrumbs: { enabled: true, position: "none" },
      authorProfiles: { enabled: true, position: "footer" },
      emailCapture: { enabled: true, position: "footer", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "Free resource", description: "A guide.", buttonText: "Get it free" },
    },
    progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  },
  publisher: {
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    postHeader: {
      imagePosition: "fullBleed",
      contentAlignment: "left",
      contentVerticalAlignment: "bottom",
      showBreadcrumbs: false,
      showTags: false,
      showCategories: true,
      showDecorativeAccentLine: false,
    },
    leftSidebar: sidebar(false, [], 200),
    rightSidebar: sidebar(true, ["popularPosts", "relevantPosts", "filterByCategory", "tableOfContents"], 320),
    footerContent: {
      show: true,
      modules: ["authorProfiles", "relevantPosts", "prevNextArticle", "filterByCategory"],
      moduleOrder: ["authorProfiles", "relevantPosts", "prevNextArticle", "filterByCategory"],
      topPadding: 16,
      sideMargins: "postBody",
    },
    featuredImage: { show: true, layoutMode: "fullBleed", showCaption: true },
    postModules: {
      tableOfContents: { enabled: true, position: "rightSidebar", style: "numbered" },
      breadcrumbs: { enabled: false, position: "none" },
      authorProfiles: { enabled: true, position: "footer" },
      popularPosts: { enabled: true, position: "rightSidebar", count: 3 },
      relevantPosts: { enabled: true, position: "rightSidebar" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "Free resource", description: "A guide.", buttonText: "Get it free" },
    },
    progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  },
} as const;

const collectionModules = {
  filter: { filterByTags: false, filterByCategories: true },
  sort: {},
  search: {},
  recentPosts: {},
  popularPosts: { count: 3 },
  emailCapture: { header: "Subscribe to our newsletter", buttonText: "Subscribe" },
  leadMagnet: { resourceTitle: "Free resource", description: "A guide.", buttonText: "Get it free" },
};

export const collectionTemplates = {
  masthead: {
    collectionLayout: "grid",
    gridColumns: 3,
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    showPostExcerpt: true,
    pagination: { show: true, mode: "infiniteScroll", postsPerPage: 10 },
    leftSidebar: off,
    rightSidebar: off,
    collectionModules,
    headerContent: {
      show: true,
      modules: ["filterByCategory", "postSort", "searchPosts"],
      moduleOrder: ["filterByCategory", "postSort", "searchPosts"],
      height: 48,
    },
    footerContent: {
      show: true,
      modules: ["emailCapture"],
      moduleOrder: ["emailCapture"],
      topPadding: 16,
    },
    featuredImage: { show: true, layoutMode: "fullBleed", aspectRatio: "16:9" },
    socialMediaLinks: { show: false, platforms: [] },
    featuredArticle: { show: true, position: "header" },
  },
  newsroom: {
    collectionLayout: "listRows",
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    showPostExcerpt: true,
    pagination: { show: true, mode: "pages", postsPerPage: 10 },
    leftSidebar: off,
    rightSidebar: off,
    headerContent: {
      show: true,
      modules: ["filterByCategory", "searchPosts", "postSort"],
      moduleOrder: ["filterByCategory", "searchPosts", "postSort"],
      height: 48,
    },
    footerContent: {
      show: true,
      modules: ["emailCapture", "leadMagnet"],
      moduleOrder: ["emailCapture", "leadMagnet"],
      topPadding: 16,
    },
    collectionModules,
    featuredImage: { show: true, layoutMode: "leftJustified", imageWidthPercent: 30 },
    featuredArticle: { show: true, position: "inLayout" },
  },
  showcase: {
    collectionLayout: "showcase",
    pagination: { show: true, mode: "infiniteScroll", postsPerPage: 10 },
    showAuthor: true,
    showReadingTime: true,
    showPostExcerpt: true,
    featuredArticle: { show: true, position: "inLayout" },
    leftSidebar: off,
    rightSidebar: off,
    headerContent: {
      show: true,
      modules: ["filterByCategory", "postSort", "searchPosts"],
      moduleOrder: ["filterByCategory", "postSort", "searchPosts"],
      height: 48,
    },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    featuredImage: { show: true, layoutMode: "fullBleed", imageWidthPercent: 50, aspectRatio: "16:9" },
    socialMediaLinks: { show: false, platforms: [] },
    collectionModules,
  },
  editorial: {
    collectionLayout: "editorial",
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    showPostExcerpt: false,
    pagination: { show: true, mode: "pages", postsPerPage: 10 },
    featuredArticle: { show: true, position: "inLayout" },
    leftSidebar: off,
    rightSidebar: off,
    headerContent: {
      show: true,
      modules: ["filterByCategory", "searchPosts", "postSort"],
      moduleOrder: ["filterByCategory", "searchPosts", "postSort"],
      height: 48,
    },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    featuredImage: { show: true, layoutMode: "fullBleed", aspectRatio: "16:9" },
    socialMediaLinks: { show: false, platforms: [] },
    collectionModules,
  },
  digest: {
    collectionLayout: "digest",
    gridColumns: 2,
    showDate: true,
    showAuthor: true,
    showReadingTime: true,
    showPostExcerpt: false,
    featuredArticle: { show: true, position: "inLayout" },
    pagination: { show: true, mode: "pages", postsPerPage: 10 },
    leftSidebar: sidebar(true, ["emailCapture"], 220),
    rightSidebar: sidebar(true, ["authorProfiles", "emailCapture", "popularPosts", "filterByCategory"], 280),
    headerContent: {
      show: true,
      modules: ["filterByCategory", "searchPosts", "postSort"],
      moduleOrder: ["filterByCategory", "searchPosts", "postSort"],
      height: 48,
    },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    featuredImage: { show: true, layoutMode: "fullBleed", imageWidthPercent: 40, aspectRatio: "16:9" },
    socialMediaLinks: { show: false, platforms: [] },
    collectionModules,
  },
} as const;

export type PostTemplateName = keyof typeof postTemplates;
export type CollectionTemplateName = keyof typeof collectionTemplates;

/** Drop sidebar copies of modules that also live in the footer, so mobile order is visible. */
export function zoneOrderPostConfig(name: PostTemplateName): Json {
  const next = structuredClone(postTemplates[name]) as Json;
  const footer = next.footerContent as { modules?: string[]; moduleOrder?: string[] };
  const footerIds = new Set(footer?.modules || []);
  const right = next.rightSidebar as { show?: boolean; modules?: string[]; moduleOrder?: string[] } | undefined;
  const modules = next.postModules as Json;
  if (right?.show) {
    let keep = (right.modules || []).filter((id) => !footerIds.has(id) && id !== "tableOfContents");
    if (!keep.length) keep = ["popularPosts"];
    if (!keep.includes("tableOfContents")) keep = ["tableOfContents", ...keep];
    right.modules = keep;
    right.moduleOrder = keep.slice();
    modules.popularPosts = { enabled: true, position: "rightSidebar", count: 3 };
    modules.tableOfContents = { enabled: true, position: "rightSidebar", style: "numbered" };
  }
  const left = next.leftSidebar as { show?: boolean; modules?: string[]; moduleOrder?: string[] } | undefined;
  if (left?.show && !(left.modules || []).includes("tableOfContents")) {
    left.modules = ["tableOfContents", ...(left.modules || [])];
    left.moduleOrder = (left.modules || []).slice();
    modules.tableOfContents = { enabled: true, position: "leftSidebar", style: "bookmark" };
  }
  const footerModules = footer?.modules ? footer.modules.filter((id) => id !== "tableOfContents") : [];
  if (footer) {
    if (!footerModules.includes("prevNextArticle")) footerModules.push("prevNextArticle");
    footer.modules = footerModules;
    footer.moduleOrder = footerModules.slice();
  }
  return next;
}

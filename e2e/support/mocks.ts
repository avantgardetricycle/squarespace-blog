import type { Page, Route } from "@playwright/test";

const siteKey = "e2e-site";

const dashboardMe = {
  user: {
    id: 1,
    email: "e2e@example.com",
    name: "E2E User",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  subscription: {
    plan: "professional",
    cadence: "monthly",
    priceDisplay: "$29/mo",
    status: "active",
    maxSites: 3,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
  sites: [
    {
      id: "site-1",
      siteKey,
      name: "E2E Fixture Site",
      url: "http://127.0.0.1:4173/e2e/iframe-blog.html",
      blogPath: "/e2e/iframe-blog.html",
      status: "active",
      verificationStatus: "verified",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  ],
  canCreateSite: true,
};

const configResponse = {
  collectionConfig: {
    showDate: true,
    showAuthor: false,
    showReadingTime: false,
    postSort: "date",
    pagination: { show: false, mode: "pages", postsPerPage: 10 },
    collectionLayout: "grid",
    gridColumns: 3,
    collectionModules: {
      filter: { enabled: false, filterByTags: false, filterByCategories: true, position: "none" },
      sort: { enabled: false, position: "none" },
      search: { enabled: false, position: "none" },
      recentPosts: { enabled: false, position: "none" },
      emailCapture: { enabled: false, position: "none", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "", description: "", buttonText: "Get it free" },
    },
    leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    socialMediaLinks: { show: false, platforms: [] },
    featuredImage: {
      show: true,
      layoutMode: "fullBleed",
      imageWidthPercent: 40,
      aspectBehavior: "original",
      aspectRatio: "16:9",
      roundedCorners: "off",
      shadow: false,
      showCaption: true,
      verticalSpacing: "normal",
    },
    featuredArticle: { show: false, position: "header" },
  },
  postConfig: {
    showDate: true,
    showAuthor: false,
    showReadingTime: false,
    postSort: "date",
    pagination: { show: false, mode: "pages", postsPerPage: 10 },
    collectionLayout: "grid",
    gridColumns: 3,
    postModules: {
      tableOfContents: { enabled: false, position: "none" },
      breadcrumbs: { enabled: false, position: "none" },
      authorProfiles: { enabled: false, position: "none" },
      popularPosts: { enabled: false, position: "none", count: 5 },
      relevantPosts: { enabled: false, position: "none" },
      emailCapture: { enabled: false, position: "none", header: "Subscribe to our newsletter", buttonText: "Subscribe" },
      leadMagnet: { enabled: false, position: "none", resourceTitle: "", description: "", buttonText: "Get it free" },
    },
    postHeader: {
      imagePosition: "fullBleed",
      contentAlignment: "left",
      showBreadcrumbs: false,
      showTags: false,
      showCategories: false,
    },
    leftSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    rightSidebar: { show: false, modules: [], moduleOrder: [], width: 240, spaceAbove: 0, sticky: false },
    headerContent: { show: false, modules: [], moduleOrder: [], height: 48 },
    footerContent: { show: false, modules: [], moduleOrder: [], topPadding: 16 },
    socialMediaLinks: { show: false, platforms: [] },
    featuredImage: {
      show: true,
      layoutMode: "fullBleed",
      imageWidthPercent: 40,
      aspectBehavior: "original",
      aspectRatio: "16:9",
      roundedCorners: "off",
      shadow: false,
      showCaption: true,
      verticalSpacing: "normal",
    },
    progressBar: { show: false, position: "top", thickness: 6, color: "#5B4FE8" },
  },
  collectionTemplateId: null,
  postTemplateId: null,
  defaultAuthorIds: ["author-1"],
  postAuthorOverrides: {},
};

const configurePreviewResponse = {
  items: [
    {
      id: "post-1",
      title: "First Fixture Post",
      author: { displayName: "Fixture Author" },
      fullUrl: "/e2e/fixture-post-1",
    },
    {
      id: "post-2",
      title: "Second Fixture Post",
      author: { displayName: "Fixture Author" },
      fullUrl: "/e2e/fixture-post-2",
    },
  ],
};

const checkoutPlanPrices = {
  currency: "usd",
  plans: {
    essentials: {
      monthly: { perMonth: 12 },
      annual: { perMonth: 9, perYear: 108 },
    },
    professional: {
      monthly: { perMonth: 19 },
      annual: { perMonth: 14, perYear: 168 },
    },
    publication: {
      monthly: { perMonth: 39 },
      annual: { perMonth: 29, perYear: 348 },
    },
  },
};

const authorsResponse = [
  {
    id: "author-1",
    name: "Fixture Author",
    imageUrl: null,
    bio: null,
    email: null,
    socialLinks: {},
  },
];

const json = async (route: Route, status: number, body: unknown) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

export async function setupApiMocks(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname;

    if (method === "GET" && path === "/api/dashboard/me") return json(route, 200, dashboardMe);
    if (method === "GET" && path === "/api/checkout/prices") return json(route, 200, checkoutPlanPrices);
    if (method === "GET" && path === `/api/config/${siteKey}`) return json(route, 200, configResponse);
    if (method === "POST" && path === "/api/config") return json(route, 200, { ok: true });
    if (method === "GET" && path === `/api/config/blog-preview/${siteKey}`) return json(route, 200, configurePreviewResponse);
    if (method === "GET" && path === `/api/blog-authors/${siteKey}`) return json(route, 200, authorsResponse);
    if (method === "POST" && path === "/api/blog-authors") return json(route, 200, authorsResponse[0]);
    if (method === "PATCH" && path.startsWith("/api/blog-authors/")) return json(route, 200, authorsResponse[0]);
    if (method === "POST" && path === "/api/config/check-placeholder-images") return json(route, 200, { urls: {} });
    if (method === "POST" && path === "/api/analytics/events") return json(route, 200, { ok: true });
    if (method === "POST" && path === "/api/capture") return json(route, 200, { ok: true });
    if (method === "POST" && path === "/api/auth/logout") return json(route, 200, { ok: true });

    return json(route, 200, {});
  });
}

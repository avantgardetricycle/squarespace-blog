import { expect, test, type Page } from "@playwright/test";

import { cssNumber, cssValue, expectPx, isMobileProject, mountRenderer } from "./harness";
import { postTemplates, zoneOrderPostConfig, type PostTemplateName } from "./fixtures/templates";

const POSTS: PostTemplateName[] = ["feature", "reporter", "writer", "story", "publisher"];

async function layoutSnapshot(page: Page) {
  return page.evaluate(() => {
    function box(el: Element | null) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return null;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0 && rect.width === 0) return null;
      return rect.top;
    }
    const footer = document.querySelector(
      '[data-bb-zone="footer"]:not(.bb-mobile-duplicate-hidden):not(.bb-mobile-empty-hidden)',
    );
    const rail = document.querySelector(
      '.blog-overlay-sidebar-anchor[data-bb-sidebar-side="right"]:not(.bb-mobile-rail-hidden)',
    );
    const comments = document.getElementById("bb-comments");
    return {
      narrow: document.getElementById("blog-overlay-list")?.classList.contains("bb-narrow-viewport") ?? false,
      body: box(document.querySelector(".blog-overlay-body")),
      comments: box(comments),
      commentsInMainRow: Boolean(comments?.closest(".blog-overlay-main-row")),
      footer: box(footer),
      rail: box(rail),
      leftDisplay: (() => {
        const left = document.querySelector('[data-bb-sidebar-side="left"]');
        return left ? getComputedStyle(left).display : null;
      })(),
      tocHidden: Boolean(
        document.querySelector('[data-bb-module="tableOfContents"]')?.classList.contains("bb-mobile-toc-hidden"),
      ),
      hasToc: Boolean(document.querySelector('[data-bb-module="tableOfContents"]')),
      overlayPosition: getComputedStyle(document.getElementById("blog-overlay-list")!).position,
      footerPosition: (() => {
        const el = document.querySelector(".blog-overlay-footer-content, .blog-overlay-feature-below-row");
        return el ? getComputedStyle(el).position : null;
      })(),
    };
  });
}

test.describe("post layout contract", () => {
  for (const name of POSTS) {
    test(`${name} matches the post layout spec`, async ({ page }, testInfo) => {
      const mobile = isMobileProject(testInfo);
      await mountRenderer(page, { postConfig: zoneOrderPostConfig(name) });
      const snap = await layoutSnapshot(page);

      expect(snap.narrow, "bb-narrow-viewport").toBe(mobile);
      expect(snap.overlayPosition).not.toBe("fixed");
      expect(snap.footerPosition === "fixed" || snap.footerPosition === "absolute").toBe(false);

      if (snap.hasToc) {
        expect(snap.tocHidden, "table of contents hidden only on mobile").toBe(mobile);
      }
      if (snap.leftDisplay) {
        if (mobile) expect(snap.leftDisplay).toBe("none");
        else expect(snap.leftDisplay).not.toBe("none");
      }

      const h1 = await cssNumber(page, ".blog-overlay-body h1", "font-size");
      const h6 = await cssNumber(page, ".blog-overlay-body h6", "font-size");
      expectPx(h6, 12);
      if (mobile) expectPx(h1, name === "writer" ? 29 : 24);
      else expectPx(h1, 48);

      const footerGapSel =
        name === "feature" && mobile
          ? ".blog-overlay-feature-footer-modules"
          : name === "feature"
            ? ".blog-overlay-feature-below-row"
            : ".blog-overlay-footer-content";
      const footerGap = await cssNumber(page, footerGapSel, "gap");
      if (mobile) expectPx(footerGap, 56, 2);
      else expect(footerGap).toBeLessThan(40);

      const prevDisplay = await cssValue(page, "nav.blog-overlay-prev-next", "display");
      const categoryDisplay = await cssValue(page, ".blog-overlay-prev-next-category", "display");
      if (mobile) {
        expect(prevDisplay).toBe("grid");
        expect(categoryDisplay).toBe("none");
        const columns = await cssValue(page, "nav.blog-overlay-prev-next", "grid-template-columns");
        expect(columns.split(" ").length).toBe(2);
      } else {
        expect(prevDisplay).toBe("flex");
        expect(categoryDisplay).not.toBe("none");
      }

      if (mobile) {
        expect(snap.body).not.toBeNull();
        expect(snap.comments).not.toBeNull();
        expect(snap.footer).not.toBeNull();
        expect(snap.body!).toBeLessThan(snap.comments!);
        expect(snap.comments!).toBeLessThan(snap.footer!);
        if (snap.rail != null) expect(snap.footer!).toBeLessThan(snap.rail);
      } else {
        expect(snap.commentsInMainRow, "desktop comments stay outside the main row").toBe(false);
        if (name === "feature") {
          const belowAfterRow = await page.evaluate(() => {
            const row = document.querySelector(".blog-overlay-main-row");
            const below = document.querySelector(".blog-overlay-feature-below-row");
            if (!row || !below) return false;
            return Boolean(row.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING);
          });
          expect(belowAfterRow).toBe(true);
        }
      }

      await assertTemplate(page, name, mobile);
    });
  }

  test("sidebar copy wins over a duplicated footer module on mobile", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    await mountRenderer(page, { postConfig: structuredClone(postTemplates.feature) });
    const hidden = await page
      .locator('[data-bb-zone="footer"][data-bb-module="authorProfiles"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-duplicate-hidden"));
    expect(hidden).toBe(mobile);
  });

  test("a left-only module keeps its footer copy on mobile", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    const cfg = structuredClone(postTemplates.feature) as Record<string, any>;
    cfg.leftSidebar = {
      show: true,
      modules: ["leadMagnet", "tableOfContents"],
      moduleOrder: ["leadMagnet", "tableOfContents"],
      width: 240,
      spaceAbove: 0,
      sticky: true,
    };
    cfg.rightSidebar.modules = ["popularPosts"];
    cfg.rightSidebar.moduleOrder = ["popularPosts"];
    cfg.footerContent.modules = ["leadMagnet", "prevNextArticle"];
    cfg.footerContent.moduleOrder = ["leadMagnet", "prevNextArticle"];
    cfg.postModules.leadMagnet = {
      enabled: true,
      position: "footer",
      resourceTitle: "Free resource",
      description: "A guide.",
      buttonText: "Get it free",
    };
    await mountRenderer(page, { postConfig: cfg });
    const hidden = await page
      .locator('[data-bb-zone="footer"][data-bb-module="leadMagnet"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-duplicate-hidden"));
    expect(hidden).toBe(false);
    if (mobile) {
      const left = await cssValue(page, '[data-bb-sidebar-side="left"]', "display");
      expect(left).toBe("none");
    }
  });

  test("sidebar category filters stay hidden on mobile and the footer copy shows", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    await mountRenderer(page, { postConfig: structuredClone(postTemplates.publisher) });
    const sidebarHidden = await page
      .locator('[data-bb-zone="sidebar"][data-bb-module="filterByCategory"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-sidebar-filter-hidden"));
    const footerHidden = await page
      .locator('[data-bb-zone="footer"][data-bb-module="filterByCategory"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-duplicate-hidden"));
    expect(sidebarHidden).toBe(mobile);
    expect(footerHidden).toBe(false);
  });

  test("reporter and publisher comments follow the side margins toggle", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "stacked mobile comments span the content column");
    for (const name of ["reporter", "publisher"] as const) {
      for (const mode of ["postBody", "fullScreen"] as const) {
        const cfg = structuredClone(postTemplates[name]) as Record<string, any>;
        cfg.footerContent.sideMargins = mode;
        await mountRenderer(page, { postConfig: cfg });
        const widths = await page.evaluate(() => {
          function size(el: Element | null) {
            if (!el) return { width: 0, left: 0 };
            const box = el.getBoundingClientRect();
            return { width: Math.round(box.width), left: Math.round(box.left) };
          }
          const comments = document.getElementById("bb-comments");
          return {
            comments: size(comments),
            main: size(document.querySelector(".blog-overlay-posts")),
            row: size(document.querySelector(".blog-overlay-main-row")),
            footer: size(document.querySelector(".blog-overlay-footer-zone")),
            inMainRow: Boolean(comments?.closest(".blog-overlay-main-row")),
          };
        });
        expect(widths.inMainRow, `${name} ${mode} comments stay outside the main row`).toBe(false);
        expectPx(widths.comments.left, widths.main.left, 2);
        expectPx(widths.footer.width, widths.comments.width, 2);
        if (mode === "postBody") {
          expectPx(widths.comments.width, widths.main.width, 2);
          expect(widths.comments.width, `${name} post body comments are narrower than the content row`).toBeLessThan(
            widths.row.width - 40,
          );
        } else {
          expectPx(widths.comments.width, widths.row.width, 2);
          expect(widths.comments.width, `${name} full screen comments span past the article column`).toBeGreaterThan(
            widths.main.width + 40,
          );
        }
      }
    }
  });

  test("sidebar width comes from settings", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "mobile rails stretch to the content width");
    await mountRenderer(page, { postConfig: structuredClone(postTemplates.publisher) });
    const width = await page.locator('[data-bb-sidebar-side="right"]').first().evaluate((el) => {
      return Math.round(el.getBoundingClientRect().width);
    });
    expectPx(width, 320, 2);
  });

  test("reporter and publisher desktop footer side margins follow the setting", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    for (const name of ["reporter", "publisher"] as const) {
      const base = structuredClone(postTemplates[name]) as Record<string, any>;
      base.footerContent = { ...base.footerContent, sideMargins: "postBody" };
      await mountRenderer(page, { postConfig: base });
      const postBody = await footerSideBox(page);
      base.footerContent = { ...base.footerContent, sideMargins: "fullScreen" };
      await mountRenderer(page, { postConfig: base });
      const fullScreen = await footerSideBox(page);

      if (mobile) {
        expect(Math.abs(postBody.footerWidth - fullScreen.footerWidth)).toBeLessThan(2);
        expect(Math.abs(postBody.footerLeft - fullScreen.footerLeft)).toBeLessThan(2);
        continue;
      }

      expect(Math.abs(postBody.footerLeft - postBody.articleLeft)).toBeLessThan(2);
      expect(Math.abs(postBody.footerWidth - postBody.articleWidth)).toBeLessThan(2);
      expect(fullScreen.footerWidth).toBeGreaterThan(fullScreen.articleWidth + 40);
      expect(Math.abs(fullScreen.footerLeft - fullScreen.rowLeft)).toBeLessThan(2);
      expect(fullScreen.footerWidth).toBeGreaterThan(postBody.footerWidth + 40);
    }
  });

  test("story desktop comments follow the footer side margin setting", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    const base = structuredClone(postTemplates.story) as Record<string, any>;
    base.footerContent = { ...base.footerContent, sideMargins: "postBody" };
    await mountRenderer(page, { postConfig: base });
    const postBody = await storyCommentsFooterBox(page);
    base.footerContent = { ...base.footerContent, sideMargins: "fullScreen" };
    await mountRenderer(page, { postConfig: base });
    const fullScreen = await storyCommentsFooterBox(page);

    expect(Math.abs(postBody.commentsLeft - postBody.footerLeft)).toBeLessThan(2);
    expect(Math.abs(postBody.commentsWidth - postBody.footerWidth)).toBeLessThan(2);
    expect(Math.abs(fullScreen.commentsLeft - fullScreen.footerLeft)).toBeLessThan(2);
    expect(Math.abs(fullScreen.commentsWidth - fullScreen.footerWidth)).toBeLessThan(2);

    if (mobile) {
      expect(Math.abs(postBody.commentsWidth - fullScreen.commentsWidth)).toBeLessThan(2);
      expect(Math.abs(postBody.commentsLeft - fullScreen.commentsLeft)).toBeLessThan(2);
      return;
    }

    expect(fullScreen.commentsWidth).toBeGreaterThan(postBody.commentsWidth + 40);
  });

  test("sidebar subscribe and get-it-free use compact desktop padding", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    const cfg = structuredClone(postTemplates.reporter) as Record<string, any>;
    cfg.rightSidebar = {
      show: true,
      modules: ["emailCapture", "leadMagnet"],
      moduleOrder: ["emailCapture", "leadMagnet"],
      width: 280,
      spaceAbove: 0,
      sticky: false,
    };
    cfg.footerContent = {
      ...cfg.footerContent,
      modules: ["emailCapture", "leadMagnet"],
      moduleOrder: ["emailCapture", "leadMagnet"],
    };
    cfg.postModules.emailCapture = {
      enabled: true,
      position: "rightSidebar",
      header: "Subscribe to our newsletter",
      buttonText: "Subscribe",
    };
    cfg.postModules.leadMagnet = {
      enabled: true,
      position: "rightSidebar",
      resourceTitle: "Free resource",
      description: "A guide.",
      buttonText: "Get it free",
    };
    await mountRenderer(page, { postConfig: cfg });

    const sidebar = await page.evaluate(() => {
      function read(selector: string) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) return null;
        const cs = getComputedStyle(el);
        const parent = el.parentElement ? el.parentElement.getBoundingClientRect().width : 0;
        return {
          padding: cs.padding,
          width: el.getBoundingClientRect().width,
          parent,
          fontSizeInline: el.style.fontSize,
          primary: el.classList.contains("sqs-button-element--primary"),
        };
      }
      return {
        subscribe: read(".blog-overlay-sidebar-section .bb-newsletter-btn"),
        lead: read(".blog-overlay-sidebar-section .bb-lead-magnet-btn"),
        footerSubscribe: read(".blog-overlay-email-capture-footer .bb-newsletter-btn"),
      };
    });

    expect(sidebar.subscribe).not.toBeNull();
    expect(sidebar.lead).not.toBeNull();
    expect(sidebar.subscribe!.primary).toBe(true);
    expect(sidebar.lead!.primary).toBe(true);
    expect(sidebar.subscribe!.fontSizeInline).toBe("");
    expect(sidebar.lead!.fontSizeInline).toBe("");

    if (mobile) {
      expect(sidebar.footerSubscribe!.padding).toBe("8px 16px");
      return;
    }

    expect(sidebar.subscribe!.padding).toBe("8px 16px");
    expect(sidebar.lead!.padding).toBe("8px 16px");
    expect(Math.abs(sidebar.subscribe!.width - sidebar.subscribe!.parent)).toBeLessThan(2);
    expect(Math.abs(sidebar.lead!.width - sidebar.lead!.parent)).toBeLessThan(2);
    expect(sidebar.footerSubscribe!.padding).not.toBe("8px 16px");
    expect(sidebar.footerSubscribe!.width).toBeLessThan(sidebar.footerSubscribe!.parent - 20);
  });

  test("sticky sidebar stays in flow until it pins, and does not pin at top 0", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "sidebars stack and drop sticky on phones");
    await mountRenderer(page, { postConfig: structuredClone(postTemplates.feature) });
    const rail = page.locator('.blog-overlay-sidebar-rail[data-bb-sticky-rail="1"]').first();
    await expect(rail).toHaveCount(1);
    const resting = await rail.evaluate((el) => getComputedStyle(el).position);
    expect(resting === "fixed" || resting === "absolute").toBe(false);

    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(50);
    const stuck = await rail.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, top: parseFloat(cs.top) };
    });
    if (stuck.position === "fixed") {
      expect(stuck.top).toBeGreaterThan(0);
    }
  });
});

async function storyCommentsFooterBox(page: Page) {
  return page.evaluate(() => {
    function contentBox(el: Element | null) {
      if (!el) return { left: 0, width: 0 };
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      return { left: rect.left + padLeft, width: rect.width - padLeft - padRight };
    }
    const comments = contentBox(document.getElementById("bb-comments"));
    const footer = contentBox(document.querySelector(".blog-overlay-footer-content"));
    return {
      commentsLeft: comments.left,
      commentsWidth: comments.width,
      footerLeft: footer.left,
      footerWidth: footer.width,
    };
  });
}

async function footerSideBox(page: Page) {
  return page.evaluate(() => {
    const footer = document.querySelector(".blog-overlay-footer-zone");
    const article = document.querySelector(".blog-overlay-posts");
    const row = document.querySelector(".blog-overlay-main-row");
    const box = (el: Element | null) => {
      const rect = el ? el.getBoundingClientRect() : null;
      return rect ? { left: rect.left, width: rect.width } : { left: 0, width: 0 };
    };
    const f = box(footer);
    const a = box(article);
    const r = box(row);
    return {
      footerLeft: f.left,
      footerWidth: f.width,
      articleLeft: a.left,
      articleWidth: a.width,
      rowLeft: r.left,
    };
  });
}

async function assertTemplate(page: Page, name: PostTemplateName, mobile: boolean) {
  const title = await cssNumber(page, ".blog-overlay-post-title", "font-size");
  if (!mobile) expectPx(title, 40, 2);

  if (name === "feature") {
    const imageMargin = await cssNumber(
      page,
      ".blog-overlay-featured-image-stacked-fullbleed--feature",
      "margin-top",
    );
    const bodyPad = await cssNumber(page, ".blog-overlay-body", "padding-top");
    const authorDisplay = await cssValue(page, ".blog-overlay-author-card-text", "display");
    if (mobile) {
      expectPx(title, 28);
      expect(await cssValue(page, ".blog-overlay-post-title", "text-align")).toBe("center");
      expectPx(imageMargin, -15);
      expectPx(bodyPad, 20);
      expect(authorDisplay).toBe("contents");
      const moved = await page.locator(".blog-overlay-author-card-text").first().evaluate((el) => {
        return Boolean(el.closest(".blog-overlay-author-card"));
      });
      expect(moved, "author text column stays inside the card").toBe(true);
      await expectArticleCommentsGap(page, 8);
      const bodyMargin = await cssNumber(page, ".blog-overlay-body", "margin-bottom");
      expect(bodyMargin).not.toBe(-80);
    } else {
      expect(imageMargin).not.toBe(-15);
      expect(authorDisplay).not.toBe("contents");
    }
    await assertMoreToReadAndThumbs(page, mobile);
  }

  if (name === "reporter") {
    const crumb = await cssValue(page, ".blog-overlay-post-breadcrumbs a, .blog-overlay-post-breadcrumbs span", "display");
    if (mobile) {
      expectPx(title, 28);
      expect(crumb).toBe("inline");
      await expectArticleCommentsGap(page, 8);
      const listMargin = await cssNumber(page, ".bb-comments-list", "margin-bottom");
      expectPx(listMargin, 24, 4);
      const formGap = await page.evaluate(() => {
        const list = document.querySelector(".bb-comments-list");
        const form = document.querySelector(".bb-comment-form-wrap");
        if (!list || !form) return NaN;
        return form.getBoundingClientRect().top - list.getBoundingClientRect().bottom;
      });
      expectPx(formGap, 24, 8);
    }
    await assertMoreToReadAndThumbs(page, mobile);
  }

  if (name === "writer") {
    const pad = await cssNumber(page, "#blog-overlay-list", "padding-left");
    const rule = await cssNumber(page, ".blog-overlay-writer-rule", "width");
    expectPx(rule, 40, 2);
    if (mobile) {
      expectPx(title, 34);
      expectPx(pad, 18.75, 1);
    } else {
      expect(pad).toBeGreaterThan(80);
    }
  }

  if (name === "story") {
    const direction = await cssValue(page, ".blog-overlay-story-header-row", "flex-direction");
    await expect(page.locator(".blog-overlay-share-row, .blog-overlay-share-links").first()).toBeVisible();
    expect(await page.locator(".blog-overlay-sidebar-anchor").count()).toBe(0);
    if (mobile) {
      expect(direction).toBe("column");
      expectPx(title, 28);
      const ratio = await cssValue(page, ".blog-overlay-story-featured-image > div", "aspect-ratio");
      expect(ratio === "16 / 10" || ratio === "1.6").toBe(true);
      const crumbsAbove = await page.evaluate(() => {
        const crumbs = document.querySelector(".blog-overlay-post-breadcrumbs");
        const image = document.querySelector(".blog-overlay-story-featured-image");
        if (!crumbs || !image) return false;
        return crumbs.getBoundingClientRect().top < image.getBoundingClientRect().top;
      });
      expect(crumbsAbove).toBe(true);
    } else {
      expect(direction).toBe("row");
      await expect(page.locator(".blog-overlay-more-to-read")).toBeVisible();
    }
    expect(await page.locator(".blog-overlay-relevant-posts--footer").count()).toBeGreaterThan(0);
    await assertMoreToReadAndThumbs(page, mobile);
  }

  if (name === "publisher") {
    const hero = await cssNumber(page, ".blog-overlay-post-header-fullbleed--publisher", "height");
    expectPx(hero, 500, 2);
    expect(await page.locator(".blog-overlay-post-breadcrumbs").count()).toBe(0);
    expect(await page.locator(".blog-overlay-share-row").count()).toBe(0);
    expect(await page.locator(".blog-overlay-post-deck").count()).toBe(0);
    if (mobile) {
      expectPx(title, 28);
      const tocHidden = await page
        .locator('[data-bb-module="tableOfContents"]')
        .first()
        .evaluate((el) => el.classList.contains("bb-mobile-toc-hidden"));
      expect(tocHidden).toBe(true);
    }
    await assertMoreToReadAndThumbs(page, mobile);
  }
}

async function assertMoreToReadAndThumbs(page: Page, mobile: boolean) {
  const thumb = page.locator(".bb-sidebar-post-thumb");
  if (await thumb.count()) {
    const size = await cssNumber(page, ".bb-sidebar-post-thumb", "width");
    expectPx(size, mobile ? 80 : 60, 2);
  }
  const grid = page.locator(".blog-overlay-relevant-posts--footer");
  if (await grid.count()) {
    const columns = await cssValue(page, ".blog-overlay-relevant-posts--footer", "grid-template-columns");
    const display = await cssValue(page, ".blog-overlay-relevant-posts--footer", "display");
    const titleMargin = await cssNumber(page, ".bb-more-to-read-title", "margin-top");
    if (mobile) {
      expect(display === "flex" || columns === "none").toBe(true);
      expectPx(titleMargin, 0, 1);
    } else {
      expect(display).toBe("grid");
      expect(columns).not.toBe("none");
      expect(titleMargin).not.toBe(0);
    }
  }
}

async function expectArticleCommentsGap(page: Page, tolerance: number) {
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const body = document.querySelector(".blog-overlay-body");
        const comments = document.getElementById("bb-comments");
        if (!body || !comments) return NaN;
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            if (!String(node.nodeValue || "").trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        const range = document.createRange();
        let best = 0;
        let node: Node | null;
        while ((node = walker.nextNode())) {
          range.selectNodeContents(node);
          const rects = range.getClientRects();
          if (!rects.length) continue;
          best = Math.max(best, rects[rects.length - 1].bottom);
        }
        if (!best) return NaN;
        return comments.getBoundingClientRect().top - best;
      });
    }, { timeout: 5_000 })
    .toBeGreaterThan(24 - tolerance);
  const gap = await page.evaluate(() => {
    const body = document.querySelector(".blog-overlay-body");
    const comments = document.getElementById("bb-comments");
    if (!body || !comments) return NaN;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!String(node.nodeValue || "").trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const range = document.createRange();
    let best = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      range.selectNodeContents(node);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      best = Math.max(best, rects[rects.length - 1].bottom);
    }
    return comments.getBoundingClientRect().top - best;
  });
  expectPx(gap, 24, tolerance);
}

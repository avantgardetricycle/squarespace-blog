import { expect, test, type Page } from "@playwright/test";

import { cssNumber, cssValue, expectPx, isMobileProject, mountRenderer } from "./harness";
import { authorProfiles, blogJson } from "./fixtures/blog";
import { collectionTemplates, postTemplates, zoneOrderPostConfig, type PostTemplateName } from "./fixtures/templates";

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
      if (mobile) expectPx(h1, 24);
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

  test("a drawer sidebar keeps footer copies on the page", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    const cfg = structuredClone(postTemplates.publisher) as Record<string, any>;
    cfg.rightSidebar.modules = ["authorProfiles", "popularPosts", "relevantPosts", "filterByCategory"];
    cfg.rightSidebar.moduleOrder = cfg.rightSidebar.modules.slice();
    cfg.rightSidebar.mobileDisplay = "drawer";
    cfg.footerContent.modules = ["authorProfiles", "relevantPosts", "prevNextArticle"];
    cfg.footerContent.moduleOrder = cfg.footerContent.modules.slice();
    await mountRenderer(page, { postConfig: cfg });

    const flags = await page.evaluate(() => {
      const hidden = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? el.classList.contains("bb-mobile-duplicate-hidden") : null;
      };
      const top = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const box = el.getBoundingClientRect();
        return box.height > 0 ? box.top : null;
      };
      return {
        footerAuthorHidden: hidden('[data-bb-zone="footer"][data-bb-module="authorProfiles"]'),
        footerRelatedHidden: hidden('[data-bb-zone="footer"][data-bb-module="relevantPosts"]'),
        drawerAuthor: !!document.querySelector('.bb-mobile-drawer [data-bb-module="authorProfiles"]'),
        drawerRelated: !!document.querySelector('.bb-mobile-drawer [data-bb-module="relevantPosts"]'),
        comments: top("#bb-comments"),
        author: top('[data-bb-zone="footer"][data-bb-module="authorProfiles"]'),
        related: top('[data-bb-zone="footer"][data-bb-module="relevantPosts"]'),
      };
    });

    expect(flags.footerAuthorHidden).toBe(false);
    expect(flags.footerRelatedHidden).toBe(false);
    if (mobile) {
      expect(flags.drawerAuthor).toBe(true);
      expect(flags.drawerRelated).toBe(true);
      expect(flags.comments).not.toBeNull();
      expect(flags.author).not.toBeNull();
      expect(flags.related).not.toBeNull();
      expect(flags.comments!).toBeLessThan(flags.author!);
      expect(flags.author!).toBeLessThan(flags.related!);
    }
  });

  test("a stacked right sidebar still wins over a duplicated footer module", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    const cfg = structuredClone(postTemplates.publisher) as Record<string, any>;
    cfg.rightSidebar.modules = ["authorProfiles", "popularPosts", "relevantPosts", "filterByCategory"];
    cfg.rightSidebar.moduleOrder = cfg.rightSidebar.modules.slice();
    cfg.rightSidebar.mobileDisplay = "hidden";
    cfg.footerContent.modules = ["authorProfiles", "relevantPosts", "prevNextArticle"];
    cfg.footerContent.moduleOrder = cfg.footerContent.modules.slice();
    await mountRenderer(page, { postConfig: cfg });

    const hidden = await page.evaluate(() => {
      return ["authorProfiles", "relevantPosts"].map((id) => {
        const el = document.querySelector(`[data-bb-zone="footer"][data-bb-module="${id}"]`);
        return el ? el.classList.contains("bb-mobile-duplicate-hidden") : null;
      });
    });
    expect(hidden).toEqual([mobile, mobile]);
  });

  test("sidebar copy wins over a duplicated footer module on mobile", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    await mountRenderer(page, { postConfig: structuredClone(postTemplates.feature) });
    const hidden = await page
      .locator('[data-bb-zone="footer"][data-bb-module="authorProfiles"]')
      .first()
      .evaluate((el) => el.classList.contains("bb-mobile-duplicate-hidden"));
    expect(hidden).toBe(mobile);
  });

  test("author bios render text, markdown, and sanitized html", async ({ page }) => {
    await mountRenderer(page, {
      postConfig: structuredClone(postTemplates.feature),
      defaultAuthorIds: ["literal", "markdown", "html"],
      authorProfiles,
    });

    const bio = (zone: "sidebar" | "footer", name: string) =>
      page
        .locator(`[data-bb-zone="${zone}"][data-bb-module="authorProfiles"] .blog-overlay-author-unit`)
        .filter({ hasText: name })
        .locator(".blog-overlay-author-card-bio");

    const literal = bio("sidebar", "Literal Author");
    await expect(literal).toHaveText("See **bold** and <strong>nope</strong>");
    await expect(literal.locator("strong")).toHaveCount(0);
    await expect(bio("footer", "Literal Author")).toHaveText("Footer literal stays **bold**");

    const markdown = bio("sidebar", "Markdown Author");
    const markdownCard = markdown.locator("xpath=ancestor::*[contains(@class,'blog-overlay-author-unit')]");
    await expect(markdownCard.locator('a[aria-label="Instagram"]')).toHaveAttribute(
      "href",
      "https://instagram.com/salaamssalaams",
    );
    await expect(markdownCard.locator('a[aria-label="Facebook"]')).toHaveAttribute(
      "href",
      "https://www.facebook.com/ada",
    );
    await expect(markdownCard.locator('a[aria-label="Linkedin"]')).toHaveAttribute(
      "href",
      "https://linkedin.com/in/ada",
    );
    await expect(markdownCard.locator('a[aria-label="X"]')).toHaveAttribute("href", "https://www.x.com/ada");
    await expect(markdownCard.locator('a[aria-label="Website"]')).toHaveCount(0);
    await expect(markdown.locator("strong")).toHaveText("first");
    await expect(markdown.locator('a[href="https://example.invalid/notes"]')).toHaveAttribute("title", "Maya's notes");
    await expect(markdown.locator('a[href="https://example.invalid/oak"]')).toHaveText("https://example.invalid/oak");
    await expect(markdown.locator("li")).toHaveText(["Ada", "Code"]);
    const markdownFooter = bio("footer", "Markdown Author");
    await expect(markdownFooter.locator("strong")).toHaveText("long");
    await expect(markdownFooter.locator("a")).toHaveAttribute("href", "https://example.invalid/long");

    const html = bio("sidebar", "HTML Author");
    await expect(html.locator("strong")).toHaveText("HTML");
    await expect(html.locator('a[href="https://example.invalid/ok"]')).toHaveCount(1);
    const htmlSource = (await html.innerHTML()).toLowerCase();
    expect(htmlSource).not.toContain("script");
    expect(htmlSource).not.toContain("onerror");

    const htmlFooter = bio("footer", "HTML Author");
    await expect(htmlFooter.locator("em")).toHaveText("HTML");
    const htmlFooterSource = (await htmlFooter.innerHTML()).toLowerCase();
    expect(htmlFooterSource).not.toContain("script");
    expect(htmlFooterSource).not.toContain("onerror");
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

  test("story desktop image height stays between 4:3 and square", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "mobile story image stays 16:10");
    const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const items = blogJson.items.map((item, index) => ({
      ...item,
      assetUrl: pixel,
      mediaFocalPoint: { x: 0.2, y: 0.8 },
      title: index === 1 ? "Short" : item.title,
      excerpt: index === 1 ? "A short deck." : item.excerpt,
    }));
    const base = structuredClone(postTemplates.story) as Record<string, any>;
    base.postHeader = { ...base.postHeader, contentVerticalAlignment: "top" };
    await mountRenderer(page, { postConfig: base, blogItems: items });
    const topAligned = await storyHeaderFrame(page);
    expect(topAligned.objectFit).toBe("cover");
    expect(topAligned.objectPosition).toBe("20% 80%");
    expect(topAligned.widthShare).toBeGreaterThan(0.55);
    expect(topAligned.widthShare).toBeLessThan(0.61);
    expect(Math.abs(topAligned.ratio - 0.75)).toBeLessThan(0.04);
    expect(Math.abs(topAligned.heightDelta)).toBeLessThan(2);
    expect(topAligned.shareGap).toBeGreaterThan(40);

    base.postHeader = { ...base.postHeader, contentVerticalAlignment: "bottom" };
    await mountRenderer(page, { postConfig: base, blogItems: items });
    const bottomAligned = await storyHeaderFrame(page);
    expect(Math.abs(bottomAligned.ratio - 0.75)).toBeLessThan(0.04);
    expect(bottomAligned.shareGap).toBeGreaterThan(32);
    expect(bottomAligned.shareGap).toBeLessThan(48);
    expect(topAligned.shareGap - bottomAligned.shareGap).toBeGreaterThan(40);

    const tall = blogJson.items.map((item, index) => ({
      ...item,
      assetUrl: pixel,
      title: index === 1 ? "Tall header line ".repeat(40) : item.title,
      excerpt: index === 1 ? "Deck line. ".repeat(20) : item.excerpt,
    }));
    base.postHeader = { ...base.postHeader, contentVerticalAlignment: "top" };
    await mountRenderer(page, { postConfig: base, blogItems: tall });
    const capped = await storyHeaderFrame(page);
    expect(Math.abs(capped.ratio - 1)).toBeLessThan(0.04);
    expect(Math.abs(capped.topDelta)).toBeLessThan(2);
    expect(capped.heightDelta).toBeGreaterThan(24);
    expect(Math.abs(capped.textOverflow)).toBeLessThan(2);
    expect(Math.abs(capped.zoneLeft)).toBeLessThan(2);
    expect(Math.abs(capped.zoneRightGap)).toBeLessThan(2);

    await page.setViewportSize({ width: 1461, height: 900 });
    const wide = await storyHeaderFrame(page);
    expect(wide.clientWidth).toBeGreaterThan(1400);
    expect(Math.abs(wide.zoneLeft)).toBeLessThan(2);
    expect(Math.abs(wide.zoneRightGap)).toBeLessThan(2);
    expect(Math.abs(wide.zoneWidth - wide.clientWidth)).toBeLessThan(2);
    expect(Math.abs(wide.rowInsetLeft - wide.pagePad)).toBeLessThan(2);
    expect(Math.abs(wide.rowInsetRight - wide.pagePad)).toBeLessThan(2);
    expect(Math.abs(wide.textOverflow)).toBeLessThan(2);

    await page.setViewportSize({ width: 1100, height: 800 });
    const narrow = await storyHeaderFrame(page);
    expect(narrow.clientWidth).toBeLessThan(1200);
    expect(Math.abs(narrow.zoneLeft)).toBeLessThan(2);
    expect(Math.abs(narrow.zoneWidth - narrow.clientWidth)).toBeLessThan(2);
  });

  test("applying publisher drops a stacked header left over from the previous template", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "publisher mobile hero is a separate frame");
    await mountRenderer(page, { postConfig: structuredClone(postTemplates.feature) });
    await expect(page.locator(".blog-overlay-featured-image-stacked-fullbleed")).toBeVisible();

    await page.evaluate((publisher) => {
      const renderer = (window as unknown as { BlogOverlayRenderer: { updateConfig: (cfg: unknown) => void } }).BlogOverlayRenderer;
      renderer.updateConfig({ postConfig: publisher });
    }, structuredClone(postTemplates.publisher));

    await expect(page.locator(".blog-overlay-post-header-fullbleed--publisher")).toBeVisible();
    const placed = await page.evaluate(() => {
      const hero = document.querySelector(".blog-overlay-post-header-fullbleed--publisher");
      const title = document.querySelector(".blog-overlay-post-title");
      if (!hero || !title) return null;
      const heroBox = hero.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      return {
        inside: hero.contains(title),
        titleAboveHero: titleBox.bottom < heroBox.top + 1,
        heroHeight: heroBox.height,
        stacked: !!document.querySelector(".blog-overlay-featured-image-stacked-fullbleed"),
      };
    });
    expect(placed).not.toBeNull();
    expect(placed!.stacked).toBe(false);
    expect(placed!.inside).toBe(true);
    expect(placed!.titleAboveHero).toBe(false);
    expect(placed!.heroHeight).toBeGreaterThan(400);
  });

  test("publisher desktop header text wraps inside the hero as the window narrows", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "publisher mobile hero stays a fixed 500px frame");
    const title = "SpaceX Starship: The Vehicle That Could Change Everything";
    const items = blogJson.items.map((item, index) => ({
      ...item,
      title: index === 1 ? title : item.title,
    }));
    await mountRenderer(page, {
      postConfig: structuredClone(postTemplates.publisher),
      blogItems: items,
    });

    const frame = () =>
      page.evaluate(() => {
        const hero = document.querySelector(".blog-overlay-post-header-fullbleed--publisher");
        const heading = document.querySelector(".blog-overlay-post-title");
        if (!hero || !heading) return null;
        const heroBox = hero.getBoundingClientRect();
        const titleBox = heading.getBoundingClientRect();
        const heroStyle = getComputedStyle(hero);
        const titleStyle = getComputedStyle(heading);
        const lineHeight = parseFloat(titleStyle.lineHeight) || titleBox.height;
        return {
          heroWidth: heroBox.width,
          clientWidth: document.documentElement.clientWidth,
          padLeft: parseFloat(heroStyle.paddingLeft) || 0,
          padRight: parseFloat(heroStyle.paddingRight) || 0,
          insetLeft: titleBox.left - heroBox.left,
          insetRight: heroBox.right - titleBox.right,
          lines: Math.round(titleBox.height / lineHeight),
          scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

    const wide = await frame();
    expect(wide).not.toBeNull();
    expect(Math.abs(wide!.heroWidth - wide!.clientWidth)).toBeLessThan(2);
    expect(wide!.insetLeft).toBeGreaterThan(wide!.padLeft - 2);
    expect(wide!.insetRight).toBeGreaterThan(wide!.padRight - 2);

    await page.setViewportSize({ width: 900, height: 800 });
    await expect.poll(async () => {
      const next = await frame();
      if (!next) return 9999;
      return Math.abs(next.heroWidth - next.clientWidth);
    }, { timeout: 2000 }).toBeLessThan(2);
    const narrow = await frame();
    expect(narrow).not.toBeNull();
    expect(narrow!.clientWidth).toBeLessThan(950);
    expect(narrow!.insetLeft).toBeGreaterThan(narrow!.padLeft - 2);
    expect(narrow!.insetRight).toBeGreaterThan(narrow!.padRight - 2);
    expect(narrow!.lines).toBeGreaterThan(wide!.lines);
    expect(narrow!.scrollOverflow).toBeLessThan(2);
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

  test("post header sizes are independent for the title, deck, and meta", async ({ page }, testInfo) => {
    const config = zoneOrderPostConfig("feature");
    const header = {
      ...(config.postHeader as Record<string, unknown>),
      titleSize: "xl",
      deckSize: "s",
      metaSize: "l",
    };
    await mountRenderer(page, {
      postConfig: { ...config, postHeader: header },
      extraCss: "#blog-overlay-list h1.blog-overlay-post-title{font-size:64px !important}#blog-overlay-list .blog-overlay-post-deck{font-size:11px !important}#blog-overlay-list .blog-overlay-meta{font-size:9px !important}",
    });

    const mobile = isMobileProject(testInfo);
    const list = page.locator("#blog-overlay-list");
    expect(await list.getAttribute("data-bb-title-size")).toBe("xl");
    expect(await list.getAttribute("data-bb-deck-size")).toBe("s");
    expect(await list.getAttribute("data-bb-meta-size")).toBe("l");
    expectPx(await cssNumber(page, ".blog-overlay-post-title", "font-size"), mobile ? 40 : 56);
    expectPx(await cssNumber(page, ".blog-overlay-post-deck", "font-size"), mobile ? 13 : 17);
    expectPx(await cssNumber(page, ".blog-overlay-meta", "font-size"), mobile ? 15 : 19);
    if (mobile) {
      expectPx(await cssNumber(page, ".blog-overlay-body h1", "font-size"), 34);
    }
  });
});

test.describe("post updated at", () => {
  function itemsWithUpdatedOn(extraMs: number) {
    return blogJson.items.map((item) => ({
      ...item,
      updatedOn: item.publishOn + extraMs,
    }));
  }

  test("shows Squarespace updatedOn in the post header when enabled", async ({ page }) => {
    const items = itemsWithUpdatedOn(20 * 86_400_000);
    await mountRenderer(page, {
      postConfig: { ...postTemplates.reporter, showDate: true, showPostUpdatedAt: true },
      blogItems: items,
    });
    const meta = page.locator(".blog-overlay-meta").first();
    const labels = await page.evaluate((post) => {
      return {
        published: new Date(post.publishOn).toLocaleDateString(),
        updated: "Updated " + new Date(post.updatedOn).toLocaleDateString(),
      };
    }, items[1]);
    await expect(meta).toContainText(labels.published);
    await expect(meta).toContainText(labels.updated);
  });

  test("hides the updated date when the post control is off", async ({ page }) => {
    const items = itemsWithUpdatedOn(20 * 86_400_000);
    await mountRenderer(page, {
      postConfig: { ...postTemplates.reporter, showDate: true, showPostUpdatedAt: false },
      blogItems: items,
    });
    const meta = page.locator(".blog-overlay-meta").first();
    await expect(meta).not.toContainText("Updated");
  });
});

async function storyHeaderFrame(page: Page) {
  return page.evaluate(() => {
    const box = document.querySelector(".blog-overlay-story-featured-image > div");
    const col = document.querySelector(".blog-overlay-story-info-col");
    const wrap = document.querySelector(".blog-overlay-story-featured-image");
    const row = document.querySelector(".blog-overlay-story-header-row");
    const img = document.querySelector(".blog-overlay-story-featured-image img");
    const title = document.querySelector(".blog-overlay-post-title");
    const share = document.querySelector(".blog-overlay-share-row");
    if (!box || !col || !wrap || !row || !title || !share) {
      throw new Error("story header frame is missing");
    }
    const zone = document.querySelector(".blog-overlay-single-post-header-zone--story");
    const wrapper = document.getElementById("blog-overlay-list");
    if (!zone || !wrapper) throw new Error("story header strip is missing");
    const b = box.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    const clientWidth = document.documentElement.clientWidth;
    const pagePad = parseFloat(getComputedStyle(wrapper).paddingLeft) || 0;
    return {
      ratio: b.height / b.width,
      widthShare: w.width / r.width,
      topDelta: b.top - c.top,
      heightDelta: c.height - b.height,
      shareGap: b.bottom - share.getBoundingClientRect().bottom,
      titleTop: title.getBoundingClientRect().top,
      objectFit: img ? getComputedStyle(img).objectFit : getComputedStyle(box).backgroundSize,
      objectPosition: img ? getComputedStyle(img).objectPosition : "",
      zoneLeft: z.left,
      zoneRightGap: clientWidth - z.right,
      zoneWidth: z.width,
      clientWidth,
      rowInsetLeft: r.left,
      rowInsetRight: clientWidth - r.right,
      pagePad,
      textOverflow: c.right - r.right,
    };
  });
}

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
      const crumbImageGap = await page.evaluate(() => {
        const crumbs = document.querySelector(".blog-overlay-post-breadcrumbs");
        const image = document.querySelector(".blog-overlay-reporter-featured-image");
        if (!crumbs || !image) return NaN;
        return image.getBoundingClientRect().top - crumbs.getBoundingClientRect().bottom;
      });
      expectPx(crumbImageGap, 15, 1);
      const accent = await page.evaluate(() => {
        const rules = Array.from(document.querySelectorAll("hr.blog-overlay-reporter-accent-rule"));
        const visible = rules.filter((el) => getComputedStyle(el).display !== "none");
        const meta = document.querySelector(".blog-overlay-meta-row");
        const above = document.querySelector(".blog-overlay-reporter-accent-rule--above-meta");
        const line = visible[0];
        return {
          visible: visible.length,
          aboveHidden: Boolean(above && getComputedStyle(above).display === "none"),
          belowMeta: Boolean(line && meta && meta.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      });
      expect(accent.visible).toBe(1);
      expect(accent.aboveHidden).toBe(true);
      expect(accent.belowMeta).toBe(true);
      const accentBodyGap = await page.evaluate(() => {
        const line = Array.from(document.querySelectorAll("hr.blog-overlay-reporter-accent-rule")).find(
          (el) => getComputedStyle(el).display !== "none",
        );
        const body = document.querySelector(".blog-overlay-body");
        if (!line || !body) return NaN;
        return body.getBoundingClientRect().top - line.getBoundingClientRect().bottom;
      });
      expectPx(accentBodyGap, 10, 1);
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
    } else {
      const headerAlign = await page.evaluate(() => {
        const para = document.querySelector(".blog-overlay-body p");
        const left = (sel: string) => {
          const el = document.querySelector(sel);
          return el && para ? el.getBoundingClientRect().left - para.getBoundingClientRect().left : NaN;
        };
        return {
          crumbs: left(".blog-overlay-post-breadcrumbs"),
          title: left(".blog-overlay-post-title"),
          deck: left(".blog-overlay-post-deck"),
          meta: left(".blog-overlay-meta-row"),
        };
      });
      expectPx(headerAlign.crumbs, 0, 1);
      expectPx(headerAlign.title, 0, 1);
      expectPx(headerAlign.deck, 0, 1);
      expectPx(headerAlign.meta, 0, 1);
    }
    await assertMoreToReadAndThumbs(page, mobile);
  }

  if (name === "writer") {
    const pad = await cssNumber(page, "#blog-overlay-list", "padding-left");
    const rule = await cssNumber(page, ".blog-overlay-writer-rule", "width");
    expectPx(rule, 40, 2);
    if (mobile) {
      expectPx(title, 28);
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
      const boxRatio = await page.evaluate(() => {
        const box = document.querySelector(".blog-overlay-story-featured-image > div");
        if (!box) return NaN;
        const b = box.getBoundingClientRect();
        return b.width / b.height;
      });
      expect(boxRatio).toBeGreaterThan(1.5);
      expect(boxRatio).toBeLessThan(1.7);
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
      const frame = await storyHeaderFrame(page);
      expect(frame.widthShare).toBeGreaterThan(0.55);
      expect(frame.widthShare).toBeLessThan(0.61);
      expect(frame.ratio).toBeGreaterThan(0.72);
      expect(frame.ratio).toBeLessThan(1.03);
      expect(Math.abs(frame.topDelta)).toBeLessThan(2);
      expect(frame.heightDelta).toBeGreaterThan(-2);
      expect(frame.objectFit).toBe("cover");
      expect(Math.abs(frame.zoneLeft)).toBeLessThan(2);
      expect(Math.abs(frame.zoneRightGap)).toBeLessThan(2);
      expect(Math.abs(frame.rowInsetLeft - frame.pagePad)).toBeLessThan(2);
      expect(Math.abs(frame.rowInsetRight - frame.pagePad)).toBeLessThan(2);
      expect(Math.abs(frame.textOverflow)).toBeLessThan(2);
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

test.describe("post video blocks", () => {
  test("youtube, vimeo, and file videos fill the Squarespace wrapper", async ({ page }) => {
    const youtube =
      '<div class="sqs-block video-block sqs-block-video" data-block-type="32" data-sqsp-block="video">' +
      '<div class="sqs-block-content"><div class="intrinsic" style="max-width:100%">' +
      '<div class="embed-block-wrapper" style="height:0;overflow:hidden;padding-bottom:56.25%">' +
      '<div class="sqs-video-wrapper" data-provider-name="YouTube" data-html="&lt;iframe src=&quot;//www.youtube.com/embed/dQw4w9WgXcQ?wmode=opaque&quot; width=&quot;854&quot; height=&quot;480&quot; frameborder=&quot;0&quot; allowfullscreen&gt;&lt;/iframe&gt;"></div>' +
      "</div></div></div></div>";
    const vimeo =
      '<div class="sqs-block video-block sqs-block-video" data-block-type="32" data-sqsp-block="video" ' +
      'data-block-json="{&quot;url&quot;:&quot;https://vimeo.com/76979871&quot;,&quot;providerName&quot;:&quot;Vimeo&quot;,&quot;resolvedBy&quot;:&quot;vimeo&quot;,&quot;width&quot;:640,&quot;height&quot;:360,&quot;html&quot;:&quot;&quot;}">' +
      '<div class="sqs-block-content"><div class="sqs-video-wrapper" data-provider-name="Vimeo"></div></div></div>';
    const file =
      '<div class="sqs-block video-block sqs-block-video" data-sqsp-block="video">' +
      '<div class="sqs-block-content"><div class="sqs-video-wrapper" data-html="&lt;video controls src=&quot;https://cdn.example.com/clip.mp4&quot;&gt;&lt;/video&gt;"></div></div></div>';
    const native =
      '<div class="sqs-block video-block sqs-block-video" data-sqsp-block="video" ' +
      'data-block-json="{&quot;resolvedBy&quot;:&quot;native&quot;,&quot;alexandriaUrl&quot;:&quot;https://video.squarespace-cdn.com/content/v1/site/clip/{variant}&quot;,&quot;width&quot;:1920,&quot;height&quot;:1080,&quot;html&quot;:&quot;&quot;}">' +
      '<div class="sqs-block-content"><div class="sqs-native-video" data-config-video="{&quot;alexandriaUrl&quot;:&quot;https://video.squarespace-cdn.com/content/v1/site/clip/{variant}&quot;}"></div>' +
      '<div class="sqs-video-wrapper"></div></div></div>';

    await mountRenderer(page, {
      previewSelectedPostIndex: 0,
      blogItems: [
        {
          ...blogJson.items[0],
          title: "Video post",
          body: ["<p>Opening line before the players.</p>", youtube, vimeo, file, native].join(""),
        },
      ],
    });

    await page.addStyleTag({
      content:
        ".sqs-video-wrapper{position:absolute;top:0;left:0;width:100%;height:100%}" +
        ".embed-block-wrapper{height:0;overflow:hidden}" +
        ".sqs-native-video{position:absolute;inset:0}",
    });

    const youtubeSrc = await page.locator(".blog-overlay-body iframe").nth(0).getAttribute("src");
    const vimeoSrc = await page.locator(".blog-overlay-body iframe").nth(1).getAttribute("src");
    expect(youtubeSrc).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(vimeoSrc).toBe("https://player.vimeo.com/video/76979871");

    const fileSrc = await page.locator('.blog-overlay-body video[src*="clip.mp4"]').getAttribute("src");
    expect(fileSrc).toBe("https://cdn.example.com/clip.mp4");

    const nativeSrc = await page.locator(".blog-overlay-body video[data-bb-video-src]").last().getAttribute("data-bb-video-src");
    expect(nativeSrc).toBe("https://video.squarespace-cdn.com/content/v1/site/clip/playlist.m3u8");

    const heights = await page.locator(".blog-overlay-body .bb-video-frame").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    );
    expect(heights).toHaveLength(4);
    for (const height of heights) expect(height).toBeGreaterThan(80);
  });
});

test.describe("sidebar mobile drawer", () => {
  test("drawer tabs sit on the right and open the sidebar", async ({ page }, testInfo) => {
    const mobile = isMobileProject(testInfo);
    const postConfig = zoneOrderPostConfig("feature");
    const left = postConfig.leftSidebar as { mobileDisplay?: string; show?: boolean };
    const right = postConfig.rightSidebar as { mobileDisplay?: string; show?: boolean };
    left.mobileDisplay = "drawer";
    right.mobileDisplay = "drawer";

    await mountRenderer(page, { postConfig });

    const tabs = page.locator(".bb-mobile-drawer-tab");
    if (!mobile) {
      await expect(tabs).toHaveCount(0);
      const leftDisplay = await page.locator('[data-bb-sidebar-side="left"]').first().evaluate((el) => getComputedStyle(el).display);
      expect(leftDisplay).not.toBe("none");
      return;
    }

    await expect(tabs).toHaveCount(2);
    const rightTab = page.locator('.bb-mobile-drawer[data-bb-sidebar-side="right"] .bb-mobile-drawer-tab');
    const rightPanel = page.locator("#bb-mobile-drawer-panel-right");
    await expect(rightTab).toBeVisible();
    await expect(rightTab).toHaveText("More");
    const tabBox = await rightTab.boundingBox();
    const viewport = page.viewportSize();
    expect(tabBox).not.toBeNull();
    expect(tabBox!.x + tabBox!.width).toBeGreaterThan((viewport?.width ?? 0) - 4);
    expect(tabBox!.width).toBeLessThanOrEqual(36);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);

    await expect(rightPanel).toBeHidden();
    await rightTab.click();
    await expect(rightPanel).toBeVisible();
    await expect(rightPanel.locator("[data-bb-module]").first()).toBeVisible();
    await expect.poll(async () => {
      const panelBox = await rightPanel.boundingBox();
      const tabNow = await rightTab.boundingBox();
      if (!panelBox || !tabNow) return Number.POSITIVE_INFINITY;
      const hostRight = viewport?.width ?? 0;
      const flush = Math.abs(panelBox.x + panelBox.width - hostRight);
      const tabMeetsPanel = Math.abs(tabNow.x + tabNow.width - panelBox.x);
      return Math.max(flush, tabMeetsPanel);
    }).toBeLessThanOrEqual(2);

    await page.mouse.click(12, 280);
    await expect(rightPanel).toBeHidden();
  });

  test("Configure phone frame pins the drawer tab to the preview column", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "renderer-desktop", "needs a wide window around a 375px root");
    const postConfig = zoneOrderPostConfig("feature");
    (postConfig.rightSidebar as { mobileDisplay?: string }).mobileDisplay = "drawer";
    (postConfig.leftSidebar as { mobileDisplay?: string }).mobileDisplay = "hidden";

    await mountRenderer(page, {
      postConfig,
      previewDevice: "mobile",
      rootWidth: 375,
    });

    const tab = page.locator('.bb-mobile-drawer[data-bb-sidebar-side="right"] .bb-mobile-drawer-tab');
    await expect(tab).toBeVisible();
    const tabBox = await tab.boundingBox();
    const rootBox = await page.locator("#root").boundingBox();
    expect(tabBox).not.toBeNull();
    expect(rootBox).not.toBeNull();
    expect(Math.abs(tabBox!.x + tabBox!.width - (rootBox!.x + rootBox!.width))).toBeLessThan(8);
    expect(tabBox!.x).toBeGreaterThan(rootBox!.x + rootBox!.width - 48);

    await expect.poll(async () => {
      return page.evaluate(() => {
        const root = document.getElementById("root");
        if (!root) return Number.POSITIVE_INFINITY;
        return root.scrollWidth - root.clientWidth;
      });
    }).toBeLessThanOrEqual(2);

    await tab.click();
    const panel = page.locator("#bb-mobile-drawer-panel-right");
    await expect(panel).toBeVisible();
    await expect.poll(async () => {
      const panelBox = await panel.boundingBox();
      const tabNow = await tab.boundingBox();
      const rootNow = await page.locator("#root").boundingBox();
      if (!panelBox || !tabNow || !rootNow) return Number.POSITIVE_INFINITY;
      const flush = Math.abs(panelBox.x + panelBox.width - (rootNow.x + rootNow.width));
      const tabMeetsPanel = Math.abs(tabNow.x + tabNow.width - panelBox.x);
      return Math.max(flush, tabMeetsPanel);
    }).toBeLessThanOrEqual(2);
    const settled = await panel.boundingBox();
    expect(settled).not.toBeNull();
    expect(settled!.x).toBeGreaterThanOrEqual((rootBox!.x) - 2);
  });

  test("hidden sidebars do not widen the phone frame", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "renderer-desktop", "needs a wide window around a 375px root");
    const postConfig = zoneOrderPostConfig("feature");
    (postConfig.leftSidebar as { mobileDisplay?: string }).mobileDisplay = "hidden";
    (postConfig.rightSidebar as { mobileDisplay?: string }).mobileDisplay = "hidden";

    await mountRenderer(page, {
      postConfig,
      previewDevice: "mobile",
      rootWidth: 375,
    });

    await expect.poll(async () => {
      return page.evaluate(() => {
        const root = document.getElementById("root");
        if (!root) return Number.POSITIVE_INFINITY;
        return root.scrollWidth - root.clientWidth;
      });
    }).toBeLessThanOrEqual(2);
    await expect(page.locator(".bb-mobile-drawer-tab")).toHaveCount(0);
  });

  test("mobile full-bleed header stays edge to edge without sideways scroll", async ({ page }, testInfo) => {
    test.skip(!isMobileProject(testInfo), "mobile viewport");
    const digest = structuredClone(collectionTemplates.digest) as {
      leftSidebar: { mobileDisplay?: string };
      rightSidebar: { mobileDisplay?: string };
    };
    digest.leftSidebar.mobileDisplay = "drawer";
    digest.rightSidebar.mobileDisplay = "drawer";
    await mountRenderer(page, {
      collectionConfig: digest,
      previewSelectedPostIndex: -1,
    });

    await expect.poll(async () => {
      return page.evaluate(() => {
        const img = document.querySelector(".blog-overlay-digest-featured-article .blog-overlay-featured-image");
        const doc = document.documentElement;
        if (!img) return "missing";
        const rect = img.getBoundingClientRect();
        const scroll = doc.scrollWidth - doc.clientWidth;
        if (scroll > 1) return "scroll " + scroll;
        if (rect.left < -1 || rect.left > 2) return "left " + rect.left;
        const rightGap = doc.clientWidth - rect.right;
        if (rightGap < -1 || rightGap > 2) return "right " + rightGap;
        return "ok";
      });
    }).toBe("ok");
  });
});

test.describe("reading progress bar", () => {
  test("snaps to the site header when the window resizes", async ({ page }) => {
    await mountRenderer(page, {
      postConfig: structuredClone(postTemplates.reporter),
      liveSite: true,
    });

    const place = (height: number, scrollY: number) =>
      page.evaluate(({ height: nextHeight, scrollY: nextScroll }) => {
        const header = document.querySelector("header");
        const article = document.querySelector("#blog-overlay-list article");
        if (header) header.style.height = nextHeight + "px";
        if (article) (article as HTMLElement).style.minHeight = "2400px";
        window.scrollTo(0, nextScroll);
        window.dispatchEvent(new Event("resize"));
        const bar = document.getElementById("blog-overlay-progress");
        const crumbs = document.querySelector(".blog-overlay-post-breadcrumbs");
        if (!header || !bar || !crumbs) return null;
        const headerRect = header.getBoundingClientRect();
        const navbar = headerRect.top < 0 ? headerRect.height : headerRect.bottom;
        const scroll = window.scrollY || document.documentElement.scrollTop || 0;
        const barRect = bar.getBoundingClientRect();
        const crumbRect = crumbs.getBoundingClientRect();
        return {
          expectedTop: Math.max(0, navbar - scroll),
          barTop: barRect.top,
          barBottom: barRect.bottom,
          crumbTop: crumbRect.top,
          scroll,
          position: getComputedStyle(bar).position,
        };
      }, { height, scrollY });

    const rested = await place(96, 0);
    expect(rested).not.toBeNull();
    expect(rested!.position).toBe("fixed");
    expect(Math.abs(rested!.barTop - rested!.expectedTop)).toBeLessThan(2);
    expect(rested!.crumbTop).toBeGreaterThanOrEqual(rested!.barBottom - 1);

    const scrolled = await place(96, 36);
    expect(scrolled).not.toBeNull();
    expect(scrolled!.scroll).toBeGreaterThan(20);
    expect(Math.abs(scrolled!.barTop - scrolled!.expectedTop)).toBeLessThan(2);

    const grown = await place(140, 36);
    expect(grown).not.toBeNull();
    expect(Math.abs(grown!.barTop - grown!.expectedTop)).toBeLessThan(2);

    const shrunk = await place(48, 36);
    expect(shrunk).not.toBeNull();
    expect(Math.abs(shrunk!.barTop - shrunk!.expectedTop)).toBeLessThan(2);

    const cleared = await place(48, 0);
    expect(cleared).not.toBeNull();
    expect(Math.abs(cleared!.barTop - cleared!.expectedTop)).toBeLessThan(2);
    expect(cleared!.crumbTop).toBeGreaterThanOrEqual(cleared!.barBottom - 1);

    await expect.poll(async () => {
      return page.evaluate(() => {
        const header = document.querySelector("header");
        const bar = document.getElementById("blog-overlay-progress");
        const crumbs = document.querySelector(".blog-overlay-post-breadcrumbs");
        if (!header || !bar || !crumbs) return 999;
        const headerRect = header.getBoundingClientRect();
        const navbar = headerRect.top < 0 ? headerRect.height : headerRect.bottom;
        const scroll = window.scrollY || document.documentElement.scrollTop || 0;
        const barRect = bar.getBoundingClientRect();
        const crumbRect = crumbs.getBoundingClientRect();
        if (crumbRect.top < barRect.bottom - 1) return 999;
        return Math.abs(barRect.top - Math.max(0, navbar - scroll));
      });
    }).toBeLessThan(2);
  });
});

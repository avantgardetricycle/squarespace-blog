import { expect, test } from "@playwright/test";

import { cssNumber, cssValue, isMobileProject, mountRenderer } from "./harness";
import { collectionTemplates, type CollectionTemplateName } from "./fixtures/templates";

const COLLECTIONS: CollectionTemplateName[] = ["masthead", "newsroom", "showcase", "editorial", "digest"];

test.describe("collection layout contract", () => {
  for (const name of COLLECTIONS) {
    test(`${name} matches the collection layout spec`, async ({ page }, testInfo) => {
      const mobile = isMobileProject(testInfo);
      await mountRenderer(page, {
        collectionConfig: structuredClone(collectionTemplates[name]),
        previewSelectedPostIndex: -1,
      });

      const structure = await page.evaluate(() => {
        function follows(earlier: Element | null, later: Element | null) {
          if (!earlier || !later) return null;
          return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
        }
        const header = document.querySelector(".blog-overlay-header-zone");
        const main = document.querySelector(".blog-overlay-main-row");
        const pagination = document.getElementById("blog-overlay-pagination-zone");
        const footer = document.querySelector(".blog-overlay-footer-content");
        const overlay = document.getElementById("blog-overlay-list");
        const search = document.querySelector(".blog-overlay-header-search");
        const sort = document.querySelector(".blog-overlay-header-content select");
        const pills = document.querySelector(".blog-overlay-header-filter-pills");
        return {
          narrow: overlay?.classList.contains("bb-narrow-viewport") ?? false,
          overlayPosition: overlay ? getComputedStyle(overlay).position : null,
          footerPosition: footer ? getComputedStyle(footer).position : null,
          headerBeforeMain: follows(header, main),
          mainBeforePagination: follows(main, pagination),
          paginationBeforeFooter: follows(pagination, footer),
          paginationInsideMain: pagination ? Boolean(pagination.closest(".blog-overlay-main-row")) : null,
          searchInHeader: search ? Boolean(search.closest(".blog-overlay-header-content, .blog-overlay-header-zone")) : null,
          searchInSidebar: search ? Boolean(search.closest(".blog-overlay-sidebar-anchor")) : null,
          sortInHeader: sort ? Boolean(sort.closest(".blog-overlay-header-content, .blog-overlay-header-zone")) : null,
          sortInSidebar: sort ? Boolean(sort.closest(".blog-overlay-sidebar-anchor")) : null,
          pillsDisplay: pills ? getComputedStyle(pills).display : null,
          leftDisplay: (() => {
            const left = document.querySelector('[data-bb-sidebar-side="left"]');
            return left ? getComputedStyle(left).display : null;
          })(),
          sidebarFilterHidden: Boolean(
            document
              .querySelector('[data-bb-zone="sidebar"][data-bb-module="filterByCategory"]')
              ?.classList.contains("bb-mobile-sidebar-filter-hidden"),
          ),
          hasSidebarFilter: Boolean(
            document.querySelector('[data-bb-zone="sidebar"][data-bb-module="filterByCategory"]'),
          ),
        };
      });

      expect(structure.narrow).toBe(mobile);
      expect(structure.overlayPosition).not.toBe("fixed");
      expect(structure.headerBeforeMain).toBe(true);
      if (structure.footerPosition) {
        expect(structure.footerPosition === "fixed" || structure.footerPosition === "absolute").toBe(false);
      }
      if (structure.mainBeforePagination != null) {
        expect(structure.mainBeforePagination, "pagination follows the main row").toBe(true);
        expect(structure.paginationInsideMain, "pagination is not a grid cell").toBe(false);
      }
      if (structure.paginationBeforeFooter != null) {
        expect(structure.paginationBeforeFooter).toBe(true);
      }
      if (structure.searchInHeader != null) {
        expect(structure.searchInHeader).toBe(true);
        expect(structure.searchInSidebar).toBe(false);
      }
      if (structure.sortInHeader != null) {
        expect(structure.sortInHeader).toBe(true);
        expect(structure.sortInSidebar).toBe(false);
      }
      if (structure.pillsDisplay) expect(structure.pillsDisplay).not.toBe("none");
      if (structure.leftDisplay) {
        if (mobile) expect(structure.leftDisplay).toBe("none");
        else expect(structure.leftDisplay).not.toBe("none");
      }
      if (structure.hasSidebarFilter) {
        expect(structure.sidebarFilterHidden).toBe(mobile);
      }

      if (name === "newsroom") {
        const formDirection = await cssValue(page, ".bb-newsletter-footer-form", "flex-direction");
        const buttonWidth = await cssNumber(page, ".bb-newsletter-btn", "width");
        const formWidth = await cssNumber(page, ".bb-newsletter-footer-form", "width");
        if (mobile) {
          expect(formDirection).toBe("column");
          expect(buttonWidth).toBeGreaterThan(formWidth * 0.9);
          const justify = await cssValue(page, ".bb-newsletter-btn", "justify-content");
          expect(justify).toBe("center");
        } else {
          expect(formDirection).toBe("row");
          expect(buttonWidth).toBeLessThan(formWidth * 0.75);
        }
      }
    });
  }
});

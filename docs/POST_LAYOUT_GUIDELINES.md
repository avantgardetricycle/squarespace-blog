# BetterBlog Post Page — Layout Contract

## Zone order (top to bottom, normal flow)

### Desktop
1. Header
2. Main row (left sidebar + content + right sidebar)
3. Comments
4. Footer
5. Progress bar (out of flow — see below)

Feature’s comments and footer modules sit in a full-width `.blog-overlay-feature-below-row` immediately after the main row. Desktop order is author, comments, then the remaining footer modules (more to read, email capture, lead magnet, and any others). On mobile, comments use `order: 0` and footer modules use `order: 1` so comments paint first even when the author card is earlier in the DOM. Footer modules share one `.blog-overlay-feature-footer-modules` column. Mobile spacing between footer modules is the container `gap: 56px` (also on `.blog-overlay-footer-content` for the other post templates) — never per-module margins. Feature’s newsletter can start in the footer zone; `_syncFeatureFooterModulePack` must merge it into that column first or the gap cannot reach it. Feature’s main row has two `.blog-overlay-sidebar-anchor` nodes — a TOC-only rail hidden on mobile (`.bb-mobile-rail-hidden`, height 0) and the live author/related rail. The painted rail (height > 0) is moved to immediately after the below-row; CSS `order` cannot do that because the rail and the below-row are not siblings.

### Mobile (<768px, including Configure’s phone preview)
When the main row stacks, order is:

1. Header
2. Article body
3. Comments
4. Footer modules
5. Sidebar modules (visible rails only)

Comments and footer modules render inside `.blog-overlay-posts` so they stay with the article. Sidebar rails come after that column. Feature’s left TOC rail is hidden on mobile (`.bb-mobile-rail-hidden`, height 0) and is not part of this stack — the live right rail is selected by height > 0 and moved after the below-row.

Verify this order with a **sidebar module turned off**. Default Feature/Reporter configs duplicate author/related posts in the sidebar and footer; the footer copy is hidden on mobile, which can hide an ordering bug.

On mobile, if a module exists in both the sidebar and the footer, the **sidebar copy is shown** and the footer copy is hidden (sidebar-wins). **Tags and Categories are the exception:** sidebar Filter by Category / Filter by Tag / Filter by Tags & Categories sections are always hidden on phones, even when enabled in settings. If a footer copy exists, that one is shown instead.

On mobile, every `.blog-overlay-author-unit` in a module gets the same wrap layout (44px avatar beside the name, bio and social on full-width rows below). `.blog-overlay-author-card-text{display:contents}` is the key so bio and social participate in the row wrap. Feature is CSS-only — do not `appendChild` or otherwise restructure the author DOM; Feature rebuilds the block before measuring code runs. Style **all** author units — `querySelector` only hits the first, and single-author posts hide that bug. Include a multi-author post in QA for remaining templates.

Feature mobile header (BB sets font sizes only; family/weight inherit customer tokens unless noted): full-bleed image `margin-top: -15px` / `margin-bottom: -50px`; breadcrumbs 13px P1, body 60%, centered, width 100%, child `a`/`span` `display: inline`; category line 11px P1 700 uppercase 0.08em accent, centered, `margin-bottom: 8px`; title 28px / 1.15, centered; deck 14px P1 / 1.4, centered; meta 13px P1 with H1 weight, centered, inner `.blog-overlay-meta` 13px H1; article `margin-bottom: -80px`. No meta reorder and no column override — Feature already stacks.

Feature mobile modules: sidebar Related and Popular share compact cards (100% width, 80×80 thumbs, 12px gap). Footer More to Read uses full-width 16:10 cards; hide `.bb-more-to-read-deck` and show date/read-time meta instead. Footer newsletter and lead magnet use the existing `.bb-mobile-sidebar-chrome` header — do not inject a second one; collapse empty `.bb-newsletter-footer-copy` / `.bb-newsletter-footer-msg`. Comment form wrap uses `padding-top: 25px` (not margin) with a 12px uppercase heading and full-width submit.

Writer mobile (BB sets font sizes only; family/weight inherit customer tokens unless noted): wrapper horizontal padding `18.75px` (not the desktop `8vw` literary inset); header zone horizontal padding `0`; `padding-top` is site header height + 5px, `margin-top: 0`. Breadcrumbs 13px P1, `--bb-muted`, `display: block`, width 100%, child `a`/`span` `display: inline`. Category 11px P1 700 uppercase 0.08em accent, `margin-bottom: 10px`. Title 34px / 1.15, `margin: 0 0 12px` (larger than other templates — no featured image). Deck 14px P1 / 1.4, `--bb-excerpt`, `margin: 0 0 24px`. Writer rule stays a 40px centered divider with `margin: 0 auto 24px`. Meta 13px P1; inner `.blog-overlay-meta` 13px heading family. `.blog-overlay-body` `margin-bottom: -80px`. Footer modules use container `gap: 56px` with module margins 0.

On mobile, cap `h1–h6` inside `.blog-overlay-body` at post-title × 0.85 (line-height 1.25) so customer heading scales cannot exceed the headline. Cap only — never enlarge. Reporter / Feature / Publisher / Story (28px title) → 24px; Writer (34px title) → 29px.

## Per-zone rules

**BetterBlog overlay root**
- Wraps all zones above
- position: relative, z-index: 10
- Never position: fixed

**Header**
- Full viewport width always
- z-index: 100
- Sticky toggle (user setting):
  - ON: position: sticky, top: 0
  - OFF: position: relative (scrolls with page)
- No element may overlap the header regardless of sticky state

**Main row**
- display: flex, flex-direction: row
- Top edge must equal the header's bottom edge — no gap, no overlap
- Sidebars:
  - Width: user-configured value (not hardcoded to 240px)
  - Sticky toggle (user setting):
    - ON: position: sticky, top: [current header height]px, align-self: flex-start
    - OFF: position: relative, scrolls with page
  - Always IN FLOW — never position: absolute or fixed
- Content: flex: 1, fills remaining horizontal space

**Comments**
- Full-width block, normal flow
- Desktop: a sibling row after the main row — never inside the desktop three-column flex row
- Mobile: inside `.blog-overlay-posts`, directly under the article body and before footer modules
- z-index: 10

**Footer**
- Full-width block, normal flow
- Desktop: always after comments
- Mobile: after comments and before stacked sidebar modules
- Mobile spacing between modules is container `gap: 56px` on `.blog-overlay-footer-content` (and Feature `.blog-overlay-feature-below-row` / `.blog-overlay-feature-footer-modules`). Zero top/bottom margins on `.blog-overlay-footer-module` and the newsletter / lead-magnet cards — do not add extra `margin-top` on those modules
- Mobile Previous/Next is one bordered `nav.blog-overlay-prev-next` grid (`1fr 1fr`, gap 0, padding 0). Columns pad 16px; the first has `border-right` as the only divider. Hide `.blog-overlay-prev-next-category`. Radius is `min(var(--bb-btn-radius), shortest-side × 0.08)` with no 20px card cap.
- Never position: fixed or absolute
- z-index: 10

## Progress bar
- z-index: 200 — always above all other zones
- Top setting:
  - Initial state: offset ~4px below the viewport top
  - On scroll: transitions to top: 0 flush with viewport top
  - Use IntersectionObserver or scroll listener to toggle a .scrolled
    class that sets top: 0
- Bottom setting: position: fixed, bottom: 0, left: 0, width: 100%
- Neither setting participates in normal document flow —
  surrounding zones must not shift to accommodate it

## What must never happen
- Sidebars must not use top: 0 when sticky — their sticky offset
  must always equal the current header height, or they will
  overlap the header zone
- Footer must not use position: fixed or absolute
- Comments must not be placed inside the desktop three-column main row
- On mobile, comments and footer must not appear after stacked sidebar modules
- Sidebar width must be read from user settings at render time,
  not hardcoded
- The overlay root must not use position: fixed
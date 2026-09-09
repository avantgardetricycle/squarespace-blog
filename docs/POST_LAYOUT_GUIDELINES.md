# BetterBlog Post Page — Layout Contract

## Zone order (top to bottom, normal flow)

### Desktop
1. Header
2. Main row (left sidebar + content + right sidebar)
3. Comments
4. Footer
5. Progress bar (out of flow — see below)

Feature’s comments and footer modules sit in a full-width `.blog-overlay-feature-below-row` immediately after the main row. Desktop order is author, comments, then the remaining footer modules (more to read, email capture, lead magnet, and any others). On mobile, comments use `order: 0` and footer modules use `order: 1` so comments paint first even when the author card is earlier in the DOM. Footer modules share one `.blog-overlay-feature-footer-modules` column (`gap: 56px`, no module margins). Feature’s main row has two `.blog-overlay-sidebar-anchor` nodes — a TOC-only rail hidden on mobile (`.bb-mobile-rail-hidden`, height 0) and the live author/related rail. The painted rail (height > 0) is moved to immediately after the below-row; CSS `order` cannot do that because the rail and the below-row are not siblings.

### Mobile (<768px, including Configure’s phone preview)
When the main row stacks, order is:

1. Header
2. Article body
3. Comments
4. Footer modules
5. Sidebar modules (visible rails only)

Comments and footer modules render inside `.blog-overlay-posts` so they stay with the article. Sidebar rails come after that column. Feature’s left TOC rail is hidden on mobile (`.bb-mobile-rail-hidden`, height 0) and is not part of this stack — the live right rail is selected by height > 0 and moved after the below-row.

Verify this order with a **sidebar module turned off**. Default Feature/Reporter configs duplicate author/related posts in the sidebar and footer; the footer copy is hidden on mobile, which can hide an ordering bug.

On mobile, every `.blog-overlay-author-unit` in a module gets the same wrap layout (44px avatar beside the name, bio and social on full-width rows below). Style **all** author units — `querySelector` only hits the first, and single-author posts hide that bug. Include a multi-author post in QA for remaining templates.

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
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

On mobile, every `.blog-overlay-author-unit` in a module gets the same wrap layout (44px avatar beside the name, bio and social on full-width rows below). `.blog-overlay-author-card-text{display:contents}` is the key so bio and social participate in the row wrap. Feature is CSS-only — do not `appendChild` or otherwise restructure the author DOM; Feature rebuilds the block before measuring code runs. Style **all** author units — `querySelector` only hits the first, and single-author posts hide that bug. Include a multi-author post in QA for remaining templates. If Author Profiles is enabled, `.blog-overlay-author-profiles` must be in the DOM (sidebar and/or footer). Empty `defaultAuthorIds` is not a reason to skip the module — fall back to name-matched profiles, then configured profile keys, then the post’s Squarespace author.

Feature mobile header (BB sets font sizes only; family/weight inherit customer tokens unless noted): full-bleed image `margin-top: -15px` / `margin-bottom: 0` (do not use `−50px` — that plus the body’s 25px content padding paints the first line over the image). Painted gap from the image bottom to the first line of article text is **20px** via `.blog-overlay-body` `padding-top: 20px`. Breadcrumbs 13px P1, body 60%, centered, width 100%, child `a`/`span` `display: inline`; category line 11px P1 700 uppercase 0.08em accent (`!important` on type so site paragraph tokens cannot win), centered, `margin-bottom: 8px`; title 28px / 1.15, centered, `margin-bottom: 8px` (same as Story / Publisher — prefer 8px over 5px); deck 14px P1 / 1.4, centered; meta 13px P1 with H1 weight, centered, inner `.blog-overlay-meta` 13px H1; share links 32×32 with 18×18 icons; `.blog-overlay-body` `margin-bottom: -80px`. No meta reorder and no column override — Feature already stacks.

Feature mobile modules: sidebar Related and Popular share compact cards (100% width, 80×80 thumbs, 12px gap). Footer More to Read uses full-width 16:10 cards; hide `.bb-more-to-read-deck` and show date/read-time meta instead. Footer newsletter and lead magnet use the existing `.bb-mobile-sidebar-chrome` header — do not inject a second one; collapse empty `.bb-newsletter-footer-copy` / `.bb-newsletter-footer-msg`. Empty `.bb-comments-list` collapses. Gap from a non-empty comments list to `.bb-comment-form-wrap` is ~24px (`margin-bottom` on the list; form wrap padding/margin 0). Comment form heading is 12px uppercase; submit is full-width at 14px.

Writer mobile (BB sets font sizes only; family/weight inherit customer tokens unless noted): wrapper horizontal padding `18.75px` (not the desktop `8vw` literary inset); header zone horizontal padding `0`; `padding-top` is site header height + 5px, `margin-top: 0`. Breadcrumbs 13px P1, `--bb-muted`, `display: block`, width 100%, child `a`/`span` `display: inline`. Category 11px P1 700 uppercase 0.08em accent, `margin-bottom: 10px`. Title 34px / 1.15, `margin: 0 0 12px` (larger than other templates — no featured image). Deck 14px P1 / 1.4, `--bb-excerpt`, `margin: 0 0 24px`. Writer rule stays a 40px centered divider with `margin: 0 auto 24px`. Meta 13px P1; inner `.blog-overlay-meta` 13px heading family. `.blog-overlay-body` `margin-bottom: -80px`. Footer modules use container `gap: 56px` with module margins 0. Footer newsletter: hide the inner heading when chrome is shown; collapse empty `.bb-newsletter-footer-copy` / `.bb-newsletter-footer-msg`; button is `inline-block` (not flex — `text-align:center` is ignored on a flex button with `justify-content: normal`), full width, `padding: 8px 16px`. Comment form heading 12px / 700 / uppercase / 0.08em, `margin: 0 0 8px`; submit `inline-block`, width 100%, `8px 16px`, 14px.

Story mobile (BB sets font sizes only; family/weight inherit customer tokens unless noted): stack `.blog-overlay-story-header-row` to a column (`gap: 20px`); image and info column `width: 100%` / `flex: 0 0 auto`; image `aspect-ratio: 16/10`. Breadcrumbs move above the image row (`display: block`, child `a`/`span` `inline`, 13px P1). Category 11px P1 700 uppercase 0.08em, always `var(--bb-accent)` — not header ink. Title 28px / 1.15; deck 14px P1 / 1.4; story rule `margin: 12px 0`; meta 13px P1 with inner `.blog-overlay-meta` heading family. Header zone full-bleeds the customer background: `width: auto`, negative L/R margin equal to wrapper horizontal padding with the same amount padded back, `padding: 24px` top/bottom, `margin-bottom: 0`. Header text colour is Rule E from that background’s luminance (`(0.2126R + 0.7152G + 0.0722B) / 255`; under 0.5 white ink, otherwise black) — title 100%, deck 80%, breadcrumbs/meta/share 60%, story-rule border 15%. No text-shadow. Share stays on Story: row `flex` / `gap: 0` / `margin: 12px 0 0`, left-aligned; each link 32×32 with 18×18 `currentColor` icons. `.blog-overlay-body` `margin-top: -24px` / `margin-bottom: -80px`. No sidebar. Footer / comment primary buttons use the shared mobile compact scale in `_mobilePostFooterGapCss` (`inline-block`, not flex — Squarespace `justify-content: normal` left-aligns flex labels), `padding: 8px 16px`, `font-size: 14px`, width 100%. Collapse empty `.bb-newsletter-footer-copy` / `.bb-newsletter-footer-msg`. Comment heading 12px / 700 / uppercase / 0.08em, `margin: 0 0 8px`.

Publisher mobile (BB sets font sizes only; family/weight inherit customer tokens unless noted): hero stays 375×500 full-bleed; `.blog-overlay-post-header-fullbleed` `margin-bottom: 0`. Wrapper `padding-top` is site header height + 5px, `margin-top: 0`. Category ribbon is `inline-flex` centered, `line-height: 1`, `padding: 7px 12px` (not desktop `line-height: 0` + 18px pad), 11px P1 800 uppercase 0.08em, accent fill and button radius, margin 0; the categories line is `display: block` / `line-height: 1` / `margin: 0 0 10px`. Title 28px / 1.15 white, `margin: 0 0 8px`. Meta 13px P1 `--bb-meta-on-image`, inner `.blog-overlay-meta` heading family. Title and meta `text-shadow: 0 1px 3px rgba(0,0,0,0.5)` (on-image, unlike Story’s solid header). No deck, breadcrumbs, or share row. Body `padding-top: 20px` / `margin-bottom: -80px`. Hide Table of Contents on mobile even when the sidebar has it (same `.bb-mobile-toc-hidden` as Feature). Sidebar rail `gap: 28px`, footer `gap: 56px`, module margins 0. Sidebar Related + Popular use shared mobile compact cards (`_mobileSidebarPostCardCss`): 80×80 thumbs, `aspect-ratio: 1/1`, `img` `border-radius: 4px`, card `gap: 12px` — same on Reporter, Feature, and Digest Collection. Comment heading 12px / 700 / uppercase / 0.08em in `--bb-heading-font-family`, `margin: 0 0 8px`. Submit is centred flex, width 100%, `padding: 8px 16px`, `font-size: 14px`.

Reporter mobile (BB sets font sizes only; family/weight inherit customer tokens unless noted): breadcrumbs `display: block`, child `a`/`span` `inline`, `margin-bottom: 12px` (do not set `display:flex !important` on the nav — flex items stack). Hide Table of Contents on mobile with `.bb-mobile-toc-hidden` regardless of the setting (same as Feature / Publisher). Article-to-comments gap is **measured**: last line of text in `.blog-overlay-body` (Range rects, not the container box) to the top of `#bb-comments` (or the next visible block when comments are off) must be ~24px. Set `--bb-reporter-article-mb` from that measurement — do not swap the old `−80px` for another fixed number; extra space below the last glyph is post-dependent. Empty `.bb-comments-list` collapses (`:empty` / `display:none`). Gap from `.bb-comments-list` bottom to `.bb-comment-form-wrap` top is ~24px. Author Profiles must still render when enabled: if `defaultAuthorIds` is empty, match the post author to `authorProfiles` / `authorMap`, else use those keys, else the Squarespace byline.

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
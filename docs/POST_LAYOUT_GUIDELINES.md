# BetterBlog Post Page — Layout Contract

## Zone order (top to bottom, normal flow)
1. Header
2. Main row (left sidebar + content + right sidebar)
3. Comments
4. Footer
5. Progress bar (out of flow — see below)

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
- Always a sibling row after the main row — never inside the flex container
- z-index: 10

**Footer**
- Full-width block, normal flow
- Always after comments
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
- Comments must not be placed inside the flex main row
- Sidebar width must be read from user settings at render time,
  not hardcoded
- The overlay root must not use position: fixed
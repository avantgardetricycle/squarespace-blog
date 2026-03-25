# BetterBlog Collection Page — Layout Contract

## Zone order (top to bottom, normal flow)
1. Header
2. Main row (left sidebar + post collection + right sidebar)
3. Pagination (optional — inside the post collection column, directly below it)
4. Footer

## Per-zone rules

**BetterBlog overlay root**
- Wraps all zones above
- position: relative, z-index: 10
- Never position: fixed

**Header**
- Full viewport width always
- z-index: 100
- Always contains: blog title
- Optionally contains: filter, search, sort controls
  - Each module is individually toggled on/off by the user
  - The arrangement and order of modules within the header is
    user-controlled — do not assume a fixed left-to-right order
  - All active modules render inside the header zone, never outside it
- Sticky toggle (user setting):
  - ON: position: sticky, top: 0
  - OFF: position: relative (scrolls with page)
- No element may overlap the header regardless of sticky state

**Main row**
- display: flex, flex-direction: row
- Top edge must equal the header's bottom edge — no gap, no overlap
- Sidebars:
  - Width: user-configured value (not hardcoded)
  - Sticky toggle (user setting):
    - ON: position: sticky, top: [current header height]px, align-self: flex-start
    - OFF: position: relative, scrolls with page
  - Always IN FLOW — never position: absolute or fixed
- Post collection: flex: 1, fills remaining horizontal space
  - Layout style (grid, list, showcase, etc.) is user-configured
  - Never overlaps sidebars or header

**Pagination**
- Optional — only rendered when user has enabled it
- Sits directly below the post collection, same width as post collection
- Is NOT full-width — it does not span the sidebars
- Is NOT a separate full-width row — it lives in the same column as
  the post collection, as a block child below it
- z-index: 1

**Footer**
- Full-width block, normal flow
- Always after the main row (which includes post collection + pagination)
- Never position: fixed or absolute
- z-index: 10

## What must never happen
- Sidebars must not use top: 0 when sticky — offset must equal header height
- Pagination must not span full width or sit outside the post collection column
- Footer must not use position: fixed or absolute
- Header modules must not render outside the header zone regardless of
  their arrangement — floating filter dropdowns or search bars must be
  anchored to and contained within the header
- Module order inside the header must be driven by user settings,
  not hardcoded in the render logic
- Post collection must not overlap sidebars at any viewport width
- The overlay root must not use position: fixed
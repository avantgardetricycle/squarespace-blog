# BetterBlog Collection Page — Layout Contract

## Zone order (top to bottom, normal flow)
1. Header
2. Main row (left sidebar + post collection + right sidebar)
3. Pagination zone (optional — full width of the overlay content area, below the entire main row)
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

**Pagination zone**
- Optional — only rendered when the user has enabled pagination
- Its own block in normal flow: **100% width** of the overlay content area (spans the full row beneath left sidebar, post collection, and right sidebar)
- Placed **directly under the main row**, before the footer
- Contains the pagination controls (numbered pages, load more, etc.)
- z-index: 1

**Footer**
- Full-width block, normal flow
- Always after the main row and pagination zone
- Never position: fixed or absolute
- z-index: 10

## What must never happen
- Sidebars must not use top: 0 when sticky — offset must equal header height
- Pagination must not be laid out as a grid cell inside the post collection when a dedicated full-width pagination zone is used — it belongs in the pagination zone below the main row
- Footer must not use position: fixed or absolute
- Header modules must not render outside the header zone regardless of
  their arrangement — floating filter dropdowns or search bars must be
  anchored to and contained within the header
- Module order inside the header must be driven by user settings,
  not hardcoded in the render logic
- Post collection must not overlap sidebars at any viewport width
- The overlay root must not use position: fixed

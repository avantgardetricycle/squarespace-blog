import { cn } from "@/app/components/ui/utils";

const ACCENT = "#5B4FE8";
const IMG = "bg-[#d8d7d3]";
const IMG_MID = "bg-[#c4c3bf]";
const IMG_DARK = "bg-[#a8a7a3]";
const BAR_DARK = "bg-[#6b6b6b]";
const BAR_LIGHT = "bg-[#e5e4e0]";

type PreviewLayout =
  | "masthead"
  | "newsroom"
  | "digest"
  | "showcase"
  | "editorial"
  | "feature"
  | "publisher"
  | "reporter"
  | "story"
  | "writer";

interface TemplatePreviewProps {
  previewLayout: string;
  className?: string;
}

function Bar({
  w = "w-full",
  h = "h-1.5",
  tone = "light",
  className,
}: {
  w?: string;
  h?: string;
  tone?: "light" | "mid" | "dark" | "accent" | "white";
  className?: string;
}) {
  const toneClass =
    tone === "dark"
      ? BAR_DARK
      : tone === "mid"
        ? "bg-[#c9c8c4]"
        : tone === "accent"
          ? "bg-[#5B4FE8]"
          : tone === "white"
            ? "bg-white/85"
            : BAR_LIGHT;
  return <div className={cn(h, "rounded-sm", toneClass, w, className)} />;
}

function AccentPill({ className }: { className?: string }) {
  return <div className={cn("h-1.5 w-7 rounded-sm shrink-0", "bg-[#5B4FE8]", className)} />;
}

function AccentDots({ light }: { light?: boolean } = {}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn("h-1 w-1 rounded-full", light ? "bg-white/70" : "bg-[#5B4FE8]/70")}
        />
      ))}
    </div>
  );
}

function Para({ lines = 4 }: { lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-5/6", "w-3/4"];
  return (
    <div className="space-y-1.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} w={widths[i % widths.length]} />
      ))}
    </div>
  );
}

function BodyParas({ count = 3, lines = 4 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Para key={i} lines={lines} />
      ))}
    </div>
  );
}

/** Dark sidebar section label (black rectangle in mockups). */
function SidebarLabel({ w = "w-12" }: { w?: string } = {}) {
  return <Bar w={w} h="h-1.5" tone="dark" />;
}

function RelatedItems({ count = 3 }: { count?: number } = {}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <div className={cn(IMG, "w-4 h-4 rounded-sm shrink-0")} />
          <div className="flex-1 min-w-0 space-y-1">
            <Bar w="w-full" h="h-1" tone="accent" />
            <Bar w="w-4/5" h="h-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarSection({ count = 3 }: { count?: number } = {}) {
  return (
    <div className="space-y-1.5">
      <SidebarLabel />
      <RelatedItems count={count} />
    </div>
  );
}

function AuthorSidebarBlock() {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5 items-start">
        <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: ACCENT }} />
        <div className="flex-1 min-w-0 space-y-1 pt-0.5">
          <Bar w="w-full" h="h-1" tone="dark" />
          <Bar w="w-4/5" h="h-1" />
        </div>
      </div>
    </div>
  );
}

function FilterPills({ count = 5 }: { count?: number } = {}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 w-6 rounded-full border border-[#c4b9f5]/80 bg-transparent"
        />
      ))}
    </div>
  );
}

function CollectionHeader({ withSearch = true }: { withSearch?: boolean } = {}) {
  return (
    <div className="flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={cn(BAR_DARK, "w-3.5 h-3.5 rounded-sm shrink-0")} />
        <div className="space-y-1 min-w-0">
          <Bar w="w-14" h="h-1.5" tone="dark" />
          <Bar w="w-9" h="h-1" />
        </div>
      </div>
      {withSearch && (
        <div className="h-4 w-20 rounded border border-[#e5e4e0] bg-white shrink-0" />
      )}
    </div>
  );
}

function MosaicTile({
  shade,
  className,
  featured,
}: {
  shade: "light" | "mid" | "dark";
  className?: string;
  featured?: boolean;
}) {
  const bg = shade === "dark" ? IMG_DARK : shade === "mid" ? IMG_MID : IMG;
  return (
    <div className={cn(bg, "rounded relative overflow-hidden min-h-0", className)}>
      {featured && (
        <div className="absolute top-2 left-2 h-2 w-5 rounded-full bg-[#5B4FE8]/90" />
      )}
      <div className="absolute bottom-2 left-2 right-2 space-y-1">
        <div className="h-1 w-7 rounded-sm bg-[#c4b9f5]/90" />
        <div className="h-1.5 w-4/5 rounded-sm bg-white/90" />
        <div className="h-1 w-1/2 rounded-sm bg-white/70" />
      </div>
    </div>
  );
}

/** Editorial mosaic row: large tile (2 cols) beside two stacked landscape tiles. */
function EditorialMosaicRow({
  largeShade,
  smallShades,
  largeOnRight = false,
  featured,
}: {
  largeShade: "light" | "mid" | "dark";
  smallShades: ["light" | "mid" | "dark", "light" | "mid" | "dark"];
  largeOnRight?: boolean;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5",
        largeOnRight ? "grid-cols-[1fr_2fr]" : "grid-cols-[2fr_1fr]"
      )}
    >
      {largeOnRight ? (
        <>
          <MosaicTile shade={smallShades[0]} className="aspect-[2/1] w-full col-start-1 row-start-1" />
          <MosaicTile shade={smallShades[1]} className="aspect-[2/1] w-full col-start-1 row-start-2" />
          <MosaicTile
            shade={largeShade}
            featured={featured}
            className="row-span-2 col-start-2 row-start-1 h-full min-h-0"
          />
        </>
      ) : (
        <>
          <MosaicTile
            shade={largeShade}
            featured={featured}
            className="row-span-2 col-start-1 row-start-1 h-full min-h-0"
          />
          <MosaicTile shade={smallShades[0]} className="aspect-[2/1] w-full col-start-2 row-start-1" />
          <MosaicTile shade={smallShades[1]} className="aspect-[2/1] w-full col-start-2 row-start-2" />
        </>
      )}
    </div>
  );
}

export function TemplatePreview({ previewLayout, className }: TemplatePreviewProps) {
  const layout = previewLayout as PreviewLayout;

  switch (layout) {
    /* ── Collections ─────────────────────────────────────────── */

    case "showcase":
      return (
        <div className={cn("flex flex-col gap-3.5 p-4 min-h-0", className)}>
          <CollectionHeader />
          <div className="space-y-3.5 min-h-0">
            {[false, true, false, true].map((reverse, i) => (
              <div
                key={i}
                className={cn("flex gap-3 items-center", reverse && "flex-row-reverse")}
              >
                {/* Landscape ~3:2 images */}
                <div className={cn(IMG, "w-[58%] aspect-[3/2] shrink-0 rounded")} />
                <div
                  className={cn(
                    "flex-1 min-w-0 flex flex-col justify-center gap-2",
                    reverse && "items-end"
                  )}
                >
                  <AccentPill />
                  <Bar w="w-full" h="h-2" tone="dark" />
                  <Bar w="w-full" h="h-1.5" />
                  <Bar w="w-5/6" h="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "newsroom":
      return (
        <div className={cn("flex flex-col gap-2.5 p-4 min-h-0", className)}>
          <div className="h-5 w-full rounded border border-[#e5e4e0] bg-white shrink-0" />
          <CollectionHeader withSearch={false} />
          {/* Extra space between header and list */}
          <div className="space-y-2.5 min-h-0 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 items-center">
                {/* Larger landscape thumbs (restored size/ratio) */}
                <div className={cn(IMG, "w-16 h-11 shrink-0 rounded")} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Bar w="w-full" h="h-1.5" tone="dark" />
                  <AccentPill />
                  <Bar w="w-4/5" h="h-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "masthead":
      return (
        <div className={cn("flex flex-col gap-3 p-4 min-h-0", className)}>
          {/* Wide hero ~2:1 */}
          <div className={cn(IMG, "w-full aspect-[2/1] rounded shrink-0")} />
          <div className="space-y-1.5 shrink-0">
            <AccentPill />
            <Bar w="w-full" h="h-2" tone="dark" />
          </div>
          {/* Gap before grid; 3:2 grid images; 2×3 */}
          <div className="grid grid-cols-3 gap-2.5 mt-1 min-h-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-0">
                <div className={cn(IMG, "w-full aspect-[3/2] rounded")} />
                <div className="mt-1.5 space-y-1">
                  <Bar w="w-full" h="h-1.5" tone="dark" />
                  <Bar w="w-3/4" h="h-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "editorial":
      return (
        <div className={cn("flex flex-col gap-3 p-4 min-h-0", className)}>
          <CollectionHeader />
          <div className="flex flex-col gap-2 min-h-0">
            <EditorialMosaicRow
              largeShade="mid"
              smallShades={["dark", "light"]}
              featured
            />
            <EditorialMosaicRow
              largeShade="dark"
              smallShades={["mid", "light"]}
              largeOnRight
            />
            <EditorialMosaicRow
              largeShade="light"
              smallShades={["dark", "mid"]}
            />
          </div>
        </div>
      );

    case "digest":
      return (
        <div className={cn("flex gap-3.5 p-4 min-w-0 min-h-0", className)}>
          <div className="flex-[2] min-w-0 flex flex-col gap-2.5">
            <CollectionHeader withSearch={false} />
            {/* Featured ~2:1 — shorter than before */}
            <div className={cn(IMG, "w-full aspect-[2/1] rounded shrink-0")} />
            <div className="space-y-1.5 shrink-0">
              <AccentPill />
              <Bar w="w-full" h="h-2" tone="dark" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-0">
                  <div className={cn(IMG, "w-full aspect-[3/2] rounded")} />
                  <div className="mt-1.5 space-y-1">
                    <AccentPill />
                    <Bar w="w-full" h="h-1.5" tone="dark" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Distinct sidebar modules with breathing room */}
          <div className="w-[32%] min-w-[80px] shrink-0 flex flex-col gap-4 pt-1">
            {/* Author / profile module */}
            <div className="flex flex-col items-start gap-2">
              <div className="w-7 h-7 rounded-full" style={{ backgroundColor: ACCENT }} />
              <Bar w="w-full" h="h-1" />
              <Bar w="w-4/5" h="h-1" />
              <Bar w="w-3/5" h="h-1" />
              <div className={cn(BAR_LIGHT, "w-full h-4 rounded mt-0.5")} />
            </div>
            {/* CTA + list module */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded" style={{ backgroundColor: ACCENT }} />
              <div className="space-y-2 pt-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <div className={cn(IMG, "w-3.5 h-3.5 rounded-sm shrink-0")} />
                    <Bar w="w-full" h="h-1" />
                  </div>
                ))}
              </div>
            </div>
            {/* Filters module */}
            <div className="space-y-2 mt-auto">
              <SidebarLabel w="w-10" />
              <FilterPills count={5} />
            </div>
          </div>
        </div>
      );

    /* ── Posts ───────────────────────────────────────────────── */

    case "reporter":
      return (
        <div className={cn("flex flex-col gap-3.5 p-4 min-h-0", className)}>
          <div className="flex gap-3 shrink-0 items-stretch">
            {/* Post info spread vertically to match image height */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <AccentPill />
              <Bar w="w-full" h="h-2.5" tone="dark" />
              <Bar w="w-full" h="h-2" tone="dark" />
              <div className="space-y-1.5">
                <Bar w="w-full" h="h-1.5" />
                <Bar w="w-5/6" h="h-1.5" />
                <Bar w="w-2/3" h="h-1.5" />
              </div>
            </div>
            <div className={cn(IMG, "w-[44%] aspect-[4/3] shrink-0 rounded")} />
          </div>
          <div className="flex gap-3 min-h-0">
            <div className="flex-1 min-w-0 px-3">
              <BodyParas count={3} lines={4} />
            </div>
            <div className="w-[30%] min-w-[72px] shrink-0 flex flex-col gap-3.5">
              <AuthorSidebarBlock />
              <SidebarSection count={3} />
              <SidebarSection count={3} />
            </div>
          </div>
        </div>
      );

    case "feature":
      return (
        <div className={cn("flex flex-col gap-3 p-4 min-h-0", className)}>
          {/* Header spread vertically */}
          <div className="flex flex-col items-center gap-2.5 shrink-0 py-1">
            <Bar w="w-16" h="h-1" />
            <AccentPill />
            <Bar w="w-3/5" h="h-2.5" tone="dark" />
            <Bar w="w-2/5" h="h-1.5" />
            <Bar w="w-1/3" h="h-1.5" />
            <AccentDots />
          </div>
          {/* Wide short hero ~2:1 */}
          <div className={cn(IMG, "w-full aspect-[2/1] rounded shrink-0")} />
          <div className="flex gap-3 min-h-0 mt-1">
            {/* Left sidebar (TOC) */}
            <div className="w-[14%] min-w-[36px] shrink-0 flex flex-col gap-2 pt-1">
              <Bar w="w-full" h="h-1" tone="accent" />
              <Bar w="w-4/5" h="h-1" tone="accent" />
              <Bar w="w-full" h="h-1" />
              <Bar w="w-3/4" h="h-1" />
              <Bar w="w-full" h="h-1" />
            </div>
            {/* Narrower body */}
            <div className="flex-1 min-w-0 px-2">
              <BodyParas count={3} lines={4} />
            </div>
            {/* Right sidebar */}
            <div className="w-[28%] min-w-[68px] shrink-0 flex flex-col gap-3.5">
              <AuthorSidebarBlock />
              <SidebarSection count={3} />
            </div>
          </div>
        </div>
      );

    case "writer":
      return (
        <div className={cn("flex flex-col gap-4 px-10 py-4 min-h-0", className)}>
          {/* Header spread vertically */}
          <div className="flex flex-col items-center gap-2.5 shrink-0 py-2">
            <Bar w="w-14" h="h-1" />
            <AccentPill />
            <Bar w="w-3/5" h="h-2.5" tone="dark" />
            <Bar w="w-1/3" h="h-1.5" />
            <div className="h-0.5 w-10 rounded-full" style={{ backgroundColor: ACCENT }} />
          </div>
          <div className="min-h-0 px-2">
            <BodyParas count={5} lines={3} />
          </div>
        </div>
      );

    case "story":
      return (
        <div className={cn("flex flex-col gap-4 p-4 min-h-0", className)}>
          <div className="flex gap-4 shrink-0 rounded-md bg-[#1a1a1a] p-4">
            <div className={cn(IMG, "w-[40%] aspect-[5/4] shrink-0 rounded")} />
            {/* Post info spread vertically */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <AccentPill />
              <Bar w="w-full" h="h-2.5" tone="white" />
              <Bar w="w-full" h="h-2" tone="white" />
              <Bar w="w-4/5" h="h-1.5" tone="white" />
              <AccentDots light />
            </div>
          </div>
          {/* Wide side margins on body */}
          <div className="min-h-0 px-10">
            <BodyParas count={4} lines={4} />
          </div>
        </div>
      );

    case "publisher":
      return (
        <div className={cn("flex flex-col gap-3.5 p-4 min-h-0", className)}>
          {/* Gradient hero — no inner grey rectangle; post info spread horizontally */}
          <div className="relative shrink-0 overflow-hidden rounded aspect-[2/1] bg-gradient-to-b from-[#9a9995] to-[#d0cfcb]">
            <div className="absolute inset-y-0 left-0 right-[20%] flex flex-col justify-center gap-2.5 px-4 py-3">
              <AccentPill />
              <Bar w="w-full" h="h-2.5" tone="white" />
              <Bar w="w-4/5" h="h-1.5" tone="white" />
              <Bar w="w-3/5" h="h-1.5" tone="white" />
            </div>
          </div>
          <div className="flex gap-3 min-h-0">
            <div className="flex-1 min-w-0 px-1">
              <BodyParas count={3} lines={4} />
            </div>
            {/* Three labeled sidebar sections + filter pills */}
            <div className="w-[32%] min-w-[72px] shrink-0 flex flex-col gap-3.5">
              <SidebarSection count={3} />
              <SidebarSection count={3} />
              <SidebarSection count={3} />
              <FilterPills count={6} />
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <Bar w="w-2/3" h="h-2" tone="dark" />
          <BodyParas count={2} lines={4} />
        </div>
      );
  }
}

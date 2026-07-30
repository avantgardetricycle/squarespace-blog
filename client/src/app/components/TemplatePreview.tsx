import { cn } from "@/app/components/ui/utils";

const ACCENT = "#5B4FE8";
const IMG = "bg-[#d8d7d3]";
const IMG_MID = "bg-[#c4c3bf]";
const IMG_DARK = "bg-[#a8a7a3]";
const BAR = "bg-[#c9c8c4]";
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
        ? BAR
        : tone === "accent"
          ? "bg-[#5B4FE8]"
          : tone === "white"
            ? "bg-white/85"
            : BAR_LIGHT;
  return <div className={cn(h, "rounded-sm", toneClass, w, className)} />;
}

function AccentPill({ className }: { className?: string }) {
  return <div className={cn("h-1.5 w-8 rounded-full", "bg-[#5B4FE8]", className)} />;
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
  const widths = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"];
  return (
    <div className="space-y-1">
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} w={widths[i % widths.length]} />
      ))}
    </div>
  );
}

function BodyParas({ count = 3, lines = 4 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Para key={i} lines={lines} />
      ))}
    </div>
  );
}

function RelatedCard() {
  return (
    <div className="flex gap-1.5 items-start">
      <div className={cn(IMG, "w-5 h-5 rounded shrink-0")} />
      <div className="flex-1 min-w-0 space-y-1 pt-0.5">
        <Bar w="w-10" h="h-1" tone="accent" />
        <Bar w="w-full" h="h-1" tone="mid" />
      </div>
    </div>
  );
}

function AuthorBlock() {
  return (
    <div className="flex gap-1.5 items-start">
      <div
        className="w-5 h-5 rounded-full shrink-0"
        style={{ backgroundColor: ACCENT }}
      />
      <div className="flex-1 min-w-0 space-y-1 pt-0.5">
        <Bar w="w-14" h="h-1" tone="mid" />
        <Bar w="w-full" h="h-1" />
        <Bar w="w-4/5" h="h-1" />
      </div>
    </div>
  );
}

function PostMeta({ reverse }: { reverse?: boolean } = {}) {
  return (
    <div className={cn("flex flex-col gap-1.5 min-w-0", reverse && "items-end text-right")}>
      <AccentPill />
      <Bar w="w-full" h="h-2" tone="dark" className={reverse ? "ml-auto" : undefined} />
      <Bar w="w-4/5" h="h-1.5" className={reverse ? "ml-auto" : undefined} />
      <Bar w="w-3/5" h="h-1.5" className={reverse ? "ml-auto" : undefined} />
    </div>
  );
}

function GridPostCard() {
  return (
    <div className="min-w-0">
      <div className={cn(IMG, "w-full aspect-[2/1] rounded")} />
      <div className="mt-1.5 space-y-1">
        <Bar w="w-full" h="h-1.5" tone="dark" />
        <Bar w="w-3/4" h="h-1" />
      </div>
    </div>
  );
}

function CollectionHeader({ withSearch = true }: { withSearch?: boolean } = {}) {
  return (
    <div className="flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={cn(BAR_DARK, "w-3.5 h-3.5 rounded-sm shrink-0")} />
        <div className="space-y-0.5 min-w-0">
          <Bar w="w-12" h="h-1.5" tone="dark" />
          <Bar w="w-8" h="h-1" />
        </div>
      </div>
      {withSearch && <div className={cn("h-4 w-16 rounded border border-[#e5e4e0] bg-white shrink-0")} />}
    </div>
  );
}

function MosaicTile({
  shade,
  className,
}: {
  shade: "light" | "mid" | "dark";
  className?: string;
}) {
  const bg = shade === "dark" ? IMG_DARK : shade === "mid" ? IMG_MID : IMG;
  return (
    <div className={cn(bg, "rounded relative overflow-hidden min-h-0", className)}>
      <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
        <div className="h-1 w-8 rounded-full bg-white/70" />
        <div className="h-1.5 w-4/5 rounded-sm bg-white/90" />
        <div className="h-1 w-1/2 rounded-sm bg-[#c4b9f5]/80" />
      </div>
    </div>
  );
}

export function TemplatePreview({ previewLayout, className }: TemplatePreviewProps) {
  const layout = previewLayout as PreviewLayout;

  switch (layout) {
    case "showcase":
      return (
        <div className={cn("flex flex-col gap-2.5 p-3 min-h-0", className)}>
          <CollectionHeader />
          <div className="space-y-2.5 min-h-0">
            {[false, true, false, true].map((reverse, i) => (
              <div
                key={i}
                className={cn("flex gap-2.5 items-center", reverse && "flex-row-reverse")}
              >
                <div className={cn(IMG, "w-[48%] aspect-[4/5] shrink-0 rounded")} />
                <PostMeta reverse={reverse} />
              </div>
            ))}
          </div>
        </div>
      );

    case "newsroom":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="h-5 w-full rounded border border-[#e5e4e0] bg-white shrink-0" />
          <CollectionHeader withSearch={false} />
          <div className="space-y-2 min-h-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className={cn(IMG, "w-9 h-9 shrink-0 rounded")} />
                <div className="flex-1 min-w-0 space-y-1">
                  <AccentPill />
                  <Bar w="w-full" h="h-1.5" tone="dark" />
                  <Bar w="w-3/4" h="h-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "masthead":
      return (
        <div className={cn("flex flex-col gap-2.5 p-3 min-h-0", className)}>
          <div className={cn(IMG, "w-full aspect-[3/2] rounded shrink-0")} />
          <div className="space-y-1 shrink-0">
            <AccentPill />
            <Bar w="w-4/5" h="h-2" tone="dark" />
            <Bar w="w-1/2" h="h-1.5" />
          </div>
          <div className="grid grid-cols-3 gap-2 min-h-0">
            <GridPostCard />
            <GridPostCard />
            <GridPostCard />
          </div>
        </div>
      );

    case "editorial":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <CollectionHeader />
          <div className="flex flex-col gap-1.5 min-h-0">
            {/* Large left + two stacked right */}
            <div
              className="grid gap-1.5 h-[88px]"
              style={{ gridTemplateColumns: "1.35fr 1fr", gridTemplateRows: "1fr 1fr" }}
            >
              <MosaicTile shade="mid" className="row-span-2" />
              <MosaicTile shade="dark" />
              <MosaicTile shade="light" />
            </div>
            {/* Two stacked left + large right */}
            <div
              className="grid gap-1.5 h-[88px]"
              style={{ gridTemplateColumns: "1fr 1.35fr", gridTemplateRows: "1fr 1fr" }}
            >
              <MosaicTile shade="dark" />
              <MosaicTile shade="mid" className="row-span-2" />
              <MosaicTile shade="light" />
            </div>
            {/* Bottom alternating strip */}
            <div className="grid grid-cols-3 gap-1.5 h-[48px]">
              <MosaicTile shade="light" />
              <MosaicTile shade="dark" />
              <MosaicTile shade="mid" />
            </div>
          </div>
        </div>
      );

    case "digest":
      return (
        <div className={cn("flex gap-2.5 p-3 min-w-0 min-h-0", className)}>
          <div className="flex-[2] min-w-0 flex flex-col gap-2">
            <CollectionHeader withSearch={false} />
            <div className={cn(IMG, "w-full aspect-[3/2] rounded shrink-0")} />
            <div className="space-y-1 shrink-0">
              <AccentPill />
              <Bar w="w-4/5" h="h-2" tone="dark" />
              <Bar w="w-3/5" h="h-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="min-w-0">
                  <div className={cn(IMG, "w-full aspect-[2/1] rounded")} />
                  <div className="mt-1 space-y-1">
                    <AccentPill />
                    <Bar w="w-full" h="h-1.5" tone="dark" />
                    <Bar w="w-2/3" h="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[72px] shrink-0 flex flex-col gap-2.5 pt-6">
            <div className="flex flex-col items-start gap-1.5">
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: ACCENT }}
              />
              <Bar w="w-full" h="h-1" />
              <Bar w="w-4/5" h="h-1" />
              <Bar w="w-3/5" h="h-1" />
              <div className={cn(BAR_LIGHT, "w-full h-5 rounded mt-0.5")} />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded" style={{ backgroundColor: ACCENT }} />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <div className={cn(IMG, "w-4 h-4 rounded shrink-0")} />
                  <Bar w="w-full" h="h-1" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5 mt-auto">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-5 w-full rounded border border-[#c4b9f5]/70 bg-transparent"
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "reporter":
      return (
        <div className={cn("flex flex-col gap-2.5 p-3 min-h-0", className)}>
          <div className="flex gap-2.5 shrink-0 items-start">
            <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
              <AccentPill />
              <Bar w="w-full" h="h-2.5" tone="dark" />
              <Bar w="w-4/5" h="h-2" tone="dark" />
              <Bar w="w-2/3" h="h-1.5" />
            </div>
            <div className={cn(IMG, "w-[42%] aspect-[4/3] shrink-0 rounded")} />
          </div>
          <div className="flex gap-2.5 min-h-0">
            <div className="flex-1 min-w-0">
              <BodyParas count={3} lines={4} />
            </div>
            <div className="w-[30%] min-w-[70px] shrink-0 flex flex-col gap-2.5">
              <AuthorBlock />
              <RelatedCard />
              <RelatedCard />
              <RelatedCard />
            </div>
          </div>
        </div>
      );

    case "feature":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <AccentPill />
            <Bar w="w-2/3" h="h-2.5" tone="dark" />
            <Bar w="w-1/2" h="h-2" tone="dark" />
            <AccentDots />
          </div>
          <div className={cn(IMG, "w-full aspect-[3/1] rounded shrink-0")} />
          <div className="flex gap-3 min-h-0 mt-0.5 justify-between">
            <div className="w-[52%] min-w-0">
              <div className="mb-1.5">
                <Bar w="w-10" h="h-1" tone="accent" />
              </div>
              <BodyParas count={3} lines={4} />
            </div>
            <div className="w-[34%] min-w-0 flex flex-col gap-2.5">
              <AuthorBlock />
              <RelatedCard />
              <RelatedCard />
              <RelatedCard />
            </div>
          </div>
        </div>
      );

    case "writer":
      return (
        <div className={cn("flex flex-col gap-2.5 px-7 py-3 min-h-0", className)}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <AccentPill />
            <Bar w="w-3/5" h="h-2.5" tone="dark" />
            <div className="h-0.5 w-10 rounded-full mt-0.5" style={{ backgroundColor: ACCENT }} />
          </div>
          <div className="min-h-0 mt-1">
            <BodyParas count={5} lines={3} />
          </div>
        </div>
      );

    case "story":
      return (
        <div className={cn("flex flex-col gap-3 p-3 min-h-0", className)}>
          <div className="flex gap-3 shrink-0 rounded-md bg-[#1a1a1a] p-3.5">
            <div className={cn(IMG, "w-[40%] aspect-[4/3] shrink-0 rounded")} />
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <AccentPill />
              <Bar w="w-full" h="h-2" tone="white" />
              <Bar w="w-4/5" h="h-2" tone="white" />
              <Bar w="w-3/5" h="h-1.5" tone="white" />
              <AccentDots light />
            </div>
          </div>
          <div className="min-h-0 px-6">
            <BodyParas count={4} lines={4} />
          </div>
        </div>
      );

    case "publisher":
      return (
        <div className={cn("flex flex-col gap-2.5 p-3 min-h-0", className)}>
          <div className="relative shrink-0 overflow-hidden rounded aspect-[3/1] bg-gradient-to-br from-[#bdbcb8] to-[#8f8e8a]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[42%] aspect-[4/3] rounded-lg bg-[#d8d7d3]/90 shadow-sm" />
            </div>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 space-y-1.5 max-w-[28%]">
              <AccentPill />
              <Bar w="w-full" h="h-2" tone="white" />
              <Bar w="w-4/5" h="h-1.5" tone="white" />
            </div>
          </div>
          <div className="flex gap-2.5 min-h-0">
            <div className="flex-1 min-w-0">
              <BodyParas count={3} lines={4} />
            </div>
            <div className="w-[30%] min-w-[70px] shrink-0 flex flex-col gap-2.5">
              <RelatedCard />
              <RelatedCard />
              <RelatedCard />
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

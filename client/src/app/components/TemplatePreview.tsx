import { cn } from "@/app/components/ui/utils";

const imgPlaceholder = "bg-gradient-to-br from-[#d4d3cf] to-[#e5e4e0] rounded overflow-hidden";
const textMuted = "text-[11px] text-[#6b6b6b]";

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

export function TemplatePreview({ previewLayout, className }: TemplatePreviewProps) {
  const layout = previewLayout as PreviewLayout;

  const PostCardMini = ({
    title,
    excerpt,
    compact,
  }: {
    title: string;
    excerpt: string;
    compact?: boolean;
  }) => (
    <div className="rounded-md border border-[#e5e4e0] overflow-hidden bg-white">
      <div className={cn(imgPlaceholder, compact ? "aspect-[4/3]" : "aspect-[16/9]")} />
      <div className={compact ? "p-2 space-y-0" : "p-2.5 space-y-0.5"}>
        <div className="text-[11px] font-semibold text-[#333] line-clamp-1">{title}</div>
        {!compact && <div className={cn(textMuted, "line-clamp-2")}>{excerpt}</div>}
        <div className={cn(textMuted, "text-[10px]")}>Author · Mar 7</div>
      </div>
    </div>
  );

  const ListRow = ({ title, excerpt }: { title: string; excerpt: string }) => (
    <div className="flex gap-2.5 py-2 border-b border-[#e5e4e0] last:border-0">
      <div className={cn(imgPlaceholder, "w-16 h-11 shrink-0 rounded")} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[#333] line-clamp-1">{title}</div>
        <div className={cn(textMuted, "text-[10px] line-clamp-1")}>{excerpt}</div>
        <div className={cn(textMuted, "text-[10px]")}>Author · 6 min</div>
      </div>
    </div>
  );

  const FilterBarTabs = () => (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <span className="text-[11px] font-medium text-[#111] px-2 py-1 border-b-2 border-[#111] -mb-px">All</span>
      <span className={cn(textMuted, "px-2 py-1")}>Category</span>
      <span className={cn(textMuted, "px-2 py-1")}>Tags</span>
    </div>
  );

  const SearchBar = ({ fullWidth }: { fullWidth?: boolean } = {}) => (
    <div className={cn("flex items-center gap-2 py-1.5 px-3 border border-[#e5e4e0] rounded-md bg-white", fullWidth ? "w-full" : "shrink-0")}>
      <span className={cn(textMuted, "text-[11px]")}>🔍</span>
      <span className={cn(textMuted, "text-[11px]")}>Search…</span>
    </div>
  );

  const Pagination = () => (
    <div className="flex items-center justify-center gap-1 py-2 shrink-0">
      <span className="text-[10px] font-medium w-6 h-6 flex items-center justify-center rounded bg-[#5B4FE8] text-white">1</span>
      <span className={cn(textMuted, "text-[10px] w-6 h-6 flex items-center justify-center rounded")}>2</span>
      <span className={cn(textMuted, "text-[10px] w-6 h-6 flex items-center justify-center rounded")}>3</span>
      <span className={cn(textMuted, "text-[10px]")}>…</span>
    </div>
  );

  const InfiniteScrollHint = () => (
    <div className={cn(textMuted, "text-[10px] py-1 text-center")}>Scroll for more</div>
  );

  const EmailCaptureFooter = () => (
    <div className="py-2 px-3 border-t border-[#e5e4e0] shrink-0">
      <div className={cn(textMuted, "text-[11px] font-medium mb-1")}>Subscribe to our newsletter</div>
      <div className="flex gap-2">
        <div className="flex-1 h-6 rounded border border-[#e5e4e0] bg-white" />
        <div className="w-16 h-6 rounded bg-[#5B4FE8]" />
      </div>
    </div>
  );

  switch (layout) {
    case "masthead":
      return (
        <div className={cn("flex flex-col gap-3 p-4 text-[11px] min-h-0", className)}>
          <div className="flex flex-col gap-2 shrink-0">
            <div className={cn(imgPlaceholder, "h-20 w-full rounded flex items-end p-3")}>
              <div>
                <span className="text-[10px] text-white/70">Featured</span>
                <div className="text-white font-bold text-[12px] line-clamp-1">Featured Post Headline Goes Here</div>
                <div className="text-white/80 text-[10px]">By Author · Mar 7 · 8 min</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap border-b border-[#e5e4e0] pb-2">
              <span className="text-[11px] font-medium text-[#111] px-2 py-1 border-b-2 border-[#111] -mb-px">All</span>
              <span className={cn(textMuted, "px-2 py-1")}>Category</span>
              <span className={cn(textMuted, "px-2 py-1")}>Tags</span>
              <span className={cn(textMuted, "text-[10px]")}>Sort ▾</span>
              <SearchBar />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 min-h-0">
            <PostCardMini title="Why Every AI Benchmark Is Lying" excerpt="The metrics look impressive." compact />
            <PostCardMini title="Quiet Automation Tools Saving Time" excerpt="Unglamorous workflows." compact />
            <PostCardMini title="Productivity Industrial Complex" excerpt="We're working more hours." compact />
          </div>
          <EmailCaptureFooter />
        </div>
      );
    case "newsroom":
      return (
        <div className={cn("flex flex-col gap-2 p-4 min-h-0", className)}>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-[12px] font-semibold text-[#333]">Blog Title</div>
            <SearchBar fullWidth />
            <div className="flex items-center justify-between gap-2">
              <FilterBarTabs />
              <span className={cn(textMuted, "text-[10px] shrink-0")}>Sort ▾</span>
            </div>
          </div>
          <div className="space-y-0 min-h-0">
            <ListRow title="The Featured Article Headline Goes Here" excerpt="A short excerpt or deck giving the reader context." />
            <ListRow title="Second Article With a Punchy Headline" excerpt="Short excerpt previewing the content." />
            <ListRow title="Third Post — List Format Shows More" excerpt="Short excerpt previewing the content." />
          </div>
          <InfiniteScrollHint />
        </div>
      );
    case "digest":
      return (
        <div className={cn("flex gap-3 p-3 min-w-0", className)}>
          <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
            <div className="text-[11px] font-semibold text-[#333] shrink-0">Blog Title</div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <FilterBarTabs />
              <SearchBar />
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <div className={cn(imgPlaceholder, "w-full rounded h-14")} />
              <div>
                <div className="text-[9px] text-[#6b6b6b]">Featured</div>
                <div className="text-[11px] font-bold text-[#333] line-clamp-1">The Complete Guide to Headlines</div>
                <div className={cn(textMuted, "text-[9px]")}>By Author · Mar 7 · 12 min</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 min-h-0">
              <PostCardMini title="Article One" excerpt="Short excerpt." compact />
              <PostCardMini title="Article Two" excerpt="Short excerpt." compact />
              <PostCardMini title="Article Three" excerpt="Short excerpt." compact />
              <PostCardMini title="Article Four" excerpt="Short excerpt." compact />
            </div>
            <Pagination />
          </div>
          <div className="w-[30%] min-w-[100px] shrink-0 flex flex-col gap-1 py-1.5 pl-2 border-l border-[#e5e4e0]">
            <div className={cn(textMuted, "font-medium text-[10px] uppercase")}>Search</div>
            <div className="h-6 rounded border border-[#e5e4e0] bg-white" />
            <div className={cn(textMuted, "font-medium text-[10px] uppercase mt-1")}>Newsletter</div>
            <div className={cn(textMuted, "text-[10px]")}>Subscribe</div>
            <div className={cn(textMuted, "font-medium text-[10px] uppercase mt-1")}>Trending</div>
            <div className={cn(textMuted, "text-[10px]")}>Post 1</div>
            <div className={cn(textMuted, "text-[10px]")}>Post 2</div>
            <div className={cn(textMuted, "font-medium text-[10px] uppercase mt-1")}>Filters</div>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#e5e4e0] text-[#333]">All</span>
              <span className={cn(textMuted, "text-[10px] px-2 py-1 rounded-full border border-[#e5e4e0]")}>Cat</span>
            </div>
          </div>
        </div>
      );
    case "showcase":
      return (
        <div className={cn("flex flex-col gap-3 p-4 min-h-0", className)}>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-[12px] font-semibold text-[#333]">Blog Title</div>
            <SearchBar fullWidth />
            <div className="flex items-center justify-between gap-2">
              <FilterBarTabs />
              <span className={cn(textMuted, "text-[10px] shrink-0")}>Sort ▾</span>
            </div>
          </div>
          <div className="space-y-3 min-h-0">
            <div className="flex gap-3 items-center">
              <div className={cn(imgPlaceholder, "flex-[0_0_60%] aspect-[4/3] shrink-0 rounded")} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#333] line-clamp-1">Featured Post Title</div>
                <div className={cn(textMuted, "text-[10px] line-clamp-1")}>Short excerpt here.</div>
              </div>
            </div>
            <div className="flex gap-3 items-center flex-row-reverse">
              <div className={cn(imgPlaceholder, "flex-[0_0_60%] aspect-[4/3] shrink-0 rounded")} />
              <div className="flex-1 min-w-0 text-right">
                <div className="text-[11px] font-semibold text-[#333] line-clamp-1">Second Post Title</div>
                <div className={cn(textMuted, "text-[10px] line-clamp-1")}>Short excerpt here.</div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <div className={cn(imgPlaceholder, "flex-[0_0_60%] aspect-[4/3] shrink-0 rounded")} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#333] line-clamp-1">Third Post Title</div>
                <div className={cn(textMuted, "text-[10px] line-clamp-1")}>Short excerpt here.</div>
              </div>
            </div>
          </div>
          <InfiniteScrollHint />
        </div>
      );
    case "editorial":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-[11px] font-semibold text-[#333]">Blog Title</div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <FilterBarTabs />
              <SearchBar />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-h-0">
            <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 2fr" }}>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden", imgPlaceholder)}>
                <div className="aspect-[3/2]" />
                <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
              </div>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden", imgPlaceholder)}>
                <div className="aspect-[3/2]" />
                <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
              </div>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "2fr 1fr" }}>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden", imgPlaceholder)}>
                <div className="aspect-[3/2]" />
                <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
              </div>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden", imgPlaceholder)}>
                <div className="aspect-[3/2]" />
                <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
              </div>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 2fr" }}>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden", imgPlaceholder)}>
                <div className="aspect-[3/2]" />
                <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
              </div>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden", imgPlaceholder)}>
                <div className="aspect-[3/2]" />
                <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
              </div>
            </div>
          </div>
          <Pagination />
        </div>
      );
    case "feature":
      return (
        <div className={cn("flex gap-4 p-4 min-h-0", className)}>
          <div className="w-[22%] min-w-[100px] shrink-0 py-1 space-y-0.5">
            <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>In this article</div>
            <div className={cn(textMuted, "text-[10px]")}>Introduction</div>
            <div className="text-[10px] font-medium text-[#333] border-l-2 border-[#5B4FE8] pl-1">Section One</div>
            <div className={cn(textMuted, "text-[10px]")}>Section Two</div>
            <div className={cn(textMuted, "text-[10px]")}>Conclusion</div>
          </div>
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className={cn(imgPlaceholder, "h-16 w-full rounded")} />
            <div className="space-y-1">
              <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-11/12" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-4/5" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-3/4" />
            </div>
          </div>
          <div className="w-[22%] min-w-[100px] shrink-0 py-1 space-y-2">
            <div>
              <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>About the author</div>
              <div className="flex gap-1.5 mt-0.5">
                <div className={cn(imgPlaceholder, "w-7 h-7 rounded-full shrink-0")} />
                <div className="text-[10px] font-medium">Author Name</div>
              </div>
              <div className={cn(textMuted, "text-[9px] line-clamp-2 mt-0.5")}>Short bio here.</div>
            </div>
            <div>
              <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>Related</div>
              <div className={cn(textMuted, "text-[10px] line-clamp-1 mt-0.5")}>Related post title</div>
              <div className={cn(textMuted, "text-[10px] line-clamp-1")}>Another related</div>
            </div>
          </div>
        </div>
      );
    case "publisher":
    case "reporter":
    case "story":
    case "writer":
    default:
      return (
        <div className={cn("flex gap-4 p-4 min-h-0", className)}>
          <div className="w-[22%] min-w-[100px] shrink-0 py-1 space-y-2">
            <div>
              <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>Contents</div>
              <div className={cn(textMuted, "text-[10px] mt-0.5")}>Section one</div>
              <div className={cn(textMuted, "text-[10px]")}>Section two</div>
            </div>
            <div>
              <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>Related</div>
              <div className={cn(textMuted, "text-[10px] line-clamp-1 mt-0.5")}>Related post</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className={cn(imgPlaceholder, "h-12 w-2/3 rounded")} />
            <div className="text-[11px] font-bold text-[#333]">Article Headline Goes Here</div>
            <div className={cn(textMuted, "text-[10px]")}>By Author · Mar 7, 2026 · 8 min read</div>
            <div className="space-y-1 mt-1">
              <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-5/6" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-3/4" />
            </div>
          </div>
        </div>
      );
  }
}

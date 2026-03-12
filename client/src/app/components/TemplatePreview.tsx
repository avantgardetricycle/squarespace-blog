import { cn } from "@/app/components/ui/utils";

const imgPlaceholder = "bg-gradient-to-br from-[#d4d3cf] to-[#e5e4e0] rounded-sm overflow-hidden";
const textMuted = "text-[10px] text-[#6b6b6b]";

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
    <div className="rounded border border-[#e5e4e0] overflow-hidden bg-white">
      <div className={cn(imgPlaceholder, compact ? "aspect-[4/3]" : "aspect-[16/9]")} />
      <div className={compact ? "p-1 space-y-0" : "p-1.5 space-y-0.5"}>
        <div className="text-[9px] font-semibold text-[#333] line-clamp-1">{title}</div>
        {!compact && <div className={cn(textMuted, "line-clamp-2")}>{excerpt}</div>}
        <div className={cn(textMuted, "text-[8px]")}>Author · Mar 7</div>
      </div>
    </div>
  );

  const ListRow = ({ title, excerpt }: { title: string; excerpt: string }) => (
    <div className="flex gap-1.5 py-1 border-b border-[#e5e4e0] last:border-0">
      <div className={cn(imgPlaceholder, "w-10 h-7 shrink-0 rounded")} />
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-semibold text-[#333] line-clamp-1">{title}</div>
        <div className={cn(textMuted, "text-[7px] line-clamp-1")}>{excerpt}</div>
        <div className={cn(textMuted, "text-[7px]")}>Author · 6 min</div>
      </div>
    </div>
  );

  const FilterBar = () => (
    <div className="flex items-center gap-1 py-0.5 border-b border-[#e5e4e0] shrink-0">
      <span className="text-[9px] font-medium text-[#111] px-1.5 py-0.5 border-b-2 border-[#111]">All</span>
      <span className={cn(textMuted, "px-1.5")}>Category</span>
      <span className={cn(textMuted, "px-1.5")}>Tags</span>
      <span className={cn(textMuted, "ml-auto text-[8px]")}>Sort ▾</span>
    </div>
  );

  const SearchBar = () => (
    <div className="flex items-center gap-1.5 py-1 px-2 border border-[#e5e4e0] rounded bg-white">
      <span className={cn(textMuted, "text-[9px]")}>🔍</span>
      <span className={cn(textMuted, "text-[9px]")}>Search articles…</span>
    </div>
  );

  switch (layout) {
    case "masthead":
      return (
        <div className={cn("flex flex-col gap-1.5 p-2 text-[9px]", className)}>
          <div className={cn(imgPlaceholder, "h-10 w-full shrink-0 rounded")} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] text-[#6b6b6b] font-medium uppercase">Category</span>
            <div className="font-bold text-[8px] text-[#111] line-clamp-1">Featured Post Headline Goes Here</div>
            <div className="text-[7px] text-[#6b6b6b]">By Author · Mar 7 · 8 min</div>
          </div>
          <FilterBar />
          <div className="grid grid-cols-3 gap-1.5 min-h-0">
            <PostCardMini title="Why Every AI Benchmark Is Lying" excerpt="The metrics look impressive." compact />
            <PostCardMini title="Quiet Automation Tools Saving Time" excerpt="Unglamorous workflows." compact />
            <PostCardMini title="Productivity Industrial Complex" excerpt="We're working more hours." compact />
          </div>
        </div>
      );
    case "newsroom":
      return (
        <div className={cn("flex flex-col gap-1 p-2", className)}>
          <SearchBar />
          <div className="space-y-0 min-h-0">
            <ListRow title="The Featured Article Headline Goes Here" excerpt="A short excerpt or deck giving the reader context to decide whether to click." />
            <ListRow title="Second Article With a Punchy Headline" excerpt="Short excerpt previewing the content without giving it all away." />
            <ListRow title="Third Post — List Format Shows More" excerpt="Short excerpt previewing the content without giving it all away." />
          </div>
        </div>
      );
    case "digest":
      return (
        <div className={cn("flex gap-1.5 p-2", className)}>
          <div className="flex-1 flex flex-col gap-1.5 min-h-0">
            <div className={cn(imgPlaceholder, "h-10 w-full rounded flex items-end p-1.5 shrink-0")}>
              <div>
                <div className="text-[7px] text-white/70">Featured</div>
                <div className="text-white font-bold text-[8px] line-clamp-1">The Complete Guide to Headlines</div>
                <div className="text-white/80 text-[7px]">By Author · Mar 7 · 12 min</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 min-h-0">
              <PostCardMini title="Article One" excerpt="Short excerpt." compact />
              <PostCardMini title="Article Two" excerpt="Short excerpt." compact />
              <PostCardMini title="Article Three" excerpt="Short excerpt." compact />
              <PostCardMini title="Article Four" excerpt="Short excerpt." compact />
            </div>
          </div>
          <div className="w-7 shrink-0 flex flex-col gap-0.5 py-0.5 border-l border-[#e5e4e0] pl-1.5">
            <div className={cn(textMuted, "font-medium text-[7px] uppercase")}>Filter</div>
            <div className={cn(textMuted, "text-[7px]")}>All</div>
            <div className={cn(textMuted, "text-[7px]")}>Category</div>
            <div className={cn(textMuted, "font-medium text-[7px] uppercase mt-0.5")}>Search</div>
          </div>
        </div>
      );
    case "showcase":
      return (
        <div className={cn("flex flex-col gap-1.5 p-2", className)}>
          <div className="flex gap-1.5">
            <div className={cn("flex-1 rounded border border-[#e5e4e0] overflow-hidden min-w-0", imgPlaceholder)}>
              <div className="aspect-[2/1] flex items-end p-1.5">
                <div className="text-white text-[8px] font-bold line-clamp-1">Featured Post Title</div>
              </div>
            </div>
            <div className="w-1/3 min-w-0 rounded border border-[#e5e4e0] overflow-hidden">
              <div className={cn(imgPlaceholder, "aspect-[4/3]")} />
              <div className="p-0.5 text-[7px] font-medium line-clamp-1">Post title</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-1/3 min-w-0 rounded border border-[#e5e4e0] overflow-hidden">
              <div className={cn(imgPlaceholder, "aspect-[4/3]")} />
              <div className="p-0.5 text-[7px] font-medium line-clamp-1">Post title</div>
            </div>
            <div className={cn("flex-1 rounded border border-[#e5e4e0] overflow-hidden min-w-0", imgPlaceholder)}>
              <div className="aspect-[2/1] flex items-end p-1.5">
                <div className="text-white text-[8px] font-bold line-clamp-1">Featured Post Title</div>
              </div>
            </div>
          </div>
        </div>
      );
    case "editorial":
      return (
        <div className={cn("flex flex-col gap-1.5 p-2", className)}>
          <FilterBar />
          <div className="grid grid-cols-3 gap-1.5 min-h-0">
            <PostCardMini title="Why AI Benchmarks Lie" excerpt="The metrics look impressive." compact />
            <PostCardMini title="Automation Tools That Stick" excerpt="Unglamorous workflows." compact />
            <PostCardMini title="Productivity Complex Failed" excerpt="We're working more hours." compact />
            <PostCardMini title="Second Brain on a Budget" excerpt="A system that costs nothing." compact />
            <PostCardMini title="Google's Quiet Retreat" excerpt="Reading between the lines." compact />
            <PostCardMini title="Startup Rebuilding Newsletters" excerpt="Nobody noticed the pivot." compact />
          </div>
        </div>
      );
    case "feature":
      return (
        <div className={cn("flex gap-2 p-3", className)}>
          <div className="w-12 shrink-0 py-1 space-y-0.5">
            <div className={cn(textMuted, "text-[7px] font-medium uppercase")}>In this article</div>
            <div className={cn(textMuted, "text-[8px]")}>Introduction</div>
            <div className="text-[8px] font-medium text-[#333] border-l-2 border-[#5B4FE8] pl-1">Section One</div>
            <div className={cn(textMuted, "text-[8px]")}>Section Two</div>
            <div className={cn(textMuted, "text-[8px]")}>Conclusion</div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <div className={cn(imgPlaceholder, "h-10 w-full rounded")} />
            <div className="space-y-1">
              <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-11/12" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-4/5" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
              <div className="h-1.5 bg-[#e5e4e0] rounded w-3/4" />
            </div>
          </div>
          <div className="w-14 shrink-0 py-1 space-y-2">
            <div>
              <div className={cn(textMuted, "text-[7px] font-medium uppercase")}>About the author</div>
              <div className="flex gap-1 mt-0.5">
                <div className={cn(imgPlaceholder, "w-5 h-5 rounded-full shrink-0")} />
                <div className="text-[8px] font-medium">Author Name</div>
              </div>
              <div className={cn(textMuted, "text-[7px] line-clamp-2 mt-0.5")}>Short bio here.</div>
            </div>
            <div>
              <div className={cn(textMuted, "text-[7px] font-medium uppercase")}>Related</div>
              <div className={cn(textMuted, "text-[8px] line-clamp-1 mt-0.5")}>Related post title</div>
              <div className={cn(textMuted, "text-[8px] line-clamp-1")}>Another related</div>
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
        <div className={cn("flex gap-2 p-3", className)}>
          <div className="w-12 shrink-0 py-1 space-y-2">
            <div>
              <div className={cn(textMuted, "text-[7px] font-medium uppercase")}>Contents</div>
              <div className={cn(textMuted, "text-[8px] mt-0.5")}>Section one</div>
              <div className={cn(textMuted, "text-[8px]")}>Section two</div>
            </div>
            <div>
              <div className={cn(textMuted, "text-[7px] font-medium uppercase")}>Related</div>
              <div className={cn(textMuted, "text-[8px] line-clamp-1 mt-0.5")}>Related post</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className={cn(imgPlaceholder, "h-8 w-2/3 rounded")} />
            <div className="text-[9px] font-bold text-[#333]">Article Headline Goes Here</div>
            <div className={cn(textMuted, "text-[8px]")}>By Author · Mar 7, 2026 · 8 min read</div>
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

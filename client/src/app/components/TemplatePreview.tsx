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
        <div className={cn(textMuted, "text-[10px]")}>Author · Mar 7 · 5 min</div>
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

  const SortMini = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={cn(textMuted, "text-[10px] font-medium")}>Sort</span>
      <span className="text-[10px] text-[#333] px-2 py-1 rounded border border-[#e5e4e0] bg-white">Date</span>
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

  const Breadcrumbs = ({ align = "left", light }: { align?: "left" | "center"; light?: boolean } = {}) => (
    <div className={cn("text-[9px]", align === "center" ? "text-center" : "")}>
      <span className={light ? "text-white/80" : textMuted}>Home › Blog › </span>
      <span className={light ? "text-white" : "text-[#333]"}>Article</span>
    </div>
  );

  const AuthorProfile = () => (
    <div>
      <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>About the author</div>
      <div className="flex gap-1.5 mt-0.5">
        <div className={cn(imgPlaceholder, "w-6 h-6 rounded-full shrink-0")} />
        <div className="text-[10px] font-medium">Author Name</div>
      </div>
      <div className={cn(textMuted, "text-[9px] line-clamp-2 mt-0.5")}>Short bio here.</div>
    </div>
  );

  const AuthorProfileLong = () => (
    <div>
      <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>About the author</div>
      <div className="flex gap-2 mt-0.5">
        <div className={cn(imgPlaceholder, "w-10 h-10 rounded-full shrink-0")} />
        <div>
          <div className="text-[10px] font-medium">Author Name</div>
          <div className={cn(textMuted, "text-[9px] mt-0.5 line-clamp-3")}>Longer author bio with more detail about their background and expertise.</div>
        </div>
      </div>
    </div>
  );

  const RelatedPosts = () => (
    <div>
      <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>Related</div>
      <div className={cn(textMuted, "text-[9px] mt-0.5 space-y-0.5")}>
        <div className="line-clamp-1">Related post title</div>
        <div className="line-clamp-1">Another related</div>
      </div>
    </div>
  );

  const MoreToRead = () => (
    <div>
      <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>More to read</div>
      <div className={cn(textMuted, "text-[9px] mt-0.5 space-y-0.5")}>
        <div className="line-clamp-1">Related post title</div>
        <div className="line-clamp-1">Another related</div>
      </div>
    </div>
  );

  const LeadMagnet = () => (
    <div>
      <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>Lead magnet</div>
      <div className={cn(textMuted, "text-[9px] mt-0.5")}>Free resource</div>
    </div>
  );

  const PopularPosts = () => (
    <div>
      <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>Popular this week</div>
      <div className={cn(textMuted, "text-[9px] mt-0.5 space-y-0.5")}>
        <div className="line-clamp-1">Popular post 1</div>
        <div className="line-clamp-1">Popular post 2</div>
      </div>
    </div>
  );

  const BodyParas = () => (
    <div className="space-y-1">
      <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
      <div className="h-1.5 bg-[#e5e4e0] rounded w-11/12" />
      <div className="h-1.5 bg-[#e5e4e0] rounded w-4/5" />
      <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
      <div className="h-1.5 bg-[#e5e4e0] rounded w-3/4" />
    </div>
  );

  const BodyParasLong = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-11/12" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-4/5" />
      </div>
      <div className="space-y-1">
        <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-5/6" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-3/4" />
      </div>
      <div className="space-y-1">
        <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-11/12" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-2/3" />
      </div>
      <div className="space-y-1">
        <div className="h-1.5 bg-[#e5e4e0] rounded w-full" />
        <div className="h-1.5 bg-[#e5e4e0] rounded w-4/5" />
      </div>
    </div>
  );

  const PrevNextButtons = () => (
    <div className="flex justify-between gap-2 pt-2 border-t border-[#e5e4e0]">
      <span className={cn(textMuted, "text-[9px]")}>← Previous</span>
      <span className={cn(textMuted, "text-[9px]")}>Next →</span>
    </div>
  );

  const FilterBarTags = () => (
    <div className="flex flex-wrap gap-1">
      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#e5e4e0] text-[#333]">All</span>
      <span className={cn(textMuted, "text-[9px] px-2 py-0.5 rounded-full border border-[#e5e4e0]")}>Cat</span>
      <span className={cn(textMuted, "text-[9px] px-2 py-0.5 rounded-full border border-[#e5e4e0]")}>Tag</span>
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
            <div className="flex flex-wrap items-center gap-2 border-b border-[#e5e4e0] pb-2">
              <FilterBarTabs />
              <span className={cn(textMuted, "text-[10px] shrink-0")}>Sort ▾</span>
              <SearchBar />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 min-h-0">
            <PostCardMini title="Why Every AI Benchmark Is Lying" excerpt="The metrics look impressive." compact />
            <PostCardMini title="Quiet Automation Tools Saving Time" excerpt="Unglamorous workflows." compact />
            <PostCardMini title="Productivity Industrial Complex" excerpt="We're working more hours." compact />
          </div>
          <InfiniteScrollHint />
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
                <div className={cn(textMuted, "text-[9px] line-clamp-2")}>
                  A short excerpt on the featured article only.
                </div>
                <div className={cn(textMuted, "text-[9px]")}>By Author · Mar 7 · 12 min</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 min-h-0">
              <PostCardMini title="Article One" excerpt="" compact />
              <PostCardMini title="Article Two" excerpt="" compact />
              <PostCardMini title="Article Three" excerpt="" compact />
              <PostCardMini title="Article Four" excerpt="" compact />
            </div>
            <Pagination />
          </div>
          <div className="w-[30%] min-w-[100px] shrink-0 flex flex-col gap-1 py-1.5 pl-2 border-l border-[#e5e4e0]">
            <div className={cn(textMuted, "font-medium text-[10px] uppercase")}>Newsletter</div>
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
            <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
              <FilterBarTabs />
              <SortMini />
              <SearchBar />
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
          {/* Mobile (below md): alternating full-width row, then two equal columns — same as live renderer */}
          <div className="flex md:hidden flex-col gap-1 min-h-0">
            <div className={cn("rounded border border-[#e5e4e0] overflow-hidden aspect-[2/1]", imgPlaceholder)}>
              <div className="h-full min-h-[48px]" />
              <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
            </div>
            <div className="grid grid-cols-2 gap-1 aspect-[2/1] min-h-0">
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden min-h-0", imgPlaceholder)}>
                <div className="h-full min-h-[40px]" />
                <div className="p-1 text-[8px] font-medium line-clamp-1">Post</div>
              </div>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden min-h-0", imgPlaceholder)}>
                <div className="h-full min-h-[40px]" />
                <div className="p-1 text-[8px] font-medium line-clamp-1">Post</div>
              </div>
            </div>
            <div className={cn("rounded border border-[#e5e4e0] overflow-hidden aspect-[2/1]", imgPlaceholder)}>
              <div className="h-full min-h-[48px]" />
              <div className="p-1.5 text-[9px] font-medium line-clamp-1">Post title</div>
            </div>
            <div className="grid grid-cols-2 gap-1 aspect-[2/1] min-h-0">
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden min-h-0", imgPlaceholder)}>
                <div className="h-full min-h-[40px]" />
                <div className="p-1 text-[8px] font-medium line-clamp-1">Post</div>
              </div>
              <div className={cn("rounded border border-[#e5e4e0] overflow-hidden min-h-0", imgPlaceholder)}>
                <div className="h-full min-h-[40px]" />
                <div className="p-1 text-[8px] font-medium line-clamp-1">Post</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col gap-1.5 min-h-0">
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
    case "reporter":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="flex gap-3 shrink-0">
            <div className="flex-1 min-w-0">
              <Breadcrumbs align="left" />
              <div className="text-[11px] font-bold text-[#333] mt-0.5">Article Headline Goes Here</div>
              <div className={cn(textMuted, "text-[9px] mt-0.5 line-clamp-2")}>
                A short subheading or deck that adds context to the headline.
              </div>
              <div className="border-t border-[#ddd] pt-1 mt-1">
                <div className={cn(textMuted, "text-[9px]")}>By Author · Mar 7 · 8 min</div>
              </div>
            </div>
            <div className={cn(imgPlaceholder, "w-[60%] aspect-[3/2] shrink-0 rounded")} />
          </div>
          <div className="flex gap-3 min-h-0 mt-2">
            <div className="flex-1 min-w-0">
              <BodyParas />
            </div>
            <div className="w-[28%] min-w-[80px] shrink-0 flex flex-col gap-2 py-1 pl-2 border-l border-[#e5e4e0] space-y-2">
              <AuthorProfile />
              <RelatedPosts />
            </div>
          </div>
          <div className="border-t border-[#e5e4e0] pt-2 pl-3 flex flex-col gap-2 shrink-0">
            <AuthorProfile />
            <RelatedPosts />
            <LeadMagnet />
          </div>
        </div>
      );
    case "publisher":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className={cn("relative shrink-0 overflow-hidden rounded", imgPlaceholder)}>
            <div className="aspect-[5/2] w-full" />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent rounded-b">
              <div className="text-[10px] text-white/90 font-bold">Article Headline Goes Here</div>
              <div className="text-[9px] text-white/80 mt-0.5">By Author · Mar 7 · 8 min</div>
            </div>
          </div>
          <div className="flex gap-3 min-h-0 mt-2">
            <div className="flex-1 min-w-0">
              <BodyParas />
            </div>
            <div className="w-[28%] min-w-[80px] shrink-0 flex flex-col gap-2 py-1 pl-2 border-l border-[#e5e4e0] space-y-2">
              <PopularPosts />
              <RelatedPosts />
              <div>
                <div className={cn(textMuted, "text-[9px] font-medium uppercase mb-0.5")}>Filters</div>
                <FilterBarTags />
              </div>
            </div>
          </div>
          <div className="border-t border-[#e5e4e0] pt-2 pl-3 flex flex-col gap-2 shrink-0">
            <AuthorProfileLong />
            <MoreToRead />
            <LeadMagnet />
          </div>
        </div>
      );
    case "writer":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <Breadcrumbs align="center" />
            <div className={cn(textMuted, "text-[9px]")}>Category</div>
            <div className="text-[11px] font-bold text-[#333]">Article Headline Goes Here</div>
            <div className={cn(textMuted, "text-[9px]")}>By Author · Mar 7 · 8 min</div>
          </div>
          <div className="min-h-0 mt-2">
            <BodyParasLong />
          </div>
          <div className="border-t border-[#e5e4e0] pt-2 pl-3 shrink-0">
            <AuthorProfile />
          </div>
          <PrevNextButtons />
        </div>
      );
    case "feature":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <Breadcrumbs align="center" />
            <div className="text-[11px] font-bold text-[#333]">Article Headline Goes Here</div>
            <div className={cn(textMuted, "text-[9px]")}>By Author · Mar 7 · 8 min</div>
          </div>
          <div className={cn(imgPlaceholder, "w-full aspect-[5/2] rounded shrink-0")} />
          <div className="flex gap-3 min-h-0 mt-2">
            <div className="w-[20%] min-w-[70px] shrink-0 py-1 space-y-0.5">
              <div className={cn(textMuted, "text-[9px] font-medium uppercase")}>In this article</div>
              <div className={cn(textMuted, "text-[9px]")}>Introduction</div>
              <div className="text-[9px] font-medium text-[#333] border-l-2 border-[#5B4FE8] pl-1">Section One</div>
              <div className={cn(textMuted, "text-[9px]")}>Section Two</div>
              <div className={cn(textMuted, "text-[9px]")}>Conclusion</div>
            </div>
            <div className="flex-1 min-w-0">
              <BodyParas />
            </div>
            <div className="w-[24%] min-w-[80px] shrink-0 flex flex-col gap-2 py-1 pl-2 border-l border-[#e5e4e0] space-y-2">
              <AuthorProfile />
              <RelatedPosts />
              <PopularPosts />
            </div>
          </div>
          <div className="border-t border-[#e5e4e0] pt-2 pl-3 flex flex-col gap-2 shrink-0">
            <AuthorProfile />
            <MoreToRead />
            <LeadMagnet />
          </div>
        </div>
      );
    case "story":
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="flex gap-3 shrink-0 rounded-md bg-[#1a1a1a] p-2.5">
            <div className={cn(imgPlaceholder, "w-[42%] aspect-[3/2] shrink-0 rounded")} />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <Breadcrumbs align="left" light />
              <div className="text-[11px] font-bold text-white mt-1">Article Headline Goes Here</div>
              <div className="text-[9px] text-white/70 mt-0.5">By Author · Mar 7 · 8 min</div>
            </div>
          </div>
          <div className="min-h-0 mt-2 max-w-[70%] mx-auto w-full">
            <BodyParas />
          </div>
          <div className="border-t border-[#e5e4e0] pt-2 pl-3 flex flex-col gap-2 shrink-0 max-w-[70%] mx-auto w-full">
            <AuthorProfile />
            <LeadMagnet />
          </div>
        </div>
      );
    default:
      return (
        <div className={cn("flex flex-col gap-2 p-3 min-h-0", className)}>
          <div className="text-[11px] font-bold text-[#333]">Article Headline</div>
          <BodyParas />
        </div>
      );
  }
}

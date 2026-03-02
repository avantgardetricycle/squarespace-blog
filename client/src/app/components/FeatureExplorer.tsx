import { useState } from "react";
import { cn } from "@/app/components/ui/utils";

interface FeatureData {
  name: string;
  desc: string;
  badge: string;
  bc: string;
}

const featureData: Record<string, FeatureData> = {
  sidebars: {
    name: "Sidebars",
    desc: "Add a sidebar to the left, right, or both sides of your blog. Surface recent posts, categories, a newsletter signup, author bio — or anything you need. No code required.",
    badge: "Layout & Design",
    bc: "badge-layout",
  },
  "header-image": {
    name: "Header Image Formatting",
    desc: "Full control over post header images — size, crop, position, and style. Make every post feel intentional, not assembled by a template.",
    badge: "Layout & Design",
    bc: "badge-layout",
  },
  templates: {
    name: "Template Layouts",
    desc: "Choose from professionally designed blog layouts — or customize your own. Apply sitewide or per post. Your blog, your design.",
    badge: "Layout & Design",
    bc: "badge-layout",
  },
  collection: {
    name: "Collection Formatting",
    desc: "Every blog collection can have its own unique layout — grid, list, or card stack. Full design control, per collection, independently.",
    badge: "Layout & Design",
    bc: "badge-layout",
  },
  toc: {
    name: "Table of Contents",
    desc: "Auto-generate a table of contents from your post headings. Lives in the sidebar, updates as readers scroll — essential for long-form content.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  filters: {
    name: "Tags & Category Filters",
    desc: "Give readers real filtering power — by tag, category, or both. Let them find exactly what's relevant to them.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  recent: {
    name: "Recent Posts",
    desc: "Surface your latest content automatically — in the sidebar, at the end of a post, or wherever you need it. Keep readers in your archive.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  related: {
    name: "Related Posts",
    desc: "Automatically show readers what to read next, based on tags and categories. More time on site, less work for you.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  breadcrumbs: {
    name: "Breadcrumbs",
    desc: "Show readers exactly where they are and give them an easy path back. A small detail that makes a real difference to navigation and SEO.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  pagination: {
    name: "Pagination",
    desc: "Replace Squarespace's bare arrows with real pagination — numbered pages and post counts that tell readers exactly where they are in your archive.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  "social-sharing": {
    name: "Social Sharing",
    desc: "One-click sharing to X, Facebook, Pinterest, Reddit, WhatsApp, LinkedIn, and copy-to-clipboard. Makes it effortless for readers to spread your content — which means more traffic and more reach.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  progress: {
    name: "Scroll Progress Bar",
    desc: "A thin bar across the top of every post that fills as readers scroll. Subtle, satisfying, and a quiet nudge to keep going. The kind of polish readers feel without noticing.",
    badge: "Reader Experience",
    bc: "badge-reader",
  },
  "reading-time": {
    name: "Reading Time",
    desc: "Auto-calculate and display estimated reading time on every post and post card. Sets expectations before readers click in — and gives them one more reason to.",
    badge: "Reader Experience",
    bc: "badge-reader",
  },
  search: {
    name: "Post Search",
    desc: "Give readers a real search bar for your blog. Full-text search across all your posts, with results and keyword highlights — so nothing you've written ever gets lost.",
    badge: "Navigation & Discovery",
    bc: "badge-nav",
  },
  sorting: {
    name: "Advanced Post Sorting",
    desc: "Let readers sort your blog by newest, oldest, most popular, or alphabetically. Simple controls, immediate results — the kind of thing that makes a blog feel like a real publication.",
    badge: "Publishing & Management",
    bc: "badge-pub",
  },
  featured: {
    name: "Featured & Pinned Posts",
    desc: "Mark any post as Featured and it'll appear at the top of your blog as a hero, no matter when it was published. Pin posts to keep them at the top of the archive. Total control over what readers see first.",
    badge: "Publishing & Management",
    bc: "badge-pub",
  },
  authors: {
    name: "Multiple Authors",
    desc: "Publish posts under any author name. Add multiple authors to a single post, or assign different contributors across your blog — no workarounds needed.",
    badge: "Publishing & Management",
    bc: "badge-pub",
  },
  "author-profiles": {
    name: "Author Profiles",
    desc: "Display a rich author profile in the sidebar of every post — name, photo, bio, and social links. Builds trust with readers and keeps your publication feeling professional.",
    badge: "Publishing & Management",
    bc: "badge-pub",
  },
  "post-footer": {
    name: "Post Footer Block",
    desc: "A custom block that appears automatically at the bottom of every post — above the footer, after pagination. Set it once, show it everywhere.",
    badge: "Publishing & Management",
    bc: "badge-pub",
  },
};

export function FeatureExplorer() {
  const [activeFeature, setActiveFeature] = useState("sidebars");

  const currentFeature = featureData[activeFeature];

  const badgeClass = {
    "badge-layout": "bg-[rgba(91,79,232,0.07)] text-[#5B4FE8]",
    "badge-nav": "bg-[rgba(26,122,94,0.07)] text-[#1a7a5e]",
    "badge-reader": "bg-[rgba(154,26,62,0.06)] text-[#9a1a3e]",
    "badge-pub": "bg-[rgba(122,74,26,0.06)] text-[#7a4a1a]",
  }[currentFeature.bc];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-[1140px] mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-[10px] text-[0.62rem] font-semibold tracking-[0.22em] uppercase text-[#5B4FE8] mb-4">
              <span className="w-[28px] h-[1.5px] bg-[#5B4FE8] opacity-40 rounded-[2px]"></span>
              Feature Explorer
              <span className="w-[28px] h-[1.5px] bg-[#5B4FE8] opacity-40 rounded-[2px]"></span>
            </div>
            <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-0.025em] text-[#0a0a0a] leading-[1.15] mb-4">
              See it in <em className="italic text-[#5B4FE8]">action.</em>
            </h2>
            <p className="text-[0.95rem] text-[#6b6b6b] font-light leading-[1.75] max-w-[480px] mx-auto">
              Click any feature to see what BetterBlog makes possible on your Squarespace blog.
            </p>
          </div>

          {/* Explorer */}
          <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] rounded-2xl overflow-hidden border border-[#e4e3de] shadow-[0_8px_48px_rgba(0,0,0,0.07)] lg:min-h-[780px]">
            {/* LEFT SIDEBAR */}
            <div className="bg-[#f7f6f3] lg:border-r border-[#e4e3de] overflow-y-auto lg:max-h-[780px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#e4e3de]">
              {/* Mobile Dropdown Select */}
              <div className="lg:hidden p-4 border-b border-[#e4e3de]">
                <label className="block text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#bbb] mb-2">
                  Select Feature
                </label>
                <select
                  value={activeFeature}
                  onChange={(e) => setActiveFeature(e.target.value)}
                  className="w-full p-3 text-[0.88rem] rounded-lg border border-[#e4e3de] bg-white text-[#0a0a0a] font-medium"
                >
                  <optgroup label="Layout & Design">
                    {["sidebars", "header-image", "templates", "collection"].map((id) => (
                      <option key={id} value={id}>
                        {featureData[id].name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Navigation & Discovery">
                    {["toc", "filters", "recent", "related", "breadcrumbs", "pagination", "social-sharing", "search"].map((id) => (
                      <option key={id} value={id}>
                        {featureData[id].name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Reader Experience">
                    {["reading-time", "progress"].map((id) => (
                      <option key={id} value={id}>
                        {featureData[id].name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Publishing & Management">
                    {["authors", "author-profiles", "post-footer", "sorting", "featured"].map((id) => (
                      <option key={id} value={id}>
                        {featureData[id].name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Desktop Sidebar List */}
              <div className="hidden lg:block">
                {/* Layout & Design */}
                <div className="p-4 pb-[6px] text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#bbb] border-b border-[#e4e3de] bg-[#f7f6f3] sticky top-0 z-10">
                  Layout & Design
                </div>
              {["sidebars", "header-image", "templates", "collection"].map((id) => (
                <FeatureItem
                  key={id}
                  id={id}
                  name={featureData[id].name}
                  category="layout"
                  active={activeFeature === id}
                  onClick={() => setActiveFeature(id)}
                />
              ))}

              {/* Navigation & Discovery */}
              <div className="p-4 pb-[6px] text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#bbb] border-b border-[#e4e3de] bg-[#f7f6f3] sticky top-0 z-10">
                Navigation & Discovery
              </div>
              {["toc", "filters", "recent", "related", "breadcrumbs", "pagination", "social-sharing", "search"].map((id) => (
                <FeatureItem
                  key={id}
                  id={id}
                  name={featureData[id].name}
                  category="nav"
                  active={activeFeature === id}
                  onClick={() => setActiveFeature(id)}
                />
              ))}

              {/* Reader Experience */}
              <div className="p-4 pb-[6px] text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#bbb] border-b border-[#e4e3de] bg-[#f7f6f3] sticky top-0 z-10">
                Reader Experience
              </div>
              {["reading-time", "progress"].map((id) => (
                <FeatureItem
                  key={id}
                  id={id}
                  name={featureData[id].name}
                  category="reader"
                  active={activeFeature === id}
                  onClick={() => setActiveFeature(id)}
                />
              ))}

              {/* Publishing & Management */}
              <div className="p-4 pb-[6px] text-[0.56rem] font-bold tracking-[0.18em] uppercase text-[#bbb] border-b border-[#e4e3de] bg-[#f7f6f3] sticky top-0 z-10">
                Publishing & Management
              </div>
              {["authors", "author-profiles", "post-footer", "sorting", "featured"].map((id) => (
                <FeatureItem
                  key={id}
                  id={id}
                  name={featureData[id].name}
                  category="pub"
                  active={activeFeature === id}
                  onClick={() => setActiveFeature(id)}
                />
              ))}</div>
            </div>

            {/* RIGHT PREVIEW PANEL */}
            <div className="bg-white flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-5 pb-[18px] border-b border-[#e4e3de] flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-5 flex-shrink-0">
                <div>
                  <div className="font-heading text-lg sm:text-xl font-normal tracking-[-0.015em] text-[#0a0a0a] mb-[5px]">
                    {currentFeature.name}
                  </div>
                  <div className="text-[0.78rem] text-[#6b6b6b] font-light leading-[1.65] max-w-[460px]">
                    {currentFeature.desc}
                  </div>
                </div>
                <div className={`flex-shrink-0 text-[0.56rem] font-semibold tracking-[0.1em] uppercase px-[11px] py-1 rounded-full whitespace-nowrap mt-[2px] ${badgeClass}`}>
                  {currentFeature.badge}
                </div>
              </div>

              {/* Mockup Area */}
              <div className="flex-1 p-4 bg-[#f5f5f7] flex items-start justify-center overflow-y-auto">
                <div className="w-full">
                  {activeFeature === "sidebars" && <SidebarsPanel />}
                  {activeFeature === "header-image" && <HeaderImagePanel />}
                  {activeFeature === "templates" && <TemplatesPanel />}
                  {activeFeature === "collection" && <CollectionPanel />}
                  {activeFeature === "toc" && <TocPanel />}
                  {activeFeature === "filters" && <FiltersPanel />}
                  {activeFeature === "recent" && <RecentPanel />}
                  {activeFeature === "related" && <RelatedPanel />}
                  {activeFeature === "breadcrumbs" && <BreadcrumbsPanel />}
                  {activeFeature === "pagination" && <PaginationPanel />}
                  {activeFeature === "social-sharing" && <SocialSharingPanel />}
                  {activeFeature === "reading-time" && <ReadingTimePanel />}
                  {activeFeature === "progress" && <ProgressPanel />}
                  {activeFeature === "search" && <SearchPanel />}
                  {activeFeature === "sorting" && <SortingPanel />}
                  {activeFeature === "featured" && <FeaturedPanel />}
                  {activeFeature === "authors" && <AuthorsPanel />}
                  {activeFeature === "author-profiles" && <AuthorProfilesPanel />}
                  {activeFeature === "post-footer" && <PostFooterPanel />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Feature List Item Component
function FeatureItem({
  id,
  name,
  category,
  active,
  onClick,
}: {
  id: string;
  name: string;
  category: string;
  active: boolean;
  onClick: () => void;
}) {
  const iconBg = {
    layout: "bg-[rgba(91,79,232,0.07)]",
    nav: "bg-[rgba(26,122,94,0.07)]",
    reader: "bg-[rgba(154,26,62,0.06)]",
    pub: "bg-[rgba(122,74,26,0.06)]",
  }[category];

  const iconColor = {
    layout: "stroke-[#5B4FE8]",
    nav: "stroke-[#1a7a5e]",
    reader: "stroke-[#9a1a3e]",
    pub: "stroke-[#7a4a1a]",
  }[category];

  const tagColor = {
    layout: "text-[#8F86F0]",
    nav: "text-[#3aaa86]",
    reader: "text-[#c44a6e]",
    pub: "text-[#b07040]",
  }[category];

  const tagText = {
    layout: "Layout",
    nav: "Navigation",
    reader: "Reader",
    pub: "Publishing",
  }[category];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-[11px] p-3 px-5 cursor-pointer border-b border-[rgba(228,227,222,0.6)] transition-all relative ${
        active
          ? "bg-white shadow-[inset_3px_0_0_#5B4FE8]"
          : "hover:bg-[rgba(91,79,232,0.04)]"
      }`}
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <FeatureIcon id={id} className={`w-[13px] h-[13px] ${iconColor}`} />
      </div>
      <div className="flex flex-col gap-[1px]">
        <span className={`text-[0.5rem] font-semibold tracking-[0.1em] uppercase ${tagColor}`}>
          {tagText}
        </span>
        <span className={`text-[0.78rem] font-normal text-[#1a1a1a] leading-[1.25] ${active ? "text-[#5B4FE8] font-medium" : ""}`}>
          {name}
        </span>
      </div>
    </div>
  );
}

// Feature Icons Component
function FeatureIcon({ id, className }: { id: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    sidebars: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </>
    ),
    "header-image": (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" />
        <path d="M3 15l4-4 3 3 4-5 4 6" />
        <circle cx="8.5" cy="9.5" r="1.5" />
      </>
    ),
    templates: (
      <>
        <rect x="3" y="3" width="8" height="10" rx="1.5" fill="none" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" fill="none" />
        <rect x="13" y="11" width="8" height="10" rx="1.5" fill="none" />
        <rect x="3" y="16" width="8" height="5" rx="1.5" fill="none" />
      </>
    ),
    collection: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" fill="none" />
        <rect x="14" y="3" width="7" height="7" rx="1" fill="none" />
        <rect x="3" y="14" width="7" height="7" rx="1" fill="none" />
        <rect x="14" y="14" width="7" height="7" rx="1" fill="none" />
      </>
    ),
    toc: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="3.5" cy="6" r="1" />
        <circle cx="3.5" cy="12" r="1" />
        <circle cx="3.5" cy="18" r="1" />
      </>
    ),
    filters: (
      <>
        <path d="M3 6h18M7 12h10M11 18h2" />
      </>
    ),
    recent: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" />
        <polyline points="12 7 12 12 15 15" />
      </>
    ),
    related: (
      <>
        <circle cx="7" cy="12" r="3" fill="none" />
        <circle cx="17" cy="6" r="3" fill="none" />
        <circle cx="17" cy="18" r="3" fill="none" />
        <line x1="10" y1="10.5" x2="14" y2="7.5" />
        <line x1="10" y1="13.5" x2="14" y2="16.5" />
      </>
    ),
    breadcrumbs: (
      <>
        <polyline points="9 18 15 12 9 6" />
        <line x1="3" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="21" y2="12" />
      </>
    ),
    pagination: (
      <>
        <rect x="3" y="9" width="18" height="11" rx="2" fill="none" />
        <path d="M3 13h18" />
        <line x1="8.5" y1="9" x2="8.5" y2="6" />
        <line x1="15.5" y1="9" x2="15.5" y2="6" />
      </>
    ),
    "social-sharing": (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    progress: (
      <>
        <line x1="3" y1="20" x2="21" y2="20" />
        <rect x="3" y="15" width="8" height="5" rx="1" fill="none" />
        <line x1="3" y1="11" x2="21" y2="11" strokeDasharray="2 2" opacity="0.5" />
      </>
    ),
    "reading-time": (
      <>
        <circle cx="12" cy="12" r="9" fill="none" />
        <polyline points="12 7 12 12 15 15" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" fill="none" />
        <line x1="16.5" y1="16.5" x2="22" y2="22" />
      </>
    ),
    sorting: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="9" y2="18" />
        <polyline points="17 15 21 19 17 23" />
        <line x1="21" y1="19" x2="13" y2="19" />
      </>
    ),
    featured: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
    authors: (
      <>
        <circle cx="8" cy="8" r="3.5" fill="none" />
        <circle cx="16" cy="8" r="3.5" fill="none" />
        <path d="M2 20c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6" />
      </>
    ),
    "author-profiles": (
      <>
        <circle cx="9" cy="7" r="3" fill="none" />
        <path d="M3 20c0-3 2.7-5 6-5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" fill="none" />
        <line x1="13" y1="17" x2="21" y2="17" />
        <line x1="17" y1="13" x2="17" y2="21" />
      </>
    ),
    "post-footer": (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="none" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <line x1="8" y1="19" x2="16" y2="19" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="11" x2="13" y2="11" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[id]}
    </svg>
  );
}

// Mockup Components (simplified versions - you can expand these)
// I'll create placeholder versions that match the HTML structure

function MiniBrowser({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#dde] shadow-[0_12px_48px_rgba(91,79,232,0.12),0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden animate-[fadeUp_0.18s_ease_forwards]">
      <div className="bg-[#f0f0f4] h-9 flex items-center px-[14px] gap-[6px] border-b border-[#dde]">
        <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]"></div>
        <div className="w-[10px] h-[10px] rounded-full bg-[#ffbd2e]"></div>
        <div className="w-[10px] h-[10px] rounded-full bg-[#28c940]"></div>
        <div className="flex-1 mx-3 bg-[#e4e4ea] rounded h-5 flex items-center px-[10px] text-[0.6rem] text-[#999] tracking-[0.01em]">
          yoursite.squarespace.com/blog/post-title
        </div>
      </div>
      {children}
    </div>
  );
}

function BlogNav() {
  return (
    <div className="flex justify-between items-center px-5 py-[11px] border-b border-[#f0f0f0]">
      <div className="font-heading text-base text-[#1a1a1a]">Sarah Clarke</div>
      <div className="flex gap-[14px]">
        <span className="text-[0.6rem] text-[#aaa] tracking-[0.06em] uppercase">About</span>
        <span className="text-[0.6rem] text-[#aaa] tracking-[0.06em] uppercase">Blog</span>
        <span className="text-[0.6rem] text-[#aaa] tracking-[0.06em] uppercase">Contact</span>
      </div>
    </div>
  );
}

function BlogHero() {
  return (
    <div className="w-full h-[120px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0] rounded-md mb-3 flex items-end p-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(50,35,140,0.45)] to-transparent"></div>
      <div className="relative font-heading text-base text-white leading-tight">
        Finding balance in a busy creative life
      </div>
    </div>
  );
}

function ContentLine({ className = "" }: { className?: string }) {
  return <div className={`h-[9px] bg-[#f0f0f4] rounded-[3px] mb-[7px] ${className}`}></div>;
}

function FeatureCallout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-[5px] bg-[#FFD700] text-[#7a5800] text-[0.58rem] font-semibold tracking-[0.08em] px-[10px] py-[3px] rounded-full mb-[6px]", className)}>
      {children}
    </div>
  );
}

// Panel Components
function SidebarsPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="grid grid-cols-[170px_1fr_170px]">
        {/* Left Sidebar */}
        <div className="p-4 bg-[#faf9ff] border-r border-[#f0f0f0] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout>✦ Left Sidebar</FeatureCallout>
          <div className="text-[0.62rem] font-bold tracking-[0.1em] uppercase text-[#0a0a0a] pb-[7px] border-b border-[#e4e3de] mb-[9px]">
            About Me
          </div>
          <div className="flex flex-col items-center text-center p-2 pb-[10px] border-b border-[#e4e3de] mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8] mb-[6px]"></div>
            <div className="font-heading text-[0.72rem] text-[#1a1a1a] mb-[3px]">Sarah Clarke</div>
            <div className="text-[0.58rem] text-[#6b6b6b] leading-[1.45]">
              Writer & creative living in Portland.
            </div>
            <div className="text-[0.58rem] text-[#5B4FE8] font-medium mt-1">Follow →</div>
          </div>
          <div className="text-[0.62rem] font-bold tracking-[0.1em] uppercase text-[#0a0a0a] pb-[7px] border-b border-[#e4e3de] mb-[9px]">
            Newsletter
          </div>
          <div className="bg-[rgba(91,79,232,0.07)] rounded-[5px] p-[7px] px-2 text-center">
            <div className="text-[0.58rem] text-[#6b6b6b] mb-[5px]">Get weekly posts</div>
            <div className="bg-[#5B4FE8] text-white rounded-[3px] py-1 px-2 text-[0.56rem] font-semibold">Subscribe</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 border-r border-[#f0f0f0]">
          <BlogHero />
          <div className="flex items-center gap-[7px] mb-3">
            <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
            <span className="text-[0.7rem] text-[#6b6b6b] font-medium">Sarah Clarke</span>
            <span className="text-[0.65rem] text-[#ccc] ml-1">Mar 12, 2026</span>
          </div>
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
          <div className="flex gap-[6px] mt-2">
            <div className="text-[0.62rem] font-medium text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] border border-[rgba(91,79,232,0.15)] px-[10px] py-[3px] rounded-full">Lifestyle</div>
            <div className="text-[0.62rem] font-medium text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] border border-[rgba(91,79,232,0.15)] px-[10px] py-[3px] rounded-full">Creativity</div>
            <div className="text-[0.62rem] font-medium text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] border border-[rgba(91,79,232,0.15)] px-[10px] py-[3px] rounded-full">Wellness</div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="p-4 bg-[#faf9ff] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout>✦ Right Sidebar</FeatureCallout>
          <div className="text-[0.62rem] font-bold tracking-[0.1em] uppercase text-[#0a0a0a] pb-[7px] border-b border-[#e4e3de] mb-[9px]">
            Recent
          </div>
          <div className="flex gap-[7px] items-center mb-[9px]">
            <div className="w-[34px] h-[26px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0] rounded-[3px]"></div>
            <div className="text-[0.5rem] text-[#444] leading-[1.3]">My morning ritual</div>
          </div>
          <div className="flex gap-[7px] items-center mb-[9px]">
            <div className="w-[34px] h-[26px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4] rounded-[3px]"></div>
            <div className="text-[0.5rem] text-[#444] leading-[1.3]">On slow living</div>
          </div>
          <div className="flex gap-[7px] items-center mb-[9px]">
            <div className="w-[34px] h-[26px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8] rounded-[3px]"></div>
            <div className="text-[0.5rem] text-[#444] leading-[1.3]">The edit method</div>
          </div>
          <div className="text-[0.62rem] font-bold tracking-[0.1em] uppercase text-[#0a0a0a] pb-[7px] border-b border-[#e4e3de] mb-[9px] mt-[10px]">
            Categories
          </div>
          <div className="flex justify-between text-[0.5rem] text-[#666] py-[2px]">
            Lifestyle<span className="bg-[#f0f0f0] px-[5px] py-[1px] rounded-[10px] text-[0.46rem] text-[#aaa]">14</span>
          </div>
          <div className="flex justify-between text-[0.5rem] text-[#666] py-[2px]">
            Creativity<span className="bg-[#f0f0f0] px-[5px] py-[1px] rounded-[10px] text-[0.46rem] text-[#aaa]">9</span>
          </div>
          <div className="flex justify-between text-[0.5rem] text-[#666] py-[2px]">
            Travel<span className="bg-[#f0f0f0] px-[5px] py-[1px] rounded-[10px] text-[0.46rem] text-[#aaa]">7</span>
          </div>
          <div className="flex justify-between text-[0.5rem] text-[#666] py-[2px]">
            Wellness<span className="bg-[#f0f0f0] px-[5px] py-[1px] rounded-[10px] text-[0.46rem] text-[#aaa]">5</span>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function HeaderImagePanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="w-full h-[150px] bg-gradient-to-br from-[#c8c0f0] to-[#8F86F0] rounded-md mb-3 flex items-end p-4 relative overflow-hidden animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(30,20,100,0.6)] to-[rgba(30,20,100,0.1)]"></div>
          <div className="relative w-full">
            <FeatureCallout>✦ Header Image</FeatureCallout>
            <div className="font-heading text-[1.1rem] text-white leading-tight mb-[5px]">
              Finding balance in a busy creative life
            </div>
            <div className="flex items-center gap-[6px]">
              <div className="w-4 h-4 rounded-full bg-[rgba(255,255,255,0.3)]"></div>
              <span className="text-[0.6rem] text-[rgba(255,255,255,0.75)]">
                Sarah Clarke · Mar 12, 2026 · 5 min read
              </span>
            </div>
          </div>
        </div>
        <ContentLine />
        <ContentLine className="w-[78%]" />
      </div>
    </MiniBrowser>
  );
}

function TemplatesPanel() {
  return (
    <div className="animate-[fadeUp_0.18s_ease_forwards]">
      <FeatureCallout>✦ Choose your template layout</FeatureCallout>
      <div className="grid grid-cols-3 gap-[14px] mt-4">
        {/* Magazine Template - Active */}
        <div className="border-2 border-[#5B4FE8] rounded-[10px] overflow-hidden bg-white shadow-[0_4px_20px_rgba(91,79,232,0.14)]">
          <div className="bg-[#5B4FE8] px-[14px] py-[7px] text-[0.58rem] font-bold text-white tracking-[0.1em] uppercase">
            Magazine ✓
          </div>
          <div className="p-[14px]">
            <div className="h-20 bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0] rounded-[5px] mb-[10px] flex items-end p-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(50,35,140,0.4)] to-transparent"></div>
              <div className="relative font-heading text-[0.65rem] text-white leading-[1.2]">
                Finding balance in a busy creative life
              </div>
            </div>
            <ContentLine className="mb-[5px]" />
            <ContentLine className="w-[58%] mb-[10px]" />
            <div className="grid grid-cols-2 gap-[6px]">
              <div className="h-11 bg-[#f5f3ff] rounded"></div>
              <div className="h-11 bg-[#f5f3ff] rounded"></div>
            </div>
          </div>
        </div>

        {/* Minimal Template */}
        <div className="border border-[#e0e0e0] rounded-[10px] overflow-hidden bg-white">
          <div className="bg-[#f5f5f5] px-[14px] py-[7px] text-[0.58rem] font-semibold text-[#aaa] tracking-[0.1em] uppercase">
            Minimal
          </div>
          <div className="p-[14px]">
            <div className="font-heading text-[0.95rem] text-[#1a1a1a] leading-[1.25] mb-[6px]">
              Finding balance in a busy creative life
            </div>
            <div className="text-[0.55rem] text-[#aaa] mb-3">Sarah Clarke · Mar 12 · 5 min read</div>
            <ContentLine className="mb-[5px]" />
            <ContentLine className="w-[78%] mb-[5px]" />
            <ContentLine className="w-[58%] mb-[5px]" />
            <ContentLine className="w-[78%] mb-[5px]" />
            <ContentLine className="w-[58%]" />
          </div>
        </div>

        {/* Classic + Sidebar Template */}
        <div className="border border-[#e0e0e0] rounded-[10px] overflow-hidden bg-white">
          <div className="bg-[#f5f5f5] px-[14px] py-[7px] text-[0.58rem] font-semibold text-[#aaa] tracking-[0.1em] uppercase">
            Classic + Sidebar
          </div>
          <div className="grid grid-cols-[1fr_56px]">
            <div className="p-[14px] border-r border-[#f0f0f0]">
              <div className="h-[52px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0] rounded mb-2"></div>
              <ContentLine className="mb-1" />
              <ContentLine className="w-[78%] mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
            <div className="p-[10px] px-2 bg-[#fafafa]">
              <div className="text-[0.44rem] font-bold tracking-[0.1em] uppercase text-[#bbb] mb-[6px] border-b border-[#eee] pb-1">Recent</div>
              <div className="h-[14px] bg-[#f0f0f0] rounded-[2px] mb-1"></div>
              <div className="h-[14px] bg-[#f0f0f0] rounded-[2px] mb-1"></div>
              <div className="h-[14px] bg-[#f0f0f0] rounded-[2px] mb-2"></div>
              <div className="text-[0.44rem] font-bold tracking-[0.1em] uppercase text-[#bbb] mb-[5px] border-b border-[#eee] pb-1">Tags</div>
              <div className="flex flex-wrap gap-[2px]">
                <div className="text-[0.4rem] bg-[#f0eeff] text-[#5B4FE8] px-1 py-[1px] rounded-[10px]">Travel</div>
                <div className="text-[0.4rem] bg-[#f0eeff] text-[#5B4FE8] px-1 py-[1px] rounded-[10px]">Life</div>
                <div className="text-[0.4rem] bg-[#f0eeff] text-[#5B4FE8] px-1 py-[1px] rounded-[10px]">Style</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-[0.72rem] text-[#6b6b6b] font-light text-center mt-4">
        Apply any layout sitewide — or override per post
      </div>
    </div>
  );
}

function CollectionPanel() {
  return (
    <div className="animate-[fadeUp_0.18s_ease_forwards]">
      <FeatureCallout>✦ Per-collection layouts — each blog can look completely different</FeatureCallout>
      <div className="grid grid-cols-2 gap-[14px] mt-4">
        <div className="bg-white rounded-[10px] border-2 border-[#5B4FE8] overflow-hidden shadow-[0_4px_20px_rgba(91,79,232,0.1)]">
          <div className="bg-[#5B4FE8] p-2 px-[14px] flex items-center justify-between">
            <span className="text-[0.62rem] font-bold text-white tracking-[0.08em] uppercase">
              Travel Blog
            </span>
            <span className="text-[0.58rem] text-[rgba(255,255,255,0.75)]">→ Magazine Grid</span>
          </div>
          <div className="p-[14px]">
            <div className="h-[90px] bg-gradient-to-br from-[#c8c0f0] to-[#8F86F0] rounded-md mb-[10px] flex items-end p-[10px] px-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(40,25,130,0.55)] to-transparent"></div>
              <div className="relative">
                <div className="text-[0.48rem] text-[rgba(255,255,255,0.7)] mb-[3px] uppercase tracking-[0.1em] font-semibold">Featured</div>
                <div className="font-heading text-[0.82rem] text-white leading-[1.2]">Two weeks in Kyoto</div>
                <div className="text-[0.5rem] text-[rgba(255,255,255,0.65)] mt-[3px]">8 min read · Travel</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-[7px]">
              <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
                <div className="h-[50px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
                <div className="p-[6px]">
                  <ContentLine className="mb-1 h-[7px]" />
                  <ContentLine className="w-[58%] h-[7px]" />
                </div>
              </div>
              <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
                <div className="h-[50px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8]"></div>
                <div className="p-[6px]">
                  <ContentLine className="mb-1 h-[7px]" />
                  <ContentLine className="w-[58%] h-[7px]" />
                </div>
              </div>
              <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
                <div className="h-[50px] bg-gradient-to-br from-[#f0d4d4] to-[#e8a8a8]"></div>
                <div className="p-[6px]">
                  <ContentLine className="mb-1 h-[7px]" />
                  <ContentLine className="w-[58%] h-[7px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[10px] border border-[#e0e0e0] overflow-hidden">
          <div className="bg-[#f5f5f5] p-2 px-[14px] flex items-center justify-between">
            <span className="text-[0.62rem] font-bold text-[#444] tracking-[0.08em] uppercase">
              Recipe Blog
            </span>
            <span className="text-[0.58rem] text-[#aaa]">→ List Layout</span>
          </div>
          <div className="p-[14px] flex flex-col gap-0">
            <div className="flex gap-3 items-center py-[10px] border-b border-[#f5f5f5]">
              <div className="w-16 h-[52px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8] rounded-[5px] flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-heading text-[0.75rem] text-[#1a1a1a] mb-1 leading-[1.2]">Classic banana bread</div>
                <ContentLine className="w-[58%] h-[7px] mb-1" />
                <div className="text-[0.5rem] text-[#aaa]">25 min · Easy</div>
              </div>
            </div>
            <div className="flex gap-3 items-center py-[10px] border-b border-[#f5f5f5]">
              <div className="w-16 h-[52px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4] rounded-[5px] flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-heading text-[0.75rem] text-[#1a1a1a] mb-1 leading-[1.2]">Lemon herb roast chicken</div>
                <ContentLine className="w-[58%] h-[7px] mb-1" />
                <div className="text-[0.5rem] text-[#aaa]">1h 20 min · Intermediate</div>
              </div>
            </div>
            <div className="flex gap-3 items-center py-[10px]">
              <div className="w-16 h-[52px] bg-gradient-to-br from-[#f0d4f0] to-[#d4a8e8] rounded-[5px] flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-heading text-[0.75rem] text-[#1a1a1a] mb-1 leading-[1.2]">Blueberry lavender tart</div>
                <ContentLine className="w-[58%] h-[7px] mb-1" />
                <div className="text-[0.5rem] text-[#aaa]">45 min · Easy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-[0.72rem] text-[#6b6b6b] font-light text-center mt-[14px]">
        Every collection on your site can have its own completely independent layout
      </div>
    </div>
  );
}

function TocPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="grid grid-cols-[1fr_170px]">
        <div className="p-4 border-r border-[#f0f0f0]">
          <BlogHero />
          <div className="flex items-center gap-[7px] mb-3">
            <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
            <span className="text-[0.7rem] text-[#6b6b6b] font-medium">Sarah Clarke</span>
          </div>
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <div className="flex gap-[6px] mt-2">
            <div className="text-[0.62rem] font-medium text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] border border-[rgba(91,79,232,0.15)] px-[10px] py-[3px] rounded-full">Lifestyle</div>
            <div className="text-[0.62rem] font-medium text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] border border-[rgba(91,79,232,0.15)] px-[10px] py-[3px] rounded-full">Creativity</div>
          </div>
        </div>
        <div className="p-4 bg-[#faf9ff] border-l-[3px] border-[#5B4FE8] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout className="text-[0.44rem]">✦ Table of Contents</FeatureCallout>
          <div className="text-[0.5rem] font-bold tracking-[0.1em] uppercase text-[#5B4FE8] mb-[6px]">
            Contents
          </div>
          <div className="flex flex-col gap-[5px]">
            <div className="text-[0.54rem] text-[#6b6b6b] flex items-center gap-[5px]">
              <div className="w-1 h-1 rounded-full bg-[#ccc] flex-shrink-0"></div>Introduction
            </div>
            <div className="text-[0.54rem] text-[#5B4FE8] font-medium flex items-center gap-[5px] bg-[rgba(91,79,232,0.07)] rounded-[3px] px-1 py-[2px] -ml-1">
              <div className="w-1 h-1 rounded-full bg-[#5B4FE8] flex-shrink-0"></div>Finding your rhythm
            </div>
            <div className="text-[0.54rem] text-[#6b6b6b] flex items-center gap-[5px]">
              <div className="w-1 h-1 rounded-full bg-[#ccc] flex-shrink-0"></div>The tools that help
            </div>
            <div className="text-[0.54rem] text-[#6b6b6b] flex items-center gap-[5px]">
              <div className="w-1 h-1 rounded-full bg-[#ccc] flex-shrink-0"></div>Final thoughts
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function FiltersPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="mb-[14px] p-[9px] px-[10px] bg-[#faf9ff] rounded-md border border-[rgba(91,79,232,0.12)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout>✦ Category Filters</FeatureCallout>
          <div className="flex gap-[5px] flex-wrap">
            <div className="text-[0.55rem] font-semibold bg-[#5B4FE8] text-white px-[10px] py-[3px] rounded-full">
              All
            </div>
            <div className="text-[0.55rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-[3px] rounded-full">
              Lifestyle
            </div>
            <div className="text-[0.55rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-[3px] rounded-full">
              Travel
            </div>
            <div className="text-[0.55rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-[3px] rounded-full">
              Creativity
            </div>
            <div className="text-[0.55rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-[3px] rounded-full">
              Wellness
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-[6px]">
          <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
            <div className="h-10 bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0]"></div>
            <div className="p-[5px]">
              <ContentLine className="mb-[3px]" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
            <div className="h-10 bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
            <div className="p-[5px]">
              <ContentLine className="mb-[3px]" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
            <div className="h-10 bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8]"></div>
            <div className="p-[5px]">
              <ContentLine className="mb-[3px]" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function RecentPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="grid grid-cols-[1fr_170px]">
        <div className="p-4 border-r border-[#f0f0f0]">
          <BlogHero />
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
        </div>
        <div className="p-4">
          <FeatureCallout className="text-[0.46rem]">✦ Recent Posts</FeatureCallout>
          <div className="p-[5px] bg-[#faf9ff] rounded animate-[ringPulse_2.5s_ease-in-out_infinite]">
            <div className="flex gap-[7px] items-center mb-[9px]">
              <div className="w-[34px] h-[26px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0] rounded-[3px]"></div>
              <div className="text-[0.62rem] text-[#444] leading-[1.35]">My morning ritual</div>
            </div>
            <div className="flex gap-[7px] items-center mb-[9px]">
              <div className="w-[34px] h-[26px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4] rounded-[3px]"></div>
              <div className="text-[0.62rem] text-[#444] leading-[1.35]">On slow living</div>
            </div>
            <div className="flex gap-[7px] items-center">
              <div className="w-[34px] h-[26px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8] rounded-[3px]"></div>
              <div className="text-[0.62rem] text-[#444] leading-[1.35]">The edit method</div>
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function RelatedPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <BlogHero />
        <ContentLine />
        <ContentLine className="w-[78%]" />
        <ContentLine className="w-[58%]" />
        <div className="flex gap-[6px] mb-[10px]">
          <div className="px-[10px] py-[4px] bg-[#faf9ff] rounded-full border border-[rgba(91,79,232,0.15)] text-[0.62rem] text-[#5B4FE8]">
            Lifestyle
          </div>
          <div className="px-[10px] py-[4px] bg-[#faf9ff] rounded-full border border-[rgba(91,79,232,0.15)] text-[0.62rem] text-[#5B4FE8]">
            Creativity
          </div>
        </div>
        <div className="mt-[10px] p-[9px] px-[10px] bg-[#faf9ff] rounded-md border border-[rgba(91,79,232,0.1)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout className="mb-[7px]">✦ Related Posts</FeatureCallout>
          <div className="grid grid-cols-2 gap-[7px]">
            <div className="bg-white rounded border border-[#f0f0f0] overflow-hidden">
              <div className="h-[30px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0]"></div>
              <div className="p-[5px]">
                <div className="text-[0.5rem] text-[#444] leading-[1.3] mb-[2px]">My morning ritual and why it works</div>
                <div className="text-[0.44rem] text-[#ccc]">5 min read</div>
              </div>
            </div>
            <div className="bg-white rounded border border-[#f0f0f0] overflow-hidden">
              <div className="h-[30px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
              <div className="p-[5px]">
                <div className="text-[0.5rem] text-[#444] leading-[1.3] mb-[2px]">The case for slow living</div>
                <div className="text-[0.44rem] text-[#ccc]">4 min read</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function BreadcrumbsPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="px-5 py-[7px] text-[0.62rem] text-[#6b6b6b] flex gap-[5px] items-center border-b border-[#f8f8f8] bg-[#fafafa] border border-[rgba(91,79,232,0.15)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
        <FeatureCallout>✦</FeatureCallout>
        <span>Home</span>
        <span className="text-[#ccc]">›</span>
        <span>Blog</span>
        <span className="text-[#ccc]">›</span>
        <span className="text-[#5B4FE8] font-medium">Finding balance in a busy creative life</span>
      </div>
      <div className="p-4">
        <BlogHero />
        <ContentLine />
        <ContentLine className="w-[78%]" />
        <ContentLine className="w-[58%]" />
        <ContentLine />
      </div>
    </MiniBrowser>
  );
}

function PaginationPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="grid grid-cols-3 gap-[6px] mb-[14px]">
          <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
            <div className="h-10 bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0]"></div>
            <div className="p-[5px]">
              <ContentLine className="mb-[3px]" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
            <div className="h-10 bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
            <div className="p-[5px]">
              <ContentLine className="mb-[3px]" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-[5px] overflow-hidden border border-[#f0f0f0]">
            <div className="h-10 bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8]"></div>
            <div className="p-[5px]">
              <ContentLine className="mb-[3px]" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center gap-[5px] p-[10px] bg-[#faf9ff] rounded-md border border-[rgba(91,79,232,0.12)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout className="mr-[5px]">✦ Pagination</FeatureCallout>
          <div className="text-[0.62rem] text-[#ccc] px-[7px] py-[3px]">←</div>
          <div className="text-[0.62rem] text-[#6b6b6b] px-2 py-[3px] bg-[#f0f0f0] rounded-[3px]">1</div>
          <div className="text-[0.62rem] text-white px-[9px] py-[3px] bg-[#5B4FE8] rounded-[3px] font-semibold">
            2
          </div>
          <div className="text-[0.62rem] text-[#6b6b6b] px-2 py-[3px] bg-[#f0f0f0] rounded-[3px]">3</div>
          <div className="text-[0.62rem] text-[#6b6b6b] px-2 py-[3px] bg-[#f0f0f0] rounded-[3px]">4</div>
          <div className="text-[0.62rem] text-[#6b6b6b] px-[7px] py-[3px]">→</div>
          <div className="text-[0.52rem] text-[#aaa] ml-[3px]">48 posts · 8 pages</div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function SocialSharingPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <BlogHero />
        <div className="mb-[14px]">
          <ContentLine className="mb-1" />
          <ContentLine className="mb-1" />
          <ContentLine className="w-[78%] mb-3" />
          <ContentLine className="mb-1" />
          <ContentLine className="w-[92%]" />
        </div>
        
        {/* Social Sharing Bar */}
        <div className="flex items-center gap-[10px] p-[10px] px-[14px] bg-[#faf9ff] rounded-[8px] border border-[rgba(91,79,232,0.1)] animate-[ringPulse_2.5s_ease-in-out_infinite]">
          <FeatureCallout className="flex-shrink-0">✦ Social Sharing</FeatureCallout>
          <span className="text-[0.52rem] font-bold tracking-[0.1em] uppercase text-[#8F86F0] flex-shrink-0">
            Share this post
          </span>
          <div className="flex gap-[6px] ml-auto flex-wrap">
            {/* X / Twitter */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#000] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            
            {/* Facebook */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#1877F2] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </div>
            
            {/* Pinterest */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#E60023] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.428 1.808-2.428.852 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.476 1.806 1.772 0 3.137-1.867 3.137-4.562 0-2.387-1.715-4.055-4.163-4.055-2.837 0-4.5 2.126-4.5 4.324 0 .856.33 1.772.741 2.273a.3.3 0 0 1 .069.286c-.076.313-.244.995-.277 1.134-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.527-2.292-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
              </svg>
            </div>
            
            {/* Reddit */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#FF4500] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11c0 .8-.5 1.5-1.1 1.8 0 .2.1.4.1.6 0 2.8-3.1 5-7 5s-7-2.2-7-5c0-.2 0-.4.1-.6C1.5 14.5 1 13.8 1 13c0-1.1.9-2 2-2 .5 0 1 .2 1.3.5 1.1-.9 2.5-1.5 4.1-1.6l.9-4.1 2.8.6c.2-.4.6-.7 1.1-.7.7 0 1.2.6 1.2 1.2s-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2l-2.5-.5-.8 3.7c1.6.1 3 .7 4.1 1.6.4-.3.8-.5 1.3-.5 1.1 0 2 .9 2 2zm-11.5 0c0 .7.6 1.2 1.2 1.2s1.2-.5 1.2-1.2-.5-1.2-1.2-1.2-1.2.5-1.2 1.2zm6.8 3.3c-.7.7-2.1.7-2.9.7s-2.2-.1-2.9-.7c-.1-.1-.3-.1-.4 0-.1.1-.1.3 0 .4.8.8 2.5.9 3.3.9s2.4-.1 3.3-.9c.1-.1.1-.3 0-.4-.1-.1-.3-.1-.4 0zm-.1-2.1c-.7 0-1.2.5-1.2 1.2s.5 1.2 1.2 1.2 1.2-.5 1.2-1.2-.5-1.2-1.2-1.2z"/>
              </svg>
            </div>
            
            {/* WhatsApp */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#25D366] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.054 23.455a.5.5 0 0 0 .611.61l5.638-1.474A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
              </svg>
            </div>
            
            {/* LinkedIn */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#0A66C2] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </div>
            
            {/* Copy Link */}
            <div className="w-[30px] h-[30px] rounded-[6px] bg-[#f0f0f0] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="mt-[14px]">
          <ContentLine className="mb-1" />
          <ContentLine className="w-[85%]" />
        </div>
      </div>
    </MiniBrowser>
  );
}

function ReadingTimePanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <BlogHero />
        <div className="flex items-center gap-2 mb-[14px] p-2 px-3 bg-[#faf9ff] rounded-md border border-[rgba(91,79,232,0.12)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
          <span className="text-[0.7rem] text-[#6b6b6b] font-medium">Sarah Clarke</span>
          <span className="text-[0.62rem] text-[#ddd]">·</span>
          <span className="text-[0.65rem] text-[#ccc]">Mar 12, 2026</span>
          <span className="text-[0.62rem] text-[#ddd]">·</span>
          <div className="flex items-center gap-1">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5B4FE8"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
            <span className="text-[0.68rem] text-[#5B4FE8] font-semibold">5 min read</span>
          </div>
          <FeatureCallout>✦ Reading Time</FeatureCallout>
        </div>
        <div className="text-[0.62rem] text-[#aaa] font-semibold tracking-[0.08em] uppercase mb-[10px]">Also on the blog index:</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md overflow-hidden border border-[#f0f0f0]">
            <div className="h-[52px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0]"></div>
            <div className="p-[7px]">
              <ContentLine className="mb-[5px]" />
              <ContentLine className="w-[58%] mb-[6px]" />
              <div className="flex items-center gap-[3px]">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5B4FE8" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
                <span className="text-[0.54rem] text-[#5B4FE8] font-medium">5 min</span>
              </div>
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-[#f0f0f0]">
            <div className="h-[52px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
            <div className="p-[7px]">
              <ContentLine className="mb-[5px]" />
              <ContentLine className="w-[58%] mb-[6px]" />
              <div className="flex items-center gap-[3px]">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5B4FE8" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
                <span className="text-[0.54rem] text-[#5B4FE8] font-medium">3 min</span>
              </div>
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-[#f0f0f0]">
            <div className="h-[52px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8]"></div>
            <div className="p-[7px]">
              <ContentLine className="mb-[5px]" />
              <ContentLine className="w-[58%] mb-[6px]" />
              <div className="flex items-center gap-[3px]">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5B4FE8" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
                <span className="text-[0.54rem] text-[#5B4FE8] font-medium">8 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function ProgressPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="h-1 bg-[#f0f0f0] relative border border-[rgba(91,79,232,0.2)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
        <div className="absolute left-0 top-0 h-full w-[62%] bg-[#5B4FE8]"></div>
      </div>
      <div className="px-5 py-[5px] pb-[6px] bg-[#faf9ff] border-b border-[rgba(91,79,232,0.08)] flex items-center justify-between">
        <FeatureCallout>✦ Scroll Progress Bar</FeatureCallout>
        <span className="text-[0.65rem] text-[#5B4FE8] font-bold">62% read</span>
      </div>
      <div className="p-4">
        <BlogHero />
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
          <span className="text-[0.62rem] text-[#1a1a1a] font-medium">Sarah Clarke</span>
          <span className="text-[0.62rem] text-[#6b6b6b]">Mar 12, 2026</span>
        </div>
        <ContentLine />
        <ContentLine className="w-[78%]" />
        <ContentLine className="w-[58%]" />
        <ContentLine />
        <ContentLine className="w-[78%]" />
        <ContentLine className="w-[58%]" />
        <ContentLine />
        <ContentLine className="w-[78%]" />
        <ContentLine className="w-[58%]" />
      </div>
    </MiniBrowser>
  );
}

function SearchPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="flex items-center gap-[10px] bg-[#faf9ff] border-[1.5px] border-[#5B4FE8] rounded-lg p-[10px] px-[14px] mb-4 animate-[ringPulse_2.5s_ease-in-out_infinite]">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5B4FE8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>
          <span className="text-[0.72rem] text-[#5B4FE8] font-medium flex-1">slow mornings</span>
          <FeatureCallout>✦ Post Search</FeatureCallout>
        </div>
        <div className="text-[0.6rem] text-[#aaa] mb-[10px] font-medium">
          3 results for <span className="text-[#5B4FE8]">"slow mornings"</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-3 items-center p-[10px] bg-white border border-[#f0f0f0] rounded-md border-l-[3px] border-l-[#5B4FE8]">
            <div className="w-[52px] h-[42px] bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0] rounded"></div>
            <div className="flex-1">
              <div className="font-heading text-[0.78rem] text-[#1a1a1a] mb-[3px] leading-tight">
                Finding balance in a busy creative life
              </div>
              <div className="text-[0.56rem] text-[#6b6b6b]">
                ...embracing <mark className="bg-[rgba(91,79,232,0.15)] text-[#5B4FE8] px-[2px] rounded-[2px]">slow mornings</mark> as a ritual...
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-center p-[10px] bg-white border border-[#f0f0f0] rounded-md">
            <div className="w-[52px] h-[42px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4] rounded"></div>
            <div className="flex-1">
              <div className="font-heading text-[0.78rem] text-[#1a1a1a] mb-[3px] leading-tight">
                My morning ritual and why it works
              </div>
              <div className="text-[0.56rem] text-[#6b6b6b]">
                ...the <mark className="bg-[rgba(91,79,232,0.15)] text-[#5B4FE8] px-[2px] rounded-[2px]">slow morning</mark> approach isn't about being lazy...
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-center p-[10px] bg-white border border-[#f0f0f0] rounded-md">
            <div className="w-[52px] h-[42px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8] rounded"></div>
            <div className="flex-1">
              <div className="font-heading text-[0.78rem] text-[#1a1a1a] mb-[3px] leading-tight">
                The case for slow living
              </div>
              <div className="text-[0.56rem] text-[#6b6b6b]">
                ...starting with <mark className="bg-[rgba(91,79,232,0.15)] text-[#5B4FE8] px-[2px] rounded-[2px]">slow mornings</mark> changed everything about my day...
              </div>
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function SortingPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-[14px] p-2 px-3 bg-[#faf9ff] rounded-[7px] border border-[rgba(91,79,232,0.12)] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout>✦ Sort by</FeatureCallout>
          <div className="flex gap-[5px] flex-wrap">
            <div className="text-[0.6rem] font-semibold bg-[#5B4FE8] text-white px-[10px] py-1 rounded-full">
              Newest
            </div>
            <div className="text-[0.6rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-1 rounded-full">
              Oldest
            </div>
            <div className="text-[0.6rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-1 rounded-full">
              Most Popular
            </div>
            <div className="text-[0.6rem] text-[#6b6b6b] bg-[#f0f0f0] px-[10px] py-1 rounded-full">
              A → Z
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md overflow-hidden border border-[#f0f0f0] relative">
            <div className="h-14 bg-gradient-to-br from-[#e8e4f8] to-[#c8c0f0]"></div>
            <div className="absolute top-[6px] left-[6px] bg-[#5B4FE8] text-white text-[0.44rem] font-bold px-[6px] py-[2px] rounded-[10px]">
              Mar 12
            </div>
            <div className="p-[7px]">
              <ContentLine className="mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-[#f0f0f0] relative">
            <div className="h-14 bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
            <div className="absolute top-[6px] left-[6px] bg-[#1a7a5e] text-white text-[0.44rem] font-bold px-[6px] py-[2px] rounded-[10px]">
              Feb 28
            </div>
            <div className="p-[7px]">
              <ContentLine className="mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-[#f0f0f0] relative">
            <div className="h-14 bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8]"></div>
            <div className="absolute top-[6px] left-[6px] bg-[#7a4a1a] text-white text-[0.44rem] font-bold px-[6px] py-[2px] rounded-[10px]">
              Feb 14
            </div>
            <div className="p-[7px]">
              <ContentLine className="mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function FeaturedPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="mb-3 animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <div className="relative h-[110px] bg-gradient-to-br from-[#c8c0f0] to-[#8F86F0] rounded-lg overflow-hidden flex items-end p-4">
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(40,25,130,0.6)] to-[rgba(40,25,130,0.05)]"></div>
            <div className="absolute top-[10px] left-[10px] flex gap-[5px]">
              <div className="bg-[#5B4FE8] text-white text-[0.5rem] font-bold px-2 py-[3px] rounded-full flex items-center gap-[3px]">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Featured
              </div>
              <FeatureCallout>✦ Pinned to top</FeatureCallout>
            </div>
            <div className="relative">
              <div className="font-heading text-base text-white leading-tight mb-[5px]">
                Finding balance in a busy creative life
              </div>
              <div className="text-[0.58rem] text-[rgba(255,255,255,0.7)]">
                Sarah Clarke · Mar 12 · 5 min read
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md overflow-hidden border border-[#f0f0f0]">
            <div className="h-[46px] bg-gradient-to-br from-[#d4f0e8] to-[#a8d8c4]"></div>
            <div className="p-[7px]">
              <ContentLine className="mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-[#f0f0f0]">
            <div className="h-[46px] bg-gradient-to-br from-[#f0e8d4] to-[#d8c4a8]"></div>
            <div className="p-[7px]">
              <ContentLine className="mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-[#f0f0f0]">
            <div className="h-[46px] bg-gradient-to-br from-[#f0d4d4] to-[#e8a8a8]"></div>
            <div className="p-[7px]">
              <ContentLine className="mb-1" />
              <ContentLine className="w-[58%]" />
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function AuthorsPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <div className="h-[120px] bg-gradient-to-br from-[#d4f0e8] to-[#5B8F7A] rounded-md mb-3 flex items-end p-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(50,35,140,0.45)] to-transparent"></div>
          <div className="relative font-heading text-base text-white leading-tight">
            A conversation on creative burnout
          </div>
        </div>
        <div className="bg-[#faf9ff] border border-[rgba(91,79,232,0.12)] rounded-md p-[9px] px-[11px] mb-[9px] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout>✦ Multiple Authors</FeatureCallout>
          <div className="flex gap-4">
            <div className="flex items-center gap-[5px]">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
              <div>
                <div className="text-[0.58rem] text-[#1a1a1a] font-medium">Sarah Clarke</div>
                <div className="text-[0.5rem] text-[#aaa]">Author</div>
              </div>
            </div>
            <div className="flex items-center gap-[5px]">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#a8d8c4] to-[#1a7a5e]"></div>
              <div>
                <div className="text-[0.58rem] text-[#1a1a1a] font-medium">James Okafor</div>
                <div className="text-[0.5rem] text-[#aaa]">Author</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function AuthorProfilesPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="grid grid-cols-[1fr_140px]">
        <div className="p-4 border-r border-[#f0f0f0]">
          <BlogHero />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
            <span className="text-[0.62rem] text-[#1a1a1a] font-medium">Sarah Clarke</span>
            <span className="text-[0.62rem] text-[#6b6b6b]">Mar 12</span>
          </div>
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
          <ContentLine className="w-[78%]" />
          <ContentLine className="w-[58%]" />
          <ContentLine />
          <div className="flex gap-[6px] mt-2">
            <div className="text-[0.6rem] text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] px-[10px] py-[4px] rounded-full">
              Lifestyle
            </div>
            <div className="text-[0.6rem] text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] px-[10px] py-[4px] rounded-full">
              Creativity
            </div>
          </div>
        </div>
        <div className="p-4 bg-[#faf9ff] border-l-2 border-[#5B4FE8] animate-[ringPulse_2.5s_ease-in-out_infinite] rounded-[5px]">
          <FeatureCallout>✦ Author Profile</FeatureCallout>
          <div className="flex flex-col items-center text-center gap-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8F86F0] to-[#5B4FE8]"></div>
            <div className="font-heading text-[0.7rem] text-[#1a1a1a] leading-tight">Sarah Clarke</div>
            <div className="text-[0.5rem] text-[#6b6b6b] leading-[1.5] font-light">
              Writer & creative in Portland. Sharing slow mornings & honest work.
            </div>
            <div className="flex gap-1 flex-wrap justify-center mt-[2px]">
              <div className="text-[0.48rem] text-[#5B4FE8] font-medium bg-[rgba(91,79,232,0.07)] px-[6px] py-[2px] rounded-full">
                Instagram
              </div>
              <div className="text-[0.48rem] text-[#5B4FE8] font-medium bg-[rgba(91,79,232,0.07)] px-[6px] py-[2px] rounded-full">
                Newsletter
              </div>
            </div>
            <div className="text-[0.5rem] text-[#5B4FE8] font-medium mt-[2px]">Follow →</div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}

function PostFooterPanel() {
  return (
    <MiniBrowser>
      <BlogNav />
      <div className="p-4">
        <ContentLine />
        <ContentLine className="w-[78%]" />
        <ContentLine className="w-[58%]" />
        <div className="flex gap-[6px] mb-[10px]">
          <div className="text-[0.6rem] text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] px-[10px] py-[4px] rounded-full">
            Lifestyle
          </div>
          <div className="text-[0.6rem] text-[#5B4FE8] bg-[rgba(91,79,232,0.07)] px-[10px] py-[4px] rounded-full">
            Creativity
          </div>
        </div>
        <div className="flex justify-content gap-[5px] mb-3">
          <div className="text-[0.6rem] text-[#ccc] px-[7px] py-[3px]">←</div>
          <div className="text-[0.6rem] text-white px-[9px] py-[3px] bg-[#5B4FE8] rounded-[3px] font-semibold">
            2
          </div>
          <div className="text-[0.6rem] text-[#6b6b6b] px-[7px] py-[3px]">→</div>
        </div>
        <div className="bg-gradient-to-br from-[#f0eeff] to-[#e8e4f8] border border-[rgba(91,79,232,0.18)] rounded-lg p-[14px] px-4 text-center animate-[ringPulse_2.5s_ease-in-out_infinite]">
          <FeatureCallout>✦ Post Footer Block</FeatureCallout>
          <div className="font-heading text-[0.82rem] text-[#1a1a1a] mb-1">
            Get my free content planning guide
          </div>
          <div className="text-[0.58rem] text-[#6b6b6b] mb-[10px] font-light max-w-[280px] mx-auto">
            The exact framework I use to plan a month of content in 2 hours.
          </div>
          <div className="flex gap-[5px] justify-center">
            <div className="bg-white border border-[#dde] rounded px-[11px] py-[5px] text-[0.54rem] text-[#aaa] min-w-[120px] text-left">
              email@example.com
            </div>
            <div className="bg-[#5B4FE8] text-white rounded px-3 py-[5px] text-[0.54rem] font-semibold whitespace-nowrap">
              Get it free
            </div>
          </div>
        </div>
      </div>
    </MiniBrowser>
  );
}
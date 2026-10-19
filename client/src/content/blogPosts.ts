import meetBetterBlog from "./posts/meet-betterblog.md?raw";

/** Someone who writes for the marketing-site blog. Shown in the post sidebar and the index. */
export type BlogAuthor = {
  name: string;
  /** Short role line under the name, e.g. "Co-founder · design". */
  role: string;
  /** One or two sentences. Plain text. */
  bio: string;
  /** Square photo under `client/public`. */
  photo: string;
  /** Optional link wrapped around these words of the bio (their studio, say). */
  link?: { text: string; href: string };
};

export const blogAuthors = {
  salaams: {
    name: "Salaams J. DeRosa",
    role: "Co-founder · design",
    bio: "Runs WeGo!, a web and marketing studio in the Bay Area. Occasionally found inside an inflatable costume.",
    link: { text: "WeGo!", href: "https://wegooakland.com" },
    photo: "/blog/authors/salaams.webp",
  },
  scott: {
    name: "Scott Duane",
    role: "Co-founder · engineering",
    bio: "Founder of Underdog Software, a software studio in the Bay Area. Dancer. Often found buried under his four animals.",
    link: { text: "Underdog Software", href: "https://www.underdogsoftware.xyz/" },
    photo: "/blog/authors/scott.webp",
  },
} as const satisfies Record<string, BlogAuthor>;

export type BlogAuthorKey = keyof typeof blogAuthors;

/** A marketing-site post. `slug` is the path under `/blog`. `content` is Markdown. */
export type BlogPost = {
  slug: string;
  title: string;
  /** One line under the title on the post page. */
  subtitle?: string;
  /** Shown on the index and as the meta description. */
  excerpt: string;
  /** Small label above the title, e.g. "Announcements". */
  category?: string;
  /** ISO date (`YYYY-MM-DD`). The index lists newest first. */
  publishedAt: string;
  /** The byline. Everyone listed shows in the post's "Written by" box too. */
  authors: BlogAuthorKey[];
  /** Image behind the post title and on the index card. Under `client/public`. */
  heroImage?: string;
  content: string;
};

/** Append an entry here to publish a post. While there is exactly one, /blog opens it directly. */
export const blogPosts: BlogPost[] = [
  {
    slug: "meet-betterblog",
    title: "Meet BetterBlog: everything your Squarespace blog was missing",
    subtitle:
      "Ten templates, a sidebar in 7.1, numbered pages, comments, email sign-ups and more. One script, nothing to migrate.",
    excerpt:
      "BetterBlog adds ten blog templates, sidebars, a table of contents, search, comments and email sign-ups to Squarespace 7.1 blogs. One snippet, no migration.",
    category: "Announcements",
    publishedAt: "2026-10-19",
    authors: ["salaams"],
    heroImage: "/blog/meet-betterblog-hero.webp",
    content: meetBetterBlog,
  },
];

export function listBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function formatBlogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Minutes at ~220 words a minute, never less than 1. */
export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/[#*_`>\-\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export type BlogHeading = { id: string; text: string };

/** The `##` headings of a post, for the table of contents. Ids match what the article renders. */
export function postHeadings(markdown: string): BlogHeading[] {
  return markdown
    .split("\n")
    .filter((line) => /^## /.test(line))
    .map((line) => {
      const text = line.replace(/^## /, "").trim();
      // Long headings get their first clause in the sidebar ("Ten templates. Twenty-five..." -> "Ten templates").
      const label = text.length > 32 ? text.split(/[.:]/)[0].trim() : text;
      return { id: headingId(text), text: label };
    });
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

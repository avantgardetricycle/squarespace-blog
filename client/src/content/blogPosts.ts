/** A marketing-site post. `slug` is the path under `/blog`. `content` is Markdown. */
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date (`YYYY-MM-DD`). The index lists newest first. */
  publishedAt: string;
  content: string;
};

/** Append an entry here to publish a post. */
export const blogPosts: BlogPost[] = [];

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

/** Squarespace-shaped blog JSON for renderer layout tests. */

export const BLOG_JSON_PATH = "/e2e/renderer-blog.json";

const BODY = [
  "<p>Opening paragraph of the fixture post so the article has a measurable last line of text.</p>",
  '<h1 style="font-size:48px">Oversized heading</h1>',
  "<p>More body copy after the oversized heading. The cap must shrink this heading on phones and leave it alone on desktop.</p>",
  '<h6 style="font-size:12px">Small heading</h6>',
  "<p>Closing paragraph that should be the last line of the article for the comments gap.</p>",
].join("");

function post(index: number, title: string) {
  return {
    id: `bb-layout-post-${index}`,
    title,
    urlId: `bb-layout-post-${index}`,
    fullUrl: `/e2e/renderer-blog/bb-layout-post-${index}`,
    assetUrl: `https://example.invalid/bb-layout-post-${index}.jpg`,
    body: BODY,
    excerpt: "A short deck for the header.",
    publishOn: 1_700_000_000_000 + index * 86_400_000,
    categories: ["Desk"],
    category: "Desk",
    author: { displayName: "Ada Lovelace" },
    authors: [{ displayName: "Ada Lovelace" }, { displayName: "Grace Hopper" }],
  };
}

export const blogJson = {
  collection: {
    title: "Layout Fixture",
    fullUrl: "/e2e/renderer-blog",
  },
  website: { title: "Layout Fixture Site" },
  items: [
    post(0, "Earlier post"),
    post(1, "Layout contract post"),
    post(2, "Later post"),
  ],
};

export const commentListJson = {
  comments: [
    {
      id: "c-layout-1",
      display_name: "Reader",
      body: "A fixture comment so the list has height.",
      created_at: "2024-01-02T00:00:00.000Z",
      like_count: 0,
      replies: [],
    },
  ],
  total: 1,
};

export const authorProfiles = {
  ada: {
    name: "Ada Lovelace",
    imageUrl: null,
    bio: "Wrote the first algorithm.",
    email: "ada@example.invalid",
    socialLinks: { website: "https://example.invalid/ada" },
  },
  grace: {
    name: "Grace Hopper",
    imageUrl: null,
    bio: "Invented the compiler.",
    email: "grace@example.invalid",
    socialLinks: { website: "https://example.invalid/grace" },
  },
  literal: {
    name: "Literal Author",
    imageUrl: null,
    bio: "See **bold** and <strong>nope</strong>",
    bioLong: "Footer literal stays **bold**",
    bioFormat: "text" as const,
    email: null,
    socialLinks: {},
  },
  markdown: {
    name: "Markdown Author",
    imageUrl: null,
    bio: "Wrote the **first** algorithm. [Notes](https://example.invalid/notes)",
    bioLong: "Footer **long** bio. [More](https://example.invalid/long)",
    bioFormat: "markdown" as const,
    email: null,
    socialLinks: {},
  },
  html: {
    name: "HTML Author",
    imageUrl: null,
    bio: '<p>Hello <strong>HTML</strong> <a href="https://example.invalid/ok">ok</a></p><script>alert(1)</script><img src="x" onerror="alert(1)">',
    bioLong: "<p>Footer <em>HTML</em> bio.</p><script>alert(2)</script>",
    bioFormat: "html" as const,
    email: null,
    socialLinks: {},
  },
};

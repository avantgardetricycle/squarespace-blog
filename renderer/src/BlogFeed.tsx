import React from 'react';

interface BlogPost {
  id: string;
  title: string;
  body: string;
  excerpt?: string;
  publishOn?: number;
  author?: { displayName: string };
  assetUrl?: string;
  fullUrl?: string;
}

interface BlogData {
  items?: BlogPost[];
}

interface Config {
  [key: string]: unknown;
}

interface BlogFeedProps {
  data: BlogData;
  config: Config;
}

export function BlogFeed({ data, config }: BlogFeedProps) {
  const posts = data.items ?? [];

  if (posts.length === 0) {
    return <div className="blog-feed-empty">No posts found.</div>;
  }

  return (
    <div className="blog-feed">
      {posts.map((post) => (
        <article key={post.id} className="blog-post">
          {post.assetUrl && (
            <img src={post.assetUrl} alt={post.title} className="blog-post-image" />
          )}
          <h2 className="blog-post-title">
            <a href={post.fullUrl}>{post.title}</a>
          </h2>
          {post.excerpt && (
            <p className="blog-post-excerpt">{post.excerpt}</p>
          )}
          {post.publishOn && (
            <time className="blog-post-date">
              {new Date(post.publishOn).toLocaleDateString()}
            </time>
          )}
        </article>
      ))}
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useParams } from "react-router";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { getDashboardMe } from "@/api/auth";
import { formatBlogDate, getBlogPost, listBlogPosts } from "@/content/blogPosts";
import { trackEvent } from "@/lib/analytics";

const articleComponents: Components = {
  p: ({ children }) => <p className="mb-5 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h2: ({ children }) => (
    <h2 className="font-heading mt-10 mb-3 text-2xl font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-heading mt-8 mb-2 text-xl font-semibold tracking-tight">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-[#5B4FE8]/40 pl-4 text-neutral-600">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-[#5B4FE8] underline underline-offset-2">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt ?? ""} className="my-6 w-full rounded-xl" />
  ),
  hr: () => <hr className="my-8 border-neutral-200" />,
};

function BlogChrome({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getDashboardMe().then((me) => setIsAuthenticated(!!me));
  }, []);

  const trackNav = (link: string) => {
    trackEvent("nav_click", { link });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-purple-100 selection:text-purple-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" aria-label="BetterBlog home">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/#features"
              onClick={() => trackNav("features")}
              className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors"
            >
              Features
            </Link>
            <Link
              to="/#how-it-works"
              onClick={() => trackNav("how_it_works")}
              className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors"
            >
              How it Works
            </Link>
            <Link
              to="/#pricing"
              onClick={() => trackNav("pricing")}
              className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/blog"
              onClick={() => trackNav("blog")}
              className="text-sm font-medium text-[#5B4FE8] transition-colors"
              aria-current="page"
            >
              Blog
            </Link>
            <Link
              to="/support"
              onClick={() => trackNav("support")}
              className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors"
            >
              Support
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full px-6">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="pt-16">{children}</main>

      <footer className="bg-white py-12 border-t border-neutral-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link to="/" aria-label="BetterBlog home">
              <Logo size="sm" />
            </Link>
            <div className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} BetterBlog. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function BlogLayout() {
  return (
    <BlogChrome>
      <Outlet />
    </BlogChrome>
  );
}

export function BlogIndex() {
  const posts = listBlogPosts();

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#5B4FE8]">BetterBlog</p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mt-3">Blog</h1>
        {posts.length === 0 ? (
          <p className="mt-8 text-neutral-500 text-lg">No posts yet.</p>
        ) : (
          <ul className="mt-12 divide-y divide-neutral-100 border-y border-neutral-100">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link to={`/blog/${post.slug}`} className="block py-8 group">
                  <time dateTime={post.publishedAt} className="text-sm text-neutral-400">
                    {formatBlogDate(post.publishedAt)}
                  </time>
                  <h2 className="font-heading text-2xl font-semibold tracking-tight mt-2 group-hover:text-[#5B4FE8] transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-neutral-600 leading-relaxed">{post.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const post = slug ? getBlogPost(slug) : undefined;

  if (!post) {
    return (
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading text-4xl font-bold tracking-tight">Post not found</h1>
          <p className="mt-4 text-neutral-500">That post isn&apos;t published.</p>
          <Link to="/blog" className="inline-block mt-8 text-sm font-medium text-[#5B4FE8] hover:text-[#4a3fd4]">
            Back to the blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <Link to="/blog" className="text-sm font-medium text-neutral-500 hover:text-[#5B4FE8] transition-colors">
          Blog
        </Link>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mt-4">{post.title}</h1>
        <time dateTime={post.publishedAt} className="block mt-4 text-sm text-neutral-400">
          {formatBlogDate(post.publishedAt)}
        </time>
        <div className="mt-10 text-[17px] text-neutral-800">
          <Markdown components={articleComponents}>{post.content}</Markdown>
        </div>
      </div>
    </article>
  );
}

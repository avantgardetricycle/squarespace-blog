import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, Outlet, useParams } from "react-router";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { InterestModal } from "@/app/components/InterestModal";
import { getDashboardMe } from "@/api/auth";
import {
  blogAuthors,
  formatBlogDate,
  getBlogPost,
  headingId,
  listBlogPosts,
  postHeadings,
  readingMinutes,
  type BlogAuthorKey,
  type BlogPost,
} from "@/content/blogPosts";
import { INTEREST_MODAL_SOURCES, trackEvent, type InterestModalSource } from "@/lib/analytics";
import { BUILD_TIME_IS_LIVE, resolveIsBetterBlogLive } from "@/lib/isBetterBlogLive";

/*
 * The marketing blog, drawn the way BetterBlog draws a customer's blog:
 * the index is The Digest (main column + sidebar), posts are The Publisher
 * (title over the hero image, sidebar on the right). Same fonts and colors
 * as the rest of betterblog.co.
 */

const ACCENT = "#5B4FE8";

const articleComponents: Components = {
  p: ({ children }) => <p className="mb-6 text-[18px] leading-[1.75] text-[#3A342F] last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[#1a1a1a]">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="my-6 list-disc space-y-2 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-6 list-decimal space-y-2 pl-6 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-[18px] leading-[1.7] text-[#3A342F]">{children}</li>,
  h2: ({ children }) => {
    const text = Array.isArray(children) ? children.join("") : String(children ?? "");
    return (
      <h2
        id={headingId(text)}
        className="font-heading mt-10 mb-4 scroll-mt-24 text-[30px] font-normal leading-tight tracking-tight text-[#1a1a1a] first:mt-0"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 className="font-heading mt-8 mb-3 text-2xl font-normal tracking-tight text-[#1a1a1a]">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-[#5B4FE8]/40 pl-4 text-neutral-600">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-[#5B4FE8] underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[#f3f1fe] px-1.5 py-0.5 font-mono text-[16px]">{children}</code>
  ),
  img: ({ src, alt }) => <img src={src} alt={alt ?? ""} className="my-6 w-full rounded-xl" />,
  hr: () => <hr className="my-8 border-neutral-200" />,
};

const SQUARESPACE_NOTICE =
  "is a trademark of Squarespace, Inc. BetterBlog is not in a partnership with, not sponsored or endorsed by, and has no affiliation with Squarespace.";

/* ---------- site chrome (header + footer) ---------- */

function BlogChrome({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getDashboardMe().then((me) => setIsAuthenticated(!!me));
  }, []);

  const trackNav = (link: string) => {
    trackEvent("nav_click", { link });
  };

  const navLink = "text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors";

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-purple-100 selection:text-purple-900">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" aria-label="BetterBlog home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/#features" onClick={() => trackNav("features")} className={navLink}>
              Features
            </Link>
            <Link to="/#how-it-works" onClick={() => trackNav("how_it_works")} className={navLink}>
              How it Works
            </Link>
            <Link to="/#pricing" onClick={() => trackNav("pricing")} className={navLink}>
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
            <Link to="/support" onClick={() => trackNav("support")} className={navLink}>
              Support
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="rounded-full bg-[#5B4FE8] px-6 text-white hover:bg-[#4a3fd4]">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Link to="/login" className={navLink}>
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="pt-16">{children}</main>

      <footer className="border-t border-neutral-100 bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link to="/" aria-label="BetterBlog home">
              <Logo size="sm" />
            </Link>
            <div className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} BetterBlog. All rights reserved.
            </div>
          </div>
          {/* Squarespace Developer Terms 17.4(e): trademark notice + link, wherever the name is used. */}
          <p className="mt-8 border-t border-neutral-100 pt-6 text-center text-xs leading-relaxed text-neutral-400">
            <a
              href="https://www.squarespace.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-neutral-600"
            >
              Squarespace
            </a>{" "}
            {SQUARESPACE_NOTICE}
          </p>
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

/* ---------- sidebar blocks (shared by index and post) ---------- */

const sideHeading = "mb-3 border-b border-[#ECE8E2] pb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#1a1a1a]";

function AuthorCard({ authorKey }: { authorKey: BlogAuthorKey }) {
  const author = blogAuthors[authorKey];
  const bio = author.link ? author.bio.split(author.link.text) : [author.bio];
  return (
    <div>
      <div className="flex items-center gap-3">
        <img
          src={author.photo}
          alt=""
          width={52}
          height={52}
          className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
        />
        <div>
          <div className="font-heading text-[20px] leading-tight text-[#1a1a1a]">{author.name}</div>
          <div className="text-[13px] text-[#766D64]">{author.role}</div>
        </div>
      </div>
      <p className="mt-2.5 text-[14px] leading-[1.6] text-[#5A534C]">
        {author.link && bio.length === 2 ? (
          <>
            {bio[0]}
            <a
              href={author.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5B4FE8] underline underline-offset-2"
            >
              {author.link.text}
            </a>
            {bio[1]}
          </>
        ) : (
          author.bio
        )}
      </p>
    </div>
  );
}

/** Start-a-trial card. Mirrors the landing page: dashboard when signed in, checkout when live, waitlist otherwise. */
function TrialCard({
  isAuthenticated,
  isLive,
  onWaitlist,
}: {
  isAuthenticated: boolean;
  isLive: boolean;
  onWaitlist: () => void;
}) {
  const href = isAuthenticated ? "/dashboard" : "/checkout?plan=professional&billing=annual";
  const label = isAuthenticated ? "Go to your dashboard" : "Start your free trial";
  const track = () => trackEvent("cta_click", { cta: "blog_trial", destination: href });
  const button = "mt-3 block w-full rounded-md bg-white py-2.5 text-center text-[14px] font-semibold text-[#5B4FE8]";

  return (
    <div className="rounded-lg bg-[#5B4FE8] p-4 text-white">
      <div className="font-heading text-[19px] leading-tight">Try it on your blog</div>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-white/85">
        7-day free trial, every feature on your plan, your real posts. Plans from $9 a month.
      </p>
      {isAuthenticated || isLive ? (
        <Link to={href} onClick={track} className={button}>
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onWaitlist} className={button}>
          {label}
        </button>
      )}
    </div>
  );
}

/** Email capture, honestly framed: an email when something ships, not a newsletter. Posts to the same leads list as the waitlist. */
function UpdatesCard() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("submitting");
    trackEvent("interest_modal_submit", { trigger_source: INTEREST_MODAL_SOURCES.blogUpdates });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) throw new Error("bad status");
      setStatus("success");
      setEmail("");
      trackEvent("interest_modal_success", { trigger_source: INTEREST_MODAL_SOURCES.blogUpdates });
    } catch {
      setStatus("error");
      trackEvent("interest_modal_error", {
        trigger_source: INTEREST_MODAL_SOURCES.blogUpdates,
        error_type: "api_error",
      });
    }
  };

  return (
    <div className="rounded-lg border border-[#e6e3f5] bg-[#f7f5ff] p-4">
      <div className="font-heading text-[19px] leading-tight text-[#1a1a1a]">Not a newsletter</div>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-[#5A534C]">
        One email when we ship something new. Nothing on a schedule, no digests.
      </p>
      {status === "success" ? (
        <p className="mt-3 text-[13px] font-medium text-[#5B4FE8]">You're on the list. We'll keep it short.</p>
      ) : (
        <form onSubmit={submit} className="mt-3">
          <label htmlFor="blog-updates-email" className="sr-only">
            Email address
          </label>
          <input
            id="blog-updates-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-2 w-full rounded-md border border-[#DCD6CE] bg-white px-2.5 py-2 text-[13px] text-neutral-800 outline-none focus:border-[#5B4FE8]"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-md bg-[#5B4FE8] py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {status === "submitting" ? "One sec…" : "Tell me when it ships"}
          </button>
          {status === "error" && (
            <p className="mt-2 text-[12px] text-red-600">That didn't go through. Try again in a moment.</p>
          )}
        </form>
      )}
    </div>
  );
}

/** The sidebar's state that both pages share: who's signed in, whether checkout is live, the waitlist modal. */
function useSidebarState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLive, setIsLive] = useState<boolean>(BUILD_TIME_IS_LIVE);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<InterestModalSource | null>(null);

  useEffect(() => {
    getDashboardMe().then((me) => setIsAuthenticated(!!me));
    resolveIsBetterBlogLive().then(setIsLive);
  }, []);

  const openWaitlist = useCallback(() => {
    trackEvent("interest_modal_open", { trigger_source: INTEREST_MODAL_SOURCES.blogTrial });
    setModalSource(INTEREST_MODAL_SOURCES.blogTrial);
    setModalOpen(true);
  }, []);

  const onModalOpenChange = useCallback((open: boolean) => {
    if (!open) setModalSource(null);
    setModalOpen(open);
  }, []);

  const modal = <InterestModal open={modalOpen} onOpenChange={onModalOpenChange} triggerSource={modalSource} />;

  return { isAuthenticated, isLive, openWaitlist, modal };
}

/* ---------- index: The Digest ---------- */

function PostMeta({ post, className = "" }: { post: BlogPost; className?: string }) {
  const names = post.authors.map((key) => blogAuthors[key].name).join(", ");
  return (
    <div className={`text-[15px] text-[#766D64] ${className}`}>
      {names} · <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time> ·{" "}
      {readingMinutes(post.content)} min read
    </div>
  );
}

export function BlogIndex() {
  const posts = listBlogPosts();
  const [featured, ...rest] = posts;
  const { isAuthenticated, isLive, openWaitlist, modal } = useSidebarState();

  // One post is not a list. Until there's a second, /blog is the post.
  if (posts.length === 1) {
    return <Navigate to={`/blog/${posts[0].slug}`} replace />;
  }

  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#ECE8E2] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.09em] text-[#5B4FE8]">BetterBlog</p>
            <h1 className="font-heading mt-2 text-4xl font-normal tracking-tight text-[#1a1a1a] md:text-5xl">Blog</h1>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-[#5A534C]">
            Notes on Squarespace blogging, new templates and features, from the two people who make BetterBlog.
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="min-w-0 flex-1">
            {!featured ? (
              <p className="text-lg text-neutral-500">No posts yet.</p>
            ) : (
              <>
                <Link to={`/blog/${featured.slug}`} className="group block">
                  {featured.heroImage && (
                    <div
                      className="aspect-[21/9] w-full rounded-md bg-[#f3f1fe] bg-cover bg-center"
                      style={{ backgroundImage: `url(${featured.heroImage})` }}
                      role="img"
                      aria-label=""
                    />
                  )}
                  {featured.category && (
                    <div className="mt-5 text-[13px] font-bold uppercase tracking-[0.08em] text-[#5B4FE8]">
                      {featured.category}
                    </div>
                  )}
                  <h2 className="font-heading mt-2 text-[34px] font-normal leading-[1.15] tracking-tight text-[#1a1a1a] transition-colors group-hover:text-[#5B4FE8] md:text-[40px]">
                    {featured.title}
                  </h2>
                  <PostMeta post={featured} className="mt-3" />
                  <p className="mt-3 text-[17px] leading-[1.65] text-[#5A534C]">{featured.excerpt}</p>
                </Link>

                {rest.length > 0 && (
                  <ul className="mt-12 grid gap-8 border-t border-[#ECE8E2] pt-10 sm:grid-cols-2">
                    {rest.map((post) => (
                      <li key={post.slug}>
                        <Link to={`/blog/${post.slug}`} className="group block">
                          {post.heroImage && (
                            <div
                              className="aspect-video w-full rounded-md bg-[#f3f1fe] bg-cover bg-center"
                              style={{ backgroundImage: `url(${post.heroImage})` }}
                            />
                          )}
                          {post.category && (
                            <div className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5B4FE8]">
                              {post.category}
                            </div>
                          )}
                          <h3 className="font-heading mt-1.5 text-[24px] font-normal leading-[1.2] text-[#1a1a1a] transition-colors group-hover:text-[#5B4FE8]">
                            {post.title}
                          </h3>
                          <PostMeta post={post} className="mt-2 text-[13px]" />
                          <p className="mt-2 text-[15px] leading-relaxed text-[#5A534C]">{post.excerpt}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-8 lg:w-[300px]">
            <div>
              <div className={sideHeading}>Who writes this</div>
              <div className="space-y-5">
                {(Object.keys(blogAuthors) as BlogAuthorKey[]).map((key) => (
                  <AuthorCard key={key} authorKey={key} />
                ))}
              </div>
            </div>
            <div>
              <div className={sideHeading}>Free trial</div>
              <TrialCard isAuthenticated={isAuthenticated} isLive={isLive} onWaitlist={openWaitlist} />
            </div>
            <div>
              <div className={sideHeading}>Updates</div>
              <UpdatesCard />
            </div>
          </aside>
        </div>
      </div>
      {modal}
    </section>
  );
}

/* ---------- post: The Publisher ---------- */

function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === "undefined") return;
    const headings = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function BlogPostPage() {
  const { slug } = useParams();
  const post = slug ? getBlogPost(slug) : undefined;
  const { isAuthenticated, isLive, openWaitlist, modal } = useSidebarState();
  const headings = useMemo(() => (post ? postHeadings(post.content) : []), [post]);
  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const active = useActiveHeading(headingIds);

  useEffect(() => {
    if (post) document.title = `${post.title} · BetterBlog`;
    return () => {
      document.title = "BetterBlog";
    };
  }, [post]);

  if (!post) {
    return (
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-heading text-4xl font-bold tracking-tight">Post not found</h1>
          <p className="mt-4 text-neutral-500">That post isn&apos;t published.</p>
          <Link to="/blog" className="mt-8 inline-block text-sm font-medium text-[#5B4FE8] hover:text-[#4a3fd4]">
            Back to the blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article>
      {/* Hero: brand gradient with the post image faded behind the title. */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2a2460_0%,#5B4FE8_55%,#8F86F0_100%)]">
        {post.heroImage && (
          <img
            src={post.heroImage}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-8 w-[820px] max-w-none rotate-[-8deg] opacity-[0.22] saturate-[0.6]"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,16,50,0.75)_0%,rgba(20,16,50,0.25)_50%,rgba(20,16,50,0)_100%)]" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto flex min-h-[420px] max-w-[1180px] flex-col justify-end pb-10 pt-24 md:min-h-[520px] md:pb-12">
            <nav className="mb-4 text-[14px] text-white/75" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-1.5">›</span>
              <Link to="/blog" className="hover:text-white">
                Blog
              </Link>
              {post.category && (
                <>
                  <span className="mx-1.5">›</span>
                  <span>{post.category}</span>
                </>
              )}
            </nav>
            {post.category && (
              <div className="mb-3 inline-block w-fit rounded bg-[#5B4FE8] px-3 py-1.5 text-[13px] font-bold uppercase tracking-[0.08em] text-white">
                {post.category}
              </div>
            )}
            <h1 className="font-heading max-w-[820px] text-[34px] font-normal leading-[1.12] tracking-tight text-white md:text-[46px]">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="mt-3 max-w-[760px] text-[17px] leading-[1.4] text-white/85 md:text-[20px]">{post.subtitle}</p>
            )}
            <PostMeta post={post} className="mt-3 !text-white/75" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="min-w-0 max-w-[760px] flex-1">
            <Markdown components={articleComponents}>{post.content}</Markdown>
            {isAuthenticated || isLive ? (
              <Link
                to={isAuthenticated ? "/dashboard" : "/checkout?plan=professional&billing=annual"}
                onClick={() => trackEvent("cta_click", { cta: "blog_post_end", destination: "checkout" })}
                className="mt-9 inline-block rounded-full bg-[#5B4FE8] px-8 py-3.5 text-[17px] font-semibold text-white hover:bg-[#4a3fd4]"
              >
                {isAuthenticated ? "Go to your dashboard" : "Start your free trial"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={openWaitlist}
                className="mt-9 inline-block rounded-full bg-[#5B4FE8] px-8 py-3.5 text-[17px] font-semibold text-white hover:bg-[#4a3fd4]"
              >
                Start your free trial
              </button>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-8 lg:sticky lg:top-24 lg:w-[300px]">
            {headings.length > 0 && (
              <div className="hidden lg:block">
                <div className={sideHeading}>Contents</div>
                <nav aria-label="Table of contents">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block border-l-2 py-1.5 pl-3 text-[14px] transition-colors ${
                        active === h.id
                          ? "border-[#5B4FE8] font-semibold text-[#5B4FE8]"
                          : "border-transparent text-[#5A534C] hover:text-[#1a1a1a]"
                      }`}
                      style={active === h.id ? { color: ACCENT } : undefined}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}
            <div>
              <div className={sideHeading}>Written by</div>
              <div className="space-y-5">
                {(Object.keys(blogAuthors) as BlogAuthorKey[]).map((key) => (
                  <AuthorCard key={key} authorKey={key} />
                ))}
              </div>
            </div>
            <div>
              <div className={sideHeading}>Free trial</div>
              <TrialCard isAuthenticated={isAuthenticated} isLive={isLive} onWaitlist={openWaitlist} />
            </div>
            <div>
              <div className={sideHeading}>Updates</div>
              <UpdatesCard />
            </div>
          </aside>
        </div>
      </div>
      {modal}
    </article>
  );
}

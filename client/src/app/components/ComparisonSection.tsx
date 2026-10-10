import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";

/*
 * BetterBlog vs moving the blog to Ghost, Substack or beehiiv.
 *
 * Every competitor fact here is checkable, so keep it current: re-verify
 * against each company's own pricing page before changing copy, and update
 * PRICES_AS_OF. Verified Oct 9 2026 on each company's own pricing page:
 * ghost.org/pricing (Publisher $29/mo yearly at 1,000 members; members =
 * registered members, free included), Substack help article "How much does
 * Substack cost?" (10% + Stripe), beehiiv.com/pricing (paid subscriptions
 * start on Lite, $49/mo yearly at 1,000), squarespace.com/pricing (Digital
 * Content and Memberships fee 5% Core, 1% Plus, 0% Advanced), ghost.org/help/
 * multiple-sites ("subscriptions include hosting for one Ghost publication").
 * Feature rows (checked Oct 9 2026): Ghost tutorial "Show reading time &
 * progress" (progress bar needs theme code) and forum "Feature request: table
 * of contents" (code injection/theme); Substack help "How do I add anchor
 * links" + "A guide to customizing your Substack website" (preset layouts,
 * homepage-only right rail; no TOC/progress-bar articles); beehiiv help "How
 * to add a TOC to your post" (TOC block) and "Customizing your site in the
 * Website Builder" (columns/widgets); no beehiiv progress-bar feature found.
 * Templates row: ghost.org/pricing (marketplace + custom themes from Publisher),
 * Substack guide (preset hero/list/grid layouts), beehiiv.com/pricing compare
 * table (website templates on all plans).
 * /blog row: ghost.org/help/run-ghost-from-a-subdirectory ("paid add-on for
 * our Business plan" + reverse proxy); Substack help "Can I use my root
 * domain..." (www./newsletter. subdomain formats; $50 custom domain per
 * pricing article); beehiiv help "Understanding domains in beehiiv"
 * (subdomain like newsletter.yoursite.com; custom domains on paid plans).
 */
const PRICES_AS_OF = "October 2026";

type Cell = { text: string; good?: boolean; note?: string };

const COLUMNS = ["BetterBlog", "Ghost", "Substack", "beehiiv"] as const;

const ROWS: { label: string; neutral?: boolean; cells: [Cell, Cell, Cell, Cell] }[] = [
  {
    label: "Where your blog lives",
    cells: [
      { text: "On your Squarespace site", good: true },
      { text: "A separate Ghost site" },
      { text: "On Substack" },
      { text: "A separate beehiiv site" },
    ],
  },
  {
    label: "Blog stays at yoursite.com/blog",
    cells: [
      { text: "Yes, it's your Squarespace blog page", good: true, note: "Same web address, so your search rankings stay put" },
      { text: "Business plan add-on and a server proxy", note: "On Publisher: a separate address like blog.yoursite.com" },
      { text: "Separate address", note: "Like newsletter.yoursite.com. Custom domain is $50 one-time" },
      { text: "Separate address", note: "Like newsletter.yoursite.com. Custom domain on paid plans" },
    ],
  },
  {
    label: "Several blogs on one website",
    cells: [
      { text: "Up to 3 blogs, each with its own template", good: true, note: "Publication plan" },
      { text: "One blog per subscription", note: "Each extra site is another plan" },
      { text: "Each blog is a separate publication" },
      { text: "Each blog is a separate publication" },
    ],
  },
  {
    label: "Move your posts and rebuild your design",
    cells: [
      { text: "Not needed", good: true },
      { text: "Yes" },
      { text: "Yes" },
      { text: "Yes" },
    ],
  },
  {
    label: "Designed blog templates",
    cells: [
      { text: "10 templates, switch in one click", good: true, note: "4 on Essentials, 8 on Professional, all 10 on Publication. Customize each with live preview" },
      { text: "Theme marketplace", note: "Custom themes from Publisher up" },
      { text: "A few preset layouts" },
      { text: "Website templates" },
    ],
  },
  {
    label: "Looks like the rest of your site",
    cells: [
      { text: "Uses your site's fonts and colors", good: true },
      { text: "Separate theme to set up" },
      { text: "Substack's layout" },
      { text: "beehiiv's site builder" },
    ],
  },
  {
    label: "Table of contents",
    cells: [
      { text: "Built in, generated from your headings", good: true },
      { text: "Needs theme code" },
      { text: "Build it by hand with anchor links" },
      { text: "Built-in block", good: true },
    ],
  },
  {
    label: "Reading progress bar",
    cells: [
      { text: "Built in", good: true },
      { text: "Needs theme code" },
      { text: "Not offered" },
      { text: "Not offered" },
    ],
  },
  {
    label: "Sidebars on posts",
    cells: [
      { text: "Built in", good: true, note: "Related posts, author, sign-up form and more" },
      { text: "Depends on your theme" },
      { text: "Not offered on posts" },
      { text: "Build your own with columns" },
    ],
  },
  {
    label: "Price to sell paid subscriptions",
    neutral: true,
    cells: [
      { text: "$29/mo", note: "Publication plan" },
      { text: "From $29/mo", note: "Publisher, up to 1,000 members" },
      { text: "$0", note: "Substack takes a cut instead" },
      { text: "From $49/mo", note: "Lite, up to 1,000 subscribers" },
    ],
  },
  {
    label: "Price rises as your audience grows",
    cells: [
      { text: "No", good: true },
      { text: "Yes" },
      { text: "Its cut grows with revenue" },
      { text: "Yes" },
    ],
  },
  {
    label: "Cut of your subscription revenue",
    cells: [
      { text: "0% to BetterBlog", good: true, note: "Squarespace charges 5% on Core, 1% on Plus, 0% on Advanced" },
      { text: "0%", good: true },
      { text: "10%" },
      { text: "0%", good: true },
    ],
  },
];

const BENEFITS = [
  {
    title: "Your site stays in one place",
    body: "Your blog keeps your domain, your design and the rest of your Squarespace site: pages, shop, bookings. Nothing to rebuild.",
  },
  {
    title: "No migration",
    body: "No exporting posts, setting up redirects or recreating your design somewhere else. Turn BetterBlog on and the posts you already have get the upgrade.",
  },
  {
    title: "A flat price, no cut from us",
    body: "BetterBlog doesn't charge by audience size and takes nothing from your paid subscriptions. Squarespace's own fees still apply.",
  },
];

export default function ComparisonSection() {
  return (
    <section id="compare" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-[1080px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#5B4FE8] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE8] opacity-50"></span>
            Why stay on Squarespace
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE8] opacity-50"></span>
          </div>
          <h2 className="font-heading text-[clamp(32px,4.4vw,52px)] font-normal leading-[1.1] text-[#0a0a0a] tracking-tight max-w-[760px] mx-auto">
            You don&apos;t have to move your blog <em className="italic text-[#5B4FE8]">to get a better one.</em>
          </h2>
          <p className="mt-5 text-[17px] text-[#5f5f5f] font-light leading-relaxed max-w-[620px] mx-auto">
            Ghost, Substack and beehiiv are good platforms. Moving to one means a second site, a migration, and a bill
            that grows with your audience. BetterBlog upgrades the blog you already have.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-[#ecebe6] bg-[#fbfaf8] p-6">
              <div className="w-9 h-9 rounded-full bg-[#5B4FE8]/10 text-[#5B4FE8] flex items-center justify-center mb-4">
                <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h3 className="font-heading text-[22px] leading-tight text-[#0a0a0a] mb-2">{b.title}</h3>
              <p className="text-[15px] text-[#5f5f5f] font-light leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        <p className="md:hidden text-[13px] text-[#6b6b6b] mb-2 text-right">Swipe to compare Ghost, Substack and beehiiv &rarr;</p>
        <div className="rounded-2xl border border-[#ecebe6] overflow-x-auto" tabIndex={0} aria-label="Comparison table, scrolls sideways on small screens">
          <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
            <caption className="sr-only">BetterBlog compared with moving your blog to Ghost, Substack or beehiiv</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-white p-3 md:p-4 w-[132px] md:w-[26%]">
                  <span className="sr-only">Feature</span>
                </th>
                {COLUMNS.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={
                      i === 0
                        ? "p-4 font-heading text-[19px] font-normal text-[#5B4FE8] bg-[#f3f1fe] border-b-2 border-[#5B4FE8]"
                        : "p-4 font-heading text-[19px] font-normal text-[#0a0a0a] border-b border-[#ecebe6]"
                    }
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-t border-[#ecebe6]">
                  <th scope="row" className="sticky left-0 z-10 bg-white p-3 md:p-4 font-medium text-[13px] md:text-[14px] text-[#0a0a0a] align-top shadow-[1px_0_0_#ecebe6] md:shadow-none">
                    {r.label}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td key={i} className={`p-4 align-top ${i === 0 ? "bg-[#f3f1fe]" : ""}`}>
                      <div className="flex items-start gap-2">
                        {r.neutral ? null : cell.good ? (
                          <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#1f8a5b]" strokeWidth={2.5} aria-hidden="true" />
                        ) : (
                          <Minus className="w-4 h-4 mt-0.5 shrink-0 text-[#a3a3a3]" strokeWidth={2} aria-hidden="true" />
                        )}
                        <div>
                          <div className={i === 0 ? "font-semibold text-[#0a0a0a]" : "text-[#2a2a2a]"}>{cell.text}</div>
                          {cell.note && <div className="text-[12.5px] text-[#6b6b6b] mt-1 leading-snug">{cell.note}</div>}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-[12.5px] text-[#6b6b6b] leading-relaxed max-w-[860px]">
          Prices and features are from each company&apos;s own pricing and help pages as of {PRICES_AS_OF}; prices are US, billed annually. Card processing fees
          apply on every platform, and BetterBlog requires a Squarespace 7.1 site on the Core plan or higher. Ghost,
          Substack and beehiiv are trademarks of their respective owners; BetterBlog is not affiliated with or endorsed
          by them.
        </p>
      </div>
    </section>
  );
}

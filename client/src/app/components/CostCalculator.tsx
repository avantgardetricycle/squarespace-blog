import { useState } from "react";
import { motion } from "motion/react";
import { trackEvent } from "@/lib/analytics";

/*
 * "Squarespace + BetterBlog" vs "Squarespace + Ghost / beehiiv".
 * Sits directly above pricing so the last prices a visitor sees before ours
 * are the higher two-platform totals (anchoring).
 *
 * A toggle keeps the comparison like-for-like:
 *  - Free blog: BetterBlog Professional vs each platform's cheapest plan for
 *    that many subscribers (Ghost Starter up to 1,000 members, then
 *    Publisher; beehiiv Free up to 2,500, then Lite). Sign-ups are collected
 *    with Squarespace's own newsletter block.
 *  - Paid subscriptions: BetterBlog Publication (sign-up forms + paywall) vs
 *    each platform's cheapest plan that can sell paid subscriptions (Ghost
 *    Publisher, beehiiv Lite).
 *
 * All prices US dollars, billed yearly. Verified Oct 9 2026 on each
 * company's own pricing page: ghost.org/pricing (members slider; Starter
 * capped at 1,000 members, no paid subscriptions), beehiiv.com/pricing
 * (subscribers slider; Free capped at 2,500, paid subscriptions from Lite),
 * squarespace.com/pricing (Core list price $29; promotions vary).
 * Re-verify before changing numbers and update PRICES_AS_OF.
 */
const PRICES_AS_OF = "October 2026";
const SQUARESPACE_CORE = 29;
const BB_PROFESSIONAL = 14;
const BB_PUBLICATION = 29;
const GHOST_STARTER = 15; // up to 1,000 members, free blogs only

const STEPS = [
  { subs: 1000, ghostPub: 29, beeLite: 49 },
  { subs: 2500, ghostPub: 46, beeLite: 69 },
  { subs: 5000, ghostPub: 63, beeLite: 95 },
  { subs: 10000, ghostPub: 88, beeLite: 119 },
  { subs: 25000, ghostPub: 141, beeLite: 169 },
  { subs: 50000, ghostPub: 208, beeLite: 249 },
  { subs: 100000, ghostPub: 274, beeLite: 399 },
];
const DEFAULT_STEP = 3; // 10,000 subscribers

type Mode = "free" | "paid";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number, max: number) => `${((n / max) * 100).toFixed(2)}%`;
const shortSubs = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

type Row = { name: string; add: number; note: string; ours?: boolean };

function Bar({ row, max }: { row: Row; max: number }) {
  const total = SQUARESPACE_CORE + row.add;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <div className={row.ours ? "text-[16px] font-bold text-[#5B4FE8]" : "text-[16px] font-semibold text-[#0a0a0a]"}>{row.name}</div>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-heading text-[28px] md:text-[30px] ${row.ours ? "text-[#5B4FE8]" : "text-[#0a0a0a]"}`}>{money(total)}</span>
          <span className="text-[13px] text-[#6b6b6b]">/mo</span>
        </div>
      </div>
      <div className="flex h-[28px] rounded-lg overflow-hidden bg-[#f4f3f0]" aria-hidden="true">
        <motion.div className="bg-[#d9d7d0]" initial={false} animate={{ width: pct(SQUARESPACE_CORE, max) }} transition={{ duration: 0.35, ease: "easeOut" }} />
        <motion.div
          className={row.ours ? "bg-[#5B4FE8]" : "bg-[#2b2940]"}
          initial={false}
          animate={{ width: pct(row.add, max) }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      <div className="text-[13px] text-[#6b6b6b]">{row.note}</div>
    </div>
  );
}

export default function CostCalculator() {
  const [step, setStep] = useState(DEFAULT_STEP);
  const [mode, setMode] = useState<Mode>("free");
  const [touched, setTouched] = useState(false);
  const s = STEPS[step];
  const subsLabel = s.subs.toLocaleString("en-US");
  const paid = mode === "paid";

  // Each platform's cheapest plan that does the job at this size.
  const bb = paid ? BB_PUBLICATION : BB_PROFESSIONAL;
  const ghost = !paid && s.subs <= 1000 ? GHOST_STARTER : s.ghostPub;
  const ghostPlan = !paid && s.subs <= 1000 ? "Ghost Starter" : "Ghost Publisher";
  const bee = !paid && s.subs <= 2500 ? 0 : s.beeLite;
  const beePlan = !paid && s.subs <= 2500 ? "beehiiv Free" : "beehiiv Lite";

  const rows: Row[] = [
    {
      name: "Squarespace + BetterBlog",
      add: bb,
      note: paid
        ? `BetterBlog Publication: sign-up forms and paywall. Same price at any size.`
        : `BetterBlog Professional. Same price at any size.`,
      ours: true,
    },
    {
      name: "Squarespace + Ghost",
      add: ghost,
      note: `${ghostPlan} for ${subsLabel} members. Your blog moves to a second site.`,
    },
    {
      name: "Squarespace + beehiiv",
      add: bee,
      note: `${beePlan} for ${subsLabel} subscribers. Your blog moves to a second site.`,
    },
  ];

  const maxTotal = SQUARESPACE_CORE + Math.max(bb, ghost, bee, 1);
  const yearly = (other: number) => (other - bb) * 12;
  const gSave = yearly(ghost);
  const bSave = yearly(bee);

  const markTouched = () => {
    if (!touched) {
      setTouched(true);
      trackEvent("cost_calculator_used");
    }
  };

  const tabClass = (on: boolean) =>
    `min-h-[44px] px-4 md:px-5 rounded-full text-[14px] md:text-[15px] font-semibold transition-colors ${
      on ? "bg-white text-[#0a0a0a] shadow-[0_1px_4px_rgba(0,0,0,.08)]" : "bg-transparent text-[#5f5f5f] hover:text-[#0a0a0a]"
    }`;

  return (
    <section id="cost" className="py-16 md:py-24 bg-[#f7f6f3]">
      <div className="container mx-auto px-4 max-w-[960px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#5B4FE8] mb-5">What a blog really costs</div>
          <h2 className="font-heading text-[clamp(30px,4.2vw,48px)] font-normal leading-[1.1] text-[#0a0a0a] tracking-tight max-w-[780px] mx-auto">
            You&apos;re already paying for Squarespace.{" "}
            <em className="italic text-[#5B4FE8]">Your blog shouldn&apos;t need a second platform.</em>
          </h2>
          <p className="mt-5 text-[17px] text-[#5f5f5f] font-light leading-relaxed max-w-[600px] mx-auto">
            Move your blog to Ghost or beehiiv and you keep paying Squarespace for the rest of your site, plus a second
            bill that grows with every subscriber. BetterBlog stays one flat price.
          </p>
        </motion.div>

        <div className="bg-white border border-[#ecebe6] rounded-[20px] p-6 md:p-9 flex flex-col gap-8 shadow-[0_12px_40px_rgba(26,26,42,.06)]">
          <div className="flex flex-col gap-3">
            <div className="text-[16px] font-semibold text-[#0a0a0a]" id="bb-paid-label">
              Do you want to sell paid subscriptions?
            </div>
            <div role="radiogroup" aria-labelledby="bb-paid-label" className="flex w-fit gap-1 p-1 bg-[#f4f3f0] rounded-full">
              {(
                [
                  ["free", "No, my blog is free"],
                  ["paid", "Yes"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  className={tabClass(mode === m)}
                  onClick={() => {
                    setMode(m);
                    markTouched();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="flex justify-between items-baseline gap-4 flex-wrap">
              <label htmlFor="bb-subs" className="text-[16px] font-semibold text-[#0a0a0a]">
                How many people subscribe to your blog?
              </label>
              <div className="font-heading text-[32px] md:text-[34px] text-[#5B4FE8]" aria-hidden="true">
                {subsLabel}
              </div>
            </div>
            <input
              id="bb-subs"
              type="range"
              min={0}
              max={STEPS.length - 1}
              step={1}
              value={step}
              onChange={(e) => {
                setStep(Number(e.target.value));
                markTouched();
              }}
              aria-valuetext={`${subsLabel} subscribers`}
              className="w-full h-7 cursor-pointer accent-[#5B4FE8]"
            />
            <div className="flex justify-between text-[12px] md:text-[13px] text-[#6b6b6b]" aria-hidden="true">
              {STEPS.map((x) => (
                <span key={x.subs}>{shortSubs(x.subs)}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6" aria-live="polite">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#5f5f5f] -mb-1" aria-hidden="true">
              <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#d9d7d0]" />Squarespace Core {money(SQUARESPACE_CORE)}</span>
              <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#5B4FE8]" />BetterBlog {money(bb)}</span>
              <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#2b2940]" />Second blog platform</span>
            </div>
            {rows.map((r) => (
              <Bar key={r.name} row={r} max={maxTotal} />
            ))}
          </div>

          <div className="border-t border-[#ecebe6] pt-6 flex flex-wrap gap-x-8 gap-y-4 items-center justify-between">
            <p className="text-[16px] md:text-[17px] leading-snug text-[#0a0a0a] m-0 max-w-[560px]">
              {gSave > 0 && bSave > 0 && (
                <>
                  Over a year, you&apos;d save <b className="text-[#1f8a5b]">{money(gSave)}</b> compared with Ghost and{" "}
                  <b className="text-[#1f8a5b]">{money(bSave)}</b> compared with beehiiv.
                </>
              )}
              {gSave > 0 && bSave <= 0 && (
                <>
                  Over a year, you&apos;d save <b className="text-[#1f8a5b]">{money(gSave)}</b> compared with Ghost.
                  beehiiv&apos;s free plan costs less up to 2,500 subscribers, but your blog would move off your site.
                </>
              )}
              {gSave <= 0 && bSave > 0 && (
                <>
                  Over a year, you&apos;d save <b className="text-[#1f8a5b]">{money(bSave)}</b> compared with beehiiv, and
                  match Ghost&apos;s price without moving your blog.
                </>
              )}
              {gSave <= 0 && bSave <= 0 && <>Same price or less, and your blog stays on your site.</>}
            </p>
            <a
              href="#pricing"
              onClick={() => trackEvent("cost_calculator_cta_click", { subscribers: s.subs, mode })}
              className="inline-flex items-center min-h-[44px] px-6 rounded-full bg-[#5B4FE8] hover:bg-[#4a3fd6] text-white font-semibold text-[15px] no-underline transition-colors"
            >
              See BetterBlog plans
            </a>
          </div>
        </div>

        <p className="mt-5 text-[12.5px] text-[#6b6b6b] leading-relaxed">
          Each company&apos;s published US prices as of {PRICES_AS_OF}, billed yearly, using each platform&apos;s cheapest
          plan for that many subscribers.{" "}
          {paid
            ? "Paid subscriptions: BetterBlog Publication, Ghost Publisher and beehiiv Lite, the cheapest plans on each that can sell them. Squarespace charges its own fee on paid memberships (5% on Core)."
            : "Free blog: BetterBlog Professional, with sign-ups collected by Squarespace's newsletter block; Ghost Starter (up to 1,000 members) then Publisher; beehiiv Free (up to 2,500 subscribers) then Lite."}{" "}
          Ghost and beehiiv prices include emailing your subscribers; BetterBlog doesn&apos;t send email. Ghost and beehiiv
          are trademarks of their respective owners; BetterBlog is not affiliated with or endorsed by them.
        </p>
      </div>
    </section>
  );
}

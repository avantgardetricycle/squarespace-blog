import { useState } from "react";
import { motion } from "motion/react";
import { trackEvent } from "@/lib/analytics";

/*
 * "Squarespace + BetterBlog" vs "Squarespace + Ghost / beehiiv" for a blog
 * with free subscribers. Sits directly above pricing so the last prices a
 * visitor sees before ours are the higher two-platform totals (anchoring).
 *
 * Compares like with like: BetterBlog Publication (the plan with email
 * sign-up forms) against each platform's plan that holds that many
 * subscribers. All prices billed annually, US dollars.
 * Re-verify against ghost.org/pricing and beehiiv.com/pricing before
 * changing, and update PRICES_AS_OF. Sources (Oct 2026): Ghost Publisher
 * tiers and beehiiv Scale tiers as published; Squarespace Core $29/mo annual.
 */
const PRICES_AS_OF = "October 2026";
const SQUARESPACE_CORE = 29;
const BETTERBLOG_PUBLICATION = 29;

const STEPS = [
  { subs: 5000, ghost: 63, bee: 68 },
  { subs: 10000, ghost: 88, bee: 85 },
  { subs: 25000, ghost: 141, bee: 128 },
  { subs: 50000, ghost: 208, bee: 171 },
  { subs: 100000, ghost: 274, bee: 343 },
];
const DEFAULT_STEP = 1; // 10,000 subscribers

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number, max: number) => `${((n / max) * 100).toFixed(2)}%`;

type Row = { name: string; add: number; addLabel: string; note: string; ours?: boolean };

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
  const [touched, setTouched] = useState(false);
  const s = STEPS[step];
  const subsLabel = s.subs.toLocaleString("en-US");

  const rows: Row[] = [
    {
      name: "Squarespace + BetterBlog",
      add: BETTERBLOG_PUBLICATION,
      addLabel: `BetterBlog ${money(BETTERBLOG_PUBLICATION)}`,
      note: "Your blog stays on your site. Same price at any size.",
      ours: true,
    },
    {
      name: "Squarespace + Ghost",
      add: s.ghost,
      addLabel: `Ghost ${money(s.ghost)}`,
      note: `Ghost Publisher for ${subsLabel} members. Your blog moves to a second site.`,
    },
    {
      name: "Squarespace + beehiiv",
      add: s.bee,
      addLabel: `beehiiv ${money(s.bee)}`,
      note: `beehiiv Scale for up to ${subsLabel} subscribers. Your blog moves to a second site.`,
    },
  ];

  const maxTotal = SQUARESPACE_CORE + Math.max(s.ghost, s.bee, BETTERBLOG_PUBLICATION);
  const yearly = (other: number) => money((other - BETTERBLOG_PUBLICATION) * 12);

  const onChange = (v: number) => {
    setStep(v);
    if (!touched) {
      setTouched(true);
      trackEvent("cost_calculator_used");
    }
  };

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
              onChange={(e) => onChange(Number(e.target.value))}
              aria-valuetext={`${subsLabel} subscribers`}
              className="w-full h-7 cursor-pointer accent-[#5B4FE8]"
            />
            <div className="flex justify-between text-[12px] md:text-[13px] text-[#6b6b6b]" aria-hidden="true">
              {STEPS.map((x) => (
                <span key={x.subs}>{x.subs >= 1000 ? `${x.subs / 1000}k` : x.subs}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6" aria-live="polite">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#5f5f5f] -mb-1" aria-hidden="true">
              <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#d9d7d0]" />Squarespace Core {money(SQUARESPACE_CORE)}</span>
              <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#5B4FE8]" />BetterBlog {money(BETTERBLOG_PUBLICATION)}</span>
              <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#2b2940]" />Second blog platform</span>
            </div>
            {rows.map((r) => (
              <Bar key={r.name} row={r} max={maxTotal} />
            ))}
          </div>

          <div className="border-t border-[#ecebe6] pt-6 flex flex-wrap gap-x-8 gap-y-4 items-center justify-between">
            <p className="text-[16px] md:text-[17px] leading-snug text-[#0a0a0a] m-0">
              Over a year, you&apos;d save <b className="text-[#1f8a5b]">{yearly(s.ghost)}</b> compared with Ghost and{" "}
              <b className="text-[#1f8a5b]">{yearly(s.bee)}</b> compared with beehiiv.
            </p>
            <a
              href="#pricing"
              onClick={() => trackEvent("cost_calculator_cta_click", { subscribers: s.subs })}
              className="inline-flex items-center min-h-[44px] px-6 rounded-full bg-[#5B4FE8] hover:bg-[#4a3fd6] text-white font-semibold text-[15px] no-underline transition-colors"
            >
              See BetterBlog plans
            </a>
          </div>
        </div>

        <p className="mt-5 text-[12.5px] text-[#6b6b6b] leading-relaxed">
          For a blog with free subscribers. Each company&apos;s published US prices as of {PRICES_AS_OF}, billed
          annually: Squarespace Core, BetterBlog Publication (includes email sign-up forms), Ghost Publisher and beehiiv
          Scale. Ghost and beehiiv prices include emailing your subscribers; BetterBlog doesn&apos;t send email. Ghost and
          beehiiv are trademarks of their respective owners; BetterBlog is not affiliated with or endorsed by them.
        </p>
      </div>
    </section>
  );
}

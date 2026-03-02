import { motion } from 'motion/react';

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 md:py-[100px] px-4 md:px-16 bg-white overflow-hidden">
      <div className="max-w-[1160px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-[10px] text-[0.6rem] font-semibold tracking-[0.24em] uppercase text-[#5B4FE8] mb-[18px]">
              <div className="w-[28px] h-[1.5px] bg-[#5B4FE8] opacity-35 rounded-sm"></div>
              How it works
              <div className="w-[28px] h-[1.5px] bg-[#5B4FE8] opacity-35 rounded-sm"></div>
            </div>
            <h2 className="font-heading text-[clamp(2.2rem,4vw,3.2rem)] font-normal tracking-tight text-[#0a0a0a] leading-[1.1] mb-4">
              One line of code.
              <br />
              Then <em className="italic text-[#5B4FE8]">forget about code forever.</em>
            </h2>
            <p className="text-[0.95rem] text-[#6b6b6b] font-light leading-[1.7] max-w-[460px] mx-auto">
              The snippet installs in 60 seconds. After that, everything is controlled from your BetterBlog dashboard — no touching Squarespace, no developer needed.
            </p>
          </motion.div>
        </div>

        {/* Steps */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 items-stretch gap-8">
          {/* STEP 1 */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="flex flex-col gap-0 group bg-white/40 backdrop-blur-sm border border-[#e4e3de]/50 rounded-2xl p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 min-w-0"
          >
            <div className="font-heading text-[4.5rem] font-normal tracking-tight leading-none text-[#e4e3de] mb-1 select-none transition-colors duration-200 group-hover:text-[rgba(91,79,232,0.2)]">
              01
            </div>
            <div className="text-[0.58rem] font-bold tracking-[0.18em] uppercase text-[#5B4FE8] mb-[10px]">
              Step one
            </div>
            <div className="font-heading text-2xl font-normal tracking-tight text-[#0a0a0a] leading-[1.2] mb-3">
              Get your snippet
            </div>
            <div className="text-[0.85rem] text-[#6b6b6b] font-light leading-[1.75] mb-7">
              Sign up and your personal script tag is waiting in your BetterBlog dashboard — ready to copy with one click.
            </div>

            <div className="rounded-[14px] overflow-hidden border border-[#e4e3de] shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-200 group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] group-hover:-translate-y-[3px]">
              <div className="bg-[#f7f6f3] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-[22px] h-[22px] rounded-[5px] bg-[#5B4FE8] flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2L8 8H2l5 4-2 6 7-4 7 4-2-6 5-4h-6z" />
                    </svg>
                  </div>
                  <div className="font-heading text-xs text-[#0a0a0a] tracking-tight">BetterBlog</div>
                </div>
                <div className="flex gap-[6px] mb-4">
                  <div className="text-[0.52rem] text-[#5B4FE8] font-medium px-[10px] py-1 rounded-md bg-[rgba(91,79,232,0.12)] border border-[rgba(91,79,232,0.2)]">
                    Install
                  </div>
                  <div className="text-[0.52rem] text-[#6b6b6b] font-medium px-[10px] py-1 rounded-md bg-white border border-[#e4e3de]">
                    Features
                  </div>
                  <div className="text-[0.52rem] text-[#6b6b6b] font-medium px-[10px] py-1 rounded-md bg-white border border-[#e4e3de]">
                    Settings
                  </div>
                </div>
                <div className="text-[0.52rem] font-semibold tracking-[0.1em] uppercase text-[#6b6b6b] mb-2">
                  Your install snippet
                </div>
                <div className="bg-[#13121f] rounded-lg p-[14px] px-4 relative">
                  <div className="absolute top-[10px] right-[10px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-[5px] px-2 py-[3px] text-[0.48rem] text-[rgba(255,255,255,0.4)] font-medium tracking-wider cursor-pointer">
                    Copy
                  </div>
                  <div className="font-mono text-[0.62rem] text-[#a8b0c8] leading-[1.6] whitespace-nowrap overflow-hidden">
                    <span className="text-[#c792ea]">&lt;script</span>{' '}
                    <span className="text-[#80cbc4]">src</span>=
                    <span className="text-[#c3e88d]">"https://cdn.betterblog.io/bb.js"</span>
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span className="text-[#80cbc4]">key</span>=
                    <span className="text-[#c3e88d]">"bb_live_k9x2m..."</span>
                    <span className="text-[#c792ea]">&gt;&lt;/script&gt;</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="text-[0.52rem] text-[#6b6b6b] font-light">Your site key</div>
                  <div className="font-mono text-[0.56rem] text-[#5B4FE8] font-medium bg-[rgba(91,79,232,0.12)] border border-[rgba(91,79,232,0.15)] px-2 py-[2px] rounded">
                    bb_live_k9x2mf84
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* STEP 2 */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col gap-0 group bg-white/40 backdrop-blur-sm border border-[#e4e3de]/50 rounded-2xl p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 min-w-0"
          >
            <div className="font-heading text-[4.5rem] font-normal tracking-tight leading-none text-[#e4e3de] mb-1 select-none transition-colors duration-200 group-hover:text-[rgba(91,79,232,0.2)]">
              02
            </div>
            <div className="text-[0.58rem] font-bold tracking-[0.18em] uppercase text-[#5B4FE8] mb-[10px]">
              Step two
            </div>
            <div className="font-heading text-2xl font-normal tracking-tight text-[#0a0a0a] leading-[1.2] mb-3">
              Paste it once
            </div>
            <div className="text-[0.85rem] text-[#6b6b6b] font-light leading-[1.75] mb-7">
              In Squarespace, go to Settings → Advanced → Code Injection → Footer. Paste your snippet. Save. That's the last time you'll touch this screen.
            </div>

            <div className="rounded-[14px] overflow-hidden border border-[#e4e3de] shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-200 group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] group-hover:-translate-y-[3px]">
              <div className="bg-[#f7f6f3]">
                <div className="bg-[#1a1a2e] px-4 py-[10px] flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex gap-1">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#ff5f57]"></div>
                    <div className="w-[7px] h-[7px] rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-[7px] h-[7px] rounded-full bg-[#28c940]"></div>
                  </div>
                  <div className="flex-1 bg-[rgba(255,255,255,0.07)] rounded h-4 flex items-center px-2">
                    <div className="font-mono text-[0.48rem] text-[rgba(255,255,255,0.3)] tracking-wide">
                      yoursite.squarespace.com/config/advanced
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex gap-[5px] items-center text-[0.5rem] text-[#6b6b6b] mb-3">
                    Settings <span className="text-[#ccc]">›</span> Advanced <span className="text-[#ccc]">›</span>{' '}
                    <strong className="text-[#1a1a1a]">Code Injection</strong>
                  </div>
                  <div className="bg-white rounded-lg border border-[#e4e3de] overflow-hidden">
                    <div className="px-[14px] py-[10px] border-b border-[#e4e3de] text-[0.6rem] font-semibold text-[#0a0a0a]">
                      Code Injection
                    </div>
                    <div className="px-[14px] pt-[10px] pb-1 text-[0.52rem] font-semibold text-[#6b6b6b] uppercase tracking-[0.1em]">
                      Footer
                    </div>
                    <div className="mx-[14px] mb-[10px] bg-[#13121f] rounded-md p-[10px] px-3 font-mono text-[0.58rem] text-[#a8b0c8] leading-[1.7]">
                      <span className="text-[#c792ea]">&lt;script</span>{' '}
                      <span className="text-[#80cbc4]">src</span>=
                      <span className="text-[#c3e88d]">"https://cdn.betterblog.io/bb.js"</span>
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-[#80cbc4]">key</span>=
                      <span className="text-[#c3e88d]">"bb_live_k9x2m..."</span>
                      <span className="text-[#c792ea]">&gt;&lt;/script&gt;</span>
                    </div>
                    <div className="px-[14px] py-[10px] border-t border-[#e4e3de] flex justify-end gap-[7px]">
                      <div className="text-[0.56rem] text-[#6b6b6b] px-3 py-[5px] rounded-[5px] border border-[#e4e3de] bg-white font-medium">
                        Cancel
                      </div>
                      <div className="text-[0.56rem] text-white px-[14px] py-[5px] rounded-[5px] bg-[#1a1a2e] font-semibold">
                        Save
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* STEP 3 */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex flex-col gap-0 group bg-white/40 backdrop-blur-sm border border-[#e4e3de]/50 rounded-2xl p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 min-w-0"
          >
            <div className="font-heading text-[4.5rem] font-normal tracking-tight leading-none text-[#e4e3de] mb-1 select-none transition-colors duration-200 group-hover:text-[rgba(91,79,232,0.2)]">
              03
            </div>
            <div className="text-[0.58rem] font-bold tracking-[0.18em] uppercase text-[#5B4FE8] mb-[10px]">
              Step three
            </div>
            <div className="font-heading text-2xl font-normal tracking-tight text-[#0a0a0a] leading-[1.2] mb-3">
              Format from your dashboard
            </div>
            <div className="text-[0.85rem] text-[#6b6b6b] font-light leading-[1.75] mb-7">
              Turn features on, tweak settings, choose layouts — all from BetterBlog. Every change goes live the moment you hit save.
            </div>

            <div className="rounded-[14px] overflow-hidden border border-[#e4e3de] shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-200 group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] group-hover:-translate-y-[3px]">
              <div className="bg-[#f7f6f3] p-5">
                <div className="flex items-center gap-2 mb-[14px]">
                  <div className="text-[0.5rem] text-[#6b6b6b] flex items-center gap-[3px]">
                    ← Dashboard
                  </div>
                  <div className="font-heading text-[0.8rem] text-[#0a0a0a] tracking-tight">Blog Settings</div>
                  <div className="ml-auto text-[0.48rem] font-semibold bg-[rgba(40,201,64,0.12)] text-[#1a8a2e] px-2 py-[3px] rounded-full tracking-wider">
                    ● Live
                  </div>
                </div>
                <div className="text-[0.5rem] font-bold tracking-[0.14em] uppercase text-[#6b6b6b] pb-[6px] border-b border-[#e4e3de] mb-[10px]">
                  Layout & Design
                </div>
                <div className="flex items-center justify-between py-[7px] border-b border-[rgba(228,227,222,0.5)]">
                  <div>
                    <div className="text-[0.6rem] text-[#1a1a1a] font-normal">Sidebar</div>
                    <div className="text-[0.5rem] text-[#6b6b6b] font-light mt-[1px]">Right side</div>
                  </div>
                  <div className="w-7 h-4 rounded-lg bg-[#5B4FE8] relative flex-shrink-0">
                    <div className="absolute w-3 h-3 rounded-full bg-white top-[2px] left-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-[7px] border-b border-[rgba(228,227,222,0.5)]">
                  <div>
                    <div className="text-[0.6rem] text-[#1a1a1a] font-normal">Template Layout</div>
                  </div>
                  <div className="text-[0.52rem] text-[#5B4FE8] font-medium bg-[rgba(91,79,232,0.12)] px-[9px] py-[3px] rounded border border-[rgba(91,79,232,0.2)]">
                    Magazine
                  </div>
                </div>
                <div className="flex items-center justify-between py-[7px] border-b border-[rgba(228,227,222,0.5)]">
                  <div>
                    <div className="text-[0.6rem] text-[#1a1a1a] font-normal">Scroll Progress Bar</div>
                  </div>
                  <div className="w-7 h-4 rounded-lg bg-[#5B4FE8] relative flex-shrink-0">
                    <div className="absolute w-3 h-3 rounded-full bg-white top-[2px] left-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-[7px] border-b border-[rgba(228,227,222,0.5)]">
                  <div>
                    <div className="text-[0.6rem] text-[#1a1a1a] font-normal">Reading Time</div>
                  </div>
                  <div className="w-7 h-4 rounded-lg bg-[#5B4FE8] relative flex-shrink-0">
                    <div className="absolute w-3 h-3 rounded-full bg-white top-[2px] left-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-[7px]">
                  <div>
                    <div className="text-[0.6rem] text-[#1a1a1a] font-normal">Featured Posts</div>
                  </div>
                  <div className="w-7 h-4 rounded-lg bg-[#ddd] relative flex-shrink-0">
                    <div className="absolute w-3 h-3 rounded-full bg-white top-[2px] left-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"></div>
                  </div>
                </div>
                <div className="mt-[14px] flex justify-between items-center">
                  <div className="text-[0.52rem] text-[#6b6b6b] font-light flex items-center gap-1">
                    <span className="text-[0.4rem] text-[#28c940] animate-pulse">●</span>
                    Changes go live on save
                  </div>
                  <div className="text-[0.58rem] text-white px-4 py-[7px] rounded-md bg-[#5B4FE8] font-semibold shadow-[0_2px_10px_rgba(91,79,232,0.3)]">
                    Save Changes
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 md:mt-20 text-center"
        >
          <p className="text-[0.88rem] text-[#6b6b6b] font-light mb-6 leading-[1.7]">
            Setup takes under a minute. Your blog looks completely different in under five.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-[9px] bg-[#5B4FE8] text-white text-[0.88rem] font-semibold px-8 py-[14px] rounded-full no-underline shadow-[0_4px_20px_rgba(91,79,232,0.3)] transition-all duration-150 hover:bg-[#4e43d4] hover:-translate-y-[2px] hover:shadow-[0_8px_32px_rgba(91,79,232,0.4)]"
          >
            Start your free trial
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-transform duration-150 group-hover:translate-x-[3px]"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
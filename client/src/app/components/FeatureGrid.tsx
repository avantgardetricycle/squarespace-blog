import { motion } from "motion/react";

const features = [
  {
    category: "layout",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </>
    ),
    name: "Sidebars",
  },
  {
    category: "layout",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 15l4-4 3 3 4-5 4 6" />
        <circle cx="8.5" cy="9.5" r="1.5" />
      </>
    ),
    name: "Header Image Formatting",
  },
  {
    category: "layout",
    icon: (
      <>
        <rect x="3" y="3" width="8" height="10" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="11" width="8" height="10" rx="1.5" />
        <rect x="3" y="16" width="8" height="5" rx="1.5" />
      </>
    ),
    name: "Template Layouts",
  },
  {
    category: "layout",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    name: "Collection Formatting",
  },
  {
    category: "nav",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="22" y2="22" />
      </>
    ),
    name: "Post Search",
  },
  {
    category: "nav",
    icon: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="3.5" cy="6" r="1" />
        <circle cx="3.5" cy="12" r="1" />
        <circle cx="3.5" cy="18" r="1" />
      </>
    ),
    name: "Table of Contents",
  },
  {
    category: "nav",
    icon: (
      <>
        <path d="M3 6h18M7 12h10M11 18h2" />
      </>
    ),
    name: "Tags & Category Filters",
  },
  {
    category: "nav",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </>
    ),
    name: "Recent Posts",
  },
  {
    category: "nav",
    icon: (
      <>
        <circle cx="7" cy="12" r="3" />
        <circle cx="17" cy="6" r="3" />
        <circle cx="17" cy="18" r="3" />
        <line x1="10" y1="10.5" x2="14" y2="7.5" />
        <line x1="10" y1="13.5" x2="14" y2="16.5" />
      </>
    ),
    name: "Related Posts",
  },
  {
    category: "nav",
    icon: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    name: "Social Sharing",
  },
  {
    category: "nav",
    icon: (
      <>
        <polyline points="9 18 15 12 9 6" />
        <line x1="3" y1="12" x2="6" y2="12" />
      </>
    ),
    name: "Breadcrumbs",
  },
  {
    category: "nav",
    icon: (
      <>
        <rect x="3" y="9" width="18" height="11" rx="2" />
        <path d="M3 13h18" />
        <line x1="8.5" y1="9" x2="8.5" y2="6" />
        <line x1="15.5" y1="9" x2="15.5" y2="6" />
      </>
    ),
    name: "Pagination",
  },
  {
    category: "reader",
    icon: (
      <>
        <line x1="3" y1="20" x2="21" y2="20" />
        <rect x="3" y="14" width="9" height="6" rx="1" />
        <line x1="3" y1="10" x2="21" y2="10" strokeDasharray="2 2" opacity="0.5" />
      </>
    ),
    name: "Scroll Progress Bar",
  },
  {
    category: "reader",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </>
    ),
    name: "Reading Time",
  },
  {
    category: "pub",
    icon: (
      <>
        <circle cx="8" cy="8" r="3.5" />
        <circle cx="16" cy="8" r="3.5" />
        <path d="M2 20c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6" />
      </>
    ),
    name: "Multiple Authors",
  },
  {
    category: "pub",
    icon: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 20c0-3 2.7-5 6-5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
        <line x1="13" y1="17" x2="21" y2="17" />
        <line x1="17" y1="13" x2="17" y2="21" />
      </>
    ),
    name: "Author Profiles",
  },
  {
    category: "pub",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <line x1="8" y1="19" x2="16" y2="19" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="11" x2="13" y2="11" />
      </>
    ),
    name: "Post Footer Block",
  },
  {
    category: "pub",
    icon: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
    name: "Featured & Pinned Posts",
  },
  {
    category: "pub",
    icon: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="9" y2="18" />
        <polyline points="17 15 21 19 17 23" />
        <line x1="21" y1="19" x2="13" y2="19" />
      </>
    ),
    name: "Advanced Post Sorting",
  },
];

export function FeatureGrid() {
  const categoryStyles = {
    layout: {
      iconBg: "bg-[rgba(91,79,232,0.12)]",
      iconStroke: "stroke-[#5B4FE8]",
    },
    nav: {
      iconBg: "bg-[rgba(26,122,94,0.08)]",
      iconStroke: "stroke-[#1a7a5e]",
    },
    reader: {
      iconBg: "bg-[rgba(154,26,62,0.07)]",
      iconStroke: "stroke-[#9a1a3e]",
    },
    pub: {
      iconBg: "bg-[rgba(122,74,26,0.07)]",
      iconStroke: "stroke-[#7a4a1a]",
    },
  };

  return (
    <section className="bg-[#f7f6f3] py-[100px] px-4 md:px-16">
      <div className="max-w-[1180px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between gap-12 mb-[60px] flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <div className="inline-flex items-center gap-[10px] text-[0.6rem] font-semibold tracking-[0.24em] uppercase text-[#5B4FE8] mb-[18px]">
              <span className="w-[28px] h-[1.5px] bg-[#5B4FE8] opacity-35 rounded-[2px]"></span>
              The full feature set
              <span className="w-[28px] h-[1.5px] bg-[#5B4FE8] opacity-35 rounded-[2px]"></span>
            </div>
            <h2 className="font-heading text-[clamp(2.6rem,4.5vw,3.8rem)] font-normal tracking-[-0.03em] text-[#0a0a0a] leading-[1.05]">
              Every feature your<br />blog has been <em className="italic text-[#5B4FE8]">missing.</em>
            </h2>
          </div>

          {/* Feature Count Stamp */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0 flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full bg-[#5B4FE8] text-white animate-[stampPulse_3s_ease-in-out_infinite]"
            style={{
              boxShadow: "0 0 0 12px rgba(91,79,232,0.1), 0 0 0 24px rgba(91,79,232,0.05)",
            }}
          >
            <div className="font-heading text-[2.8rem] font-normal leading-none tracking-[-0.04em]">
              19
            </div>
            <div className="text-[0.52rem] font-semibold tracking-[0.16em] uppercase opacity-70 mt-[2px]">
              Features
            </div>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-2 gap-y-4">
          {features.map((feature, idx) => {
            const styles = categoryStyles[feature.category as keyof typeof categoryStyles];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04, duration: 0.45 }}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center justify-center gap-[10px] text-center cursor-default transition-transform duration-[180ms] py-4"
              >
                <div
                  className={`w-[72px] h-[72px] rounded-[18px] flex items-center justify-center flex-shrink-0 transition-transform duration-[180ms] hover:scale-110 ${styles.iconBg}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-8 h-8 fill-none stroke-[1.5] ${styles.iconStroke}`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <div className="font-sans text-[0.88rem] font-medium text-[#1a1a1a] tracking-[-0.01em] leading-[1.3] px-2">
                  {feature.name}
                </div>
              </motion.div>
            );
          })}

          {/* Coming Soon Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: features.length * 0.04, duration: 0.45 }}
            whileHover={{ y: -4 }}
            className="flex flex-col items-center justify-center gap-[10px] text-center cursor-default transition-transform duration-[180ms] py-4"
          >
            <div className="w-[72px] h-[72px] rounded-[18px] bg-[rgba(91,79,232,0.1)] flex items-center justify-center flex-shrink-0">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5B4FE8"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="font-sans text-[0.88rem] font-medium text-[#5B4FE8] tracking-[-0.01em] leading-[1.3] px-2">
              <div className="text-[0.52rem] font-bold tracking-[0.16em] uppercase opacity-50 mb-1">
                More coming
              </div>
              New features every release
            </div>
          </motion.div>
        </div>

        {/* Bridge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-10 flex items-center justify-between gap-6 flex-wrap"
        >
          <p className="text-[0.82rem] text-[#6b6b6b] font-light leading-[1.6] flex-1 min-w-[280px]">
            <strong className="text-[#1a1a1a] font-medium">
              Want to see every feature in action?
            </strong>{" "}
            Click any feature in the explorer below to see exactly what it looks like on a real blog.
          </p>
          <a
            href="#feature-explorer"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#5B4FE8] text-white text-[0.8rem] font-semibold px-6 py-3 rounded-full transition-all duration-150 hover:bg-[#4e43d4] hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(91,79,232,0.35)] whitespace-nowrap group"
          >
            Open Feature Explorer
            <svg
              width="14"
              height="14"
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
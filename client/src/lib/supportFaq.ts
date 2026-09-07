export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  tagBg: string;
  tagFg: string;
  items: FaqItem[];
}

export const SUPPORT_FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    tagBg: "#EDEAFB",
    tagFg: "#5647D9",
    items: [
      {
        q: "How do I install BetterBlog on my Squarespace site?",
        a: "Sign up for an account and copy your personal install snippet from the BetterBlog dashboard. Paste it once into Squarespace under Settings → Advanced → Code Injection → Header, then save. That's the only code you'll ever touch.",
      },
      {
        q: "Do I need to know how to code?",
        a: "No. The install step is copy-and-paste, and everything after that — sidebars, layouts, table of contents, and every other feature — is toggled from your BetterBlog dashboard.",
      },
      {
        q: "Which Squarespace plans does BetterBlog work with?",
        a: "BetterBlog requires Code Injection, which is available on Squarespace's Core plan or higher (Core, Plus, Advanced, and equivalent legacy plans like Business and Commerce). It is not available on Personal or Basic plans. Squarespace 7.1 is required; 7.0 is not supported.",
      },
      {
        q: "How long does setup take?",
        a: "Most people are fully installed in under a minute, and have their blog restyled with sidebars, a table of contents, and related posts within five.",
      },
    ],
  },
  {
    id: "installation",
    label: "Installation",
    tagBg: "#E6F5EC",
    tagFg: "#1E9E5A",
    items: [
      {
        q: "Where exactly do I paste my install snippet?",
        a: "In Squarespace, go to Settings → Advanced → Code Injection, then paste the snippet into the Header field and save. The Header field is required so BetterBlog's preloader can run before the page content loads and prevent a flash of the default Squarespace layout.",
      },
      {
        q: "My snippet isn't loading — what should I check first?",
        a: "Confirm the snippet was saved in the Header (not Footer) field, that you copied the whole tag including the closing script tag, and that you clicked Save in Squarespace. Then force-refresh your live blog (Cmd+Shift+R / Ctrl+Shift+R).",
      },
      {
        q: "Can I use BetterBlog on more than one site?",
        a: "Yes. Your plan sets the limit: 1 blog on Essentials, 3 on Professional, and unlimited on Publication. Each Squarespace domain gets its own snippet; multiple blogs on the same domain share one snippet.",
      },
      {
        q: "Does the snippet slow my site down?",
        a: "The script loads asynchronously and is under 20KB gzipped, so it won't block your page from rendering or affect your Squarespace speed score in any noticeable way.",
      },
    ],
  },
  {
    id: "features",
    label: "Features",
    tagBg: "#FCEAEE",
    tagFg: "#D1465F",
    items: [
      {
        q: "How do sidebars work?",
        a: "Open Customize Blog and add modules to Left Sidebar or Right Sidebar — a sidebar appears when it has modules. You can set width and sticky behavior on the collection page. Some templates lock sidebars; switch templates if the sidebar section is hidden.",
      },
      {
        q: "Can I turn features on and off individually?",
        a: "Yes. Toggles in Customize Blog control dates, reading time, progress bar, comments, and more. Changes go live when you click Save — nothing needs to be republished in Squarespace. Settings a template owns are hidden because the template controls them.",
      },
      {
        q: "Does BetterBlog support Related Posts and a Table of Contents?",
        a: "Both are built in. The table of contents is generated from Heading 2 and Heading 3 blocks in your post, and related posts can be placed in a sidebar or the post footer.",
      },
      {
        q: "Can I customize colors and fonts to match my site?",
        a: "Layout features inherit your Squarespace site styles by default, so typography and color stay consistent with the rest of your site.",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing & Plans",
    tagBg: "#F3EFE4",
    tagFg: "#9A7B3F",
    items: [
      {
        q: "Is there a free trial?",
        a: "Yes, every plan starts with a 7-day free trial. No card is charged until the trial ends, and you can cancel anytime before then from Account.",
      },
      {
        q: "How do I upgrade or downgrade my plan?",
        a: "Go to Account → Current Plan and click Change Plan. That opens the Stripe billing portal, where you can switch tiers and billing cadence.",
      },
      {
        q: "What happens if I cancel?",
        a: "Your features stay live until the end of your current billing period. After that, BetterBlog stops rendering on your site, but your underlying Squarespace content is never touched.",
      },
      {
        q: "Can I get an invoice for my records?",
        a: "Invoices are emailed each billing cycle and are available in the Stripe billing portal (open it from Account → Update Payment Method or Change Plan).",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    tagBg: "#FBEFE1",
    tagFg: "#C07A2A",
    items: [
      {
        q: "Changes aren't showing on my live site.",
        a: "Confirm the snippet is in Code Injection → Header and that you clicked Save in both Squarespace and BetterBlog. Then hard-refresh the live blog (Cmd/Ctrl+Shift+R). Preview on a .squarespace.com URL may be blocked — check the live site in a new tab.",
      },
      {
        q: "A feature disappeared after I changed templates.",
        a: "Settings a template controls are hidden from the customizer — the template is making those decisions. Switch templates if you need that control back, or customize whatever the new template leaves unlocked.",
      },
      {
        q: "I'm seeing a “site key not recognized” error.",
        a: "This usually means the snippet was copied partially, or belongs to a different site. Open Installation instructions in your dashboard, copy the full snippet again, and replace what's in Code Injection.",
      },
      {
        q: "My table of contents is missing entries.",
        a: "The table of contents is built from Heading 2 and Heading 3 blocks in your post. Text that's only bolded or sized larger won't be picked up — use an actual heading block instead.",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    tagBg: "#E7EEFB",
    tagFg: "#3E6FD1",
    items: [
      {
        q: "How do I log in?",
        a: "BetterBlog uses magic links, not passwords. Enter your account email on the login page and click the link we send. Links expire after 24 hours — request a new one if yours has expired.",
      },
      {
        q: "How do I change the email on my account?",
        a: "Account email cannot be changed in the dashboard. Contact the BetterBlog team from Support and we'll help move the account.",
      },
      {
        q: "Can I add teammates to my account?",
        a: "Not at this time. Each BetterBlog account is a single login. You can share access by having a teammate use the same email inbox, or contact Support if you need a different arrangement.",
      },
    ],
  },
];

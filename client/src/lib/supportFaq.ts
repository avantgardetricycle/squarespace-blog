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
        a: "Sign up for an account and copy your personal install snippet from the BetterBlog dashboard. Paste it once into Squarespace under Settings → Advanced → Code Injection → Footer, then save. That's the only code you'll ever touch.",
      },
      {
        q: "Do I need to know how to code?",
        a: "No. The install step is copy-and-paste, and everything after that — sidebars, layouts, table of contents, and every other feature — is toggled from your BetterBlog dashboard.",
      },
      {
        q: "Which Squarespace plans does BetterBlog work with?",
        a: "BetterBlog works on any Squarespace plan that supports Code Injection, which includes all Business and Commerce plans, plus most current Personal plans. Squarespace 7.1 is fully supported.",
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
        a: "In Squarespace, go to Settings → Advanced → Code Injection, then paste the snippet into the Footer field and save. Avoid the Header field — the script is built to load at the end of the page.",
      },
      {
        q: "My snippet isn't loading — what should I check first?",
        a: "Confirm the snippet was saved in the Footer (not Header) field, that you copied the whole tag including the closing script tag, and that your site key matches the one shown in your dashboard's Install tab.",
      },
      {
        q: "Can I use BetterBlog on more than one site?",
        a: "Yes. Each site gets its own site key and its own snippet. You can manage multiple sites from a single BetterBlog account and switch between their dashboards freely.",
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
        a: "Turn on a left, right, or double sidebar from the dashboard, then choose what fills it — an author bio, recent posts, categories, or a newsletter signup. No template editing required.",
      },
      {
        q: "Can I turn features on and off individually?",
        a: "Yes, every one of the 20 features has its own toggle in Blog Settings. Changes go live the moment you hit Save Changes — nothing needs to be republished.",
      },
      {
        q: "Does BetterBlog support Related Posts and a Table of Contents?",
        a: "Both are built in. The table of contents is generated automatically from your post's headings, and related posts are matched by shared tags and categories.",
      },
      {
        q: "Can I customize colors and fonts to match my site?",
        a: "Yes — layout features inherit your Squarespace site styles by default, and you can override colors, spacing, and typography per feature from the dashboard.",
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
        a: "Yes, every plan starts with a 14-day free trial. No card is charged until the trial ends, and you can cancel anytime before then from your account settings.",
      },
      {
        q: "How do I upgrade or downgrade my plan?",
        a: "Go to your dashboard → Settings → Plan, and choose a new tier. Upgrades apply immediately; downgrades take effect at the start of your next billing cycle.",
      },
      {
        q: "What happens if I cancel?",
        a: "Your features stay live until the end of your current billing period. After that, the install snippet stops rendering BetterBlog features, but your underlying Squarespace content is never touched.",
      },
      {
        q: "Can I get an invoice for my records?",
        a: "Every invoice is available under Settings → Billing → Invoice History, and is also emailed automatically each billing cycle.",
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
        a: "Give it a minute — changes typically propagate within 30 seconds. If it's been longer, try a hard refresh (Cmd/Ctrl+Shift+R), and confirm you clicked Save Changes and not just closed the tab.",
      },
      {
        q: "A feature disappeared after a Squarespace update.",
        a: "Squarespace template updates occasionally change page structure. Re-check the feature's toggle in your dashboard — if it's still on, contact us with your site URL and we'll take a look directly.",
      },
      {
        q: "I'm seeing a “site key not recognized” error.",
        a: "This usually means the snippet was copied partially, or belongs to a different site. Head to Install in your dashboard, copy the full snippet again, and replace what's in Code Injection.",
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
        q: "How do I reset my password?",
        a: "From the login screen, choose “Forgot password” and enter your account email. You'll get a reset link within a couple of minutes — check spam if it doesn't arrive.",
      },
      {
        q: "How do I change the email on my account?",
        a: "Go to Settings → Account → Email, enter the new address, and confirm it via the verification link we send. Your login updates as soon as it's confirmed.",
      },
      {
        q: "Can I add teammates to my account?",
        a: "Team seats are available on the Studio plan and above. Invite teammates from Settings → Team using their email address.",
      },
    ],
  },
];

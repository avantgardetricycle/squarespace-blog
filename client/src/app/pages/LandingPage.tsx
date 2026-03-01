import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { Check, ArrowRight, PanelLeft, Image, LayoutTemplate, Grid3x3, List, Tag, Clock, Link2, ChevronRight, TrendingUp, Users, UserCircle2, Hash } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { BeforeAfterComparison } from "@/app/components/BeforeAfterComparison";
import { getDashboardMe } from "@/api/auth";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getDashboardMe().then((me) => setIsAuthenticated(!!me));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const pricingTiers = [
    {
      planKey: "starter",
      name: "Starter",
      description: "Perfect for personal blogs",
      monthlyPrice: 15,
      annualPrice: 12,
      features: ["1 Blog", "Basic Customization", "Standard Layouts", "Email Support"],
      highlight: false
    },
    {
      planKey: "pro",
      name: "Pro",
      description: "For serious content creators",
      monthlyPrice: 29,
      annualPrice: 24,
      features: ["3 Blogs", "Advanced Customization", "All Premium Layouts", "Priority Support", "Custom CSS Injection"],
      highlight: true
    },
    {
      planKey: "agency",
      name: "Agency",
      description: "Manage multiple client sites",
      monthlyPrice: 79,
      annualPrice: 65,
      features: ["Unlimited Blogs", "White Labeling", "API Access", "Dedicated Success Manager", "Team Collaboration"],
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full px-6">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-[#5B4FE8] transition-colors hidden sm:block">Log in</Link>
                <Button asChild className="bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full px-6">
                  <Link to="/login">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 to-emerald-50 border border-purple-100 text-purple-700 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Compatible with Squarespace 7.1
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-heading font-bold tracking-tight text-neutral-900 leading-[1.1]">
              Finally, a Squarespace blog worth having.
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
              BetterBlog gives you full design control over your Squarespace blog - plus all the professional blogging features you've been missing.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {isAuthenticated ? (
                <Button size="lg" className="h-12 px-8 text-base bg-[#5B4FE8] hover:bg-[#4a3fd4] rounded-full w-full sm:w-auto" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" className="h-12 px-8 text-base bg-[#5B4FE8] hover:bg-[#4a3fd4] rounded-full w-full sm:w-auto" asChild>
                  <Link to="/login">Start Free Trial</Link>
                </Button>
              )}
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-neutral-200 hover:bg-neutral-50 rounded-full w-full sm:w-auto" asChild>
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#5B4FE8] to-[#8F86F0] rounded-2xl blur opacity-20"></div>
            <div className="relative rounded-xl border border-neutral-200 bg-white shadow-2xl overflow-hidden">
              <BeforeAfterComparison />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      {/* Intro Banner */}
      <section className="py-20 bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-[#8F86F0] mb-5">
              Everything you need. One extension.
            </div>
            <h2 className="font-heading text-4xl md:text-6xl font-normal text-white tracking-tight leading-[1.15] mb-5">
              Other tools solve <em className="italic text-[#8F86F0]">one</em> problem.<br />BetterBlog solves them all.
            </h2>
            <p className="text-lg text-white/55 font-light max-w-2xl mx-auto leading-relaxed">
              There are plugins for sidebars. Workarounds for table of contents. Hacks for author profiles. BetterBlog replaces all of it — with a single, cohesive extension built specifically for Squarespace bloggers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Layout & Design */}
      <section id="features" className="py-20 bg-[#f7f6f3] border-b border-[#d4d4d0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[#5B4FE8] mb-3">
              Layout & Design
            </div>
            <h3 className="font-heading text-3xl md:text-4xl font-normal tracking-tight text-[#0a0a0a] leading-tight mb-3">
              Your blog, designed <em className="italic text-[#5B4FE8]">your</em> way.
            </h3>
            <p className="text-base text-[#6b6b6b] font-light leading-relaxed max-w-2xl">
              Squarespace gives you a beautiful website and then hands you a blog that looks like an afterthought. BetterBlog puts you back in control — with real layout tools that match the design power you have everywhere else on your site.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: PanelLeft,
                name: "Sidebars — Left & Right",
                copy: "Add a fully customizable sidebar to the left or right of your blog content. Surface what matters — recent posts, categories, a newsletter signup, or anything else — without touching a line of code."
              },
              {
                icon: Image,
                name: "Header Image Formatting",
                copy: "Take full control of how your post header images look — size, crop, positioning, and style. Make every post feel intentional, not like it was slapped together by a template."
              },
              {
                icon: LayoutTemplate,
                name: "Template Layouts",
                copy: "Choose from a set of professionally designed blog layouts — or customize your own. Apply them sitewide or per post. Your blog finally has the same design flexibility as the rest of your site."
              },
              {
                icon: Grid3x3,
                name: "Collection Formatting",
                copy: "Control how post cards are displayed within each collection independently, so your travel blog looks nothing like your recipe blog, and your portfolio reads exactly the way you want it to. Full design control, per collection."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-7 border border-[#d4d4d0] flex flex-col gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-1">
                  <feature.icon className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <div className="font-heading text-lg font-normal text-[#0a0a0a] tracking-tight">
                  {feature.name}
                </div>
                <div className="text-sm text-[#6b6b6b] leading-relaxed font-light">
                  {feature.copy}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Navigation & Discovery */}
      <section className="py-20 bg-white border-b border-[#d4d4d0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[#5B4FE8] mb-3">
              Navigation & Discovery
            </div>
            <h3 className="font-heading text-3xl md:text-4xl font-normal tracking-tight text-[#0a0a0a] leading-tight mb-3">
              Help readers find what they're <em className="italic text-[#5B4FE8]">looking for.</em>
            </h3>
            <p className="text-base text-[#6b6b6b] font-light leading-relaxed max-w-2xl">
              A great blog isn't just well-written — it's well-organized. BetterBlog adds the navigation and discovery tools that keep readers engaged, exploring, and coming back.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: List,
                name: "Table of Contents",
                copy: "Automatically generate a table of contents from your post headings. Readers jump to what they need; you look organized and professional. Essential for long-form content."
              },
              {
                icon: Tag,
                name: "Tags & Category Filters",
                copy: "Give readers real filtering power — by tag, category, or both. Let them self-sort into the content that's relevant to them, the way every serious blog should."
              },
              {
                icon: Clock,
                name: "Recent Posts",
                copy: "Surface your latest content automatically — in the sidebar, at the end of a post, or anywhere you need it. Keep readers moving through your archive instead of bouncing."
              },
              {
                icon: Link2,
                name: "Related Posts",
                copy: "Automatically show readers posts they're likely to love next, based on tags and categories. More time on site. More value delivered. Less work for you."
              },
              {
                icon: ChevronRight,
                name: "Breadcrumbs",
                copy: "Show readers exactly where they are on your site — and give them an easy path back. A small detail that makes a big difference to navigation, SEO, and overall polish."
              },
              {
                icon: Hash,
                name: "Pagination",
                copy: "Replace Squarespace's bare previous/next arrows with real pagination — numbered pages, post counts, and clear navigation that tells readers exactly where they are in your archive. Because '→' is not a page number."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#f7f6f3] rounded-xl p-7 border border-[#d4d4d0] flex flex-col gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-1">
                  <feature.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="font-heading text-lg font-normal text-[#0a0a0a] tracking-tight">
                  {feature.name}
                </div>
                <div className="text-sm text-[#6b6b6b] leading-relaxed font-light">
                  {feature.copy}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reader Experience */}
      <section className="py-20 bg-[#f7f6f3] border-b border-[#d4d4d0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[#5B4FE8] mb-3">
              Reader Experience
            </div>
            <h3 className="font-heading text-3xl md:text-4xl font-normal tracking-tight text-[#0a0a0a] leading-tight mb-3">
              The little things that make readers <em className="italic text-[#5B4FE8]">stay.</em>
            </h3>
            <p className="text-base text-[#6b6b6b] font-light leading-relaxed max-w-2xl">
              The best blogs feel effortless to read. BetterBlog adds the details that signal quality and keep readers engaged — the kind of features you see on the blogs you admire, now available on yours.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
            {[
              {
                icon: TrendingUp,
                name: "Reading Progress — % Read",
                copy: "Show readers how far through a post they are with a subtle progress indicator. It encourages completion, sets expectations on long reads, and adds a layer of polish that readers notice — even if they can't say why."
              },
              {
                icon: List,
                name: "Table of Contents",
                copy: "An auto-generated, scrollable table of contents that updates as readers move through your post. Great for long-form content, tutorials, and anything readers might want to reference more than once."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-7 border border-[#d4d4d0] flex flex-col gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-1">
                  <feature.icon className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <div className="font-heading text-lg font-normal text-[#0a0a0a] tracking-tight">
                  {feature.name}
                </div>
                <div className="text-sm text-[#6b6b6b] leading-relaxed font-light">
                  {feature.copy}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Publishing & Management */}
      <section className="py-20 bg-white border-b border-[#d4d4d0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[#5B4FE8] mb-3">
              Publishing & Management
            </div>
            <h3 className="font-heading text-3xl md:text-4xl font-normal tracking-tight text-[#0a0a0a] leading-tight mb-3">
              Built for blogs that are <em className="italic text-[#5B4FE8]">actually</em> being run.
            </h3>
            <p className="text-base text-[#6b6b6b] font-light leading-relaxed max-w-2xl">
              Whether you're a solo blogger or managing content for multiple clients, BetterBlog gives you the publishing infrastructure that Squarespace forgot to build.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#f7f6f3] rounded-xl p-7 border border-[#d4d4d0] flex flex-col gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="font-heading text-lg font-normal text-[#0a0a0a] tracking-tight">
                Multiple Authors
              </div>
              <div className="text-sm text-[#6b6b6b] leading-relaxed font-light">
                Publish posts under any author name on your site. Add multiple authors to a single post, or assign different contributors across your blog. Perfect for team blogs, guest contributors, and client sites with more than one voice.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#f7f6f3] rounded-xl p-7 border border-[#d4d4d0] flex flex-col gap-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-1">
                <UserCircle2 className="w-5 h-5 text-[#5B4FE8]" />
              </div>
              <div className="font-heading text-lg font-normal text-[#0a0a0a] tracking-tight">
                Author Profiles
              </div>
              <div className="text-sm text-[#6b6b6b] leading-relaxed font-light">
                Display a rich author profile on every post — name, photo, bio, and social links. Give your contributors a presence that builds trust with readers and keeps your publication feeling professional, not anonymous.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Closer */}
      <section className="py-20 bg-[#5B4FE8] text-white text-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-heading text-4xl md:text-5xl font-normal text-white tracking-tight leading-tight mb-4">
              And we're <em className="italic text-white/60">just getting started.</em>
            </h2>
            <p className="text-base text-white/65 font-light max-w-lg mx-auto mb-8 leading-relaxed">
              BetterBlog is actively developed with new features shipping regularly — all based on what real Squarespace bloggers actually need. One extension. Everything your blog deserves.
            </p>
            <Button 
              asChild 
              className="bg-white text-[#5B4FE8] hover:bg-white/90 rounded-lg px-8 h-12 text-sm font-semibold"
            >
              <Link to="/login">Get BetterBlog →</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Implementation */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[#5B4FE8] mb-3">
                How it Works
              </div>
              <h2 className="font-heading text-4xl md:text-5xl font-normal text-[#0a0a0a] tracking-tight leading-tight mb-4">
                One line of code. <em className="italic text-[#5B4FE8]">Seriously.</em>
              </h2>
              <p className="text-lg text-[#6b6b6b] font-light leading-relaxed">
                Copy a snippet. Paste it into your Squarespace Custom CSS. That's it.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-[#f7f6f3] rounded-2xl border border-[#d4d4d0] overflow-hidden shadow-xl">
              {/* Browser chrome mockup */}
              <div className="bg-[#e4e3de] px-4 py-3 flex items-center gap-2 border-b border-[#d4d4d0]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-block bg-white rounded px-3 py-1 text-xs text-[#6b6b6b]">
                    Squarespace → Design → Custom CSS
                  </div>
                </div>
              </div>

              {/* Code snippet */}
              <div className="bg-white p-8 border-b border-[#d4d4d0]">
                <pre className="text-sm text-[#0a0a0a] font-mono leading-relaxed">
                  <code>{`/* Paste your BetterBlog snippet here */\n@import url('https://betterblog.app/v1/YOUR_ID.js');`}</code>
                </pre>
              </div>

              {/* Description */}
              <div className="p-8 bg-[#0a0a0a]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-normal text-white mb-2">
                      No custom code. No developer required.
                    </h3>
                    <p className="text-sm text-white/70 font-light leading-relaxed">
                      Get your unique snippet from your BetterBlog dashboard, paste it into Squarespace's Custom CSS panel, and start customizing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button size="lg" className="h-12 px-8 text-base bg-[#5B4FE8] hover:bg-[#4a3fd4] rounded-full" asChild>
              <Link to="/login">Try It Now <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-neutral-500 mb-8">Choose the plan that's right for your needs.</p>
            
            <div className="inline-flex items-center p-1 bg-white rounded-full border border-neutral-200 shadow-sm">
              <button 
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all",
                  !isAnnual ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  isAnnual ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                Yearly <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className={cn(
                  "relative bg-white rounded-2xl p-8 border flex flex-col",
                  tier.highlight 
                    ? "border-purple-200 shadow-xl shadow-purple-100/50 z-10 scale-105" 
                    : "border-neutral-200 shadow-sm hover:shadow-md"
                )}
              >
                {tier.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#5B4FE8] to-[#8F86F0] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-neutral-900">{tier.name}</h3>
                  <p className="text-neutral-500 text-sm mt-1">{tier.description}</p>
                </div>
                
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-neutral-900">
                    ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-neutral-500">/mo</span>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm text-neutral-600">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  asChild
                  variant={tier.highlight ? "default" : "outline"}
                  className={cn(
                    "w-full rounded-full h-12",
                    tier.highlight ? "bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white" : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <Link to={isAuthenticated ? "/dashboard" : `/checkout?plan=${tier.planKey}&billing=${isAnnual ? "annual" : "monthly"}`}>
                    {tier.highlight ? "Get Started" : "Start Free Trial"}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-neutral-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5B4FE8] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#8F86F0] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: "1s" }}></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
            <span className="text-neutral-400">You don't need to leave Squarespace.</span><br />
            <span className="text-neutral-400">You don't need a stack of plugins.</span><br />
            <span className="text-white">You just need BetterBlog.</span>
          </h2>
          <Button size="lg" className="h-14 px-10 text-lg bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full mt-10" asChild>
            <Link to="/login">Get Started for Free</Link>
          </Button>
          <p className="mt-6 text-sm text-neutral-500">No credit card required for 14-day trial.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-neutral-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Logo size="sm" />
            <div className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} BetterBlog. All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

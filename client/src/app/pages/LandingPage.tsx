import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { BeforeAfterComparison } from "@/app/components/BeforeAfterComparison";
import { FeatureGrid } from "@/app/components/FeatureGrid";
import { FeatureExplorer } from "@/app/components/FeatureExplorer";
import HowItWorks from "@/app/components/HowItWorks";
import { InterestModal } from "@/app/components/InterestModal";
import { getDashboardMe } from "@/api/auth";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [interestModalOpen, setInterestModalOpen] = useState(false);

  useEffect(() => {
    getDashboardMe().then((me) => setIsAuthenticated(!!me));
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setIsLive(data.isLive === true))
      .catch(() => setIsLive(false));
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
      name: "Essentials",
      tier: "Starter",
      description: "Fix the basics. Everything Squarespace should have included from day one.",
      monthlyPrice: 12,
      annualPrice: 9,
      features: [
        "1 sidebar",
        "Numbered pagination",
        "Table of contents",
        "Post thumbnail banners",
        "Related posts",
        "Social sharing buttons"
      ],
      highlight: false
    },
    {
      name: "Professional",
      tier: "Core",
      description: "A real blog. Discoverable, navigable, and genuinely readable.",
      monthlyPrice: 19,
      annualPrice: 14,
      features: [
        "Everything in Starter, plus",
        "2 sidebars",
        "Breadcrumb navigation",
        "Post filtering & search",
        "Reading time and scroll progress bar",
        "Featured & pinned posts",
        "Advanced post sorting",
        "Rich author profiles"
      ],
      highlight: true
    },
    {
      name: "Publication",
      tier: "Pro",
      description: "A serious publication. Beautiful, branded, fully under your control.",
      monthlyPrice: 39,
      annualPrice: 29,
      features: [
        "Everything in Core, plus",
        "Custom designed templates",
        "Expanded post banner layouts",
        "Multiple authors",
        "Per-collection layouts & formatting",
        "Image style options per collection",
        "Advanced filtering & tag search",
        "Saved post templates",
        "Priority support"
      ],
      highlight: false
    }
  ];

  const studioTier = {
    name: "BetterBlog Studio",
    tier: "Studio",
    description: "Manage every client blog from one place. Bill the cost back on your first project.",
    monthlyPrice: 149,
    annualPrice: 99,
    features: [
      "Unlimited client sites",
      "All Pro features included",
      "Client management dashboard",
      "White-label options",
      "Team member access",
      "Early feature access & dedicated support"
    ]
  };

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
                {isLive === true ? (
                  <Button asChild className="bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full px-6">
                    <Link to="/login">Get Started</Link>
                  </Button>
                ) : (
                  <Button onClick={() => setInterestModalOpen(true)} className="bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full px-6">
                    Get Started
                  </Button>
                )}
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
              ) : isLive === true ? (
                <Button size="lg" className="h-12 px-8 text-base bg-[#5B4FE8] hover:bg-[#4a3fd4] rounded-full w-full sm:w-auto" asChild>
                  <Link to="/login">Start Free Trial</Link>
                </Button>
              ) : (
                <Button size="lg" onClick={() => setInterestModalOpen(true)} className="h-12 px-8 text-base bg-[#5B4FE8] hover:bg-[#4a3fd4] rounded-full w-full sm:w-auto">
                  Start Free Trial
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

      {/* Everything You Need Section */}
      <section id="features" className="py-20 bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-medium mb-8">
              <span className="text-[#10B981]">✦</span>
              Everything you need. One extension.
            </div>
            
            <h2 className="font-heading text-4xl md:text-5xl font-normal tracking-tight text-white leading-tight mb-6">
              Other tools solve one problem.<br />
              BetterBlog solves <em className="italic text-[#8F86F0]">them all.</em>
            </h2>
            
            <p className="text-lg text-white/60 font-light max-w-2xl mx-auto leading-relaxed">
              There are plugins for sidebars. Workarounds for table of contents. Hacks for author profiles. BetterBlog replaces all of it — with a single, cohesive extension built specifically for Squarespace bloggers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <FeatureGrid />

      {/* Feature Explorer - replaces all feature sections */}
      <div id="feature-explorer">
        <FeatureExplorer />
      </div>

      {/* How It Works */}
      <HowItWorks />

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-20 bg-[#f7f6f3]">
        <div className="container mx-auto px-4 max-w-[1080px]">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#5B4FE8] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE8] opacity-50"></span>
              Simple, transparent pricing
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE8] opacity-50"></span>
            </div>
            <h1 className="font-heading text-[clamp(36px,5vw,58px)] font-normal leading-[1.08] text-[#0a0a0a] mb-4 tracking-tight">
              A better blog,<br />at a <em className="italic text-[#5B4FE8]">better price.</em>
            </h1>
            <p className="text-base text-[#6b6b6b] font-light max-w-[420px] mx-auto mb-8 leading-[1.7]">
              Stay on the platform you love. Get everything you've been missing.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white border border-neutral-200 rounded-full p-1 gap-1 shadow-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "font-medium text-[13px] px-5 py-2 rounded-full cursor-pointer border-none transition-all flex items-center gap-2",
                  !isAnnual 
                    ? "bg-[#5B4FE8] text-white shadow-md" 
                    : "bg-transparent text-neutral-400"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "font-medium text-[13px] px-5 py-2 rounded-full cursor-pointer border-none transition-all flex items-center gap-2",
                  isAnnual 
                    ? "bg-[#5B4FE8] text-white shadow-md" 
                    : "bg-transparent text-neutral-400"
                )}
              >
                Annual 
                <span className={cn(
                  "text-[9.5px] font-bold px-1.5 py-0.5 rounded-full tracking-wide",
                  isAnnual 
                    ? "bg-white/20 text-white" 
                    : "bg-[#eaf7f2] text-[#10B981]"
                )}>
                  Save 25%
                </span>
              </button>
            </div>
          </div>

          {/* Section Label */}
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-neutral-400 mb-3.5 pl-0.5">
            For bloggers &amp; site owners
          </p>

          {/* 3-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
            {pricingTiers.map((tier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06, duration: 0.45 }}
                whileHover={{ y: -3 }}
                className={cn(
                  "bg-white border rounded-[10px] p-7 pb-6 relative transition-all flex flex-col",
                  tier.highlight
                    ? "border-[#5B4FE8] border-[1.5px] shadow-[0_8px_32px_rgba(91,79,232,0.14),0_2px_8px_rgba(91,79,232,0.08)] translate-y-[-5px]"
                    : "border-neutral-200 shadow-[0_1px_3px_rgba(26,26,42,0.06),0_1px_2px_rgba(26,26,42,0.04)] hover:shadow-[0_4px_16px_rgba(26,26,42,0.07),0_1px_4px_rgba(26,26,42,0.05)]"
                )}
              >
                {/* Accent Bar */}
                <div className={cn(
                  "h-[3px] rounded-t-[10px] mb-5.5 -mt-7 -mx-7",
                  tier.highlight ? "bg-[#5B4FE8]" : "bg-neutral-100"
                )}></div>

                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5B4FE8] text-white text-[9.5px] font-bold tracking-[0.1em] uppercase px-3 py-1 rounded-full whitespace-nowrap">
                    Most popular
                  </div>
                )}

                <p className={cn(
                  "text-[10px] font-bold tracking-[0.13em] uppercase mb-1",
                  tier.highlight ? "text-[#5B4FE8]" : "text-neutral-400"
                )}>
                  {tier.tier}
                </p>
                <h2 className="font-heading text-2xl text-[#0a0a0a] mb-1.5 leading-tight">
                  {tier.name}
                </h2>
                <p className="text-[12.5px] text-neutral-400 leading-[1.55] mb-5 min-h-[36px]">
                  {tier.description}
                </p>

                {/* Price Block */}
                <div className="mb-5 min-h-[74px]">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[17px] font-semibold text-[#0a0a0a] pb-1.5">$</span>
                    <span className="font-heading text-[50px] leading-none text-[#0a0a0a]">
                      {isAnnual ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    <span className="text-[13px] text-neutral-400 pb-1 ml-1">/mo</span>
                  </div>
                  <p className="text-[11.5px] text-neutral-400 mt-1 min-h-[16px]">
                    {isAnnual 
                      ? `Billed $${(isAnnual ? tier.annualPrice : tier.monthlyPrice) * 12}/year`
                      : 'Billed monthly'}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-neutral-100 mb-4.5"></div>

                <p className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-neutral-400 mb-3">
                  {tier.features[0].includes('Everything') ? tier.features[0] : 'What\'s included'}
                </p>

                {/* Features */}
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {tier.features.map((feature, fIdx) => {
                    // Skip "Everything in X, plus" text as we've shown it above
                    if (feature.includes('Everything')) return null;
                    return (
                      <li key={fIdx} className="flex items-start gap-2.5 text-[13px] text-[#6b6b6b] leading-[1.45]">
                        <span className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-black",
                          tier.highlight 
                            ? "bg-[#e6e6f8] text-[#5B4FE8]" 
                            : "bg-[#f7f6f3] text-neutral-400"
                        )}>
                          ✓
                        </span>
                        {feature}
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                {isLive === true ? (
                  <Button
                    asChild
                    className={cn(
                      "w-full h-auto py-3 px-3 rounded-[6px] text-[13.5px] font-semibold transition-all border-[1.5px] tracking-[0.01em]",
                      tier.highlight
                        ? "bg-[#5B4FE8] border-[#5B4FE8] text-white shadow-[0_3px_12px_rgba(91,79,232,0.28)] hover:bg-[#4a3fd4] hover:border-[#4a3fd4] hover:-translate-y-0.5 hover:shadow-[0_5px_18px_rgba(91,79,232,0.35)]"
                        : "bg-transparent border-neutral-200 text-[#0a0a0a] hover:border-[#5B4FE8] hover:text-[#5B4FE8] hover:bg-[#f2f2fd]"
                    )}
                  >
                    <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                      Start free trial
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => setInterestModalOpen(true)}
                    className={cn(
                      "w-full h-auto py-3 px-3 rounded-[6px] text-[13.5px] font-semibold transition-all border-[1.5px] tracking-[0.01em]",
                      tier.highlight
                        ? "bg-[#5B4FE8] border-[#5B4FE8] text-white shadow-[0_3px_12px_rgba(91,79,232,0.28)] hover:bg-[#4a3fd4] hover:border-[#4a3fd4] hover:-translate-y-0.5 hover:shadow-[0_5px_18px_rgba(91,79,232,0.35)]"
                        : "bg-transparent border-neutral-200 text-[#0a0a0a] hover:border-[#5B4FE8] hover:text-[#5B4FE8] hover:bg-[#f2f2fd]"
                    )}
                  >
                    Start free trial
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Studio Divider */}
          <div className="flex items-center gap-3.5 my-6">
            <div className="flex-1 h-px bg-neutral-200"></div>
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-neutral-400 whitespace-nowrap">
              For designers &amp; agencies
            </span>
            <div className="flex-1 h-px bg-neutral-200"></div>
          </div>

          {/* Studio Band */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.24, duration: 0.45 }}
            whileHover={{ y: -3 }}
            className="bg-[#0a0a0a] rounded-[10px] p-6 md:p-10 flex flex-col md:grid md:grid-cols-[1.1fr_0.8fr_1.2fr_auto] gap-6 md:gap-9 items-start md:items-center relative overflow-hidden transition-all hover:shadow-[0_16px_48px_rgba(26,26,42,0.25)]"
          >
            {/* Gradient Overlays */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-full h-full bg-[radial-gradient(ellipse_at_85%_40%,rgba(91,79,232,0.15)_0%,transparent_55%)]"></div>
              <div className="absolute w-full h-full bg-[radial-gradient(ellipse_at_15%_70%,rgba(91,79,232,0.07)_0%,transparent_50%)]"></div>
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#8F86F0] opacity-80 mb-2">
                {studioTier.tier}
              </p>
              <h2 className="font-heading text-[28px] font-normal text-[#f4f4f7] leading-[1.15] mb-2.5">
                {studioTier.name}
              </h2>
              <p className="text-[13px] text-[#f4f4f7]/50 leading-[1.65]">
                {studioTier.description}
              </p>
            </div>

            <div className="relative z-10">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[17px] font-semibold text-[#f4f4f7] pb-1.5">$</span>
                <span className="font-heading text-[50px] leading-none text-[#f4f4f7]">
                  {isAnnual ? studioTier.annualPrice : studioTier.monthlyPrice}
                </span>
                <span className="text-[13px] text-[#f4f4f7]/45 pb-1 ml-1">/mo</span>
              </div>
              <p className="text-[11.5px] text-[#f4f4f7]/35 mt-1 min-h-[16px]">
                {isAnnual 
                  ? `Billed $${(isAnnual ? studioTier.annualPrice : studioTier.monthlyPrice) * 12}/year`
                  : 'Billed monthly'}
              </p>
            </div>

            <ul className="flex flex-col gap-1.5 relative z-10">
              {studioTier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[12.5px] text-[#f4f4f7]/60 leading-[1.45]">
                  <span className="w-[15px] h-[15px] rounded-full bg-[#5B4FE8]/25 text-[#8F86F0] flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-black">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-center relative z-10">
              {isLive === true ? (
                <Button
                  asChild
                  className="inline-block py-3 px-8 bg-transparent text-[#f4f4f7] border-[1.5px] border-[#f4f4f7]/25 rounded-[6px] text-[13.5px] font-semibold cursor-pointer whitespace-nowrap transition-all tracking-[0.01em] hover:bg-[#f4f4f7]/8 hover:border-[#f4f4f7]/50 hover:-translate-y-0.5"
                >
                  <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                    Contact us
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() => setInterestModalOpen(true)}
                  className="inline-block py-3 px-8 bg-transparent text-[#f4f4f7] border-[1.5px] border-[#f4f4f7]/25 rounded-[6px] text-[13.5px] font-semibold cursor-pointer whitespace-nowrap transition-all tracking-[0.01em] hover:bg-[#f4f4f7]/8 hover:border-[#f4f4f7]/50 hover:-translate-y-0.5"
                >
                  Contact us
                </Button>
              )}
            </div>
          </motion.div>

          {/* Footer Note */}
          <p className="text-center mt-7 text-[12.5px] text-neutral-400 leading-[1.9]">
            All plans include a 30-day free trial &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Cancel anytime
          </p>
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
          {isLive === true ? (
            <Button size="lg" className="h-14 px-10 text-lg bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full mt-10" asChild>
              <Link to="/login">Get Started for Free</Link>
            </Button>
          ) : (
            <Button size="lg" onClick={() => setInterestModalOpen(true)} className="h-14 px-10 text-lg bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-full mt-10">
              Get Started for Free
            </Button>
          )}
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
          </div>
        </div>
      </footer>

      <InterestModal open={interestModalOpen} onOpenChange={setInterestModalOpen} />
    </div>
  );
}

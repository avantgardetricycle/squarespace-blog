import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { Check, ArrowRight, Zap, Layout, Paintbrush, Code, Database, Globe } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

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

  const features = [
    {
      icon: Paintbrush,
      title: "Complete Customization",
      description: "Change fonts, colors, and spacing without writing a single line of CSS code."
    },
    {
      icon: Layout,
      title: "Modern Layouts",
      description: "Choose from dozens of pre-designed grid, masonry, and list layouts for your posts."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed. Your blog will load instantly, improving SEO and user experience."
    },
    {
      icon: Code,
      title: "No Code Required",
      description: "Designed for creators, not developers. Visual editors for everything you need."
    }
  ];

  const pricingTiers = [
    {
      name: "Starter",
      description: "Perfect for personal blogs",
      monthlyPrice: 15,
      annualPrice: 12,
      features: ["1 Blog", "Basic Customization", "Standard Layouts", "Email Support"],
      highlight: false
    },
    {
      name: "Pro",
      description: "For serious content creators",
      monthlyPrice: 29,
      annualPrice: 24,
      features: ["3 Blogs", "Advanced Customization", "All Premium Layouts", "Priority Support", "Custom CSS Injection"],
      highlight: true
    },
    {
      name: "Agency",
      description: "Manage multiple client sites",
      monthlyPrice: 79,
      annualPrice: 65,
      features: ["Unlimited Blogs", "White Labeling", "API Access", "Dedicated Success Manager", "Team Collaboration"],
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors hidden sm:block">Log in</Link>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
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
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Now compatible with Squarespace 7.1
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-heading font-bold tracking-tight text-neutral-900 leading-[1.1]">
              Give your Squarespace blog <br />
              <span className="bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">superpowers.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
              BetterBlog unlocks the customization features Squarespace left out. 
              Create beautiful, unique blog layouts in minutes without code.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {isAuthenticated ? (
                <Button size="lg" className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 rounded-full w-full sm:w-auto" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 rounded-full w-full sm:w-auto" asChild>
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
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl blur opacity-20"></div>
            <div className="relative rounded-xl border border-neutral-200 bg-white shadow-2xl overflow-hidden aspect-[16/9]">
              <img 
                src="https://images.unsplash.com/photo-1542728928-0011f81446e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwYmxvZyUyMGRlc2lnbnxlbnwxfHx8fDE3NzE3MzQ3NTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                alt="BetterBlog Interface" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-4">Everything you need to stand out</h2>
            <p className="text-lg text-neutral-500">Stop fighting with basic templates. Take full control of your content presentation.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-neutral-900">{feature.title}</h3>
                <p className="text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-12">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900">It's easier than you think</h2>
                <p className="text-lg text-neutral-500">
                  No complex setups or developer mode required. BetterBlog works with your existing Squarespace site.
                </p>
              </div>

              <div className="space-y-8">
                {[
                  {
                    step: "01",
                    title: "Connect your site",
                    desc: "Enter your Squarespace URL and we'll scan your current blog structure."
                  },
                  {
                    step: "02",
                    title: "Install the snippet",
                    desc: "Copy one line of code into your site header. That's it. No other code required."
                  },
                  {
                    step: "03",
                    title: "Customize & Publish",
                    desc: "Use our visual editor to redesign your blog, then hit save to update your live site instantly."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6">
                    <div className="flex-none">
                      <span className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-neutral-100 text-lg font-bold text-neutral-400 bg-neutral-50">
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 mb-2">{item.title}</h3>
                      <p className="text-neutral-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 bg-neutral-900 aspect-[4/3]">
                <div className="absolute top-0 left-0 right-0 h-8 bg-neutral-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="p-8 pt-12 text-white font-mono text-sm leading-relaxed opacity-80">
                  <span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://cdn.betterblog.com/v1/bundle.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span>
                  <br /><br />
                  <span className="text-neutral-500">// That's literally all the code you need.</span>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1765445666527-67b2c1dfff34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMHdlYiUyMGRlc2lnbiUyMG1vZGVybnxlbnwxfHx8fDE3NzE3MzQ3NjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Code snippet"
                  className="absolute bottom-0 left-0 right-0 w-full h-2/3 object-cover opacity-20"
                />
              </div>
            </div>
          </div>
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
                    ? "border-blue-200 shadow-xl shadow-blue-100/50 z-10 scale-105" 
                    : "border-neutral-200 shadow-sm hover:shadow-md"
                )}
              >
                {tier.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
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
                    tier.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <Link to={isAuthenticated ? "/dashboard" : "/login"}>
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "2s" }}></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">Ready to transform your blog?</h2>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto mb-10">
            Join thousands of creators who have upgraded their Squarespace sites with BetterBlog.
          </p>
          <Button size="lg" className="h-14 px-10 text-lg bg-white text-neutral-900 hover:bg-neutral-100 rounded-full" asChild>
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

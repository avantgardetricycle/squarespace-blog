import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { toast } from "sonner";
import { Logo } from "@/app/components/Logo";
import {
  fetchPublicPlanPrices,
  formatCurrencyAmount,
  type PublicPlanPricesResponse,
} from "@/api/planPrices";

const pricingPlans = {
  starter: {
    name: "Essentials",
    description: "Fix the basics on your Squarespace blog",
    features: ["1 blog", "Core layouts & modules", "Standard support"],
  },
  pro: {
    name: "Professional",
    description: "A real blog—discoverable, navigable, readable",
    features: ["Up to 3 blogs", "Advanced customization", "Priority support"],
  },
  agency: {
    name: "Publication",
    description: "Serious publication tools and higher limits",
    features: ["Unlimited blogs (fair use)", "Publication-focused features", "Priority support"],
  },
} as const;

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan") || "pro";
  const billingParam = searchParams.get("billing") || "annual";
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAnnual, setIsAnnual] = useState(billingParam === "annual");
  const [stripePrices, setStripePrices] = useState<PublicPlanPricesResponse | null>(null);
  const [pricesLoadError, setPricesLoadError] = useState(false);

  useEffect(() => {
    fetchPublicPlanPrices()
      .then(setStripePrices)
      .catch(() => {
        setPricesLoadError(true);
        toast.error("Could not load current prices. Refresh the page or try again shortly.");
      });
  }, []);

  const plan = pricingPlans[planParam as keyof typeof pricingPlans] || pricingPlans.pro;
  const currency = stripePrices?.currency ?? "usd";

  const planPrices = useMemo(() => {
    if (!stripePrices?.plans) return null;
    return stripePrices.plans[planParam] ?? stripePrices.plans.pro ?? null;
  }, [stripePrices, planParam]);

  const monthlyPerMonth = planPrices?.monthly.perMonth ?? null;
  const annualPerMonth = planPrices?.annual.perMonth ?? null;
  const annualTotalYear = planPrices?.annual.perYear ?? null;

  const price = isAnnual ? annualPerMonth : monthlyPerMonth;
  const nextChargeAmount =
    isAnnual && annualTotalYear != null
      ? annualTotalYear
      : monthlyPerMonth != null
        ? monthlyPerMonth
        : null;
  const savings =
    monthlyPerMonth != null && annualTotalYear != null
      ? Math.max(0, monthlyPerMonth * 12 - annualTotalYear)
      : 0;
  const annualSavingsPercent =
    monthlyPerMonth != null && annualTotalYear != null && monthlyPerMonth > 0
      ? Math.max(0, Math.round((1 - annualTotalYear / (monthlyPerMonth * 12)) * 100))
      : 0;

  const trialDays = 7;
  const futureChargeDate = new Date();
  futureChargeDate.setDate(futureChargeDate.getDate() + trialDays);
  const formattedChargeDate = futureChargeDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!planPrices || price == null) {
      toast.error("Prices are still loading. Please wait a moment.");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setCheckoutLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const checkRes = await fetch("/api/checkout/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const checkData = await checkRes.json().catch(() => ({}));
      if (checkData.exists) {
        window.location.href = "/login?reason=existing_user";
        return;
      }

      const cadence = isAnnual ? "annual" : "monthly";
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planKey: planParam,
          cadence,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Checkout failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <p className="text-[#6b6b6b] mt-2 text-sm">Complete your subscription</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Customer Information */}
          <Card className="shadow-[0_1px_3px_rgba(26,26,42,0.06),0_1px_2px_rgba(26,26,42,0.04)] border-neutral-200 rounded-[10px]">
<CardHeader>
            <CardTitle className="font-heading text-[#0a0a0a]">Your Information</CardTitle>
            <CardDescription className="text-[#6b6b6b]">
              Enter your details to continue to secure checkout
            </CardDescription>
          </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckout} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#0a0a0a]">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-[#6b6b6b]">
                      We'll send your receipt and login details here
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Billing Frequency Toggle */}
                <div className="space-y-3">
                  <Label className="text-[#0a0a0a]">Billing Frequency</Label>
                  <div className="inline-flex bg-white border border-neutral-200 rounded-full p-1 gap-1 shadow-sm w-full">
                    <button
                      type="button"
                      onClick={() => setIsAnnual(false)}
                      className={`flex-1 rounded-full px-5 py-2.5 text-[13px] font-medium transition-all ${
                        !isAnnual
                          ? "bg-[#5B4FE8] text-white shadow-md"
                          : "bg-transparent text-neutral-400 hover:text-[#6b6b6b]"
                      }`}
                    >
                      Monthly ·{" "}
                      {monthlyPerMonth != null
                        ? `${formatCurrencyAmount(monthlyPerMonth, currency)}/mo`
                        : "…"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnnual(true)}
                      className={`relative flex-1 rounded-full px-5 py-2.5 text-[13px] font-medium transition-all ${
                        isAnnual
                          ? "bg-[#5B4FE8] text-white shadow-md"
                          : "bg-transparent text-neutral-400 hover:text-[#6b6b6b]"
                      }`}
                    >
                      Annual ·{" "}
                      {annualPerMonth != null
                        ? `${formatCurrencyAmount(annualPerMonth, currency)}/mo`
                        : "…"}
                      {savings > 0 && annualSavingsPercent > 0 && (
                        <span className={isAnnual ? "ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-white/20" : "ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[#eaf7f2] text-[#10B981]"}>
                          Save {annualSavingsPercent}%
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#5B4FE8] hover:bg-[#4a3fd4] h-12 text-base font-semibold text-white rounded-[6px]"
                  size="lg"
                  disabled={checkoutLoading || !planPrices || pricesLoadError}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {checkoutLoading ? "Redirecting..." : "Continue to Secure Checkout"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <p className="text-xs text-center text-[#6b6b6b]">
                  Secured by Stripe. Your payment information is encrypted and secure.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card className="shadow-[0_1px_3px_rgba(26,26,42,0.06),0_1px_2px_rgba(26,26,42,0.04)] border-[#5B4FE8] border-[1.5px] rounded-[10px]">
              <CardHeader>
                <CardTitle className="font-heading text-[#0a0a0a]">Order Summary</CardTitle>
                <CardDescription className="text-[#6b6b6b]">Review your subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Details */}
                <div className="bg-[#f2f2fd] rounded-[10px] p-5 space-y-3 border border-[#5B4FE8]/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-xl text-[#0a0a0a]">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-[#6b6b6b]">{plan.description}</p>
                      <p className="text-sm font-medium text-[#10B981] mt-1">
                        {trialDays}-day free trial • Nothing due today
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-heading text-[#5B4FE8]">
                        {price != null
                          ? formatCurrencyAmount(price, currency)
                          : "…"}
                      </div>
                      <div className="text-xs text-[#6b6b6b]">
                        per month after trial
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-[#0a0a0a]">Included features:</h4>
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#5B4FE8] shrink-0 mt-0.5" />
                        <span className="text-sm text-[#6b6b6b]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">
                      {plan.name} Plan ({isAnnual ? "Annual" : "Monthly"})
                    </span>
                    <span className="font-medium text-[#0a0a0a]">
                      {price != null
                        ? `${formatCurrencyAmount(price, currency)}/mo`
                        : "…"}
                    </span>
                  </div>
                  {isAnnual && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6b6b6b]">Billed annually</span>
                        <span className="font-medium text-[#0a0a0a]">
                          {annualTotalYear != null
                            ? `${formatCurrencyAmount(annualTotalYear, currency)}/year`
                            : "…"}
                        </span>
                      </div>
                      {savings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#10B981] font-medium">Annual savings</span>
                          <span className="font-medium text-[#10B981]">
                            −{formatCurrencyAmount(savings, currency)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#10B981] font-medium">{trialDays}-day free trial</span>
                    <span className="font-medium text-[#10B981]">$0</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="font-semibold text-neutral-900">Due today</span>
                    <span className="font-bold text-xl text-neutral-900">$0</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-neutral-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Charged on {formattedChargeDate}</span>
                      <span className="font-medium text-neutral-900">
                        {nextChargeAmount != null
                          ? formatCurrencyAmount(nextChargeAmount, currency)
                          : "…"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {isAnnual
                        ? "Then billed annually at this rate"
                        : "Then billed monthly at this rate"}
                    </p>
                  </div>
                </div>

                {/* Money Back Guarantee */}
                <div className="bg-[#eaf7f2] border border-[#10B981]/30 rounded-[10px] p-4">
                  <p className="text-sm text-[#10B981] font-medium text-center">
                    ✓ 30-Day Money-Back Guarantee
                  </p>
                  <p className="text-xs text-[#10B981]/80 text-center mt-1">
                    Not satisfied? Get a full refund within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <div className="text-center">
              <p className="text-sm text-[#6b6b6b]">
                Questions?{" "}
                <a
                  href="mailto:support@betterblog.com"
                  className="text-[#5B4FE8] hover:text-[#4a3fd4] font-medium underline"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

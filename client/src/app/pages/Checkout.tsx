import { useState } from "react";
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

const pricingPlans = {
  starter: {
    name: "Starter",
    description: "Perfect for personal blogs",
    monthlyPrice: 15,
    annualPrice: 12,
    features: ["1 Blog", "Basic Customization", "Standard Layouts", "Email Support"],
  },
  pro: {
    name: "Pro",
    description: "For serious content creators",
    monthlyPrice: 29,
    annualPrice: 24,
    features: ["3 Blogs", "Advanced Customization", "All Premium Layouts", "Priority Support", "Custom CSS Injection"],
  },
  agency: {
    name: "Agency",
    description: "Manage multiple client sites",
    monthlyPrice: 79,
    annualPrice: 65,
    features: ["10 Blogs", "White Labeling", "API Access", "Dedicated Success Manager", "Team Collaboration"],
  },
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan") || "pro";
  const billingParam = searchParams.get("billing") || "annual";
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAnnual, setIsAnnual] = useState(billingParam === "annual");
  
  const plan = pricingPlans[planParam as keyof typeof pricingPlans] || pricingPlans.pro;
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const totalPrice = isAnnual ? price * 12 : price;
  const savings = isAnnual ? (plan.monthlyPrice * 12) - (plan.annualPrice * 12) : 0;

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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
              BetterBlog
            </h1>
          </Link>
          <p className="text-neutral-600 mt-2">Complete your subscription</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Customer Information */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>
                Enter your details to continue to secure checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckout} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
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
                    <p className="text-xs text-neutral-500">
                      We'll send your receipt and login details here
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Billing Frequency Toggle */}
                <div className="space-y-3">
                  <Label>Billing Frequency</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAnnual(false)}
                      className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                        !isAnnual
                          ? "border-blue-600 bg-blue-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="font-semibold text-neutral-900">Monthly</div>
                      <div className="text-sm text-neutral-600">
                        ${plan.monthlyPrice}/month
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnnual(true)}
                      className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                        isAnnual
                          ? "border-blue-600 bg-blue-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="font-semibold text-neutral-900">Annual</div>
                      <div className="text-sm text-neutral-600">
                        ${plan.annualPrice}/month
                      </div>
                      {savings > 0 && (
                        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Save ${savings}
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-700 to-green-600 hover:from-blue-800 hover:to-green-700 h-12 text-base font-semibold"
                  size="lg"
                  disabled={checkoutLoading}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {checkoutLoading ? "Redirecting..." : "Continue to Secure Checkout"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <p className="text-xs text-center text-neutral-500">
                  Secured by Stripe. Your payment information is encrypted and secure.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card className="shadow-lg border-blue-200">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Review your subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Details */}
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-xl text-neutral-900">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-neutral-600">{plan.description}</p>
                      <p className="text-sm font-medium text-green-700 mt-1">
                        {trialDays}-day free trial • Nothing due today
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
                        ${price}
                      </div>
                      <div className="text-xs text-neutral-600">
                        per month after trial
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-900">Included features:</h4>
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-neutral-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      {plan.name} Plan ({isAnnual ? "Annual" : "Monthly"})
                    </span>
                    <span className="font-medium text-neutral-900">
                      ${price}/mo
                    </span>
                  </div>
                  {isAnnual && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Billed annually</span>
                        <span className="font-medium text-neutral-900">
                          ${totalPrice}/year
                        </span>
                      </div>
                      {savings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 font-medium">Annual savings</span>
                          <span className="font-medium text-green-600">
                            -${savings}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">{trialDays}-day free trial</span>
                    <span className="font-medium text-green-600">$0</span>
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
                        ${isAnnual ? totalPrice : price}
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium text-center">
                    ✓ 30-Day Money-Back Guarantee
                  </p>
                  <p className="text-xs text-green-700 text-center mt-1">
                    Not satisfied? Get a full refund within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <div className="text-center">
              <p className="text-sm text-neutral-600">
                Questions?{" "}
                <a
                  href="mailto:support@betterblog.com"
                  className="text-blue-700 hover:text-blue-800 font-medium underline"
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

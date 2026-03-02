import { CheckCircle, Mail } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Logo } from "@/app/components/Logo";
import { useEffect, useState } from "react";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [price, setPrice] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session");
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load session");
        return res.json();
      })
      .then((data) => {
        setEmail(data.email ?? "");
        setPlan(data.plan ?? "");
        setPrice(data.price ?? "$0");
        setCadence(data.cadence === "annual" ? "annual" : "monthly");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-6">
        <div className="text-[#6b6b6b] text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg mb-4 text-[#0a0a0a]">{error}</p>
          <Button asChild className="bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Main Card */}
        <Card className="shadow-[0_8px_32px_rgba(91,79,232,0.14),0_2px_8px_rgba(91,79,232,0.08)] border-neutral-200 rounded-[10px]">
          <CardContent className="p-8 sm:p-12">
            <div className="text-center mb-8">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#0a0a0a] mb-3">
                Welcome to BetterBlog! 🎉
              </h2>
              <p className="text-lg text-[#6b6b6b]">
                Your subscription is now active
              </p>
            </div>

            {/* Plan Details */}
            <div className="bg-[#f2f2fd] rounded-[10px] p-6 mb-8 border border-[#5B4FE8]/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-[#6b6b6b] mb-1">Your Plan</p>
                  <p className="font-heading text-2xl font-bold text-[#5B4FE8]">
                    {plan || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#6b6b6b] mb-1">Price</p>
                  <p className="text-2xl font-bold text-[#0a0a0a]">
                    {price || "$0"}<span className="text-base font-normal text-[#6b6b6b]">/{cadence === "annual" ? "year" : "mo"}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-[#6b6b6b]">
                <CheckCircle className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                <span>Payment processed successfully</span>
              </div>
            </div>

            {/* Email Instructions */}
            <div className="bg-[#f2f2fd] border border-[#5B4FE8]/30 rounded-[10px] p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-[#5B4FE8] rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0a0a0a] mb-2 text-lg">
                    Check your email
                  </h3>
                  <p className="text-[#6b6b6b] mb-3 leading-relaxed">
                    We&apos;ve sent a welcome email to <span className="font-semibold text-[#0a0a0a]">{email || "you"}</span> with a secure link to access your dashboard. No password needed!
                  </p>
                  <p className="text-sm text-[#6b6b6b]">
                    Don&apos;t see it? Check your spam folder or wait a few minutes for it to arrive.
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="mb-8">
              <h4 className="font-semibold text-[#0a0a0a] mb-4">
                What happens next?
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#e6e6f8] text-[#5B4FE8] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <p className="text-[#6b6b6b] pt-0.5">
                    Click the link in your email to access your dashboard
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#e6e6f8] text-[#5B4FE8] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <p className="text-[#6b6b6b] pt-0.5">
                    Configure your blog settings with our live preview
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#e6e6f8] text-[#5B4FE8] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <p className="text-[#6b6b6b] pt-0.5">
                    Watch your blog transform in real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                asChild 
                className="flex-1 bg-[#5B4FE8] hover:bg-[#4a3fd4] text-white rounded-[6px]"
              >
                <Link to="/login">
                  Go to Login Page
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline"
                className="flex-1 border-neutral-200 text-[#0a0a0a] hover:bg-[#f2f2fd] hover:border-[#5B4FE8] hover:text-[#5B4FE8] rounded-[6px]"
              >
                <Link to="/">
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Link */}
        <p className="text-center text-[#6b6b6b] text-sm mt-6">
          Need help? <a href="mailto:support@betterblog.app" className="text-[#5B4FE8] hover:text-[#4a3fd4] underline">Contact our support team</a>
        </p>
      </div>
    </div>
  );
}
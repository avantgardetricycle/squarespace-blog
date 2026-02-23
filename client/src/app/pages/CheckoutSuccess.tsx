import { CheckCircle, Mail } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-700 flex items-center justify-center p-6">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-700 flex items-center justify-center p-6">
        <div className="text-center text-white">
          <p className="text-lg mb-4">{error}</p>
          <Button asChild variant="secondary">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-700 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg animate-bounce">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7 text-blue-900"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <h1 
              className="text-5xl font-bold text-white"
              style={{ fontFamily: "'Courier Prime', monospace" }}
            >
              BetterBlog
            </h1>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl">
          <CardContent className="p-8 sm:p-12">
            <div className="text-center mb-8">
              <h2 
                className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3"
                style={{ fontFamily: "'Courier Prime', monospace" }}
              >
                Welcome to BetterBlog! 🎉
              </h2>
              <p className="text-lg text-neutral-600">
                Your subscription is now active
              </p>
            </div>

            {/* Plan Details */}
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-6 mb-8 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Your Plan</p>
                  <p 
                    className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-emerald-600 bg-clip-text text-transparent"
                    style={{ fontFamily: "'Courier Prime', monospace" }}
                  >
                    {plan || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-600 mb-1">Price</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {price || "$0"}<span className="text-base font-normal text-neutral-500">/{cadence === "annual" ? "year" : "mo"}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Payment processed successfully</span>
              </div>
            </div>

            {/* Email Instructions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 mb-2 text-lg">
                    Check your email
                  </h3>
                  <p className="text-neutral-700 mb-3 leading-relaxed">
                    We&apos;ve sent a welcome email to <span className="font-semibold text-neutral-900">{email || "you"}</span> with a secure link to access your dashboard. No password needed!
                  </p>
                  <p className="text-sm text-neutral-600">
                    Don't see it? Check your spam folder or wait a few minutes for it to arrive.
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="mb-8">
              <h4 className="font-semibold text-neutral-900 mb-4">
                What happens next?
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <p className="text-neutral-700 pt-0.5">
                    Click the link in your email to access your dashboard
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <p className="text-neutral-700 pt-0.5">
                    Configure your blog settings with our live preview
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <p className="text-neutral-700 pt-0.5">
                    Watch your blog transform in real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                asChild 
                className="flex-1 bg-gradient-to-r from-blue-900 to-emerald-600 hover:from-blue-800 hover:to-emerald-500"
              >
                <Link to="/login">
                  Go to Login Page
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline"
                className="flex-1"
              >
                <Link to="/">
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Link */}
        <p className="text-center text-white/80 text-sm mt-6">
          Need help? <a href="mailto:support@betterblog.app" className="underline hover:text-white">Contact our support team</a>
        </p>
      </div>
    </div>
  );
}
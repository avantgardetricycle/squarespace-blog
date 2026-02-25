import { Link } from "react-router";
import { AlertCircle, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function SubscriptionExpired() {
  const handleRenewSubscription = () => {
    // In a real app, this would redirect to Stripe checkout or billing portal
    window.location.href = "https://billing.stripe.com/portal";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
              BetterBlog
            </h1>
          </Link>
        </div>

        {/* Main Card */}
        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-2xl mb-2">Subscription Expired</CardTitle>
              <CardDescription className="text-base">
                Your BetterBlog subscription has ended. Renew now to continue customizing your blog.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What You're Missing */}
            <div className="bg-blue-50/50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-neutral-900">
                What you're missing out on:
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">Live Blog Customization</p>
                    <p className="text-sm text-neutral-600">
                      Real-time preview and updates to your blog's appearance
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">Advanced Typography Controls</p>
                    <p className="text-sm text-neutral-600">
                      Custom fonts, sizes, and styling for a unique look
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">Multi-Blog Management</p>
                    <p className="text-sm text-neutral-600">
                      Manage multiple blogs from a single dashboard
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900">Premium Support</p>
                    <p className="text-sm text-neutral-600">
                      Priority email support and dedicated assistance
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleRenewSubscription}
                className="w-full bg-gradient-to-r from-blue-700 to-green-600 hover:from-blue-800 hover:to-green-700 h-12 text-base font-semibold"
                size="lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Renew Subscription
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
                asChild
              >
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-neutral-600">
                Need help?{" "}
                <a
                  href="mailto:support@betterblog.com"
                  className="text-blue-700 hover:text-blue-800 font-medium underline"
                >
                  Contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-600">
            Your blogs and settings are safely stored and will be restored when you renew.
          </p>
        </div>
      </div>
    </div>
  );
}

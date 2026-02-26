import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/app/components/Logo";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "Invalid link. Please request a new magic link.",
  invalid_token: "Invalid or expired link. Please request a new magic link.",
  token_used: "This link has already been used. Please request a new one.",
  token_expired: "This link has expired. Please request a new magic link.",
  server_error: "Something went wrong. Please try again.",
  existing_user: "User with that email already exists. Login to manage your account.",
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const errorCode = searchParams.get("error");
  const reasonCode = searchParams.get("reason");
  const errorMessage =
    (errorCode ? ERROR_MESSAGES[errorCode] ?? "An error occurred." : null) ??
    (reasonCode ? ERROR_MESSAGES[reasonCode] ?? null) : null;

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setSent(true);
        toast.success("Check your email for the magic link!");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to send magic link");
      }
    } catch {
      toast.error("Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-700 px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-neutral-100"
      >
        <div className="text-center flex flex-col items-center">
          <Link to="/" className="mb-6">
            <Logo size="lg" />
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            {sent ? "Check your email" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {sent
              ? `We sent a magic link to ${email}. Click it to sign in.`
              : "Enter your email to receive a magic link"}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        
        {!sent && (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <Label htmlFor="email-address" className="sr-only">
                Email address
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Magic Link...
                </>
              ) : (
                "Send Magic Link"
              )}
            </Button>
          </div>
        </form>
        )}
        
        <div className="text-center text-xs text-neutral-400 mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </div>
      </motion.div>
    </div>
  );
}

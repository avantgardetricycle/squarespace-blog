import { useState } from "react";
import { motion } from "motion/react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/app/components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate magic link process
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("isAuthenticated", "true");
      toast.success("Magic link sent! Redirecting...");
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-neutral-100"
      >
        <div className="text-center flex flex-col items-center">
          <Logo size="lg" className="mb-6" />
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Enter your email to receive a magic link
          </p>
        </div>
        
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
        
        <div className="text-center text-xs text-neutral-400 mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </div>
      </motion.div>
    </div>
  );
}

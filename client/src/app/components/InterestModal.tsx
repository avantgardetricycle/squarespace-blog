import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { trackEvent, type InterestModalSource } from "@/lib/analytics";

interface InterestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerSource: InterestModalSource | null;
}

export function InterestModal({ open, onOpenChange, triggerSource }: InterestModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    if (triggerSource) {
      trackEvent("interest_modal_submit", { trigger_source: triggerSource });
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong");
        if (triggerSource) {
          trackEvent("interest_modal_error", {
            trigger_source: triggerSource,
            error_type: typeof data.error === "string" ? data.error : "api_error",
          });
        }
        return;
      }

      setStatus("success");
      if (triggerSource) {
        trackEvent("interest_modal_success", { trigger_source: triggerSource });
      }
      setEmail("");
      setName("");
    } catch {
      setStatus("error");
      setErrorMessage("Failed to submit. Please try again.");
      if (triggerSource) {
        trackEvent("interest_modal_error", {
          trigger_source: triggerSource,
          error_type: "network_error",
        });
      }
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (status !== "success" && triggerSource) {
        trackEvent("interest_modal_dismiss", {
          trigger_source: triggerSource,
          had_input: email.trim().length > 0 || name.trim().length > 0,
        });
      }
      setStatus("idle");
      setErrorMessage("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            BetterBlog is coming soon
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            We&apos;re putting the finishing touches on BetterBlog. Leave your email and we&apos;ll
            let you know as soon as it&apos;s live.
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-6 text-center">
            <p className="text-[#10B981] font-medium">Thanks! We&apos;ll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interest-email">Email</Label>
              <Input
                id="interest-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "submitting"}
                className="border-neutral-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest-name">Name (optional)</Label>
              <Input
                id="interest-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={status === "submitting"}
                className="border-neutral-200"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
              >
                {status === "submitting" ? "Submitting…" : "Notify me"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

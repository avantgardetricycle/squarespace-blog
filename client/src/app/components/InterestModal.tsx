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

interface InterestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterestModal({ open, onOpenChange }: InterestModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

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
        return;
      }

      setStatus("success");
      setEmail("");
      setName("");
    } catch {
      setStatus("error");
      setErrorMessage("Failed to submit. Please try again.");
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
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

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type { PaywallReconcileMismatch } from "@/api/auth";

function labelForState(state: PaywallReconcileMismatch["storedState"] | PaywallReconcileMismatch["probedState"]) {
  if (state === "detected_paywalled") return "membership required";
  if (state === "detected_unpaywalled") return "public (no membership required)";
  return "not set";
}

type PaywallReconcileModalProps = {
  mismatch: PaywallReconcileMismatch | null;
  applying: boolean;
  onApply: () => void;
  onDismiss: () => void;
};

export function PaywallReconcileModal({ mismatch, applying, onApply, onDismiss }: PaywallReconcileModalProps) {
  const blogName = mismatch?.name?.trim() || "this blog";
  const turningOn = mismatch?.probedState === "detected_paywalled";

  return (
    <Dialog
      open={Boolean(mismatch)}
      onOpenChange={(open) => {
        if (!open && !applying) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paywall settings may have changed</DialogTitle>
          <DialogDescription>
            We checked the live Squarespace JSON for {blogName}. It looks like the blog is now{" "}
            <span className="font-medium text-[#0a0a0a]">{labelForState(mismatch?.probedState ?? "unknown")}</span>
            , but BetterBlog still has it as{" "}
            <span className="font-medium text-[#0a0a0a]">{labelForState(mismatch?.storedState ?? "unknown")}</span>.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-[#6b6b6b]">
          {turningOn
            ? "Update BetterBlog so logged-out readers see the membership overlay and Paywall Settings?"
            : "Update BetterBlog so it no longer treats this blog as membership-gated?"}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onDismiss} disabled={applying}>
            Keep current settings
          </Button>
          <Button
            type="button"
            className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
            onClick={onApply}
            disabled={applying}
          >
            {applying ? "Updating…" : "Update BetterBlog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

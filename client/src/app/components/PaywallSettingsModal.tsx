import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { signupPageUrlError } from "@/lib/signupPageUrl";

export const DEFAULT_PAYWALL_FEATURE_ITEMS = ["Unlimited articles", "Full archive access", "Cancel anytime"] as const;
export const PAYWALL_EYEBROW_MAX = 80;
export const PAYWALL_HEADLINE_MAX = 160;
export const DEFAULT_PAYWALL_EYEBROW = "Member Exclusive";
export const DEFAULT_PAYWALL_HEADLINE = "Unlock unlimited access to {blogName}";

export type PaywallFormState = {
  subscribeUrl: string;
  footerDescription: string;
  eyebrowText: string;
  headlineText: string;
  featureItems: string[];
};

type PaywallSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PaywallFormState;
  onChange: (next: PaywallFormState | ((prev: PaywallFormState) => PaywallFormState)) => void;
};

export function PaywallSettingsModal({ open, onOpenChange, form, onChange }: PaywallSettingsModalProps) {
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUrlError(signupPageUrlError(form.subscribeUrl));
  }, [open]);

  const requestClose = (nextOpen: boolean) => {
    if (nextOpen) {
      setUrlError(null);
      onOpenChange(true);
      return;
    }
    const error = signupPageUrlError(form.subscribeUrl);
    if (error) {
      setUrlError(error);
      return;
    }
    setUrlError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paywall Settings</DialogTitle>
          <DialogDescription>
            These settings apply to both the collection and post views.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label className="text-xs text-[#6b6b6b]">
              Signup / subscription page URL <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.subscribeUrl}
              onChange={(e) => {
                const value = e.target.value;
                onChange((p) => ({ ...p, subscribeUrl: value }));
                if (urlError) setUrlError(signupPageUrlError(value));
              }}
              placeholder="https://…"
              className="text-sm"
            />
            <p className="text-[10px] text-[#6b6b6b] leading-snug">
              The URL where readers sign up for your blog
            </p>
            {urlError ? <p className="text-[10px] text-red-600 leading-snug">{urlError}</p> : null}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[#6b6b6b]">Eyebrow (optional, max {PAYWALL_EYEBROW_MAX} characters)</Label>
            <Input
              value={form.eyebrowText}
              onChange={(e) =>
                onChange((p) => ({ ...p, eyebrowText: e.target.value.slice(0, PAYWALL_EYEBROW_MAX) }))
              }
              placeholder={DEFAULT_PAYWALL_EYEBROW}
              className="text-sm"
            />
            <p className="text-[10px] text-[#6b6b6b] leading-snug">
              Small label above the headline. Displayed in uppercase. Leave blank for “{DEFAULT_PAYWALL_EYEBROW}”.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[#6b6b6b]">Header text (optional, max {PAYWALL_HEADLINE_MAX} characters)</Label>
            <Input
              value={form.headlineText}
              onChange={(e) =>
                onChange((p) => ({ ...p, headlineText: e.target.value.slice(0, PAYWALL_HEADLINE_MAX) }))
              }
              placeholder={DEFAULT_PAYWALL_HEADLINE}
              className="text-sm"
            />
            <p className="text-[10px] text-[#6b6b6b] leading-snug">
              Headline below the eyebrow. Leave blank for the default. Use {"{blogName}"} to insert your site title.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[#6b6b6b]">Footer description (optional, max 160 characters)</Label>
            <Textarea
              value={form.footerDescription}
              onChange={(e) =>
                onChange((p) => ({ ...p, footerDescription: e.target.value.slice(0, 160) }))
              }
              placeholder="Subscribe for full access to every story, the complete archive, and exclusive reading."
              rows={3}
              className="text-sm resize-y min-h-[72px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[#6b6b6b]">Feature checklist (optional, max 4)</Label>
            {form.featureItems.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={line}
                  onChange={(e) =>
                    onChange((p) => {
                      const next = p.featureItems.slice();
                      next[idx] = e.target.value;
                      return { ...p, featureItems: next };
                    })
                  }
                  className="text-sm flex-1"
                />
                <button
                  type="button"
                  className="p-2 rounded hover:bg-red-100 text-[#6b6b6b] shrink-0"
                  aria-label="Remove feature line"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      featureItems: p.featureItems.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {form.featureItems.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  onChange((p) =>
                    p.featureItems.length >= 4
                      ? p
                      : { ...p, featureItems: [...p.featureItems, ""] }
                  )
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => requestClose(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

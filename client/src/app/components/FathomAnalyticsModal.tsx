import { useState, useEffect } from "react";
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
import { Checkbox } from "@/app/components/ui/checkbox";

const FATHOM_METRICS = [
  { id: "traffic_sources" as const, label: "Traffic Sources" },
  { id: "top_referrers" as const, label: "Top Referrers" },
  { id: "new_vs_returning" as const, label: "New vs. Returning Visitors" },
] as const;

const FATHOM_SITE_ID_RE = /^[A-Z0-9]{5,12}$/i;

export interface FathomConfig {
  connected: boolean;
  fathomSiteId: string | null;
  metricsEnabled: string[];
}

interface FathomAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteKey: string;
  config: FathomConfig | null;
  onSaved: () => void;
}

export function FathomAnalyticsModal({
  open,
  onOpenChange,
  siteKey,
  config,
  onSaved,
}: FathomAnalyticsModalProps) {
  const [fathomSiteId, setFathomSiteId] = useState("");
  const [metricsEnabled, setMetricsEnabled] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditMode = config?.connected ?? false;

  useEffect(() => {
    if (open) {
      setFathomSiteId(config?.fathomSiteId ?? "");
      setMetricsEnabled(config?.metricsEnabled ?? FATHOM_METRICS.map((m) => m.id));
      setStatus("idle");
      setErrorMessage("");
    }
  }, [open, config?.fathomSiteId, config?.metricsEnabled, config?.connected]);

  const toggleMetric = (id: string) => {
    setMetricsEnabled((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const trimmedId = fathomSiteId.trim().toUpperCase();
    if (!trimmedId || !FATHOM_SITE_ID_RE.test(trimmedId)) {
      setStatus("error");
      setErrorMessage("Enter a valid Fathom Site ID (e.g. CDBUGS)");
      return;
    }

    try {
      const res = await fetch(`/api/analytics/fathom/${encodeURIComponent(siteKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fathomSiteId: trimmedId,
          metricsEnabled: metricsEnabled.length > 0 ? metricsEnabled : FATHOM_METRICS.map((m) => m.id),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Failed to save");
        return;
      }

      setStatus("success");
      onSaved();
      onOpenChange(false);
    } catch {
      setStatus("error");
      setErrorMessage("Failed to save. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Fathom? Event forwarding will stop.")) return;
    setStatus("submitting");
    try {
      const res = await fetch(`/api/analytics/fathom/${encodeURIComponent(siteKey)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      } else {
        setStatus("error");
        setErrorMessage("Failed to disconnect");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to disconnect");
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
            {isEditMode ? "Edit Fathom" : "Connect Fathom"}
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            {isEditMode
              ? "Update your Fathom Site ID and metrics. Stats stay in Fathom and do not appear in the BetterBlog charts."
              : "Enter your Fathom Site ID and select metrics to send. Fathom is cookieless, so this does not add a consent banner. Stats show up in Fathom, not in the BetterBlog charts."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fathom-site-id">Site ID</Label>
            <Input
              id="fathom-site-id"
              type="text"
              placeholder="CDBUGS"
              value={fathomSiteId}
              onChange={(e) => setFathomSiteId(e.target.value)}
              disabled={status === "submitting"}
              className="font-mono text-sm border-neutral-200"
            />
            <p className="text-xs text-[#6b6b6b]">
              Find this in Fathom → Settings → Sites. Copy the Site ID.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Metrics to track</Label>
            <div className="space-y-2">
              {FATHOM_METRICS.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={metricsEnabled.includes(m.id)}
                    onCheckedChange={() => toggleMetric(m.id)}
                    disabled={status === "submitting"}
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 sm:mr-auto"
                onClick={handleDisconnect}
                disabled={status === "submitting"}
              >
                Disconnect
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={status === "submitting"}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
              >
                {status === "submitting" ? "Saving…" : isEditMode ? "Save" : "Connect"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

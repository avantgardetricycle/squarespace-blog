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

const GA_METRICS = [
  { id: "traffic_sources" as const, label: "Traffic Sources" },
  { id: "top_referrers" as const, label: "Top Referrers" },
  { id: "new_vs_returning" as const, label: "New vs. Returning Visitors" },
] as const;

export interface GAConfig {
  connected: boolean;
  measurementId: string | null;
  metricsEnabled: string[];
}

interface GoogleAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteKey: string;
  config: GAConfig | null;
  onSaved: () => void;
}

export function GoogleAnalyticsModal({
  open,
  onOpenChange,
  siteKey,
  config,
  onSaved,
}: GoogleAnalyticsModalProps) {
  const [measurementId, setMeasurementId] = useState("");
  const [metricsEnabled, setMetricsEnabled] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditMode = config?.connected ?? false;

  useEffect(() => {
    if (open) {
      setMeasurementId(config?.measurementId ?? "");
      setMetricsEnabled(config?.metricsEnabled ?? GA_METRICS.map((m) => m.id));
      setStatus("idle");
      setErrorMessage("");
    }
  }, [open, config?.measurementId, config?.metricsEnabled, config?.connected]);

  const toggleMetric = (id: string) => {
    setMetricsEnabled((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const trimmedId = measurementId.trim();
    if (!trimmedId || !/^G-[A-Z0-9]+$/i.test(trimmedId)) {
      setStatus("error");
      setErrorMessage("Enter a valid GA4 Measurement ID (e.g. G-XXXXXXXXXX)");
      return;
    }

    try {
      const res = await fetch(`/api/analytics/ga/${encodeURIComponent(siteKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          measurementId: trimmedId,
          metricsEnabled: metricsEnabled.length > 0 ? metricsEnabled : GA_METRICS.map((m) => m.id),
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
    if (!confirm("Disconnect Google Analytics? Event forwarding will stop.")) return;
    setStatus("submitting");
    try {
      const res = await fetch(`/api/analytics/ga/${encodeURIComponent(siteKey)}`, {
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
            {isEditMode ? "Edit Google Analytics" : "Connect Google Analytics"}
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            {isEditMode
              ? "Update your GA4 Measurement ID and metrics."
              : "Enter your GA4 Measurement ID and select metrics to forward to Google Analytics."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga-measurement-id">Measurement ID</Label>
            <Input
              id="ga-measurement-id"
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={measurementId}
              onChange={(e) => setMeasurementId(e.target.value)}
              disabled={status === "submitting"}
              className="font-mono text-sm border-neutral-200"
            />
            <p className="text-xs text-[#6b6b6b]">
              Find this in GA4 Admin → Data Streams → your web stream
            </p>
          </div>

          <div className="space-y-3">
            <Label>Metrics to track</Label>
            <div className="space-y-2">
              {GA_METRICS.map((m) => (
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

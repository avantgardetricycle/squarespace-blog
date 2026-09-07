import { useEffect, useState } from "react";
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
import { toast } from "sonner";

export type SquarespaceApiKeyModalMode = false | "setup" | "edit";

type ApiKeyStatus = "unverified" | "verifying" | "verified" | "invalid" | "missing_permission";

interface SquarespaceApiKeyModalProps {
  mode: SquarespaceApiKeyModalMode;
  onModeChange: (mode: SquarespaceApiKeyModalMode) => void;
  siteKey: string | null;
  onSaved: (updates: { apiKeyVerified: true; enableSubscriberComments: boolean }) => void;
}

export function SquarespaceApiKeyModal({
  mode,
  onModeChange,
  siteKey,
  onSaved,
}: SquarespaceApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>("unverified");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === false) {
      setApiKeyInput("");
      setApiKeyStatus("unverified");
    }
  }, [mode]);

  const close = () => onModeChange(false);

  return (
    <Dialog
      open={mode !== false}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "setup" ? "Connect Squarespace API" : "Update Squarespace API Key"}
          </DialogTitle>
          <DialogDescription>
            {mode === "setup"
              ? "Connect your Squarespace API to verify subscriber emails for paywalled comment threads."
              : "Replace your Squarespace API key."}
          </DialogDescription>
        </DialogHeader>
        {mode === "edit" && (
          <p className="text-sm text-[#6b6b6b] -mt-2">Required permission: Profiles (Read).</p>
        )}
        {mode === "setup" && (
          <div className="text-sm text-[#6b6b6b] space-y-2 -mt-2">
            <p>To generate an API key:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>In Squarespace, go to Settings → Developer Tools → Developer API Keys (or Settings → Advanced → Developer API Keys)</li>
              <li>Paste an existing key with <strong>Profiles (Read)</strong>, or create one if you do not have one yet. Do not delete an old key until it has been replaced on every BetterBlog blog that uses it.</li>
              <li>Copy the key and paste it below</li>
            </ol>
          </div>
        )}
        <form
          className="space-y-4 pt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!siteKey || !apiKeyInput.trim() || apiKeyStatus !== "verified") return;
            setSaving(true);
            try {
              const res = await fetch("/api/dashboard/settings/comments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  siteKey,
                  squarespaceApiKey: apiKeyInput.trim(),
                  ...(mode === "setup" ? { subscriberCommentsEnabled: true } : {}),
                }),
              });
              if (res.ok) {
                toast.success(mode === "setup" ? "Squarespace API connected!" : "API key updated!");
                onSaved({
                  apiKeyVerified: true,
                  enableSubscriberComments: mode === "setup",
                });
                close();
              } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data?.error ?? "Failed to save");
              }
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label className="text-sm">Squarespace API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Paste your Squarespace API key"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setApiKeyStatus("unverified");
                }}
                className="flex-1 font-mono text-sm"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!apiKeyInput.trim() || apiKeyStatus === "verifying"}
                onClick={async () => {
                  if (!siteKey || !apiKeyInput.trim()) return;
                  setApiKeyStatus("verifying");
                  const res = await fetch("/api/dashboard/settings/comments/verify-api-key", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ siteKey, apiKey: apiKeyInput.trim() }),
                  });
                  const data = await res.json();
                  if (data?.valid) {
                    setApiKeyStatus("verified");
                  } else if (data?.error === "MISSING_PERMISSION") {
                    setApiKeyStatus("missing_permission");
                  } else {
                    setApiKeyStatus("invalid");
                  }
                }}
              >
                {apiKeyStatus === "verifying" ? "Verifying…" : "Verify"}
              </Button>
            </div>
            <p className="text-xs">
              {apiKeyStatus === "verified" && <span className="text-green-600">Verified ✓</span>}
              {apiKeyStatus === "invalid" && <span className="text-red-600">Invalid key ✗</span>}
              {apiKeyStatus === "missing_permission" && (
                <span className="text-red-600">Missing Profiles permission ✗</span>
              )}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={apiKeyStatus !== "verified" || saving}>
              {saving ? "Saving…" : mode === "setup" ? "Connect" : "Save Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

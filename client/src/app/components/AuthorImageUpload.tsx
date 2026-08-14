import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export interface AuthorImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  siteKey: string | null;
  authorName?: string;
  disabled?: boolean;
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AuthorImageUpload({
  value,
  onChange,
  siteKey,
  authorName,
  disabled = false,
}: AuthorImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!siteKey) {
      setError("Site is not loaded yet. Try again in a moment.");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, WebP, or GIF)");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Image must be under 4MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteKey", siteKey);
      if (value) formData.append("previousImageUrl", value);

      const res = await fetch("/api/blog-authors/photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Upload failed: ${res.status}`);
      }
      if (data.imageUrl) {
        onChange(data.imageUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    const previous = value;
    onChange(null);
    setError(null);
    if (!previous || !siteKey) return;
    void fetch("/api/blog-authors/photo", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey, imageUrl: previous }),
    }).catch(() => {
      /* best-effort */
    });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-[#6b6b6b]">Author photo</Label>
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14 border-2 border-[#e5e4e0]">
          {value ? (
            <AvatarImage src={value} alt={authorName || "Author"} />
          ) : null}
          <AvatarFallback className="bg-[#e5e4e0] text-[#6b6b6b] text-sm font-medium">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading || !siteKey}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || !siteKey}
            className="h-8 text-xs"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">{uploading ? "Uploading…" : "Upload"}</span>
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              <span className="ml-1">Remove</span>
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

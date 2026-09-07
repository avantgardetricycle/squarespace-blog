import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { buildBetterBlogSquarespaceHeaderHtml } from "@/lib/betterBlogInstallationSnippet";
import { getBetterBlogApiBase, getBetterBlogLoaderUrl } from "@/lib/betterBlogScriptUrls";
import { toast } from "sonner";

export type InstallationSnippetBlog = {
  siteKey: string;
  blogPath?: string | null;
  name?: string | null;
};

export type InstallationInstructionsVariant = "manage" | "added-new-site" | "added-replace";

function snippetForBlogs(blogs: InstallationSnippetBlog[]): string {
  return buildBetterBlogSquarespaceHeaderHtml({
    loaderUrl: getBetterBlogLoaderUrl(),
    apiBase: getBetterBlogApiBase(),
    blogs: blogs.map((b) => ({ siteKey: b.siteKey, blogPath: b.blogPath })),
  });
}

function titleForVariant(variant: InstallationInstructionsVariant): string {
  if (variant === "added-replace") return "Blog added — update your install code";
  if (variant === "added-new-site") return "Blog added successfully";
  return "Installation instructions";
}

export function InstallationInstructionsBody({
  originLabel,
  blogs,
  variant,
  justAddedName,
}: {
  originLabel: string;
  blogs: InstallationSnippetBlog[];
  variant: InstallationInstructionsVariant;
  justAddedName?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const snippet = blogs.length > 0 ? snippetForBlogs(blogs) : "";
  const multi = blogs.length > 1;
  const domain = originLabel || "this site";

  const copy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Installation code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 min-w-0">
      {variant === "added-new-site" && justAddedName ? (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm min-w-0">
          <span className="min-w-0 break-words">
            <strong>{justAddedName}</strong> has been added. Copy the code below and add it to your
            Squarespace site.
          </span>
        </div>
      ) : null}
      {variant === "added-replace" ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 text-sm min-w-0">
          <span className="min-w-0 break-words">
            {justAddedName ? (
              <>
                <strong>{justAddedName}</strong> lives on{" "}
                <span className="font-medium">{domain}</span>, which already has BetterBlog installed.
              </>
            ) : (
              <>
                This blog lives on <span className="font-medium">{domain}</span>, which already has
                BetterBlog installed.
              </>
            )}{" "}
            Copy the updated code and <strong>replace</strong> the BetterBlog block in Settings →
            Advanced → Code Injection → Header. Do not paste a second snippet.
          </span>
        </div>
      ) : (
        <p className="text-sm text-[#6b6b6b] break-words">
          Paste this into your Squarespace site&apos;s{" "}
          <span className="font-medium text-[#0a0a0a]">
            Settings → Advanced → Code Injection → Header
          </span>
          . This one block covers every BetterBlog collection on{" "}
          <span className="font-medium text-[#0a0a0a]">{domain}</span>
          {multi ? ` (${blogs.length} blogs)` : ""}. If BetterBlog is already in Header,{" "}
          <strong className="text-[#0a0a0a]">replace</strong> the old block; do not paste a second
          copy.
        </p>
      )}
      {typeof window !== "undefined" && window.location.protocol === "http:" ? (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Local dev (HTTP): If your blog is on HTTPS, the overlay may fail to load due to mixed
          content. Use a tunnel (e.g. ngrok) or deploy to test.
        </p>
      ) : null}
      {multi ? (
        <p className="text-xs text-[#6b6b6b]">
          Included blogs:{" "}
          {blogs
            .map((b) => b.name || b.blogPath || b.siteKey)
            .join(", ")}
        </p>
      ) : null}
      <div className="relative min-w-0">
        <div className="absolute right-2 top-2 z-10">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2 bg-[#0a0a0a] hover:bg-[#2d2a5e] text-white border-none"
            onClick={copy}
            disabled={!snippet}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Code
              </>
            )}
          </Button>
        </div>
        <pre className="max-h-[9.5rem] overflow-auto rounded-lg bg-[#0a0a0a] p-4 pr-24 text-sm leading-5 text-[#8F86F0] font-mono border border-[#2d2a5e] shadow-inner min-w-0 max-w-full">
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  );
}

export function InstallationInstructionsModal({
  open,
  onOpenChange,
  originLabel,
  blogs,
  variant = "manage",
  justAddedName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originLabel: string;
  blogs: InstallationSnippetBlog[];
  variant?: InstallationInstructionsVariant;
  justAddedName?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{titleForVariant(variant)}</DialogTitle>
          {variant === "added-new-site" ? (
            <DialogDescription>
              Install the code snippet on your Squarespace site to get started.
            </DialogDescription>
          ) : variant === "added-replace" ? (
            <DialogDescription>
              Replace the Header code for {originLabel || "this site"} so every blog is covered.
            </DialogDescription>
          ) : (
            <DialogDescription>
              One snippet per Squarespace site. Paste it in Header code injection.
            </DialogDescription>
          )}
        </DialogHeader>
        <InstallationInstructionsBody
          originLabel={originLabel}
          blogs={blogs}
          variant={variant}
          justAddedName={justAddedName}
        />
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#5B4FE8] hover:bg-[#4a3fd4]"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

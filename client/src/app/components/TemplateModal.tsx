import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TemplatePreview } from "@/app/components/TemplatePreview";
import { cn } from "@/app/components/ui/utils";

export interface Template {
  id: string;
  templateKey: string;
  name: string;
  description: string | null;
  collectionConfig?: object | null;
  postConfig?: object | null;
  previewLayout: string;
}

/** Display order matching the template picker mockups. */
const COLLECTION_ORDER = ["showcase", "newsroom", "masthead", "editorial", "digest"];
const POST_ORDER = ["reporter", "feature", "writer", "story", "publisher"];

/** Short blurbs shown under each card (mockup copy). */
const SHORT_DESCRIPTIONS: Record<string, string> = {
  showcase: "Large alternating images",
  newsroom: "Compact list with search",
  masthead: "Hero plus image grid",
  editorial: "Alternating mosaic, text on images",
  digest: "Main column with sidebar",
  reporter: "Title beside image, right sidebar",
  feature: "Centered header, full-bleed hero",
  writer: "Centered header, no image",
  story: "Dark split hero, narrow column",
  publisher: "Hero overlay, right sidebar",
};

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Template, level: "collection" | "post") => void;
  /** Tab to show when the modal opens (matches Collection / Post in Configure). */
  initialLevel?: "collection" | "post";
  /** Currently applied collection template id (for selection highlight). */
  collectionTemplateId?: string | null;
  /** Currently applied post template id (for selection highlight). */
  postTemplateId?: string | null;
}

function sortTemplates(templates: Template[], order: string[]): Template[] {
  const rank = new Map(order.map((key, i) => [key, i]));
  return [...templates].sort((a, b) => {
    const ai = rank.get(a.templateKey) ?? Number.MAX_SAFE_INTEGER;
    const bi = rank.get(b.templateKey) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

export function TemplateModal({
  open,
  onOpenChange,
  onSelectTemplate,
  initialLevel = "collection",
  collectionTemplateId = null,
  postTemplateId = null,
}: TemplateModalProps) {
  const [collectionTemplates, setCollectionTemplates] = useState<Template[]>([]);
  const [postTemplates, setPostTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"collection" | "post">("collection");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    template: Template;
    level: "collection" | "post";
  } | null>(null);
  const confirmPanelRef = useRef<HTMLDivElement>(null);

  const templates = useMemo(() => {
    const list = activeTab === "collection" ? collectionTemplates : postTemplates;
    const order = activeTab === "collection" ? COLLECTION_ORDER : POST_ORDER;
    return sortTemplates(list, order);
  }, [activeTab, collectionTemplates, postTemplates]);

  useEffect(() => {
    if (!open) return;
    setPending(null);
    setActiveTab(initialLevel);
    setLoading(true);
    Promise.all([
      fetch("/api/templates?level=collection", { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : { templates: [] })
      ),
      fetch("/api/templates?level=post", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : { templates: [] }
      ),
    ])
      .then(([coll, post]) => {
        setCollectionTemplates(Array.isArray(coll?.templates) ? coll.templates : []);
        setPostTemplates(Array.isArray(post?.templates) ? post.templates : []);
      })
      .catch(() => {
        setCollectionTemplates([]);
        setPostTemplates([]);
      })
      .finally(() => setLoading(false));
  }, [open, initialLevel]);

  useEffect(() => {
    setSelectedId(activeTab === "collection" ? collectionTemplateId : postTemplateId);
  }, [activeTab, collectionTemplateId, postTemplateId, open]);

  useEffect(() => {
    if (!pending) return;
    confirmPanelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [pending]);

  const handleSelect = (template: Template) => {
    setPending({ template, level: activeTab });
  };

  const handlePickerOpenChange = (next: boolean) => {
    if (!next) setPending(null);
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!pending) return;
    const { template, level } = pending;
    setPending(null);
    onSelectTemplate(template, level);
    onOpenChange(false);
  };

  const title =
    activeTab === "collection" ? "Choose a collection template" : "Choose a post template";
  const pendingLevelLabel = pending?.level === "post" ? "Post" : "Collection";
  const otherLevelLabel = pending?.level === "post" ? "Collection" : "Post";
  const pendingOverwriteDetail =
    pending?.level === "post"
      ? "header, progress bar, post modules, sidebars, and related options"
      : "layout, sidebars, modules, featured article, pagination, and related options";

  return (
    <Dialog open={open} onOpenChange={handlePickerOpenChange}>
      <DialogContent
        className="sm:max-w-5xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0"
        onEscapeKeyDown={(e) => {
          if (pending) {
            e.preventDefault();
            setPending(null);
          }
        }}
      >
        <div className={cn("px-6 pt-6 pb-3 shrink-0", pending && "pointer-events-none")} aria-hidden={Boolean(pending)}>
          <DialogHeader className="mb-3">
            <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          </DialogHeader>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "collection" | "post")}
          >
            <TabsList className="rounded-full h-9 p-1 bg-muted/80">
              <TabsTrigger value="collection" className="rounded-full px-4">
                Collection
              </TabsTrigger>
              <TabsTrigger value="post" className="rounded-full px-4">
                Post
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={cn("px-6 pb-6 flex-1 min-h-0 overflow-y-auto", pending && "pointer-events-none")} aria-hidden={Boolean(pending)}>
          {loading ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No templates available.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-7 pt-2">
              {templates.map((template) => (
                <TemplateGridCard
                  key={template.id}
                  template={template}
                  selected={template.id === selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
        {pending && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPending(null)}
          >
            <div
              ref={confirmPanelRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="apply-template-title"
              aria-describedby="apply-template-desc"
              className="bg-background w-full max-w-md rounded-lg border p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <h2 id="apply-template-title" className="text-lg leading-none font-semibold">
                  Apply {pendingLevelLabel.toLowerCase()} template?
                </h2>
                <p id="apply-template-desc" className="text-muted-foreground text-sm">
                  Applying &ldquo;{pending.template.name}&rdquo; will overwrite all {pendingLevelLabel}{" "}
                  layout settings ({pendingOverwriteDetail}) with this template. {otherLevelLabel}{" "}
                  settings, default authors, comments, and paywall are not changed. Use Save when you
                  are ready to update your live blog.
                </p>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setPending(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirm}>
                  Apply template
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateGridCard({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: (template: Template) => void;
}) {
  const blurb =
    SHORT_DESCRIPTIONS[template.templateKey] ?? template.description ?? "";

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        "group flex flex-col text-left rounded-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8]/50 focus-visible:ring-offset-2"
      )}
      aria-pressed={selected}
      aria-label={`Select ${template.name}`}
    >
      <div
        className={cn(
          "rounded-xl border bg-white overflow-hidden transition-[border-color,box-shadow]",
          selected
            ? "border-[#5B4FE8] shadow-[0_0_0_1px_#5B4FE8]"
            : "border-[#e5e4e0] group-hover:border-[#c8c7c3]"
        )}
      >
        <div className="relative aspect-[5/4] overflow-hidden bg-[#faf9f7]">
          <div
            className="absolute top-0 left-0 w-[220%] origin-top-left scale-[0.455] pointer-events-none select-none"
            aria-hidden
          >
            <TemplatePreview
              previewLayout={template.previewLayout}
              className="min-w-full"
            />
          </div>
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="font-semibold text-[15px] text-[#111] leading-tight">
          {template.name}
        </div>
        {blurb && (
          <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
            {blurb}
          </div>
        )}
      </div>
    </button>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TEMPLATE_PICKER_ART } from "@/app/components/template-picker-art";
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

const TEMPLATE_DETAILS: Record<string, { description: string; features: string[] }> = {
  showcase: {
    description:
      "Big images that alternate sides, with the excerpt beside each one. The default blog index.",
    features: ["Alternating 3:2 images", "Filter, search and sort", "Infinite scroll"],
  },
  newsroom: {
    description: "Compact rows with small thumbnails, built for scanning a big archive.",
    features: ["Small thumbnails with excerpts", "Filter, search and sort", "Numbered pages"],
  },
  masthead: {
    description: "A wide featured post across the top, then a three-column grid.",
    features: ["Wide featured hero", "Three-column grid", "Newsletter signup in the footer"],
  },
  editorial: {
    description: "A mosaic of one large and two small tiles per row, with titles over the images.",
    features: ["Titles over images", "Alternating large and small tiles", "Numbered pages"],
  },
  digest: {
    description: "A two-column post grid beside a sidebar for your bio, signup and popular posts.",
    features: ["Right sidebar", "Author, newsletter and popular posts", "Numbered pages"],
  },
  reporter: {
    description: "Title beside a large image, then the article with a sidebar alongside it.",
    features: ["Reading progress bar", "Author and related posts in the sidebar", "Newsletter signup in the footer"],
  },
  feature: {
    description:
      "A centered headline above a full-width image, with contents on the left and the author on the right.",
    features: ["Full-width hero image", "Table of contents", "Share buttons"],
  },
  writer: {
    description: "Words only: a centered headline and the article, with no image or sidebars.",
    features: ["No header image", "No sidebars", "Author card and previous / next"],
  },
  story: {
    description: "A dark header with the image beside the title, then the article.",
    features: ["Dark header, color adjustable", "Image beside the title", "No sidebars"],
  },
  publisher: {
    description: "The title sits over a tall image, with a sidebar of popular and related posts.",
    features: ["Title over the hero image", "Popular and related posts", "Category list"],
  },
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
  /** Template keys the current plan can apply. Omitted keys stay visible and locked. */
  allowedTemplateKeys?: { collection: string[]; post: string[] } | null;
  requiredPlan?: Record<string, string>;
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
  allowedTemplateKeys = null,
  requiredPlan = {},
}: TemplateModalProps) {
  const [collectionTemplates, setCollectionTemplates] = useState<Template[]>([]);
  const [postTemplates, setPostTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"collection" | "post">("collection");
  const [previewId, setPreviewId] = useState<string | null>(null);
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
    setPreviewId(activeTab === "collection" ? collectionTemplateId : postTemplateId);
  }, [activeTab, collectionTemplateId, postTemplateId, open]);

  useEffect(() => {
    if (!pending) return;
    confirmPanelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [pending]);

  const previewTemplate =
    templates.find((template) => template.id === previewId) ?? templates[0] ?? null;
  const previewIndex = previewTemplate
    ? Math.max(0, templates.findIndex((template) => template.id === previewTemplate.id))
    : 0;
  const previewDetails = previewTemplate
    ? TEMPLATE_DETAILS[previewTemplate.templateKey]
    : undefined;

  const templateLocked = (template: Template, level: "collection" | "post") => {
    if (!allowedTemplateKeys) return false;
    return !allowedTemplateKeys[level].includes(template.templateKey);
  };
  const previewLocked = previewTemplate ? templateLocked(previewTemplate, activeTab) : false;

  const handleUse = () => {
    if (!previewTemplate || previewLocked) return;
    setPending({ template: previewTemplate, level: activeTab });
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

  const pendingLevelLabel = pending?.level === "post" ? "Post" : "Collection";
  const otherLevelLabel = pending?.level === "post" ? "Collection" : "Post";
  const pendingOverwriteDetail =
    pending?.level === "post"
      ? "header, progress bar, post modules, sidebars, and related options"
      : "layout, sidebars, modules, featured article, pagination, and related options";

  return (
    <Dialog open={open} onOpenChange={handlePickerOpenChange}>
      <DialogContent
        className="flex h-[min(760px,calc(100vh-2rem))] w-[min(1080px,calc(100vw-2rem))] max-w-none flex-col gap-3.5 overflow-hidden rounded-2xl border-0 bg-[#F7F6F3] p-5 font-sans text-[#141414] sm:max-w-none [&>button.absolute]:hidden"
        onEscapeKeyDown={(e) => {
          if (pending) {
            e.preventDefault();
            setPending(null);
          }
        }}
      >
        <DialogTitle className="sr-only">Choose a template</DialogTitle>
        <div className={cn("flex h-11 shrink-0 items-center gap-5", pending && "pointer-events-none")} aria-hidden={Boolean(pending)}>
          <h2 className="m-0 text-[21px] font-bold tracking-tight">Choose a template</h2>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "collection" | "post")} className="gap-0">
            <TabsList className="h-auto gap-[3px] rounded-full bg-[#ECEAE5] p-[3px]">
              <TabsTrigger
                value="collection"
                className="h-auto flex-none rounded-full px-4 py-2 text-sm font-medium text-[#555] data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-[#141414] data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                Blog index
              </TabsTrigger>
              <TabsTrigger
                value="post"
                className="h-auto flex-none rounded-full px-4 py-2 text-sm font-medium text-[#555] data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-[#141414] data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                Post page
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <DialogClose className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-[#555] hover:bg-black/5">
            <X className="h-[18px] w-[18px]" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-3.5", pending && "pointer-events-none")} aria-hidden={Boolean(pending)}>
          {loading ? (
            <div className="py-12 text-center text-sm text-[#5F5F5F]">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#5F5F5F]">No templates available.</div>
          ) : (
            <>
              <div className="grid shrink-0 grid-cols-5 gap-2.5">
                {templates.map((template) => (
                  <TemplateThumb
                    key={template.id}
                    template={template}
                    selected={template.id === previewTemplate?.id}
                    onSelect={() => setPreviewId(template.id)}
                  />
                ))}
              </div>
              {previewTemplate && (
                <div className="flex min-h-0 flex-1 gap-6">
                  <div className="flex w-[min(538px,52%)] shrink-0 flex-col overflow-hidden rounded-[10px] border border-[#E4E2DC] bg-white shadow-[0_4px_18px_rgba(20,18,16,0.06)]">
                    <div className="flex h-[22px] shrink-0 items-center gap-1 border-b border-[#E4E2DC] bg-[#F1EFEB] px-2.5" aria-hidden>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D6D2CB]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D6D2CB]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D6D2CB]" />
                      <span className="ml-2.5 text-[10px] text-[#6B6B6B]">mayaokonkwo.com/journal</span>
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden [container-type:inline-size]">
                      <ScaledPreview previewLayout={previewTemplate.previewLayout} />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-b from-transparent to-white" />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto pt-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[30px] leading-[1.1]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        {previewTemplate.name}
                      </div>
                      <span className="whitespace-nowrap text-[13px] text-[#5F5F5F]">
                        {previewIndex + 1} of {templates.length}
                      </span>
                    </div>
                    <p className="text-[15px] leading-normal text-[#444]">
                      {previewDetails?.description ?? previewTemplate.description}
                    </p>
                    {previewDetails && previewDetails.features.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F5F5F]">
                          Includes
                        </div>
                        {previewDetails.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2.5 text-[14.5px] text-[#222]">
                            <Check className="h-4 w-4 shrink-0 text-[#5B4FE8]" strokeWidth={2.5} />
                            {feature}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex flex-col gap-3">
                      <p className="text-[12.5px] leading-normal text-[#5F5F5F]">
                        Previewed with sample posts. Your blog keeps its own fonts and colors.
                      </p>
                      <div className="flex gap-2.5">
                        <DialogClose className="h-11 rounded-full border border-[#D6D3CC] bg-white px-[18px] text-[14.5px] font-medium">
                          Cancel
                        </DialogClose>
                        <Button
                          type="button"
                          className="h-11 flex-1 rounded-full bg-[#5B4FE8] text-[14.5px] font-semibold hover:bg-[#4339C9]"
                          disabled={previewLocked}
                          onClick={handleUse}
                        >
                          {previewLocked
                            ? `Included on ${requiredPlan[previewTemplate.templateKey] ?? "a higher plan"}`
                            : `Use ${previewTemplate.name}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
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

function ScaledPreview({ previewLayout }: { previewLayout: string }) {
  const html = TEMPLATE_PICKER_ART[previewLayout];
  if (!html) return null;
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 origin-top-left select-none"
      style={{
        width: 1280,
        height: 1000,
        transform: "scale(calc(100cqw / 1280px))",
        transformOrigin: "top left",
      }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TemplateThumb({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={template.name}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-[10px] border-2 p-1.5 text-left font-inherit",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8]/50",
        selected ? "border-[#5B4FE8] bg-[#F1EFFE]" : "border-transparent bg-transparent hover:bg-white/60"
      )}
    >
      <div className="relative h-[130px] w-full overflow-hidden rounded-md border border-[#E6E4DE] bg-white [container-type:inline-size]">
        <ScaledPreview previewLayout={template.previewLayout} />
      </div>
      <span className="truncate px-[3px] text-[13px] font-semibold">{template.name}</span>
    </button>
  );
}

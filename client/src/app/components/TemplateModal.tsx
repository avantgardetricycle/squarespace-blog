import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { TemplatePreview } from "@/app/components/TemplatePreview";

export interface Template {
  id: string;
  templateKey: string;
  name: string;
  description: string | null;
  collectionConfig?: object | null;
  postConfig?: object | null;
  previewLayout: string;
}

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Template, level: "collection" | "post") => void;
  /** Tab to show when the modal opens (matches Collection / Post in Configure). */
  initialLevel?: "collection" | "post";
}

export function TemplateModal({
  open,
  onOpenChange,
  onSelectTemplate,
  initialLevel = "collection",
}: TemplateModalProps) {
  const [collectionTemplates, setCollectionTemplates] = useState<Template[]>([]);
  const [postTemplates, setPostTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"collection" | "post">("collection");
  const [index, setIndex] = useState(0);

  const templates = activeTab === "collection" ? collectionTemplates : postTemplates;
  const currentTemplate = templates[index] ?? null;

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialLevel);
    setIndex(0);
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
    setIndex(0);
  }, [activeTab]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, templates.length - 1)));
  }, [templates.length]);

  const handlePrev = () => setIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setIndex((i) => Math.min(templates.length - 1, i + 1));

  const handleSelect = () => {
    if (currentTemplate) {
      onSelectTemplate(currentTemplate, activeTab);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl w-[98vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Change Template</DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "collection" | "post")}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="post">Post</TabsTrigger>
          </TabsList>
          <TabsContent value="collection" className="flex-1 min-h-0 flex flex-col mt-2 data-[state=inactive]:hidden">
            {loading ? (
              <div className="text-sm text-muted-foreground py-8">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8">No templates available.</div>
            ) : (
              <TemplateCarousel
                template={currentTemplate}
                index={index}
                total={templates.length}
                onPrev={handlePrev}
                onNext={handleNext}
                onIndexChange={setIndex}
                onSelect={handleSelect}
              />
            )}
          </TabsContent>
          <TabsContent value="post" className="flex-1 min-h-0 flex flex-col mt-2 data-[state=inactive]:hidden">
            {loading ? (
              <div className="text-sm text-muted-foreground py-8">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8">No templates available.</div>
            ) : (
              <TemplateCarousel
                template={currentTemplate}
                index={index}
                total={templates.length}
                onPrev={handlePrev}
                onNext={handleNext}
                onIndexChange={setIndex}
                onSelect={handleSelect}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCarousel({
  template,
  index,
  total,
  onPrev,
  onNext,
  onIndexChange,
  onSelect,
}: {
  template: Template | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onIndexChange: (i: number) => void;
  onSelect: () => void;
}) {
  if (!template) return null;

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h3 className="font-semibold text-base truncate">{template.name}</h3>
        <span className="text-xs text-muted-foreground shrink-0">
          {index + 1} of {total}
        </span>
      </div>
      {template.description && (
        <p className="text-sm text-muted-foreground line-clamp-1 shrink-0">{template.description}</p>
      )}
      <div className="flex items-center gap-3 flex-1 min-h-[50vh]">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={onPrev}
          disabled={index <= 0}
          aria-label="Previous template"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0 min-h-[50vh] max-h-[50vh] border rounded-lg bg-[#f7f6f3] overflow-auto">
          <TemplatePreview
            previewLayout={template.previewLayout}
            className="min-w-full"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={onNext}
          disabled={index >= total - 1}
          aria-label="Next template"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onIndexChange(i)}
            className={`h-1.5 rounded-full transition-colors ${
              i === index ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to template ${i + 1}`}
          />
        ))}
      </div>
      <Button className="w-full" onClick={onSelect}>
        Use this template
      </Button>
    </div>
  );
}

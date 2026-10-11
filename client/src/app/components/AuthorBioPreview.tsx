import { useEffect, useRef } from "react";
import { fillAuthorBioElement, type AuthorBioRichFormat } from "@/lib/authorBioHtml";

const previewClassName =
  "text-sm leading-relaxed text-[#0a0a0a] [&_p]:m-0 [&_p+p]:mt-1.5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0 [&_a]:underline [&_a]:text-[#0a0a0a]";

export function AuthorBioPreview({
  source,
  format,
}: {
  source: string;
  format: AuthorBioRichFormat;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const empty = !source.trim();

  useEffect(() => {
    const el = ref.current;
    if (!el || empty) return;
    fillAuthorBioElement(el, source, format);
  }, [source, format, empty]);

  return (
    <div className="w-full min-h-[72px] px-3 py-2 text-sm border border-[#e5e4e0] rounded-md bg-[#fafaf8]">
      {empty ? (
        <span className="text-[#6b6b6b]">Nothing to preview.</span>
      ) : (
        <div ref={ref} className={previewClassName} />
      )}
    </div>
  );
}

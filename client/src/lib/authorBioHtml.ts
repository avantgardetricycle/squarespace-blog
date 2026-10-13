/** Dashboard preview of author bios. Keep in step with bbFillAuthorBioElement in scripts/renderer.js. */

export type AuthorBioRichFormat = "markdown" | "html";

const ALLOW_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "a", "ul", "ol", "li"]);
const DROP_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "svg",
  "math",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "textarea",
  "select",
  "button",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeBioHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^\s*javascript:/i.test(trimmed)) return "";
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return "";
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Split a CommonMark destination into the URL and an optional "title" or 'title'. */
function splitMarkdownLink(destination: string): { href: string; title: string } {
  const raw = destination.trim();
  let href = raw;
  let title = "";
  const match = raw.match(/^(.*?)\s+(?:"([^"]*)"|'([^']*)'|&quot;([\s\S]*?)&quot;)\s*$/);
  if (match) {
    href = match[1].trim();
    title = match[2] ?? match[3] ?? match[4] ?? "";
  }
  const angled = href.match(/^<(.*)>$/) || href.match(/^&lt;([\s\S]*)&gt;$/);
  if (angled) href = angled[1];
  return { href, title };
}

function applyInlineMarkdown(escaped: string): string {
  const withLinks = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    const parts = splitMarkdownLink(url);
    const href = safeBioHref(parts.href);
    if (!href) return label;
    const titleAttr = parts.title.trim()
      ? ` title="${escapeHtml(unescapeHtml(parts.title))}"`
      : "";
    return `<a href="${escapeHtml(href)}"${titleAttr}>${label}</a>`;
  });
  const withAutolinks = withLinks.replace(/&lt;((?:https?:\/\/|mailto:)[^<\s]*?)&gt;/gi, (match, url: string) => {
    const href = safeBioHref(unescapeHtml(url));
    if (!href) return match;
    const text = escapeHtml(href);
    return `<a href="${text}">${text}</a>`;
  });
  const withBold = withAutolinks
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  return withItalic.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>");
}

function listKind(line: string): "ul" | "ol" | "" {
  if (/^\s*(?:[-–—•]\s*|\*\s+)\S/.test(line)) return "ul";
  if (/^\s*\d+\.\s+\S/.test(line)) return "ol";
  return "";
}

function markdownToBioHtml(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    const kind = listKind(lines[i]);
    if (kind) {
      const items: string[] = [];
      while (i < lines.length && listKind(lines[i]) === kind) {
        const itemText = lines[i].replace(/^\s*(?:[-–—•]\s*|\*\s+|\d+\.\s+)/, "");
        items.push(`<li>${applyInlineMarkdown(escapeHtml(itemText))}</li>`);
        i++;
      }
      html.push(`<${kind}>${items.join("")}</${kind}>`);
    } else {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim() && !listKind(lines[i])) {
        parts.push(applyInlineMarkdown(escapeHtml(lines[i])));
        i++;
      }
      if (parts.length) html.push(`<p>${parts.join("<br>")}</p>`);
    }
  }
  return html.join("");
}

function appendSanitized(source: Node, target: Node): void {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent || ""));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) continue;
    if (!ALLOW_TAGS.has(tag)) {
      appendSanitized(element, target);
      continue;
    }
    if (tag === "a") {
      const href = safeBioHref(element.getAttribute("href") || "");
      if (!href) {
        appendSanitized(element, target);
        continue;
      }
      const link = document.createElement("a");
      link.setAttribute("href", href);
      const title = element.getAttribute("title");
      if (title) link.setAttribute("title", title);
      if (/^https?:\/\//i.test(href)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
      appendSanitized(element, link);
      target.appendChild(link);
      continue;
    }
    const next = document.createElement(tag);
    if (tag !== "br") appendSanitized(element, next);
    target.appendChild(next);
  }
}

export function fillAuthorBioElement(el: HTMLElement, bio: string, format: AuthorBioRichFormat): void {
  el.replaceChildren();
  const html = format === "markdown" ? markdownToBioHtml(bio) : bio;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    appendSanitized(doc.body, el);
  } catch {
    el.textContent = bio;
  }
}

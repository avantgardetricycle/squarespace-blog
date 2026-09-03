import type { Components } from "react-markdown";
import Markdown from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <p className="mb-2 font-semibold last:mb-0">{children}</p>,
  h2: ({ children }) => <p className="mb-2 font-semibold last:mb-0">{children}</p>,
  h3: ({ children }) => <p className="mb-2 font-semibold last:mb-0">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[#d9d8d4] pl-3 text-[#3f3f3f] last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-white/70 px-2 py-1.5 font-mono text-[13px]">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[13px]">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md last:mb-0">{children}</pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-2"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-[#e5e4e0]" />,
};

export function SupportMarkdown({ children }: { children: string }) {
  return (
    <div className="[&_p:last-child]:mb-0">
      <Markdown components={components}>{children}</Markdown>
    </div>
  );
}

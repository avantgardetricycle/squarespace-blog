import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Check, Plus } from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import { getDashboardMe } from "@/api/auth";
import { submitSupportRequest, type SupportFormMode } from "@/api/support";
import { SUPPORT_FAQ_CATEGORIES, type FaqCategory } from "@/lib/supportFaq";

const SUBJECT_OPTIONS = [
  "Installation",
  "Billing & plans",
  "Feature question",
  "Bug — something's broken",
  "Other",
] as const;

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

function FaqAccordionItem({
  question,
  answer,
  category,
  showCategory,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  category: FaqCategory;
  showCategory: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("rounded-2xl border border-[#e5e4e0] bg-white overflow-hidden", isOpen && "shadow-sm")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-[19px] text-left"
      >
        <span className="flex flex-col items-start gap-1.5">
          {showCategory && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: category.tagBg, color: category.tagFg }}
            >
              {category.label}
            </span>
          )}
          <span className="text-[15.5px] font-semibold leading-snug text-[#0a0a0a]">{question}</span>
        </span>
        <span
          className={cn(
            "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#f7f6f3] text-[#0a0a0a] transition-all",
            isOpen && "rotate-45 bg-[#5B4FE8] text-white"
          )}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-[14.5px] leading-relaxed text-[#6b6b6b]">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function SupportPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<SupportFormMode>("question");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDashboardMe().then((me) => setIsAuthenticated(!!me));
  }, []);

  const faqRows = useMemo(() => {
    if (activeCategory === "all") {
      return SUPPORT_FAQ_CATEGORIES.flatMap((category) =>
        category.items.map((item) => ({ ...item, category }))
      );
    }
    const category = SUPPORT_FAQ_CATEGORIES.find((c) => c.id === activeCategory);
    return category ? category.items.map((item) => ({ ...item, category })) : [];
  }, [activeCategory]);

  useEffect(() => {
    setOpenFaqIndex(null);
  }, [activeCategory]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setSubject("");
    setPageUrl("");
    setMessage("");
    setScreenshotFile(null);
    setStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readScreenshot = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Failed to read screenshot"));
      reader.readAsDataURL(file);
    });
  };

  const handleScreenshotChange = (file: File | null) => {
    if (!file) {
      setScreenshotFile(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setErrorMessage("Screenshot must be a PNG or JPG image");
      setStatus("error");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setErrorMessage("Screenshot must be 10MB or smaller");
      setStatus("error");
      return;
    }
    setScreenshotFile(file);
    setErrorMessage("");
    if (status === "error") {
      setStatus("idle");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      let screenshot: { filename: string; contentType: string; data: string } | undefined;
      if (screenshotFile) {
        const data = await readScreenshot(screenshotFile);
        screenshot = {
          filename: screenshotFile.name,
          contentType: screenshotFile.type,
          data,
        };
      }

      await submitSupportRequest({
        name: name.trim(),
        email: email.trim(),
        mode: formMode,
        subject,
        message: message.trim(),
        pageUrl: formMode === "problem" ? pageUrl.trim() || undefined : undefined,
        screenshot,
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const isProblem = formMode === "problem";

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#0a0a0a] font-sans">
      <header className="sticky top-0 z-50 border-b border-[#e5e4e0] bg-[#f7f6f3]/88 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-6 px-4 md:px-7">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-sm font-medium text-[#6b6b6b]">Support</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#faq" className="text-sm font-medium text-[#6b6b6b] transition-colors hover:text-[#5B4FE8]">
              FAQs
            </a>
            <a href="#contact" className="text-sm font-medium text-[#6b6b6b] transition-colors hover:text-[#5B4FE8]">
              Contact
            </a>
          </nav>
          {isAuthenticated ? (
            <Button asChild variant="outline" className="rounded-full border-[#e5e4e0] bg-transparent hover:border-[#0a0a0a]">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="rounded-full border-[#e5e4e0] bg-transparent hover:border-[#0a0a0a]">
              <Link to="/">Back to home</Link>
            </Button>
          )}
        </div>
      </header>

      <section id="faq" className="px-4 py-14 md:px-7 md:py-[88px] md:pt-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-11 max-w-[620px] text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="h-px w-9 bg-[#e5e4e0]" />
              <span className="text-xs font-bold uppercase tracking-[0.09em] text-[#5B4FE8]">Help center</span>
              <span className="h-px w-9 bg-[#e5e4e0]" />
            </div>
            <h1 className="font-heading text-[clamp(1.9rem,3.4vw,2.5rem)] font-normal leading-tight tracking-tight">
              Everything you might be <em className="italic text-[#5B4FE8]">wondering.</em>
            </h1>
            <p className="mt-3.5 text-base text-[#6b6b6b]">
              Browse by topic, or send us a message below if you can&apos;t find your answer.
            </p>
          </div>

          <div className="mb-11 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-full border px-5 py-2.5 text-[13.5px] font-semibold transition-colors",
                activeCategory === "all"
                  ? "border-[#5B4FE8] bg-[#5B4FE8] text-white"
                  : "border-[#e5e4e0] bg-white text-[#6b6b6b] hover:border-[#5B4FE8] hover:text-[#5B4FE8]"
              )}
            >
              All
            </button>
            {SUPPORT_FAQ_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "rounded-full border px-5 py-2.5 text-[13.5px] font-semibold transition-colors",
                  activeCategory === category.id
                    ? "border-[#5B4FE8] bg-[#5B4FE8] text-white"
                    : "border-[#e5e4e0] bg-white text-[#6b6b6b] hover:border-[#5B4FE8] hover:text-[#5B4FE8]"
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="mx-auto flex max-w-[760px] flex-col gap-3">
            {faqRows.map((item, index) => (
              <FaqAccordionItem
                key={`${item.category.id}-${item.q}`}
                question={item.q}
                answer={item.a}
                category={item.category}
                showCategory={activeCategory === "all"}
                isOpen={openFaqIndex === index}
                onToggle={() => setOpenFaqIndex((current) => (current === index ? null : index))}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#0a0a0a] px-4 py-14 text-white md:px-7 md:py-[88px]">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/7 px-4 py-2 text-[13px] font-semibold">
            ✦ Still stuck? We&apos;ve got you.
          </div>
          <h2 className="mt-5 font-heading text-[clamp(2rem,3.8vw,2.7rem)] font-normal leading-tight tracking-tight">
            Talk to a <em className="italic text-[#8F86F0]">human.</em>
          </h2>
          <p className="mx-auto mt-3.5 max-w-[440px] text-base text-white/55">
            Logged-in customers can also chat with BetterBlog Support from the dashboard. A real teammate still reads every message sent here.
          </p>

          <div className="mt-9 inline-flex rounded-full border border-white/15 bg-white/6 p-1">
            <button
              type="button"
              onClick={() => setFormMode("question")}
              className={cn(
                "rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-colors",
                formMode === "question" ? "bg-white text-[#0a0a0a]" : "text-white/55 hover:text-white/80"
              )}
            >
              Ask a question
            </button>
            <button
              type="button"
              onClick={() => setFormMode("problem")}
              className={cn(
                "rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-colors",
                formMode === "problem" ? "bg-white text-[#0a0a0a]" : "text-white/55 hover:text-white/80"
              )}
            >
              Report a problem
            </button>
          </div>

          <div className="mt-9 rounded-[22px] bg-white p-6 text-left text-[#0a0a0a] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] md:p-9">
            {status === "success" ? (
              <div className="py-3 text-center">
                <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#E6F5EC] text-[#1E9E5A]">
                  <Check className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <h3 className="font-heading text-xl font-normal">Message sent</h3>
                <p className="mt-2 text-[14.5px] text-[#6b6b6b]">
                  We&apos;ll reply within 2 hours at {email || "your inbox"}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 rounded-full"
                  onClick={resetForm}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-[18px]">
                <div className="grid gap-3.5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="support-name" className="text-[12.5px] text-[#6b6b6b]">
                      Name
                    </Label>
                    <Input
                      id="support-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Sarah Clarke"
                      className="rounded-xl border-[#e5e4e0] bg-[#f7f6f3] px-3.5 py-3 text-[14.5px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="support-email" className="text-[12.5px] text-[#6b6b6b]">
                      Email
                    </Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@yoursite.com"
                      className="rounded-xl border-[#e5e4e0] bg-[#f7f6f3] px-3.5 py-3 text-[14.5px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="support-subject" className="text-[12.5px] text-[#6b6b6b]">
                    {isProblem ? "What kind of problem?" : "What's this about?"}
                  </Label>
                  <select
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#e5e4e0] bg-[#f7f6f3] px-3.5 py-3 text-[14.5px] outline-none focus:border-[#5B4FE8]"
                  >
                    <option value="">Select a topic</option>
                    {SUBJECT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {isProblem && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="support-page-url" className="text-[12.5px] text-[#6b6b6b]">
                        Where does this happen?
                      </Label>
                      <Input
                        id="support-page-url"
                        type="url"
                        value={pageUrl}
                        onChange={(e) => setPageUrl(e.target.value)}
                        placeholder="yoursite.squarespace.com/blog/post-title"
                        className="rounded-xl border-[#e5e4e0] bg-[#f7f6f3] px-3.5 py-3 text-[14.5px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12.5px] text-[#6b6b6b]">
                        Attach a screenshot{" "}
                        <span className="font-normal text-[#A6A3AD]">(optional)</span>
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => handleScreenshotChange(e.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-xl border border-dashed border-[#e5e4e0] px-5 py-5 text-[13.5px] text-[#A6A3AD] transition-colors hover:border-[#5B4FE8] hover:text-[#5B4FE8]"
                      >
                        {screenshotFile
                          ? `Screenshot attached — ${screenshotFile.name}`
                          : "Click to upload, or drag a file here — PNG, JPG up to 10MB"}
                      </button>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="support-message" className="text-[12.5px] text-[#6b6b6b]">
                    {isProblem ? "Describe the problem" : "Your question"}
                  </Label>
                  <Textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder={
                      isProblem
                        ? "What did you expect to happen, and what happened instead?"
                        : "Tell us what's going on — the more detail, the faster we can help."
                    }
                    className="min-h-[110px] resize-y rounded-xl border-[#e5e4e0] bg-[#f7f6f3] px-3.5 py-3 text-[14.5px]"
                  />
                </div>

                {status === "error" && errorMessage && (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                )}

                <Button
                  type="submit"
                  disabled={status === "submitting"}
                  className="h-auto w-full rounded-full bg-[#5B4FE8] px-6 py-[15px] text-[15px] font-semibold hover:bg-[#4a3fd4]"
                >
                  {status === "submitting" ? "Sending..." : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="px-4 py-9 md:px-7">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#6b6b6b]">
            <Logo size="sm" iconOnly />
            <span>© {new Date().getFullYear()} BetterBlog</span>
          </div>
          <div className="flex gap-5 text-[13px] text-[#A6A3AD]">
            <Link to="/" className="transition-colors hover:text-[#0a0a0a]">
              Home
            </Link>
            <a href="#contact" className="transition-colors hover:text-[#0a0a0a]">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

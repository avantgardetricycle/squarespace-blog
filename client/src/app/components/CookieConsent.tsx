import { useEffect, useState } from "react";
import {
  getConsent,
  setConsent,
  resolveConsentRegion,
  OPEN_COOKIE_SETTINGS_EVENT,
  type ConsentChoice,
  type ConsentRegion,
} from "@/lib/analytics";

/**
 * Cookie consent for Google Analytics on betterblog.co.
 *
 * Shown automatically only to visitors in opt-in regions (EU/EEA, UK,
 * Switzerland, or unknown location) who haven't chosen yet. Anyone can
 * reopen it from "Cookie settings" in the footer. Accept and Decline are
 * deliberately styled the same: EU/UK regulators treat a less prominent
 * "reject" as a deceptive design.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<ConsentRegion | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveConsentRegion().then((r) => {
      if (cancelled) return;
      setRegion(r);
      if (r === "opt-in" && getConsent() === null) setOpen(true);
    });
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => {
      cancelled = true;
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    };
  }, []);

  if (!open) return null;

  const choose = (choice: ConsentChoice) => {
    setConsent(choice);
    setOpen(false);
  };

  // Accurate wording for each case: in opt-in regions GA is off until "Accept";
  // elsewhere it is on unless the visitor declines.
  const status =
    getConsent() === null
      ? region === "opt-out"
        ? "They're on unless you decline."
        : "They stay off unless you accept."
      : null;

  const button =
    "flex-1 sm:flex-none min-w-[112px] h-10 px-5 rounded-md border-[1.5px] border-[#5B4FE8] " +
    "bg-white text-[#5B4FE8] text-sm font-semibold cursor-pointer transition-colors " +
    "hover:bg-[#5B4FE8] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-[#5B4FE8]";

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-[640px] rounded-xl border border-[#e4e3de] bg-white p-5 shadow-[0_12px_40px_rgba(26,26,42,0.16)]"
    >
      <p className="text-sm leading-relaxed text-[#1a1a1a]">
        BetterBlog uses Google Analytics cookies to understand how people use this site.
        {status ? ` ${status}` : ""}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6b6b6b]">
        You can change your mind any time from &ldquo;Cookie settings&rdquo; at the bottom of the page.
      </p>
      <div className="mt-4 flex gap-3">
        <button type="button" className={button} onClick={() => choose("denied")}>
          Decline
        </button>
        <button type="button" className={button} onClick={() => choose("granted")}>
          Accept
        </button>
      </div>
    </div>
  );
}

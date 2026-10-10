const PRODUCTION_HOSTS = new Set(['betterblog.co', 'www.betterblog.co']);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const INTEREST_MODAL_SOURCES = {
  headerGetStarted: 'header_get_started',
  heroStartTrial: 'hero_start_trial',
  pricingTierEssentials: 'pricing_tier_essentials',
  pricingTierProfessional: 'pricing_tier_professional',
  pricingTierPublication: 'pricing_tier_publication',
  pricingStudioContact: 'pricing_studio_contact',
  bottomGetStarted: 'bottom_get_started',
} as const;

export type InterestModalSource =
  (typeof INTEREST_MODAL_SOURCES)[keyof typeof INTEREST_MODAL_SOURCES];

let initialized = false;

/*
 * Cookie consent. Google Analytics sets cookies. The EU/EEA and UK require
 * opt-in consent for that, and we treat Switzerland the same way. Visitors
 * there see a banner and GA stays off until they accept. Everyone else gets
 * GA straight away and can opt out from "Cookie settings" in the footer.
 * If we can't tell where a visitor is, we ask (the strict default).
 * The stored choice itself is strictly necessary, so it needs no consent.
 */
export type ConsentChoice = 'granted' | 'denied';
export type ConsentRegion = 'opt-in' | 'opt-out';

const CONSENT_STORAGE_KEY = 'bb_cookie_consent';
const REGION_SESSION_KEY = 'bb_consent_region';
export const CONSENT_CHANGED_EVENT = 'bb:cookie-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'bb:open-cookie-settings';

/**
 * ISO 3166-1 codes where analytics cookies need opt-in consent:
 * EU-27 (plus French outermost regions, which have their own codes),
 * Iceland, Liechtenstein, Norway (EEA), the UK, and Switzerland.
 */
const OPT_IN_COUNTRIES = new Set([
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // French outermost regions (part of the EU)
  'GF', 'GP', 'MQ', 'RE', 'YT', 'MF',
  // Rest of the EEA
  'IS', 'LI', 'NO',
  // UK and Switzerland
  'GB', 'CH',
]);

export function regionForCountry(country: string | null | undefined): ConsentRegion {
  if (!country) return 'opt-in'; // unknown: ask
  return OPT_IN_COUNTRIES.has(country.toUpperCase()) ? 'opt-in' : 'opt-out';
}

let consentRegion: ConsentRegion | null = null;
let regionPromise: Promise<ConsentRegion> | null = null;

/** Works out (once per page load) whether this visitor must opt in. */
export function resolveConsentRegion(): Promise<ConsentRegion> {
  if (regionPromise) return regionPromise;
  regionPromise = (async () => {
    try {
      const cached = window.sessionStorage.getItem(REGION_SESSION_KEY);
      if (cached === 'opt-in' || cached === 'opt-out') {
        consentRegion = cached;
        return cached;
      }
    } catch {
      // Storage blocked: just look it up.
    }
    let region: ConsentRegion = 'opt-in';
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/geo', { cache: 'no-store', signal: controller.signal });
      window.clearTimeout(timer);
      if (res.ok) {
        const body = (await res.json()) as { country?: unknown };
        region = regionForCountry(typeof body.country === 'string' ? body.country : null);
      }
    } catch {
      // Lookup failed or timed out: stay strict.
    }
    consentRegion = region;
    try {
      window.sessionStorage.setItem(REGION_SESSION_KEY, region);
    } catch {
      // Storage blocked: we'll look it up again next page load.
    }
    return region;
  })();
  return regionPromise;
}

/** True when GA may run: an explicit "yes", or no choice yet in an opt-out region. */
export function hasAnalyticsConsent(): boolean {
  const choice = getConsent();
  if (choice !== null) return choice === 'granted';
  return consentRegion === 'opt-out';
}

/** Entry point on page load: find the visitor's region, then start GA if allowed. */
export async function startAnalytics(): Promise<void> {
  await resolveConsentRegion();
  initAnalytics();
}

export function getConsent(): ConsentChoice | null {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice applies for this page view only.
  }
  if (choice === 'granted') {
    if (initialized) {
      // GA already loaded earlier in this page view (then turned off): turn it back on.
      const id = getMeasurementId();
      if (id) delete (window as unknown as Record<string, unknown>)[`ga-disable-${id}`];
      gtag('consent', 'update', { analytics_storage: 'granted' });
    } else {
      initAnalytics();
    }
  } else {
    disableAnalytics();
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: choice }));
}

/** Re-open the consent banner so a visitor can change their choice. */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

/** Withdrawing consent: stop GA for this page and remove the cookies it set. */
function disableAnalytics(): void {
  const measurementId = getMeasurementId();
  if (measurementId) {
    // Google's documented opt-out flag for gtag.js.
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
  }
  if (initialized) {
    gtag('consent', 'update', { analytics_storage: 'denied' });
  }
  const host = window.location.hostname;
  const domains = ['', host, `.${host.replace(/^www\./, '')}`];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !name.startsWith('_ga')) continue;
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` + (domain ? `; domain=${domain}` : '');
    }
  }
}

function getMeasurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof id !== 'string') return undefined;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const id = getMeasurementId();
  return !!id && PRODUCTION_HOSTS.has(window.location.hostname);
}

function gtag(...args: unknown[]): void {
  window.gtag?.(...args);
}

export function initAnalytics(): void {
  if (initialized || !isAnalyticsEnabled()) return;
  // In opt-in regions nothing loads, and no cookie is set, until the visitor accepts.
  if (!hasAnalyticsConsent()) return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;
  // Clear an opt-out flag left by an earlier "Decline" in this page view.
  delete (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`];

  window.dataLayer = window.dataLayer ?? [];
  // Match Google's official snippet: push `arguments`, not a rest-params array.
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('js', new Date());

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.addEventListener('load', () => {
    gtag('config', measurementId, { send_page_view: true });
  });
  document.head.appendChild(script);

  initialized = true;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isAnalyticsEnabled() || !hasAnalyticsConsent()) return;
  gtag('event', name, params);
}

export function trackPageView(path?: string): void {
  if (!isAnalyticsEnabled() || !hasAnalyticsConsent()) return;
  gtag('event', 'page_view', {
    page_path: path ?? window.location.pathname + window.location.search,
  });
}

export function billingPeriod(isAnnual: boolean): 'monthly' | 'annual' {
  return isAnnual ? 'annual' : 'monthly';
}

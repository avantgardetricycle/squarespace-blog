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
 * Cookie consent. Google Analytics sets cookies, which the EU/UK (and other
 * places we market to) require opt-in consent for. We ask everyone, and GA
 * does not load until a visitor accepts. The stored choice itself is
 * strictly necessary, so it needs no consent.
 */
export type ConsentChoice = 'granted' | 'denied';

const CONSENT_STORAGE_KEY = 'bb_cookie_consent';
export const CONSENT_CHANGED_EVENT = 'bb:cookie-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'bb:open-cookie-settings';

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
    initAnalytics();
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
  // Nothing loads, and no cookie is set, until the visitor accepts.
  if (getConsent() !== 'granted') return;

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
  if (!isAnalyticsEnabled() || getConsent() !== 'granted') return;
  gtag('event', name, params);
}

export function trackPageView(path?: string): void {
  if (!isAnalyticsEnabled() || getConsent() !== 'granted') return;
  gtag('event', 'page_view', {
    page_path: path ?? window.location.pathname + window.location.search,
  });
}

export function billingPeriod(isAnnual: boolean): 'monthly' | 'annual' {
  return isAnnual ? 'annual' : 'monthly';
}

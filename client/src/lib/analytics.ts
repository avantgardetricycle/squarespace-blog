const PRODUCTION_HOSTS = new Set(['betterblog.xyz', 'www.betterblog.xyz']);

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

function getMeasurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
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

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtagShim(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  initialized = true;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isAnalyticsEnabled()) return;
  gtag('event', name, params);
}

export function trackPageView(path?: string): void {
  if (!isAnalyticsEnabled()) return;
  gtag('event', 'page_view', {
    page_path: path ?? window.location.pathname + window.location.search,
  });
}

export function billingPeriod(isAnnual: boolean): 'monthly' | 'annual' {
  return isAnnual ? 'annual' : 'monthly';
}

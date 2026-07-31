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

// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
): void {
  fetch('http://127.0.0.1:7454/ingest/babef855-2138-46ca-93cf-7acd45e00ee4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3b4825' },
    body: JSON.stringify({
      sessionId: '3b4825',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

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
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const measurementId = getMeasurementId();
  const enabled = isAnalyticsEnabled();

  // #region agent log
  debugLog('C', 'analytics.ts:initAnalytics:entry', 'initAnalytics called', {
    hostname,
    enabled,
    alreadyInitialized: initialized,
    hasMeasurementId: !!measurementId,
    measurementIdLength: measurementId?.length ?? 0,
    measurementIdFormatValid: measurementId ? /^G-[A-Z0-9]+$/i.test(measurementId.trim()) : false,
    measurementIdHasWhitespace: measurementId ? measurementId !== measurementId.trim() : false,
  });
  // #endregion

  if (initialized || !enabled) return;
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

  // #region agent log
  script.addEventListener('load', () => {
    const gtagSource = window.gtag?.toString() ?? '';
    const isStillShim = gtagSource.includes('dataLayer?.push') || gtagSource.includes('dataLayer.push');
    debugLog('A', 'analytics.ts:script:onload', 'gtag.js script load event fired', {
      scriptSrc: script.src,
      dataLayerLength: window.dataLayer?.length ?? 0,
      gtagIsStillLocalShim: isStillShim,
      gtagSourcePreview: gtagSource.slice(0, 120),
    });
  });
  script.addEventListener('error', () => {
    debugLog('A', 'analytics.ts:script:onerror', 'gtag.js script failed to load', {
      scriptSrc: script.src,
      dataLayerLength: window.dataLayer?.length ?? 0,
    });
  });
  window.setTimeout(() => {
    const gtagSource = window.gtag?.toString() ?? '';
    const isStillShim = gtagSource.includes('dataLayer?.push') || gtagSource.includes('dataLayer.push');
    const scriptEl = document.querySelector('script[src*="googletagmanager"]');
    debugLog('A', 'analytics.ts:script:3s-check', 'gtag.js status 3s after init', {
      scriptInDom: !!scriptEl,
      scriptSrc: scriptEl?.getAttribute('src') ?? null,
      dataLayerLength: window.dataLayer?.length ?? 0,
      gtagIsStillLocalShim: isStillShim,
    });
  }, 3000);
  // #endregion

  document.head.appendChild(script);

  initialized = true;

  // #region agent log
  debugLog('D', 'analytics.ts:initAnalytics:done', 'initAnalytics completed', {
    scriptAppended: true,
    dataLayerLength: window.dataLayer?.length ?? 0,
  });

  if (typeof window !== 'undefined') {
    (window as Window & { __bbAnalyticsDebug?: () => Record<string, unknown> }).__bbAnalyticsDebug =
      () => {
        const gtagSource = window.gtag?.toString() ?? '';
        const scriptEl = document.querySelector('script[src*="googletagmanager"]');
        return {
          hostname: window.location.hostname,
          enabled: isAnalyticsEnabled(),
          scriptInDom: !!scriptEl,
          scriptSrc: scriptEl?.getAttribute('src') ?? null,
          dataLayerLength: window.dataLayer?.length ?? 0,
          dataLayer: window.dataLayer,
          gtagIsStillLocalShim:
            gtagSource.includes('dataLayer?.push') || gtagSource.includes('dataLayer.push'),
        };
      };
  }
  // #endregion
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isAnalyticsEnabled()) return;
  // #region agent log
  debugLog('B', 'analytics.ts:trackEvent', 'trackEvent called', {
    eventName: name,
    dataLayerLength: window.dataLayer?.length ?? 0,
  });
  // #endregion
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

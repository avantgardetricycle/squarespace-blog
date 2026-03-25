export type PublicPlanPricesResponse = {
  currency: string;
  plans: Record<
    string,
    {
      monthly: { perMonth: number };
      annual: { perMonth: number; perYear: number };
    }
  >;
};

export async function fetchPublicPlanPrices(): Promise<PublicPlanPricesResponse> {
  const res = await fetch("/api/checkout/prices");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to load prices");
  }
  return res.json() as Promise<PublicPlanPricesResponse>;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Whole or decimal amount only (no symbol), for large marketing numerals. */
export function formatMajorAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

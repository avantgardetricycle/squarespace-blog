import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import {
  fetchPublicPlanPrices,
  formatCurrencyAmount,
  formatMajorAmount,
  type PublicPlanPricesResponse,
} from "@/api/planPrices";
import { createResubscribeCheckoutSession } from "@/api/auth";
import {
  PUBLIC_PRICING_TIERS,
  annualSavingsPercent,
  type PublicPlanKey,
} from "@/lib/pricingTiers";

type ResubscribePlanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanKey?: string | null;
  defaultCadence?: string | null;
};

export function ResubscribePlanModal({
  open,
  onOpenChange,
  defaultPlanKey,
  defaultCadence,
}: ResubscribePlanModalProps) {
  const [isAnnual, setIsAnnual] = useState(defaultCadence !== "monthly");
  const [stripePrices, setStripePrices] = useState<PublicPlanPricesResponse | null>(null);
  const [pricesLoadError, setPricesLoadError] = useState(false);
  const [checkoutPlanKey, setCheckoutPlanKey] = useState<PublicPlanKey | null>(null);

  useEffect(() => {
    if (!open) return;
    setIsAnnual(defaultCadence !== "monthly");
    setCheckoutPlanKey(null);
    setPricesLoadError(false);
    fetchPublicPlanPrices()
      .then((data) => {
        setStripePrices(data);
      })
      .catch(() => {
        setPricesLoadError(true);
        toast.error("Could not load current prices. Try again shortly.");
      });
  }, [open, defaultCadence]);

  const currency = stripePrices?.currency ?? "usd";
  const annualSavePercentProfessional = useMemo(() => {
    const tier = stripePrices?.plans?.professional;
    if (!tier) return null;
    return annualSavingsPercent(tier.monthly.perMonth, tier.annual.perYear);
  }, [stripePrices]);

  const handleChoosePlan = async (planKey: PublicPlanKey) => {
    if (checkoutPlanKey || pricesLoadError || !stripePrices) return;
    setCheckoutPlanKey(planKey);
    try {
      const { url, error } = await createResubscribeCheckoutSession(
        planKey,
        isAnnual ? "annual" : "monthly"
      );
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error(error ?? "Failed to start checkout");
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutPlanKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1080px]">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-heading text-2xl text-[#0a0a0a]">
            Choose a plan
          </DialogTitle>
          <DialogDescription className="text-[#6b6b6b]">
            Resubscribe to restore BetterBlog on your live site. You&apos;ll be billed today —
            the free trial is for new signups only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center pt-1">
          <div className="inline-flex items-center bg-white border border-neutral-200 rounded-full p-1 gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={cn(
                "font-medium text-[13px] px-5 py-2 rounded-full cursor-pointer border-none transition-all flex items-center gap-2",
                !isAnnual ? "bg-[#5B4FE8] text-white shadow-md" : "bg-transparent text-neutral-400"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={cn(
                "font-medium text-[13px] px-5 py-2 rounded-full cursor-pointer border-none transition-all flex items-center gap-2",
                isAnnual ? "bg-[#5B4FE8] text-white shadow-md" : "bg-transparent text-neutral-400"
              )}
            >
              Annual
              {annualSavePercentProfessional != null && (
                <span
                  className={cn(
                    "text-[9.5px] font-bold px-1.5 py-0.5 rounded-full tracking-wide",
                    isAnnual ? "bg-white/20 text-white" : "bg-[#eaf7f2] text-[#10B981]"
                  )}
                >
                  Save {annualSavePercentProfessional}%
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          {PUBLIC_PRICING_TIERS.map((tier) => {
            const tierStripe = stripePrices?.plans?.[tier.planKey];
            const perMo =
              tierStripe == null
                ? null
                : isAnnual
                  ? tierStripe.annual.perMonth
                  : tierStripe.monthly.perMonth;
            const annualYearTotal = tierStripe?.annual.perYear ?? null;
            const isPrevious = defaultPlanKey === tier.planKey;
            const loadingThis = checkoutPlanKey === tier.planKey;

            return (
              <div
                key={tier.planKey}
                className={cn(
                  "bg-white border rounded-[10px] p-6 pb-5 relative flex flex-col",
                  tier.highlight
                    ? "border-[#5B4FE8] border-[1.5px] shadow-[0_8px_32px_rgba(91,79,232,0.14),0_2px_8px_rgba(91,79,232,0.08)]"
                    : "border-neutral-200 shadow-[0_1px_3px_rgba(26,26,42,0.06),0_1px_2px_rgba(26,26,42,0.04)]"
                )}
              >
                <div
                  className={cn(
                    "h-[3px] rounded-t-[10px] mb-5 -mt-6 -mx-6",
                    tier.highlight ? "bg-[#5B4FE8]" : "bg-neutral-100"
                  )}
                />

                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5B4FE8] text-white text-[9.5px] font-bold tracking-[0.1em] uppercase px-3 py-1 rounded-full whitespace-nowrap">
                    Most popular
                  </div>
                )}

                <p
                  className={cn(
                    "text-[10px] font-bold tracking-[0.13em] uppercase mb-1",
                    tier.highlight ? "text-[#5B4FE8]" : "text-neutral-400"
                  )}
                >
                  {tier.tier}
                  {isPrevious ? " · Previous plan" : ""}
                </p>
                <h3 className="font-heading text-2xl text-[#0a0a0a] mb-1.5 leading-tight">
                  {tier.name}
                </h3>
                <p className="text-[12.5px] text-neutral-400 leading-[1.55] mb-4 min-h-[36px]">
                  {tier.description}
                </p>

                <div className="mb-4">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[17px] font-semibold text-[#0a0a0a] pb-1">$</span>
                    <span className="font-heading text-[36px] leading-none text-[#0a0a0a]">
                      {perMo != null ? formatMajorAmount(perMo) : "—"}
                    </span>
                    <span className="text-[13px] text-neutral-400 pb-1 ml-1">/mo</span>
                  </div>
                  <p className="text-[11.5px] text-neutral-400 mt-1">
                    {!isAnnual
                      ? "Billed monthly"
                      : annualYearTotal != null
                        ? `Billed ${formatCurrencyAmount(annualYearTotal, currency)}/year`
                        : "Loading prices…"}
                  </p>
                </div>

                <Button
                  className={cn(
                    "w-full h-auto py-3 px-3 mb-5 rounded-[6px] text-[13.5px] font-semibold transition-all border-[1.5px] tracking-[0.01em]",
                    tier.highlight
                      ? "bg-[#5B4FE8] border-[#5B4FE8] text-white hover:bg-[#4a3fd4] hover:border-[#4a3fd4]"
                      : "bg-transparent border-neutral-200 text-[#0a0a0a] hover:border-[#5B4FE8] hover:text-[#5B4FE8] hover:bg-[#f2f2fd]"
                  )}
                  disabled={Boolean(checkoutPlanKey) || !stripePrices || pricesLoadError}
                  onClick={() => void handleChoosePlan(tier.planKey)}
                >
                  {loadingThis ? "Redirecting…" : "Resubscribe"}
                </Button>

                <div className="h-px bg-neutral-100 mb-4" />

                <p className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-neutral-400 mb-3">
                  {tier.features[0].includes("Everything") ? tier.features[0] : "What's included"}
                </p>

                <ul className="flex flex-col gap-1.5">
                  {tier.features.map((feature) => {
                    if (feature.includes("Everything")) return null;
                    return (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-[13px] text-[#6b6b6b] leading-[1.45]"
                      >
                        <span
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-black",
                            tier.highlight
                              ? "bg-[#e6e6f8] text-[#5B4FE8]"
                              : "bg-[#f7f6f3] text-neutral-400"
                          )}
                        >
                          ✓
                        </span>
                        {feature}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[12.5px] text-neutral-400 leading-[1.9] pt-1">
          Billed today · Cancel anytime
        </p>
      </DialogContent>
    </Dialog>
  );
}

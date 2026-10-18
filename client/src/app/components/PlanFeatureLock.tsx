import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { cn } from "@/app/components/ui/utils";

export function planUnavailableMessage(planName: string | null | undefined): string {
  const name = planName?.trim() || "your plan";
  return `This feature is not available on ${name}.`;
}

/** Grey out a control and explain the lock on hover. The control itself does not receive clicks. */
export function PlanFeatureLock({
  locked,
  planName,
  children,
  className,
}: {
  locked: boolean;
  planName: string;
  children: ReactNode;
  className?: string;
}) {
  if (!locked) return <>{children}</>;
  const message = planUnavailableMessage(planName);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn("cursor-not-allowed opacity-50", className)}
          title={message}
          aria-disabled="true"
        >
          <div className="pointer-events-none select-none">{children}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        {message}
      </TooltipContent>
    </Tooltip>
  );
}

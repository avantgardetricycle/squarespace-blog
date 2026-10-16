import { ComponentProps } from "react";
import { cn } from "@/app/components/ui/utils";

interface LogoProps extends ComponentProps<"div"> {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}

export function Logo({ size = "md", iconOnly = false, className, ...props }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  // The pen is tall and narrow, so size it by height.
  const iconSizes = {
    sm: "h-7 -translate-y-[2px]",
    md: "h-10 -translate-y-[3px]",
    lg: "h-16 -translate-y-[4px]",
  };

  return (
    <div className={cn("flex items-center gap-3 font-bold tracking-tight", sizeClasses[size], className)} {...props}>
      <img 
        src="/logo-pen.svg"
        alt="BetterBlog"
        className={cn("shrink-0 w-auto", iconSizes[size])}
      />
      {!iconOnly && (
        <span className="font-heading bg-gradient-to-r from-[#5B4FE8] to-[#8F86F0] bg-clip-text text-transparent mt-1">
          BetterBlog
        </span>
      )}
    </div>
  );
}

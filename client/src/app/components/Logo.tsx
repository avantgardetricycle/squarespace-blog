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

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex items-center gap-3 font-bold tracking-tight", sizeClasses[size], className)} {...props}>
      <img 
        src="/logo_new.png" 
        alt="BetterBlog" 
        className={cn("shrink-0 rounded-lg", iconSizes[size])}
      />
      {!iconOnly && (
        <span className="font-heading bg-gradient-to-r from-[#5B4FE8] to-[#8F86F0] bg-clip-text text-transparent mt-1">
          BetterBlog
        </span>
      )}
    </div>
  );
}

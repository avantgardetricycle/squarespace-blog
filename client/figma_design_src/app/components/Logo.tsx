import { ComponentProps } from "react";
import { cn } from "@/app/components/ui/utils";

interface LogoProps extends ComponentProps<"div"> {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}

export function Logo({ size = "md", iconOnly = false, className, ...props }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl", // Slightly larger for Limelight readability
    lg: "text-4xl",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex items-center gap-3 font-bold tracking-tight", sizeClasses[size], className)} {...props}>
      <div className={cn("relative flex items-center justify-center bg-gradient-to-br from-blue-700 to-green-600 rounded-lg text-white shadow-sm shrink-0", iconSizes[size])}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[60%] h-[60%]"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </div>
      {!iconOnly && (
        <span className="font-heading bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent mt-1">
          BetterBlog
        </span>
      )}
    </div>
  );
}

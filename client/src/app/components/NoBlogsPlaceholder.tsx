import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";

/** Shown when the user has no sites yet (Customize, Comments, Analytics). */
export function NoBlogsPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[300px] gap-4 text-center ${className}`.trim()}
    >
      <p className="text-[#6b6b6b]">
        No blogs yet. Add a blog from the dashboard to get started.
      </p>
      <Button asChild>
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}

import { Outlet, NavLink, Link, Navigate, useNavigate, useLocation, useLoaderData } from "react-router";
import { LayoutDashboard, Settings, User, LogOut, BarChart3, MessageSquare, LifeBuoy, AlertCircle } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Logo } from "@/app/components/Logo";
import type { DashboardMe } from "@/api/auth";
import { hasActiveSubscription } from "@/lib/subscription";

const EXPIRED_REDIRECT_PATHS = [
  "/dashboard/comments",
  "/dashboard/analytics",
  "/dashboard/configure",
  "/dashboard/support",
];

export default function Layout() {
  const me = useLoaderData() as DashboardMe;
  const navigate = useNavigate();
  const location = useLocation();
  const isConfigure = location.pathname === "/dashboard/configure";
  const isComments = location.pathname === "/dashboard/comments";
  const isSupport = location.pathname === "/dashboard/support";
  const invalidSites = me.sites.filter((site) => site.squarespaceApiKeyInvalid);
  const subscriptionActive = hasActiveSubscription(me.subscription);
  const shouldRedirectExpired = EXPIRED_REDIRECT_PATHS.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  if (!subscriptionActive && shouldRedirectExpired) {
    return <Navigate to="/dashboard/account" replace />;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/dashboard/comments", icon: MessageSquare, label: "Comments", end: false },
    { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", end: false },
    { to: "/dashboard/configure", icon: Settings, label: "Customize Blog" },
    { to: "/dashboard/account", icon: User, label: "Account" },
    { to: "/dashboard/support", icon: LifeBuoy, label: "Support" },
  ];

  return (
    <div className="flex h-screen bg-[#f7f6f3] text-[#0a0a0a] font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#e5e4e0] bg-white flex flex-col">
        <div className="p-6 border-b border-[#e5e4e0] flex items-center gap-2">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#5B4FE8]/10 text-[#5B4FE8]"
                    : "text-[#6b6b6b] hover:bg-[#f7f6f3] hover:text-[#0a0a0a]"
                )
              }
            >
              <item.icon className={cn("w-4 h-4", window.location.pathname === item.to ? "text-[#5B4FE8]" : "")} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#e5e4e0]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[#6b6b6b] hover:bg-[#f7f6f3] hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={isSupport ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1 overflow-auto"}>
        {invalidSites.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-amber-900">
            <div className="flex items-start gap-2 max-w-5xl">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-sm min-w-0">
                {invalidSites.length === 1 ? (
                  <p>
                    Update the Squarespace API key for{" "}
                    <strong>{invalidSites[0].name || invalidSites[0].siteKey}</strong> in Comments so
                    verified subscriber comments keep working.{" "}
                    <Link
                      to={`/dashboard/comments?siteKey=${encodeURIComponent(invalidSites[0].siteKey)}`}
                      className="font-medium text-[#5B4FE8] hover:underline"
                    >
                      Open Comments
                    </Link>
                  </p>
                ) : (
                  <>
                    <p className="mb-1">These blogs need an updated Squarespace API key in Comments:</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {invalidSites.map((site) => (
                        <li key={site.id}>
                          <Link
                            to={`/dashboard/comments?siteKey=${encodeURIComponent(site.siteKey)}`}
                            className="font-medium text-[#5B4FE8] hover:underline"
                          >
                            {site.name || site.siteKey}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {isConfigure || isComments || isSupport ? (
          isSupport ? (
            <div className="flex h-full min-h-0 flex-1 flex-col">
              <Outlet />
            </div>
          ) : (
            <Outlet />
          )
        ) : (
          <div className="container mx-auto max-w-5xl p-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}

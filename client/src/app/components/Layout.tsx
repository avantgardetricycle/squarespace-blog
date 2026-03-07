import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Settings, User, LogOut, BarChart3 } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Logo } from "@/app/components/Logo";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isConfigure = location.pathname === "/dashboard/configure";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", end: false },
    { to: "/dashboard/configure", icon: Settings, label: "Customize Blog" },
    { to: "/dashboard/account", icon: User, label: "Account" },
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
      <main className="flex-1 overflow-auto">
        {isConfigure ? (
          <Outlet />
        ) : (
          <div className="container mx-auto max-w-5xl p-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}

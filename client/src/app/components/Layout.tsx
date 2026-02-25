import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Settings, User, LogOut } from "lucide-react";
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
    { to: "/dashboard/configure", icon: Settings, label: "Customize Blog" },
    { to: "/dashboard/account", icon: User, label: "Account" },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-2">
           <Logo />
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
                    ? "bg-blue-50 text-blue-700"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                )
              }
            >
              <item.icon className={cn("w-4 h-4", window.location.pathname === item.to ? "text-blue-600" : "")} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-neutral-500 hover:bg-neutral-50 hover:text-red-600 transition-colors"
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

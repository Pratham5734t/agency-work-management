import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABEL } from "@/lib/labels";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const STAFF_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/clients", label: "Clients", icon: "🏢" },
  { to: "/projects", label: "Projects", icon: "🚀" },
  { to: "/tasks", label: "My Tasks", icon: "✅" },
  { to: "/time", label: "Time Logs", icon: "⏱️" },
  { to: "/invoices", label: "Invoices", icon: "💰" },
  { to: "/team", label: "Team", icon: "👥" },
];

const CLIENT_NAV: NavItem[] = [
  { to: "/portal", label: "Overview", icon: "📋", end: true },
  { to: "/portal/projects", label: "Projects", icon: "🚀" },
  { to: "/portal/invoices", label: "Invoices", icon: "💰" },
];

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isClient = profile?.role === "client";
  const nav = isClient ? CLIENT_NAV : STAFF_NAV;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <span className="text-lg font-bold">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Agency OS</div>
            <div className="text-xs text-slate-500">Work Management</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              <span aria-hidden>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <Avatar name={profile?.full_name || profile?.email} size="md" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">
                {profile?.full_name || profile?.email || "—"}
              </div>
              <div className="truncate text-xs text-slate-500">
                {profile ? ROLE_LABEL[profile.role] : ""}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              A
            </div>
            <span className="text-sm font-semibold">Agency OS</span>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            ☰
          </button>
        </header>
        {mobileOpen ? (
          <nav className="border-b border-slate-200 bg-white px-3 py-2 md:hidden">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-700 hover:bg-slate-100",
                  )
                }
              >
                <span aria-hidden>{n.icon}</span>
                <span>{n.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </nav>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

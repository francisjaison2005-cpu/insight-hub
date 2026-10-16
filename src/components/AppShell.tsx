import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radio,
  BrainCircuit,
  Map,
  GitCompareArrows,
  Cpu,
  Bell,
  ChartLine,
  FlaskConical,
  FileDown,
  Settings,
  Info,
  CircleHelp,
  Search,
  Menu,
  X,
  Wind,
  Sun,
  Moon,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCATIONS, NOW, fmtTime } from "@/lib/aq-data";
import { DemoBadge } from "@/components/aq";

const NAV = [
  { to: "/", label: "Overview Dashboard", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitoring", icon: Radio },
  { to: "/forecast", label: "AQI Forecasting", icon: BrainCircuit },
  { to: "/map", label: "Campus Map", icon: Map },
  { to: "/compare", label: "Location Comparison", icon: GitCompareArrows },
  { to: "/devices", label: "Sensor Devices", icon: Cpu },
  { to: "/alerts", label: "Alerts & Notifications", icon: Bell },
  { to: "/history", label: "Historical Analytics", icon: ChartLine },
  { to: "/models", label: "AI Model Laboratory", icon: FlaskConical },
  { to: "/reports", label: "Reports & Export", icon: FileDown },
  { to: "/settings", label: "System Settings", icon: Settings },
  { to: "/about", label: "About Project", icon: Info },
  { to: "/help", label: "Help & Feedback", icon: CircleHelp },
] as const;

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return { dark, setDark };
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, setDark } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const sidebar = (
    <div className="flex h-full flex-col bg-shell text-shell-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-shell-border px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wind className="size-4" />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">AeroSense AI</p>
            <p className="text-[10px] text-shell-muted">Campus Air Intelligence</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-shell-accent font-medium text-shell-foreground"
                  : "text-shell-muted hover:bg-shell-accent/60 hover:text-shell-foreground",
              )}
              title={label}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="border-t border-shell-border p-3 text-[10px] leading-relaxed text-shell-muted">
          1D-CNN–BiGRU AQI prediction research platform. Demo mode with simulated data.
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn("hidden shrink-0 transition-all md:block", collapsed ? "w-16" : "w-60")}>{sidebar}</aside>
      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-shell-border bg-shell px-3 text-shell-foreground md:px-4">
          <button
            className="rounded-md p-2 hover:bg-shell-accent md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <button
            className="hidden rounded-md p-2 hover:bg-shell-accent md:block"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <Menu className="size-4" /> : <X className="size-4" />}
          </button>

          <div className="hidden items-center gap-2 rounded-md bg-shell-accent/70 px-3 py-1.5 text-xs text-shell-muted sm:flex sm:w-56">
            <Search className="size-3.5" />
            <input
              placeholder="Search locations, devices…"
              className="w-full bg-transparent text-shell-foreground outline-none placeholder:text-shell-muted"
            />
          </div>

          <button className="hidden items-center gap-1.5 rounded-md bg-shell-accent/70 px-3 py-1.5 text-xs lg:flex">
            Main Campus <ChevronsUpDown className="size-3 text-shell-muted" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <DemoBadge />
            <span className="hidden items-center gap-1.5 text-[11px] text-shell-muted xl:flex">
              <span className="size-2 rounded-full bg-aqi-good" /> Operational · synced {fmtTime(NOW)} IST
            </span>
            <span className="hidden text-[11px] text-shell-muted lg:block">{LOCATIONS.length} stations</span>
            <Link to="/alerts" className="relative rounded-md p-2 hover:bg-shell-accent" aria-label="Notifications">
              <Bell className="size-4" />
              <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-aqi-unhealthy text-[9px] font-bold text-white">
                2
              </span>
            </Link>
            <button
              className="rounded-md p-2 hover:bg-shell-accent"
              onClick={() => setDark(!dark)}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <span className="flex size-8 items-center justify-center rounded-full bg-ai text-xs font-semibold text-ai-foreground">
              FJ
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

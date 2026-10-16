import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { aqiInfo } from "@/lib/aq-data";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AqiBadge({ aqi, className }: { aqi: number; className?: string }) {
  const info = aqiInfo(aqi);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: `${info.hex}22`, color: info.hex }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: info.hex }} />
      {info.category}
    </span>
  );
}

export function StatusDot({ status }: { status: "online" | "delayed" | "offline" | "maintenance" }) {
  const map = {
    online: { c: "var(--aqi-good)", label: "Online" },
    delayed: { c: "var(--warning)", label: "Delayed" },
    offline: { c: "var(--aqi-unhealthy)", label: "Offline" },
    maintenance: { c: "var(--ai)", label: "Maintenance" },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: map.c }} />
      {map.label}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-warning/60 bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">
      Demo data — simulated
    </span>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function KpiCard({
  title,
  value,
  unit,
  badge,
  trend,
  spark,
  tooltip,
  to,
}: {
  title: string;
  value: string;
  unit?: string;
  badge?: ReactNode;
  trend?: number; // % vs previous period, simulated
  spark?: number[];
  tooltip: string;
  to?: string;
}) {
  const body = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
          {badge}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold text-foreground">{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {typeof trend === "number" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                trend > 0 ? "text-aqi-unhealthy" : trend < 0 ? "text-aqi-good" : "text-muted-foreground",
              )}
            >
              {trend > 0 ? <TrendingUp className="size-3" /> : trend < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
              {Math.abs(trend)}% vs prev. period
            </span>
          ) : (
            <span />
          )}
          {spark && <Sparkline data={spark} />}
        </div>
      </CardContent>
    </Card>
  );
  const wrapped = to ? <Link to={to}>{body}</Link> : body;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full">{wrapped}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Sparkline({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 72;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

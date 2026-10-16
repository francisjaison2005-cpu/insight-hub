import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LOCATIONS, DEVICES, ALERTS, seriesFor, aqiInfo, fmtHour, locationName } from "@/lib/aq-data";
import { PageHeader, AqiBadge, StatusDot, DemoBadge } from "@/components/aq";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Campus Map — AeroSense AI" },
      { name: "description", content: "Schematic campus map with monitoring station status, AQI and active alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampusMap,
});

function CampusMap() {
  const [selected, setSelected] = useState("main-gate");
  const [catFilter, setCatFilter] = useState("all");

  const stations = useMemo(
    () =>
      LOCATIONS.map((l) => {
        const s = seriesFor(l.id, 24);
        const device = DEVICES.find((d) => d.locationId === l.id)!;
        const alerts = ALERTS.filter((a) => a.locationId === l.id && a.status === "Active").length;
        return { loc: l, reading: s[s.length - 1], series: s, device, alerts };
      }).filter((s) => catFilter === "all" || aqiInfo(s.reading.aqi).category === catFilter),
    [catFilter],
  );

  const detail = stations.find((s) => s.loc.id === selected) ?? stations[0];

  return (
    <div>
      <PageHeader title="Campus Map" description="Schematic campus layout — positions are illustrative demo coordinates, not real sensor placements.">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All AQI categories</SelectItem>
            {["Good", "Moderate", "Unhealthy for Sensitive Groups", "Unhealthy", "Very Unhealthy", "Hazardous"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>
      <div className="mb-4"><DemoBadge /></div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/40">
              {/* schematic campus grid */}
              <svg className="absolute inset-0 size-full" aria-hidden>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M 10% 60% Q 45% 45% 90% 55%" stroke="var(--border)" strokeWidth="10" fill="none" strokeLinecap="round" />
                <path d="M 40% 10% L 55% 90%" stroke="var(--border)" strokeWidth="8" fill="none" strokeLinecap="round" />
              </svg>
              {stations.map((s) => (
                <button
                  key={s.loc.id}
                  onClick={() => setSelected(s.loc.id)}
                  className={cn(
                    "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium shadow-sm transition-transform hover:scale-105",
                    selected === s.loc.id ? "ring-2 ring-primary" : "",
                  )}
                  style={{
                    left: `${s.loc.x}%`,
                    top: `${s.loc.y}%`,
                    backgroundColor: `${aqiInfo(s.reading.aqi).hex}22`,
                    color: aqiInfo(s.reading.aqi).hex,
                    border: `1px solid ${aqiInfo(s.reading.aqi).hex}55`,
                  }}
                >
                  <span className="font-display text-sm font-bold">{s.device.status === "offline" ? "—" : s.reading.aqi}</span>
                  <span className="whitespace-nowrap text-foreground/80">{s.loc.name}</span>
                  {s.alerts > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-aqi-unhealthy text-[9px] font-bold text-white">
                      {s.alerts}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {detail && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{detail.loc.name}</CardTitle>
                <StatusDot status={detail.device.status} />
              </div>
              <p className="text-xs text-muted-foreground">{detail.device.id} · last seen {detail.device.lastSeenMin} min ago</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-3xl font-semibold" style={{ color: aqiInfo(detail.reading.aqi).hex }}>
                    {detail.reading.aqi}
                  </p>
                  <p className="text-[11px] text-muted-foreground">AQI (particulate indicator)</p>
                </div>
                <AqiBadge aqi={detail.reading.aqi} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/60 p-2">PM2.5 <span className="font-semibold">{detail.reading.pm25}</span> µg/m³</div>
                <div className="rounded-md bg-muted/60 p-2">PM10 <span className="font-semibold">{detail.reading.pm10}</span> µg/m³</div>
              </div>
              <div className="h-32">
                <ResponsiveContainer>
                  <LineChart data={detail.series.map((r) => ({ t: fmtHour(r.ts), aqi: r.aqi }))}>
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9 }} width={28} />
                    <Tooltip />
                    <Line type="monotone" dataKey="aqi" stroke="var(--primary)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {detail.alerts} active alert{detail.alerts === 1 ? "" : "s"} at this station. A heatmap requires denser spatial coverage than the current {LOCATIONS.length} stations provide.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

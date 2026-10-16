import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { LOCATIONS, DEVICES, seriesFor, aqiInfo, fmtHour, locationName } from "@/lib/aq-data";
import { PageHeader, AqiBadge, StatusDot, DemoBadge } from "@/components/aq";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Monitoring — AeroSense AI" },
      { name: "description", content: "Real-time sensor readings from all campus monitoring stations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Live,
});

function Live() {
  const [poll, setPoll] = useState("30");
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(
    () =>
      DEVICES.map((d) => {
        const s = seriesFor(d.locationId, 24);
        return { device: d, reading: s[s.length - 1], series: s };
      }).filter((r) => statusFilter === "all" || r.device.status === statusFilter),
    [statusFilter],
  );

  const detail = rows.find((r) => r.device.id === selected);

  return (
    <div>
      <PageHeader title="Live Monitoring" description="Latest reading per registered station. Simulated data refreshes are labelled; stale or offline devices are never shown as live.">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={poll} onValueChange={setPoll}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Poll every 10 s</SelectItem>
            <SelectItem value="30">Poll every 30 s</SelectItem>
            <SelectItem value="60">Poll every 60 s</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm"><RefreshCw className="size-3.5" /> Refresh now</Button>
      </PageHeader>
      <div className="mb-4"><DemoBadge /></div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ device, reading, series }) => {
          const live = device.status === "online";
          return (
            <Card key={device.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelected(device.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{device.name}</CardTitle>
                  <StatusDot status={device.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {locationName(device.locationId)} · last seen {device.lastSeenMin} min ago ·{" "}
                  {live ? "Live (simulated)" : device.status === "delayed" ? "Delayed data" : device.status === "offline" ? "Offline — showing last known" : "Under maintenance"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-display text-3xl font-semibold" style={{ color: aqiInfo(reading.aqi).hex }}>
                      {device.status === "offline" ? "—" : reading.aqi}
                    </p>
                    <p className="text-[11px] text-muted-foreground">AQI (particulate indicator)</p>
                  </div>
                  <AqiBadge aqi={reading.aqi} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ["PM1.0", reading.pm1],
                    ["PM2.5", reading.pm25],
                    ["PM10", reading.pm10],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md bg-muted/60 py-1.5">
                      <p className="font-semibold text-foreground">{v}</p>
                      <p className="text-[10px] text-muted-foreground">{k} µg/m³</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>{reading.temp} °C · {reading.humidity}% RH</span>
                  <span title="Raw MQ-135 ADC counts — not a calibrated gas concentration">MQ-135 raw: {reading.mq135}</span>
                </div>
                <div className="mt-3 h-16">
                  <ResponsiveContainer>
                    <LineChart data={series.slice(-12).map((r) => ({ t: fmtHour(r.ts), aqi: r.aqi }))}>
                      <Line type="monotone" dataKey="aqi" stroke={aqiInfo(reading.aqi).hex} strokeWidth={1.5} dot={false} />
                      <XAxis dataKey="t" hide />
                      <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.device.name} — sensor detail</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Device ID", detail.device.id],
                    ["Board", detail.device.board],
                    ["Firmware", detail.device.firmware],
                    ["TX success", `${detail.device.txSuccess}%`],
                    ["PMS5003", detail.device.pms5003],
                    ["DHT22", detail.device.dht22],
                    ["MQ-135", detail.device.mq135],
                    ["Calibrated", detail.device.calibrated],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md border p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">{k}</p>
                      <p className="mt-0.5 font-medium text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer>
                    <LineChart data={detail.series.map((r) => ({ t: fmtHour(r.ts), AQI: r.aqi, PM25: r.pm25 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="AQI" stroke="var(--primary)" dot={false} />
                      <Line type="monotone" dataKey="PM25" stroke="var(--chart-3)" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Battery level and Wi-Fi signal strength are not reported by this firmware and are therefore not displayed.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

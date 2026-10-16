import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCw, Download, Sparkles } from "lucide-react";
import {
  LOCATIONS,
  DEVICES,
  ALERTS,
  NOW,
  seriesFor,
  forecastFor,
  aqiInfo,
  fmtHour,
  fmtTime,
  locationName,
} from "@/lib/aq-data";
import { PageHeader, KpiCard, AqiBadge, DemoBadge } from "@/components/aq";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — AeroSense AI Campus Air Quality" },
      {
        name: "description",
        content:
          "Campus air quality intelligence dashboard: live AQI, PM2.5/PM10 trends, 1D-CNN–BiGRU forecasts, device health and alerts.",
      },
      { property: "og:title", content: "AeroSense AI — Campus Air Quality Intelligence" },
      {
        property: "og:description",
        content: "Real-time campus air quality monitoring and AI forecasting dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const [locationId, setLocationId] = useState("main-gate");
  const [range, setRange] = useState("24");
  const hours = Number(range);

  const series = useMemo(() => seriesFor(locationId, Math.max(hours, 48)).slice(-hours), [locationId, hours]);
  const forecast = useMemo(() => forecastFor(locationId, 6), [locationId]);
  const current = series[series.length - 1];
  const prev = series[Math.max(0, series.length - 7)];
  const onlineDevices = DEVICES.filter((d) => d.status === "online" || d.status === "delayed").length;
  const activeAlerts = ALERTS.filter((a) => a.status === "Active").length;

  const chartData = series.map((r, i) => ({
    t: fmtHour(r.ts),
    AQI: r.aqi,
    PM25: r.pm25,
    PM10: r.pm10,
    Predicted: i === series.length - 1 ? r.aqi : null,
  }));
  forecast.forEach((f) =>
    chartData.push({ t: fmtHour(f.ts), AQI: null as unknown as number, PM25: null as unknown as number, PM10: null as unknown as number, Predicted: f.aqi }),
  );

  const locComparison = LOCATIONS.map((l) => {
    const s = seriesFor(l.id, 24);
    return { name: l.name.split(" ")[0], aqi: s[s.length - 1].aqi, fill: aqiInfo(s[s.length - 1].aqi).hex };
  });

  const trend = (now: number, before: number) => Math.round(((now - before) / before) * 100);
  const spark = (key: "aqi" | "pm25" | "pm10") => series.slice(-12).map((r) => r[key]);

  return (
    <div>
      <PageHeader
        title="Campus Air Quality Intelligence"
        description={`${locationName(locationId)} · Main Campus · ${fmtTime(NOW)} IST · Last sensor update 2 min ago`}
      >
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Last 6 h</SelectItem>
            <SelectItem value="24">Last 24 h</SelectItem>
            <SelectItem value="48">Last 48 h</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm"><RefreshCw className="size-3.5" /> Refresh</Button>
        <Button size="sm"><Download className="size-3.5" /> Export</Button>
      </PageHeader>

      <div className="mb-4"><DemoBadge /></div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard title="Current AQI" value={String(current.aqi)} badge={<AqiBadge aqi={current.aqi} />} trend={trend(current.aqi, prev.aqi)} spark={spark("aqi")} tooltip="Limited particulate indicator derived from PM2.5/PM10 (simulated). Not a full official CPCB AQI — some required pollutants are not measured." to="/live" />
        <KpiCard title="PM2.5" value={String(current.pm25)} unit="µg/m³" trend={trend(current.pm25, prev.pm25)} spark={spark("pm25")} tooltip="Fine particulate matter from PMS5003 (simulated reading)." to="/live" />
        <KpiCard title="PM10" value={String(current.pm10)} unit="µg/m³" trend={trend(current.pm10, prev.pm10)} spark={spark("pm10")} tooltip="Coarse particulate matter from PMS5003 (simulated reading)." to="/live" />
        <KpiCard title="Temperature" value={String(current.temp)} unit="°C" tooltip="DHT22 ambient temperature (simulated)." to="/live" />
        <KpiCard title="Humidity" value={String(current.humidity)} unit="%" tooltip="DHT22 relative humidity (simulated)." to="/live" />
        <KpiCard title="Active Devices" value={`${onlineDevices}/${DEVICES.length}`} tooltip="Devices reporting within their expected interval." to="/devices" />
        <KpiCard title="Predicted AQI +1 h" value={String(forecast[0].aqi)} badge={<span className="rounded-full bg-ai/15 px-2 py-0.5 text-[10px] font-medium text-ai">AI forecast</span>} tooltip="1D-CNN–BiGRU model prediction (simulated inference, model v0.9-demo)." to="/forecast" />
        <KpiCard title="Active Alerts" value={String(activeAlerts)} tooltip="Unacknowledged threshold, forecast and device alerts." to="/alerts" />
      </div>

      {/* Main charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AQI trend — actual vs predicted</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={100} stroke="var(--aqi-moderate)" strokeDasharray="4 4" label={{ value: "Moderate", fontSize: 10 }} />
                <Line type="monotone" dataKey="AQI" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Predicted" stroke="var(--ai)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Predicted (1D-CNN–BiGRU)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Location-wise AQI (current)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={locComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="aqi" name="AQI" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">PM2.5 & PM10 concentration</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chartData.slice(0, series.length)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} unit=" µg/m³" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="PM10" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.15} />
                <Area type="monotone" dataKey="PM25" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI insights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-ai" /> AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed">
            <div className="rounded-md border p-2.5">
              <p className="font-medium text-foreground">Measured (observed)</p>
              <p className="mt-1 text-muted-foreground">
                PM2.5 at {locationName(locationId)} is {current.pm25} µg/m³, {trend(current.pm25, prev.pm25) >= 0 ? "up" : "down"} {Math.abs(trend(current.pm25, prev.pm25))}% versus 6 h ago.
              </p>
            </div>
            <div className="rounded-md border border-ai/30 bg-ai/5 p-2.5">
              <p className="font-medium text-ai">Model forecast (simulated)</p>
              <p className="mt-1 text-muted-foreground">
                1D-CNN–BiGRU predicts AQI {forecast[0].aqi} in 1 h and {forecast[5].aqi} in 6 h.
                {forecast.some((f) => f.aqi > 100) && current.aqi <= 100
                  ? " A Moderate-band crossing is possible within the horizon."
                  : " No category crossing predicted within 6 h."}
              </p>
            </div>
            <div className="rounded-md border p-2.5">
              <p className="font-medium text-foreground">Data quality</p>
              <p className="mt-1 text-muted-foreground">
                {DEVICES.filter((d) => d.status === "offline").length} device offline, {DEVICES.filter((d) => d.status === "delayed").length} delayed. Forecasts exclude offline stations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

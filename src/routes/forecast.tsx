import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit, RefreshCw } from "lucide-react";
import { LOCATIONS, NOW, seriesFor, forecastFor, aqiInfo, fmtHour, fmtTime, locationName } from "@/lib/aq-data";
import { PageHeader, AqiBadge, DemoBadge } from "@/components/aq";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "AQI Forecasting — AeroSense AI" },
      { name: "description", content: "1D-CNN–BiGRU air quality forecasts with 1–6 hour horizons per campus location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forecast,
});

function Forecast() {
  const [locationId, setLocationId] = useState("main-gate");
  const [horizon, setHorizon] = useState("6");

  const hist = useMemo(() => seriesFor(locationId, 24), [locationId]);
  const fc = useMemo(() => forecastFor(locationId, Number(horizon)), [locationId, horizon]);

  const data = [
    ...hist.map((r) => ({ t: fmtHour(r.ts), Actual: r.aqi, Predicted: null as number | null, band: null as [number, number] | null })),
    ...fc.map((f, i) => ({
      t: fmtHour(f.ts),
      Actual: null as number | null,
      Predicted: f.aqi,
      band: [f.lo, f.hi] as [number, number],
      // connect lines
      ...(i === 0 ? {} : {}),
    })),
  ];
  // bridge point so predicted line starts at last actual
  data[hist.length - 1].Predicted = hist[hist.length - 1].aqi;

  const lastActual = hist[hist.length - 1].aqi;
  const crossing = fc.find((f) => (lastActual <= 100 ? f.aqi > 100 : f.aqi <= 100));

  return (
    <div>
      <PageHeader title="AQI Forecasting" description="1D-CNN–BiGRU sequence model. Observed and predicted regions are visually distinct; uncertainty band is a demo interval, not a validated prediction interval.">
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6].map((h) => <SelectItem key={h} value={String(h)}>+{h} hour{h > 1 ? "s" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm"><RefreshCw className="size-3.5" /> Regenerate forecast</Button>
      </PageHeader>
      <div className="mb-4"><DemoBadge /></div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 2, 5].map((i) => {
          const f = fc[Math.min(i, fc.length - 1)];
          return (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Predicted AQI +{Math.min(i, fc.length - 1) + 1} h</p>
                  <p className="font-display text-2xl font-semibold" style={{ color: aqiInfo(f.aqi).hex }}>{f.aqi}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtTime(f.ts)} IST</p>
                </div>
                <AqiBadge aqi={f.aqi} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {locationName(locationId)} — observed vs predicted AQI (next {horizon} h, IST)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={100} stroke="var(--aqi-moderate)" strokeDasharray="4 4" />
              <Area dataKey="band" stroke="none" fill="var(--ai)" fillOpacity={0.12} name="Uncertainty band (demo)" />
              <Line type="monotone" dataKey="Actual" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Predicted" stroke="var(--ai)" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><BrainCircuit className="size-4 text-ai" /> Prediction explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {[
              ["Model", "1D-CNN–BiGRU, v0.9-demo"],
              ["Input features", "PM1.0, PM2.5, PM10, temperature, humidity, MQ-135 raw feature"],
              ["Input window", "Past 24 hourly observations"],
              ["Forecast issued", `${fmtTime(NOW)} IST`],
              ["Targets", `Next ${horizon} hourly AQI values`],
              ["Validation (demo)", "MAE 5.4 · RMSE 7.6 · R² 0.86 @ 1 h horizon"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-1.5 last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium text-foreground">{v}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              This model provides point forecasts only — no causal explanations or feature-importance claims are made.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Category transitions & warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current:</span>
              <AqiBadge aqi={lastActual} />
              <span className="text-muted-foreground">→ +{horizon} h:</span>
              <AqiBadge aqi={fc[fc.length - 1].aqi} />
            </div>
            {crossing ? (
              <p className="rounded-md border border-warning/50 bg-warning/10 p-2.5 text-warning">
                Predicted category crossing near {fmtTime(crossing.ts)} IST (AQI {crossing.aqi}). Treat as an early warning, not a measurement.
              </p>
            ) : (
              <p className="rounded-md border p-2.5 text-muted-foreground">No AQI category crossing predicted within the selected horizon.</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Data quality warning: forecast skill degrades when input stations report stale or missing readings. See Live Monitoring for station status.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

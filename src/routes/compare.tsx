import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { LOCATIONS, seriesFor, forecastFor, fmtHour, locationName } from "@/lib/aq-data";
import { PageHeader, DemoBadge } from "@/components/aq";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Location Comparison — AeroSense AI" },
      { name: "description", content: "Side-by-side AQI, PM and forecast comparison across campus monitoring stations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Compare,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--aqi-very)"];

function Compare() {
  const [sel, setSel] = useState<string[]>(["main-gate", "library", "workshop"]);

  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 6 ? [...s, id] : s));

  const data = useMemo(() => {
    const hours = 24;
    const rows: Record<string, number | string | null>[] = [];
    for (let i = 0; i < hours; i++) {
      const row: Record<string, number | string | null> = { t: "" };
      sel.forEach((id) => {
        const s = seriesFor(id, hours);
        row.t = fmtHour(s[i].ts);
        row[id] = s[i].aqi;
        row[`${id}_pm25`] = s[i].pm25;
      });
      rows.push(row);
    }
    return rows;
  }, [sel]);

  const stats = sel.map((id) => {
    const s = seriesFor(id, 24);
    const aqis = s.map((r) => r.aqi);
    const peak = s.reduce((a, b) => (b.aqi > a.aqi ? b : a));
    return {
      id,
      avg: Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length),
      peak: peak.aqi,
      peakTs: fmtHour(peak.ts),
      availability: Math.round(92 + (id.length % 5) * 1.6),
    };
  });

  const hotspot = stats.length > 1 ? stats.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;

  return (
    <div>
      <PageHeader title="Location Comparison" description="Synchronized 24 h comparison across stations. Differences may reflect sensor calibration and placement, not only true pollution gradients.">
        <Button variant="outline" size="sm"><Download className="size-3.5" /> Download CSV</Button>
      </PageHeader>
      <div className="mb-4"><DemoBadge /></div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-4 p-4">
          {LOCATIONS.map((l) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={sel.includes(l.id)} onCheckedChange={() => toggle(l.id)} />
              {l.name}
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AQI comparison (24 h)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                {sel.map((id, i) => (
                  <Line key={id} type="monotone" dataKey={id} name={locationName(id)} stroke={COLORS[i % COLORS.length]} strokeWidth={1.8} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">PM2.5 comparison (µg/m³)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                {sel.map((id, i) => (
                  <Line key={id} type="monotone" dataKey={`${id}_pm25`} name={locationName(id)} stroke={COLORS[i % COLORS.length]} strokeWidth={1.8} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Summary statistics (24 h, simulated)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Avg AQI</th>
                <th className="py-2 pr-4 font-medium">Peak AQI</th>
                <th className="py-2 pr-4 font-medium">Peak time</th>
                <th className="py-2 pr-4 font-medium">Data availability</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{locationName(s.id)}</td>
                  <td className="py-2 pr-4">{s.avg}</td>
                  <td className="py-2 pr-4">{s.peak}</td>
                  <td className="py-2 pr-4">{s.peakTs}</td>
                  <td className="py-2 pr-4">{s.availability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hotspot && (
            <p className="mt-3 rounded-md border border-warning/50 bg-warning/10 p-2.5 text-xs text-warning">
              Hotspot rule (demo): highest 24 h mean AQI among selected stations → {locationName(hotspot.id)} (avg {hotspot.avg}). This is a relative ranking, not an absolute health assessment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BellRing, CheckCheck, Settings2 } from "lucide-react";
import { ALERTS, fmtTime, locationName } from "@/lib/aq-data";
import { PageHeader, DemoBadge } from "@/components/aq";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Notifications — AeroSense AI" },
      { name: "description", content: "Alert center for threshold, forecast, device and data-quality events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alerts,
});

const SEV_STYLE: Record<string, string> = {
  critical: "bg-aqi-unhealthy/15 text-aqi-unhealthy",
  warning: "bg-warning/15 text-warning",
  info: "bg-chart-3/15 text-chart-3",
};

function Alerts() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [alerts, setAlerts] = useState(ALERTS);

  const filtered = alerts.filter((a) => statusFilter === "all" || a.status === statusFilter);
  const counts = {
    Active: alerts.filter((a) => a.status === "Active").length,
    Acknowledged: alerts.filter((a) => a.status === "Acknowledged").length,
    Resolved: alerts.filter((a) => a.status === "Resolved").length,
  };

  const ack = (id: string) => {
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, status: "Acknowledged" as const } : a)));
    toast.success("Alert acknowledged");
  };

  return (
    <div>
      <PageHeader title="Alerts & Notifications" description="Observed pollution events are distinguished from forecast-based warnings. Thresholds shown are demo policy values, not official standard limits.">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "Active", "Acknowledged", "Resolved", "Suppressed"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>
      <div className="mb-4"><DemoBadge /></div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k}>
            <CardContent className="flex items-center gap-3 p-4">
              <BellRing className="size-4 text-muted-foreground" />
              <div>
                <p className="font-display text-xl font-semibold">{v}</p>
                <p className="text-xs text-muted-foreground">{k}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Alert feed</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="mr-1.5 size-3.5" />Alert settings</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4 space-y-2">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize", SEV_STYLE[a.severity])}>
                  {a.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{a.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.category} · {locationName(a.locationId)} · {a.deviceId} · value {a.value} (threshold {a.threshold}) · {fmtTime(a.ts)} IST
                  </p>
                </div>
                {a.forecastBased && (
                  <span className="rounded-full bg-ai/15 px-2.5 py-0.5 text-[11px] font-medium text-ai">Forecast-based</span>
                )}
                <span className="text-xs text-muted-foreground">{a.status}</span>
                {a.status === "Active" && (
                  <Button variant="outline" size="sm" onClick={() => ack(a.id)}>
                    <CheckCheck className="size-3.5" /> Acknowledge
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No alerts match this filter.</p>}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Threshold rules (demo policy)</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="aqi-th">AQI alert threshold</Label>
                <Input id="aqi-th" type="number" defaultValue={150} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-th">PM2.5 alert threshold (µg/m³)</Label>
                <Input id="pm-th" type="number" defaultValue={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sus">Sustained duration (min)</Label>
                <Input id="sus" type="number" defaultValue={30} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hys">Hysteresis (AQI points)</Label>
                <Input id="hys" type="number" defaultValue={5} />
              </div>
              <label className="flex items-center justify-between rounded-md border p-3 text-sm sm:col-span-2">
                In-app notifications
                <Switch defaultChecked />
              </label>
              <label className="flex items-center justify-between rounded-md border p-3 text-sm sm:col-span-2">
                Duplicate suppression (30 min window)
                <Switch defaultChecked />
              </label>
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                Email and webhook channels require backend configuration and are disabled in demo mode. Final thresholds must be approved against the chosen AQI standard before production use.
              </p>
              <Button className="sm:col-span-2" onClick={() => toast.success("Alert settings saved (demo mode)")}>Save settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

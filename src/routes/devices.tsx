import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Wrench, Pencil } from "lucide-react";
import { DEVICES, locationName } from "@/lib/aq-data";
import { PageHeader, StatusDot, DemoBadge } from "@/components/aq";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCATIONS } from "@/lib/aq-data";
import { toast } from "sonner";

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "Sensor Devices — AeroSense AI" },
      { name: "description", content: "ESP32 IoT sensor fleet management: health, calibration, firmware and connectivity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Devices,
});

function SensorChip({ label, state }: { label: string; state: "ok" | "degraded" | "fault" }) {
  const cls = state === "ok" ? "bg-aqi-good/15 text-aqi-good" : state === "degraded" ? "bg-warning/15 text-warning" : "bg-aqi-unhealthy/15 text-aqi-unhealthy";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}: {state}</span>;
}

function Devices() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Sensor Devices" description="Fleet of ESP32 nodes with PMS5003, DHT22 and MQ-135 sensors. Telemetry is observed; metadata is manually maintained.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-3.5" /> Register device</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register a new device</DialogTitle></DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
                toast.success("Device registration queued (demo mode — no backend connected)");
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="dev-name">Device name</Label>
                <Input id="dev-name" placeholder="e.g. Gate Node 2" required />
              </div>
              <div className="space-y-1.5">
                <Label>Monitoring location</Label>
                <Select required>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-board">ESP32 board identifier</Label>
                <Input id="dev-board" placeholder="e.g. ESP32-WROOM-32" required />
              </div>
              <Button type="submit" className="w-full">Register</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="mb-4"><DemoBadge /></div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DEVICES.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.id} · {locationName(d.locationId)}</p>
                </div>
                <StatusDot status={d.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <SensorChip label="PMS5003" state={d.pms5003} />
                <SensorChip label="DHT22" state={d.dht22} />
                <SensorChip label="MQ-135" state={d.mq135} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">Board</span><span className="text-right font-medium">{d.board}</span>
                <span className="text-muted-foreground">Firmware</span><span className="text-right font-medium">{d.firmware}</span>
                <span className="text-muted-foreground">Last seen</span><span className="text-right font-medium">{d.lastSeenMin} min ago</span>
                <span className="text-muted-foreground">TX success</span><span className="text-right font-medium">{d.txSuccess}%</span>
                <span className="text-muted-foreground">Installed</span><span className="text-right font-medium">{d.installed}</span>
                <span className="text-muted-foreground">Calibrated</span><span className="text-right font-medium">{d.calibrated}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info("Edit metadata (demo mode)")}>
                  <Pencil className="size-3" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info("Maintenance event recorded (demo mode)")}>
                  <Wrench className="size-3" /> Maintenance
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Battery level and Wi-Fi signal strength are not reported by the current firmware (v2.3.x–2.4.x) and are intentionally not displayed. Disabling a device requires an authorized backend action and is unavailable in demo mode.
        </CardContent>
      </Card>
    </div>
  );
}

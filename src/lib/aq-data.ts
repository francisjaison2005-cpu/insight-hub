// AeroSense AI — demo-mode data layer.
// All values here are SIMULATED. When a real backend (FastAPI + Supabase) is
// connected, replace these generators with service calls behind the same types.

export type AqiCategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface AqiInfo {
  category: AqiCategory;
  color: string; // tailwind token class suffix, e.g. "aqi-good"
  hex: string;
}

export function aqiInfo(aqi: number): AqiInfo {
  if (aqi <= 50) return { category: "Good", color: "aqi-good", hex: "#22b573" };
  if (aqi <= 100) return { category: "Moderate", color: "aqi-moderate", hex: "#d9a81c" };
  if (aqi <= 150)
    return { category: "Unhealthy for Sensitive Groups", color: "aqi-usg", hex: "#e08a1e" };
  if (aqi <= 200) return { category: "Unhealthy", color: "aqi-unhealthy", hex: "#d9542b" };
  if (aqi <= 300) return { category: "Very Unhealthy", color: "aqi-very", hex: "#b03a6b" };
  return { category: "Hazardous", color: "aqi-hazardous", hex: "#8a2f22" };
}

export interface Location {
  id: string;
  name: string;
  // Demo coordinates — schematic campus, not real sensor placements.
  x: number; // 0-100 schematic map coords
  y: number;
}

export const LOCATIONS: Location[] = [
  { id: "main-gate", name: "Main Gate", x: 18, y: 72 },
  { id: "library", name: "Central Library", x: 46, y: 38 },
  { id: "hostel-a", name: "Hostel Block A", x: 74, y: 22 },
  { id: "sports", name: "Sports Complex", x: 82, y: 66 },
  { id: "workshop", name: "Mechanical Workshop", x: 30, y: 20 },
  { id: "cafeteria", name: "Cafeteria", x: 58, y: 58 },
];

export interface Reading {
  ts: number; // epoch ms
  aqi: number;
  pm25: number;
  pm10: number;
  pm1: number;
  temp: number;
  humidity: number;
  mq135: number; // raw ADC counts — NOT a calibrated gas concentration
}

// Deterministic pseudo-random so SSR and client render identically.
function seed(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const HOUR = 3600_000;
export const NOW = Date.UTC(2026, 9, 16, 6, 0, 0); // fixed demo clock

function baseAqi(locIdx: number, hourIdx: number): number {
  const diurnal = 38 * Math.sin(((hourIdx % 24) / 24) * Math.PI * 2 - 1.1);
  const locBias = [28, -12, -20, -26, 42, 8][locIdx % 6];
  return Math.max(18, 78 + diurnal + locBias + seed(hourIdx * 7 + locIdx) * 26 - 13);
}

export function seriesFor(locationId: string, hours = 48): Reading[] {
  const locIdx = Math.max(0, LOCATIONS.findIndex((l) => l.id === locationId));
  const out: Reading[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const ts = NOW - i * HOUR;
    const aqi = Math.round(baseAqi(locIdx, Math.floor(ts / HOUR)));
    const pm25 = Math.round(aqi * 0.42 + seed(i + locIdx * 31) * 6);
    out.push({
      ts,
      aqi,
      pm25,
      pm10: Math.round(pm25 * 1.7 + seed(i * 3 + locIdx) * 10),
      pm1: Math.round(pm25 * 0.6),
      temp: Math.round((26 + 5 * Math.sin(((ts / HOUR) % 24) / 24 * Math.PI * 2 - 2) + seed(i) * 2) * 10) / 10,
      humidity: Math.round(62 - 12 * Math.sin(((ts / HOUR) % 24) / 24 * Math.PI * 2 - 2) + seed(i * 5) * 8),
      mq135: Math.round(900 + aqi * 4 + seed(i * 11 + locIdx) * 120),
    });
  }
  return out;
}

// 1D-CNN–BiGRU forecast (simulated inference output).
export function forecastFor(locationId: string, horizon = 6): { ts: number; aqi: number; lo: number; hi: number }[] {
  const hist = seriesFor(locationId, 48);
  const last = hist[hist.length - 1].aqi;
  const out = [];
  for (let h = 1; h <= horizon; h++) {
    const drift = Math.sin(h * 0.9) * 8 + (seed(h * 17) - 0.5) * 6;
    const aqi = Math.round(last + drift - h * 2.5);
    out.push({ ts: NOW + h * HOUR, aqi: Math.max(15, aqi), lo: Math.max(10, aqi - 9 - h * 2), hi: aqi + 9 + h * 2 });
  }
  return out;
}

export interface Device {
  id: string;
  name: string;
  locationId: string;
  board: string;
  firmware: string;
  pms5003: "ok" | "degraded" | "fault";
  dht22: "ok" | "degraded" | "fault";
  mq135: "ok" | "degraded" | "fault";
  status: "online" | "delayed" | "offline" | "maintenance";
  lastSeenMin: number;
  txSuccess: number; // %
  installed: string;
  calibrated: string;
}

export const DEVICES: Device[] = [
  { id: "AS-01", name: "Gate Node 1", locationId: "main-gate", board: "ESP32-WROOM-32", firmware: "v2.4.1", pms5003: "ok", dht22: "ok", mq135: "ok", status: "online", lastSeenMin: 1, txSuccess: 99.2, installed: "2026-01-12", calibrated: "2026-09-28" },
  { id: "AS-02", name: "Library Node", locationId: "library", board: "ESP32-WROOM-32", firmware: "v2.4.1", pms5003: "ok", dht22: "ok", mq135: "degraded", status: "online", lastSeenMin: 2, txSuccess: 98.7, installed: "2026-01-12", calibrated: "2026-09-28" },
  { id: "AS-03", name: "Hostel Node A", locationId: "hostel-a", board: "ESP32-S3", firmware: "v2.4.0", pms5003: "ok", dht22: "ok", mq135: "ok", status: "delayed", lastSeenMin: 14, txSuccess: 94.1, installed: "2026-02-03", calibrated: "2026-08-15" },
  { id: "AS-04", name: "Sports Node", locationId: "sports", board: "ESP32-WROOM-32", firmware: "v2.3.9", pms5003: "degraded", dht22: "ok", mq135: "ok", status: "online", lastSeenMin: 3, txSuccess: 97.5, installed: "2026-02-03", calibrated: "2026-07-30" },
  { id: "AS-05", name: "Workshop Node", locationId: "workshop", board: "ESP32-S3", firmware: "v2.4.1", pms5003: "ok", dht22: "fault", mq135: "ok", status: "maintenance", lastSeenMin: 47, txSuccess: 91.3, installed: "2026-03-19", calibrated: "2026-09-10" },
  { id: "AS-06", name: "Cafeteria Node", locationId: "cafeteria", board: "ESP32-WROOM-32", firmware: "v2.4.1", pms5003: "ok", dht22: "ok", mq135: "ok", status: "offline", lastSeenMin: 183, txSuccess: 88.9, installed: "2026-03-19", calibrated: "2026-09-10" },
];

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  locationId: string;
  deviceId: string;
  message: string;
  value: string;
  threshold: string;
  ts: number;
  status: "Active" | "Acknowledged" | "Resolved" | "Suppressed";
  forecastBased: boolean;
}

export const ALERTS: Alert[] = [
  { id: "AL-1042", severity: "critical", category: "AQI threshold exceeded", locationId: "workshop", deviceId: "AS-05", message: "Measured AQI crossed the Unhealthy band", value: "AQI 158", threshold: "> 150", ts: NOW - 2 * HOUR, status: "Active", forecastBased: false },
  { id: "AL-1041", severity: "warning", category: "Predicted threshold crossing", locationId: "main-gate", deviceId: "AS-01", message: "Forecast predicts AQI > 100 within 3 h", value: "AQI 104 (pred.)", threshold: "> 100", ts: NOW - 3 * HOUR, status: "Acknowledged", forecastBased: true },
  { id: "AL-1040", severity: "warning", category: "Sensor offline", locationId: "cafeteria", deviceId: "AS-06", message: "No packets received for 3 h", value: "183 min", threshold: "> 30 min", ts: NOW - 3 * HOUR, status: "Active", forecastBased: false },
  { id: "AL-1039", severity: "info", category: "Stale readings", locationId: "hostel-a", deviceId: "AS-03", message: "Reading interval exceeded 10 min", value: "14 min", threshold: "> 10 min", ts: NOW - 5 * HOUR, status: "Resolved", forecastBased: false },
  { id: "AL-1038", severity: "warning", category: "Invalid sensor data", locationId: "workshop", deviceId: "AS-05", message: "DHT22 humidity out of plausible range", value: "RH 2%", threshold: "5–99%", ts: NOW - 9 * HOUR, status: "Acknowledged", forecastBased: false },
  { id: "AL-1037", severity: "info", category: "AQI threshold exceeded", locationId: "main-gate", deviceId: "AS-01", message: "Measured AQI crossed the Moderate band", value: "AQI 101", threshold: "> 100", ts: NOW - 26 * HOUR, status: "Resolved", forecastBased: false },
];

export interface ModelMetric {
  model: string;
  mae: number;
  rmse: number;
  r2: number;
  latencyMs: number;
}

// Demo evaluation results — replace with backend experiment records.
export const MODEL_METRICS: Record<string, ModelMetric[]> = {
  "1h": [
    { model: "Persistence", mae: 9.8, rmse: 13.1, r2: 0.61, latencyMs: 0 },
    { model: "Random Forest", mae: 7.4, rmse: 10.2, r2: 0.74, latencyMs: 12 },
    { model: "XGBoost", mae: 7.1, rmse: 9.8, r2: 0.76, latencyMs: 9 },
    { model: "GRU", mae: 6.3, rmse: 8.7, r2: 0.81, latencyMs: 21 },
    { model: "LSTM", mae: 6.5, rmse: 8.9, r2: 0.8, latencyMs: 24 },
    { model: "1D-CNN–BiGRU", mae: 5.4, rmse: 7.6, r2: 0.86, latencyMs: 27 },
  ],
  "3h": [
    { model: "Persistence", mae: 15.2, rmse: 19.8, r2: 0.38, latencyMs: 0 },
    { model: "Random Forest", mae: 11.6, rmse: 15.1, r2: 0.58, latencyMs: 12 },
    { model: "XGBoost", mae: 11.1, rmse: 14.4, r2: 0.61, latencyMs: 9 },
    { model: "GRU", mae: 9.8, rmse: 12.9, r2: 0.68, latencyMs: 21 },
    { model: "LSTM", mae: 10.1, rmse: 13.2, r2: 0.66, latencyMs: 24 },
    { model: "1D-CNN–BiGRU", mae: 8.6, rmse: 11.3, r2: 0.74, latencyMs: 27 },
  ],
  "6h": [
    { model: "Persistence", mae: 21.4, rmse: 27.3, r2: 0.12, latencyMs: 0 },
    { model: "Random Forest", mae: 16.8, rmse: 21.5, r2: 0.4, latencyMs: 12 },
    { model: "XGBoost", mae: 15.9, rmse: 20.2, r2: 0.44, latencyMs: 9 },
    { model: "GRU", mae: 14.2, rmse: 18.1, r2: 0.52, latencyMs: 21 },
    { model: "LSTM", mae: 14.6, rmse: 18.5, r2: 0.5, latencyMs: 24 },
    { model: "1D-CNN–BiGRU", mae: 12.3, rmse: 15.8, r2: 0.61, latencyMs: 27 },
  ],
};

export const ABLATION = [
  { variant: "CNN only", mae: 7.9, rmse: 10.6, r2: 0.71 },
  { variant: "GRU only", mae: 6.3, rmse: 8.7, r2: 0.81 },
  { variant: "BiGRU only", mae: 6.0, rmse: 8.3, r2: 0.83 },
  { variant: "CNN–BiGRU (full)", mae: 5.4, rmse: 7.6, r2: 0.86 },
];

export function locationName(id: string) {
  return LOCATIONS.find((l) => l.id === id)?.name ?? id;
}

export function fmtTime(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export function fmtHour(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

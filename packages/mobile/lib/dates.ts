/** Local YYYY-MM-DD for a Date (defaults to now). */
export function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today() {
  return localDate();
}

export function tzOffsetMin() {
  return new Date().getTimezoneOffset();
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d + n);
  return localDate(dt);
}

export function parseDate(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDay(date: string) {
  return DAYS[parseDate(date).getDay()] ?? "";
}

export function prettyDate(date: string) {
  const t = today();
  if (date === t) return "Today";
  if (date === addDays(t, -1)) return "Yesterday";
  if (date === addDays(t, 1)) return "Tomorrow";
  const d = parseDate(date);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function shortDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function clock(d: Date) {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m} ${ampm}`;
}

/** "14h 20m" style duration from ms. */
export function humanDuration(ms: number, opts?: { seconds?: boolean }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (opts?.seconds) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function hoursBetween(a: Date, b: Date) {
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10;
}

export function currentHour() {
  return new Date().getHours();
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return inrFormatter.format(0);
  return inrFormatter.format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "0h";
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  return `${hours.toFixed(2).replace(/\.00$/, "")}h`;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const day = 86_400_000;
  const hour = 3_600_000;
  const minute = 60_000;
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs >= day) return fmt.format(Math.round(ms / day), "day");
  if (abs >= hour) return fmt.format(Math.round(ms / hour), "hour");
  if (abs >= minute) return fmt.format(Math.round(ms / minute), "minute");
  return fmt.format(Math.round(ms / 1000), "second");
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

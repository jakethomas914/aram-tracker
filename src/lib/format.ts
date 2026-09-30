const NUMBER = new Intl.NumberFormat("en-US");
const DECIMAL = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return NUMBER.format(Math.round(value));
}

export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return DECIMAL.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(timestamp: number | null): string {
  if (!timestamp) return "never";
  const deltaSeconds = Math.round((Date.now() - timestamp) / 1000);
  if (deltaSeconds < 45) return "just now";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["month", 2_592_000],
    ["year", 31_536_000],
  ];
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  let chosen: [Intl.RelativeTimeFormatUnit, number] = units[0];
  for (const unit of units) {
    if (deltaSeconds >= unit[1]) chosen = unit;
  }
  return formatter.format(-Math.round(deltaSeconds / chosen[1]), chosen[0]);
}

export function formatKda(kills: number, deaths: number, assists: number): string {
  return `${kills} / ${deaths} / ${assists}`;
}

/**
 * Data Dragon champion portrait. Returns null when we do not know which patch
 * the CDN is on, so callers fall back to initials instead of a broken image.
 */
export function championIconUrl(
  championName: string,
  ddragonVersion: string | null,
): string | null {
  if (!ddragonVersion) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championName}.png`;
}

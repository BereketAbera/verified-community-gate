const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

/** "Nov 22, 18:04 UTC" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  return `${dateTime.format(new Date(iso))} UTC`;
}

const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Dec 23, 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  return dateOnly.format(new Date(iso));
}

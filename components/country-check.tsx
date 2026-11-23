import { CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { countryName } from "@/lib/reference";

export function countryState(stated: string, detected: string | null): "match" | "differs" | "unknown" {
  if (!detected) return "unknown";
  return stated === detected ? "match" : "differs";
}

export function CountryCheck({ stated, detected, compact = false }: { stated: string; detected: string | null; compact?: boolean }) {
  const state = countryState(stated, detected);
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5" data-testid="country-check" data-state={state}>
        {detected ?? "n/a"}
        {state === "match" ? <CircleCheck className="size-3.5 text-emerald-700" aria-label="Matches stated country" /> : null}
        {state === "differs" ? <TriangleAlert className="size-3.5 text-amber-600" aria-label="Differs from stated country" /> : null}
      </span>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="country-check" data-state={state}>
      <div className="rounded-lg bg-muted px-3 py-2">
        <p className="text-xs text-muted-foreground">Stated country</p>
        <p className="font-medium">{countryName(stated)} ({stated})</p>
      </div>
      <div className={state === "differs" ? "rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-200" : "rounded-lg bg-muted px-3 py-2"}>
        <p className="text-xs text-muted-foreground">Detected at signup</p>
        <p className="font-medium">{detected ? `${countryName(detected)} (${detected})` : "Not available"}</p>
      </div>
      <p className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        {state === "match" ? <CircleCheck className="size-3.5 text-emerald-700" aria-hidden /> : state === "differs" ? <TriangleAlert className="size-3.5 text-amber-600" aria-hidden /> : <CircleHelp className="size-3.5" aria-hidden />}
        {state === "match" ? "Countries match." : state === "differs" ? "Countries differ. Travel and VPNs are common reasons; worth a closer look." : "The host sent no country for this request, so there is nothing to compare."}
      </p>
    </div>
  );
}

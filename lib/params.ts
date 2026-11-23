// Query parameters arrive as string | string[] | undefined (a repeated key gives an array).
// Pages read them only through these helpers, so odd input falls back to "not set".

export type RawParams = Record<string, string | string[] | undefined>;

/** The first value of a parameter, trimmed and capped, or undefined. */
export function param(params: RawParams, key: string, max = 40): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? undefined : trimmed;
}

/** A parameter that must be one of a known set of values. */
export function oneOf<T extends string>(params: RawParams, key: string, allowed: readonly T[]): T | undefined {
  const value = param(params, key);
  return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Looks up a message by key without matching built-in object properties such as "constructor". */
export function pick<V>(table: Record<string, V>, key: string | undefined): V | undefined {
  return key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined;
}

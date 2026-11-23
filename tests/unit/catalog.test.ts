import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { E2E_TESTS } from "@/lib/e2e-catalog";

describe("Test catalog", () => {
  it("lists exactly the end-to-end tests that exist in e2e/gate.spec.ts", () => {
    const spec = readFileSync(path.join(import.meta.dirname, "..", "..", "e2e", "gate.spec.ts"), "utf8");
    const titles = [...spec.matchAll(/test\("([^"]+)"/g)].map((m) => m[1]);
    expect(titles).toEqual(E2E_TESTS.map((t) => t.title));
  });
});

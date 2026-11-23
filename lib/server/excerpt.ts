import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Returns the code between `// #region name` and `// #endregion` in a source file, dedented. */
export async function excerpt(file: string, region: string): Promise<string> {
  const text = await readFile(path.join(process.cwd(), file), "utf8");
  const marker = text.indexOf(`// #region ${region}`);
  const end = text.indexOf("// #endregion", marker);
  if (marker < 0 || end < 0) return `// region "${region}" not found in ${file}`;
  const lines = text.slice(text.indexOf("\n", marker) + 1, end).replace(/\s+$/, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}

// Builds the fictional sample media for the demo: one illustrated portrait per person, and a
// short verification clip drawn from the same portrait (talking, blinking, small head
// movements), so a moderator can compare photo and video. Nobody here is a real person.
// Output goes to private-media/, which is never served statically.
//
// Requires: rsvg-convert and ffmpeg on PATH (or RSVG / FFMPEG env vars).
// Usage: node scripts/make-media.mjs

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const RSVG = process.env.RSVG ?? "rsvg-convert";
const root = path.resolve(import.meta.dirname, "..");
const outPhotos = path.join(root, "private-media", "photos");
const outVideos = path.join(root, "private-media", "videos");
const work = mkdtempSync(path.join(tmpdir(), "gate-media-"));

const W = 480;
const H = 640;
const FPS = 15;
const SECONDS = 6;
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

// ---------------------------------------------------------------- people

const HAIR = { black: "#1f1a17", dark: "#33241b", brown: "#5e4029", auburn: "#7f3f22", blond: "#b48a52", grey: "#9a9895", salt: "#6e6a66" };

/** Fictional people. `video` overrides the look in the clip (used for the one deliberate mismatch). */
const PEOPLE = {
  m01: { skin: "#7a4a2b", hair: ["afro", HAIR.black], top: ["#2f6f73", "crew"], bg: ["#f3e6d6", "#e2c9a8"], earrings: true },
  m02: { skin: "#8a5a38", hair: ["coily", HAIR.black], beard: "short", top: ["#2d3f66", "collar"], bg: ["#e3ecf3", "#c6d6e6"] },
  m03: { skin: "#c48a5f", hair: ["wavy", HAIR.dark], top: ["#c0634f", "v"], bg: ["#f6e5dc", "#e9c8b8"], earrings: true },
  m04: { skin: "#5b3a25", hair: ["buzz", HAIR.black], glasses: true, top: ["#7a2f3a", "collar"], bg: ["#ece6f2", "#d4c8e2"] },
  m05: { skin: "#6c4429", hair: ["locs", HAIR.black], top: ["#b8902f", "crew"], bg: ["#eef1e3", "#d6dfc0"] },
  m06: { skin: "#eec4a0", hair: ["short", HAIR.brown], beard: "full", top: ["#5c6838", "collar"], bg: ["#efe8dd", "#dccfb9"] },
  m07: { skin: "#ad784e", hair: ["straight", HAIR.black], top: ["#6b3e69", "v"], bg: ["#f4e8ee", "#e4cad8"], earrings: true },
  m08: { skin: "#8a5a3b", hair: ["curly", HAIR.dark], top: ["#4b7ba3", "crew"], bg: ["#e4eef4", "#c9dbe8"] },
  m09: { skin: "#f0cdac", hair: ["side", HAIR.blond], beard: "stubble", top: ["#465462", "collar"], bg: ["#e9ecef", "#cfd6de"] },
  m10: { skin: "#efcfae", hair: ["bun", HAIR.black], glasses: true, top: ["#6c8c77", "crew"], bg: ["#e8f0ea", "#cfe0d4"] },
  m11: {
    skin: "#d6a27a", hair: ["side", HAIR.dark], beard: "full", top: ["#3a3e45", "crew"], bg: ["#ecebe6", "#d6d3c8"],
    // The rejected seed: the clip shows a different person.
    video: { skin: "#f2d4be", hair: ["bald", HAIR.grey], beard: null, glasses: true, top: ["#9c7c5c", "collar"] },
  },
  m12: { skin: "#f5d6c2", hair: ["straight", HAIR.auburn], top: ["#4d7a5a", "crew"], bg: ["#eef2ea", "#d5e0cc"] },
  m13: { skin: "#e6b692", hair: ["short", HAIR.grey], beard: "stubble", top: ["#6a2c2c", "collar"], bg: ["#efe7e2", "#dccbc0"] },
  m14: { skin: "#7b4d31", hair: ["puff", HAIR.black], top: ["#7c69a5", "v"], bg: ["#ede9f5", "#d6cdea"], earrings: true },
  // The sample library a new member picks from.
  "sample-a": { skin: "#a46e46", hair: ["short", HAIR.black], beard: "short", top: ["#2f6f73", "collar"], bg: ["#e6efe9", "#c9dccf"] },
  "sample-b": { skin: "#efc9a8", hair: ["wavy", HAIR.brown], top: ["#a65a6b", "v"], bg: ["#f5e7ea", "#e6cad1"], earrings: true },
  "sample-c": { skin: "#6a4129", hair: ["afro", HAIR.black], glasses: true, top: ["#c29a3b", "crew"], bg: ["#f2ecdc", "#e0d2ad"] },
  "sample-d": { skin: "#d7a479", hair: ["bun", HAIR.dark], top: ["#30476b", "crew"], bg: ["#e5e9f2", "#cbd3e4"] },
};

// ---------------------------------------------------------------- drawing helpers

function shade(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => channel(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Circles along an ellipse, for textured hair outlines. */
function bumps(cx, cy, rx, ry, from, to, count, r, fill) {
  let out = "";
  for (let i = 0; i <= count; i++) {
    const a = ((from + ((to - from) * i) / count) * Math.PI) / 180;
    out += `<circle cx="${(cx + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}" fill="${fill}"/>`;
  }
  return out;
}

function backHair([style, color]) {
  const dark = shade(color, -0.25);
  switch (style) {
    case "afro":
      return `<circle cx="240" cy="236" r="132" fill="${color}"/>${bumps(240, 236, 128, 128, 0, 360, 30, 20, color)}`;
    case "puff":
      return `<circle cx="240" cy="132" r="62" fill="${color}"/>${bumps(240, 132, 60, 58, 0, 360, 18, 13, color)}`;
    case "bun":
      return `<circle cx="240" cy="146" r="40" fill="${color}"/><path d="M212 158 Q240 172 268 158" stroke="${dark}" stroke-width="4" fill="none"/>`;
    case "straight":
      return `<path d="M142 270 C132 178 184 140 240 140 C296 140 348 178 338 270 L346 452 C348 476 330 490 302 488 L178 488 C150 490 132 476 134 452 Z" fill="${color}"/>`;
    case "wavy":
      return `<path d="M140 268 C128 176 184 138 240 138 C296 138 352 176 340 268 C352 300 334 330 348 362 C362 394 340 430 352 462 C340 486 310 490 300 486 L180 486 C170 490 140 486 128 462 C140 430 118 394 132 362 C146 330 128 300 140 268 Z" fill="${color}"/>`;
    case "curly":
      return `<path d="M144 270 C134 180 186 142 240 142 C294 142 346 180 336 270 L340 450 L140 450 Z" fill="${color}"/>${bumps(240, 300, 104, 168, -200, 20, 30, 19, color)}`;
    case "locs": {
      let out = `<path d="M146 270 C138 184 188 146 240 146 C292 146 342 184 334 270 L334 300 L146 300 Z" fill="${color}"/>`;
      for (let i = 0; i < 9; i++) {
        const left = 132 + i * 7;
        const right = 348 - i * 7;
        const len = 470 - i * 6;
        out += `<rect x="${left - 9}" y="230" width="16" height="${len - 230}" rx="8" fill="${i % 2 ? dark : color}"/>`;
        out += `<rect x="${right - 7}" y="230" width="16" height="${len - 230}" rx="8" fill="${i % 2 ? dark : color}"/>`;
      }
      return out;
    }
    default:
      return "";
  }
}

function frontHair([style, color]) {
  const dark = shade(color, -0.25);
  switch (style) {
    case "short":
      return `<path d="M148 266 C140 196 182 150 240 150 C298 150 340 196 332 266 C322 236 306 212 282 204 C262 198 218 198 198 204 C174 212 158 236 148 266 Z" fill="${color}"/>`;
    case "side":
      return `<path d="M146 270 C136 190 184 142 248 144 C308 146 346 196 334 268 C330 236 318 212 300 202 C272 216 232 220 200 212 C176 222 156 242 146 270 Z" fill="${color}"/><path d="M202 160 Q236 176 300 202" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case "buzz":
      return `<path d="M152 262 C150 196 190 164 240 164 C290 164 330 196 328 262 C320 230 300 210 240 206 C180 210 160 230 152 262 Z" fill="${color}" fill-opacity="0.92"/>`;
    case "coily":
      return `<path d="M150 266 C142 196 184 156 240 156 C296 156 338 196 330 266 C322 236 304 214 280 206 C258 200 222 200 200 206 C176 214 158 236 150 266 Z" fill="${color}"/>${bumps(240, 238, 88, 82, -172, -8, 16, 13, color)}`;
    case "afro":
      return `<path d="M152 262 C146 200 186 166 240 166 C294 166 334 200 328 262 C320 232 302 212 240 208 C178 212 160 232 152 262 Z" fill="${color}"/>`;
    case "puff":
    case "bun":
      return `<path d="M152 262 C150 196 190 162 240 162 C290 162 330 196 328 262 C320 228 298 206 240 202 C182 206 160 228 152 262 Z" fill="${color}"/><path d="M196 186 Q240 168 286 188" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case "straight":
      return `<path d="M148 272 C142 194 186 150 240 150 C296 150 338 194 332 272 C322 228 296 202 256 200 C230 216 194 230 162 270 Z" fill="${color}"/>`;
    case "wavy":
      return `<path d="M148 274 C140 192 186 148 240 148 C294 148 340 192 332 274 C320 222 290 196 246 192 L240 204 L234 192 C190 196 160 222 148 274 Z" fill="${color}"/>`;
    case "curly":
      return `<path d="M150 270 C142 194 186 152 240 152 C294 152 338 194 330 270 C318 228 292 206 240 204 C188 206 162 228 150 270 Z" fill="${color}"/>${bumps(240, 236, 92, 84, -180, 0, 18, 14, color)}`;
    case "locs":
      return `<path d="M150 266 C144 196 186 158 240 158 C294 158 336 196 330 266 C320 232 300 212 240 208 C180 212 160 232 150 266 Z" fill="${color}"/>${[196, 218, 240, 262, 284].map((x) => `<path d="M${x} 168 L${x - 4} 206" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`).join("")}`;
    case "bald":
      return `<path d="M150 300 C146 262 150 232 162 214 C164 244 166 270 172 300 Z" fill="${color}"/><path d="M330 300 C334 262 330 232 318 214 C316 244 314 270 308 300 Z" fill="${color}"/>`;
    default:
      return "";
  }
}

function beard(kind, color) {
  if (!kind) return "";
  const opacity = kind === "stubble" ? 0.35 : kind === "short" ? 0.8 : 1;
  const depth = kind === "full" ? 414 : 404;
  return `<g fill="${color}" fill-opacity="${opacity}">
    <path d="M154 282 C156 352 196 ${depth} 240 ${depth} C284 ${depth} 324 352 326 282 C318 328 298 350 272 356 C258 346 222 346 208 356 C182 350 162 328 154 282 Z"/>
    <path d="M212 338 Q240 324 268 338 Q254 346 240 342 Q226 346 212 338 Z"/>
  </g>`;
}

function body([color, neckline], skin) {
  const neck = shade(skin, -0.1);
  const inner = shade(color, -0.18);
  const depth = neckline === "v" ? 534 : neckline === "collar" ? 520 : 502;
  const cut = neckline === "v" ? `L240 ${depth} L276 468` : `Q240 ${depth} 276 468`;
  const collar =
    neckline === "collar"
      ? `<path d="M206 466 L236 524 L214 530 L188 480 Z" fill="${shade(color, 0.18)}"/><path d="M274 466 L244 524 L266 530 L292 480 Z" fill="${shade(color, 0.18)}"/>`
      : "";
  return `<path d="M208 350 L208 500 L272 500 L272 350 Z" fill="${neck}"/>
  <path d="M206 468 Q240 488 274 468 L274 580 L206 580 Z" fill="${shade(skin, -0.04)}"/>
  <path d="M24 640 C28 560 86 506 168 482 L204 468 ${cut} L312 482 C394 506 452 560 456 640 Z" fill="${color}"/>
  <path d="M168 482 L204 468 ${cut} L312 482 C298 490 284 494 272 494 Q240 ${depth + 10} 208 494 C196 494 182 490 168 482 Z" fill="${inner}" fill-opacity="0.35"/>
  ${collar}`;
}

/** The head: everything that moves together in the clip. */
function head(p, { mouth = 0, blink = false } = {}) {
  const skin = p.skin;
  const skinDark = shade(skin, -0.22);
  const hair = p.hair[1];
  const brow = shade(hair === HAIR.grey ? "#6a6662" : hair, -0.2);
  const eye = (cx) =>
    blink
      ? `<path d="M${cx - 9} 280 Q${cx} 286 ${cx + 9} 280" stroke="#2a1c17" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="${cx}" cy="280" rx="6.5" ry="8" fill="#2a1c17"/><circle cx="${cx + 2}" cy="276.5" r="1.8" fill="#ffffff"/>`;
  const lips = shade(skin, -0.38);
  const n = Number.parseInt(skin.slice(1), 16);
  const light = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  const blush = light > 0.6 ? 0.18 : 0.09;
  const mouthShape =
    mouth < 0.08
      ? `<path d="M220 347 Q240 360 260 347" stroke="${lips}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<path d="M222 346 Q240 ${343 - 2 * mouth} 258 346 Q240 ${352 + 16 * mouth} 222 346 Z" fill="#5b2626"/>${
          mouth > 0.45 ? `<path d="M228 346.5 Q240 345 252 346.5 L251 349 Q240 348 229 349 Z" fill="#f4efe9"/>` : ""
        }`;
  const glasses = p.glasses
    ? `<g fill="#ffffff" fill-opacity="0.1" stroke="#2b2b2b" stroke-width="3.5">
        <rect x="184" y="262" width="44" height="34" rx="11"/><rect x="252" y="262" width="44" height="34" rx="11"/>
      </g><path d="M228 276 Q240 270 252 276" stroke="#2b2b2b" stroke-width="3" fill="none"/>
      <path d="M184 272 L156 266 M296 272 L324 266" stroke="#2b2b2b" stroke-width="3"/>`
    : "";
  const earrings = p.earrings ? `<circle cx="152" cy="306" r="5" fill="#d4a73a"/><circle cx="328" cy="306" r="5" fill="#d4a73a"/>` : "";
  return `<ellipse cx="152" cy="282" rx="15" ry="24" fill="${skin}"/><ellipse cx="328" cy="282" rx="15" ry="24" fill="${skin}"/>
  <ellipse cx="153" cy="283" rx="7" ry="13" fill="${skinDark}" fill-opacity="0.35"/><ellipse cx="327" cy="283" rx="7" ry="13" fill="${skinDark}" fill-opacity="0.35"/>
  ${earrings}
  <path d="M152 262 C152 188 192 168 240 168 C288 168 328 188 328 262 C328 342 292 398 240 398 C188 398 152 342 152 262 Z" fill="${skin}"/>
  <ellipse cx="196" cy="318" rx="16" ry="11" fill="#e0716f" fill-opacity="${blush}"/><ellipse cx="284" cy="318" rx="16" ry="11" fill="#e0716f" fill-opacity="${blush}"/>
  ${beard(p.beard, hair)}
  <path d="M190 257 Q206 249 222 255" stroke="${brow}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M258 255 Q274 249 290 257" stroke="${brow}" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${eye(206)}${eye(274)}
  <path d="M241 288 Q236 308 232 318 Q240 324 249 319" stroke="${skinDark}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${mouthShape}
  ${frontHair(p.hair)}
  ${glasses}`;
}

function caption(text, y) {
  const width = text.length * 8.4 + 36;
  return `<rect x="${(W - width) / 2}" y="${y}" width="${width}" height="32" rx="16" fill="#0b1720" fill-opacity="0.45"/>
  <text x="${W / 2}" y="${y + 21}" text-anchor="middle" font-family="${FONT}" font-size="15" fill="#ffffff" letter-spacing="0.5">${text}</text>`;
}

function photoSvg(p) {
  const [light, deep] = p.bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="240" cy="290" r="214" fill="#ffffff" fill-opacity="0.28"/>
  ${backHair(p.hair)}
  ${body(p.top, p.skin)}
  ${head(p)}
  ${caption("Fictional portrait", H - 52)}
</svg>`;
}

/** A frame of the clip: same person, a different room, slightly closer framing. */
function videoFrameSvg(p, t) {
  const angle = 2.2 * Math.sin((2 * Math.PI * t) / 4.1) + 0.8 * Math.sin((2 * Math.PI * t) / 1.7);
  const dx = 3 * Math.sin((2 * Math.PI * t) / 5.3);
  const dy = 2.5 * Math.sin((2 * Math.PI * t) / 2.2);
  const pause = (t > 2.3 && t < 2.9) || (t > 4.5 && t < 5.0) || t < 0.3;
  const mouth = pause ? 0 : Math.min(1, 0.15 + 0.85 * Math.abs(Math.sin(2 * Math.PI * t * 2.6)) * (0.6 + 0.4 * Math.sin(2 * Math.PI * t * 0.9)));
  const blink = [1.33, 3.87, 5.6].some((b) => t >= b && t < b + 0.14);
  const move = `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${angle.toFixed(2)} 240 440)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcd6cc"/><stop offset="1" stop-color="#bfb7aa"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <rect x="352" y="0" width="128" height="${H}" fill="#ffffff" fill-opacity="0.16"/>
  <rect x="410" y="0" width="6" height="${H}" fill="#8d857a" fill-opacity="0.25"/>
  <rect x="36" y="96" width="92" height="118" rx="4" fill="#8d857a" fill-opacity="0.18"/>
  <g transform="translate(240 330) scale(1.07) translate(-240 -330)">
    <g transform="${move}">${backHair(p.hair)}</g>
    ${body(p.top, p.skin)}
    <g transform="${move}">${head(p, { mouth, blink })}</g>
  </g>
  ${caption("Fictional sample clip", 18)}
</svg>`;
}

// ---------------------------------------------------------------- rendering

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed: ${err}`))));
  });
}

async function pool(tasks, size = 8) {
  const queue = [...tasks];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) await queue.shift()();
  }));
}

async function svgToPng(svg, pngPath) {
  const svgPath = pngPath.replace(/\.png$/, ".svg");
  writeFileSync(svgPath, svg);
  await run(RSVG, ["-w", String(W), "-h", String(H), "-o", pngPath, svgPath]);
}

async function main() {
  const only = process.argv.slice(2);
  const ids = Object.keys(PEOPLE).filter((id) => only.length === 0 || only.includes(id));
  mkdirSync(outPhotos, { recursive: true });
  mkdirSync(outVideos, { recursive: true });

  const frameTasks = [];
  for (const id of ids) {
    const p = PEOPLE[id];
    const v = { ...p, ...(p.video ?? {}) };
    mkdirSync(path.join(work, id), { recursive: true });
    frameTasks.push(() => svgToPng(photoSvg(p), path.join(work, id, "photo.png")));
    for (let f = 0; f < FPS * SECONDS; f++) {
      frameTasks.push(() => svgToPng(videoFrameSvg(v, f / FPS), path.join(work, id, `f${String(f).padStart(3, "0")}.png`)));
    }
  }
  await pool(frameTasks);

  await pool(
    ids.flatMap((id) => [
      () => run(FFMPEG, ["-y", "-loglevel", "error", "-i", path.join(work, id, "photo.png"), "-q:v", "3", path.join(outPhotos, `${id}.jpg`)]),
      () =>
        run(FFMPEG, [
          "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(work, id, "f%03d.png"),
          "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "main", "-pix_fmt", "yuv420p",
          "-movflags", "+faststart", "-an", path.join(outVideos, `${id}.mp4`),
        ]),
    ]),
    4,
  );

  rmSync(work, { recursive: true, force: true });
  console.log(`Sample media written to private-media/ for ${ids.length} people:`, readdirSync(outVideos).length, "clips");
}

await main();

// Generates the fictional sample media used by the demo.
// Photos: abstract gradient portraits with initials (SVG -> PNG -> JPEG).
// Videos: short H.264 clips with a slowly moving gradient and an overlay label.
// Output goes to private-media/, which is never served statically.
//
// Requires: rsvg-convert and ffmpeg on PATH (or FFMPEG / RSVG env vars).
// Usage: node scripts/generate-media.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const RSVG = process.env.RSVG ?? "rsvg-convert";
const root = path.resolve(import.meta.dirname, "..");
const outPhotos = path.join(root, "private-media", "photos");
const outVideos = path.join(root, "private-media", "videos");
mkdirSync(outPhotos, { recursive: true });
mkdirSync(outVideos, { recursive: true });
const work = mkdtempSync(path.join(tmpdir(), "gate-media-"));

const W = 480;
const H = 640;
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

// Soft, calm palettes: [light, deep]
const palettes = [
  ["#9cc4bb", "#2f5d62"],
  ["#c9bedb", "#55497a"],
  ["#e6c9a8", "#9a6240"],
  ["#aec6e2", "#33557c"],
  ["#d6d3ad", "#66653a"],
  ["#e2bcbc", "#86505a"],
  ["#b9d6c5", "#3b6a54"],
];

const members = [
  ["m01", "AO"], ["m02", "DM"], ["m03", "LH"], ["m04", "SO"], ["m05", "GK"],
  ["m06", "JW"], ["m07", "PR"], ["m08", "RA"], ["m09", "MB"], ["m10", "EN"],
  ["m11", "TS"], ["m12", "HC"], ["m13", "VH"], ["m14", "NB"],
];
const library = [["sample-a", "A"], ["sample-b", "B"], ["sample-c", "C"], ["sample-d", "D"]];

function silhouette(opacityHead, opacityBody) {
  return `
  <circle cx="${W / 2}" cy="262" r="118" fill="#ffffff" fill-opacity="${opacityHead}"/>
  <ellipse cx="${W / 2}" cy="${H + 40}" rx="230" ry="220" fill="#ffffff" fill-opacity="${opacityBody}"/>`;
}

function photoSvg(initials, [light, deep], caption) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${silhouette(0.22, 0.16)}
  <text x="${W / 2}" y="292" text-anchor="middle" font-family="${FONT}" font-size="92" font-weight="600" fill="#ffffff" fill-opacity="0.94" letter-spacing="2">${initials}</text>
  <text x="${W / 2}" y="${H - 34}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#ffffff" fill-opacity="0.85" letter-spacing="1">${caption}</text>
</svg>`;
}

function videoFigureSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${silhouette(0.24, 0.18)}
</svg>`;
}

function videoLabelSvg(n) {
  const text = `Sample verification video · Member ${n}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="26" y="${H - 92}" width="${W - 52}" height="54" rx="27" fill="#0b1720" fill-opacity="0.42"/>
  <text x="${W / 2}" y="${H - 58}" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="500" fill="#ffffff">${text}</text>
  <text x="${W / 2}" y="44" text-anchor="middle" font-family="${FONT}" font-size="15" fill="#ffffff" fill-opacity="0.8" letter-spacing="1">Fictional sample media</text>
</svg>`;
}

function svgToPng(svg, name) {
  const svgPath = path.join(work, `${name}.svg`);
  const pngPath = path.join(work, `${name}.png`);
  writeFileSync(svgPath, svg);
  execFileSync(RSVG, ["-w", String(W), "-h", String(H), "-o", pngPath, svgPath]);
  return pngPath;
}

function pngToJpeg(pngPath, outPath) {
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", pngPath, "-q:v", "4", outPath]);
}

members.forEach(([id, initials], i) => {
  const png = svgToPng(photoSvg(initials, palettes[i % palettes.length], "Sample photo · fictional"), id);
  pngToJpeg(png, path.join(outPhotos, `${id}.jpg`));
});
library.forEach(([id, letter], i) => {
  const png = svgToPng(photoSvg(letter, palettes[(i + 2) % palettes.length], `Sample photo ${letter} · fictional`), id);
  pngToJpeg(png, path.join(outPhotos, `${id}.jpg`));
});

const figure = svgToPng(videoFigureSvg(), "figure");
for (let n = 1; n <= 6; n++) {
  const [light, deep] = palettes[(n - 1) % palettes.length];
  const label = svgToPng(videoLabelSvg(n), `label-${n}`);
  const out = path.join(outVideos, `clip-${n}.mp4`);
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `gradients=s=${W}x${H}:c0=${light}:c1=${deep}:x0=0:y0=0:x1=${W}:y1=${H}:speed=0.012:duration=6:rate=24`,
    "-loop", "1", "-framerate", "24", "-i", figure,
    "-loop", "1", "-framerate", "24", "-i", label,
    "-filter_complex",
    "[0:v][1:v]overlay=x='5*sin(2*PI*t/5)':y='7*sin(2*PI*t/3)':shortest=1[a];[a][2:v]overlay=0:0:shortest=1,format=yuv420p[v]",
    "-map", "[v]", "-t", "6", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
    "-profile:v", "main", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out,
  ]);
}

rmSync(work, { recursive: true, force: true });
console.log("Sample media written to private-media/");

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

// ─── Seeded RNG  ───────────────────────────────────────

function makeRng(seed: number) {
  let s = seed;
  return {
    next(): number {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    },
    range(a: number, b: number): number {
      return a + this.next() * (b - a);
    },
    int(a: number, b: number): number {
      return Math.floor(this.range(a, b + 1));
    },
  };
}

function fidToSeed(fid: number): number {
  let h = fid * 2654435761;
  h = (h ^ (h >>> 16)) & 0xffffff;
  return 100000 + (h % 900000);
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  const sl = s / 100, ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * sl;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = ll - c / 2;
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// ─── Generator ────────────────────────────────────────────────────────────────

function generateArtSvg(fid: number): string {
  const seed = fidToSeed(fid);
  const rng = makeRng(seed);
  const S = 600;
  const CX = S / 2, CY = S / 2;

  // Color mode
  const colorModeR = rng.next();
  const colorMode = colorModeR < 0.60 ? "static" : colorModeR < 0.88 ? "gradient" : "rainbow";

  // Palette
  const baseHue = rng.int(0, 359);
  type HSL = [number, number, number];
  let palette: HSL[];
  if (colorMode === "static") {
    palette = [[baseHue, 90, 55]];
  } else if (colorMode === "gradient") {
    const count = rng.int(2, 3);
    palette = Array.from({ length: count }, (_, i) => [
      (baseHue + i * 45 + rng.int(-15, 15) + 360) % 360, 90, 55,
    ] as HSL);
  } else {
    palette = Array.from({ length: 6 }, (_, i) => [
      (i * 60 + rng.int(-8, 8) + 360) % 360, 90, 55,
    ] as HSL);
  }

  // Brightness
  const bR = rng.next();
  const alpha = bR < 0.18 ? 0.22 : bR < 0.40 ? 0.45 : bR < 0.70 ? 0.75 : 1.0;

  // Background: dark always
  const bgHue = (baseHue + 180) % 360;
  const bg = hslToHex(bgHue, 20, 8);

  // Symmetry
  const symR = rng.next();
  const symmetry = symR < 0.55 ? "none" : symR < 0.82 ? "partial" : "full";

  // Wave parameters
  const harmonics = rng.int(2, 7);
  const segments = rng.int(80, 200);
  const baseAmp = S * rng.range(0.12, 0.30);
  const centerY = rng.range(S * 0.3, S * 0.7);

  const phases = Array.from({ length: harmonics }, () => rng.next() * Math.PI * 2);
  const freqs = Array.from({ length: harmonics }, (_, i) => 0.5 + i * 0.6 + rng.next() * 0.5);
  const amps = Array.from({ length: harmonics }, (_, i) =>
    baseAmp * (0.4 * Math.pow(0.6, i) + rng.next() * 0.25)
  );

  // Build backbone points
  type Pt = { x: number; y: number };
  const pts: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = 40 + (S - 80) * t;
    let y = centerY;
    for (let j = 0; j < harmonics; j++) {
      y += Math.sin(t * Math.PI * 2 * freqs[j] + phases[j]) * amps[j];
    }
    pts.push({ x, y });
  }

  // Lines per segment
  const lineTarget = rng.int(600, 2000);
  const perSeg = Math.max(3, Math.min(25, Math.floor(lineTarget / segments)));

  // Build SVG lines
  const lineEls: string[] = [];

  const getColor = (ratio: number): string => {
    if (colorMode === "rainbow") {
      return hslToHex((ratio * 360 + rng.next() * 10) % 360, 90, 58);
    }
    const n = palette.length;
    const scaled = ratio * (n - 1);
    const ai = Math.floor(scaled);
    const lt = scaled - ai;
    const [h1, s1, l1] = palette[ai];
    const [h2, s2, l2] = palette[Math.min(ai + 1, n - 1)];
    const hh = (h1 + ((h2 - h1 + 540) % 360 - 180) * lt + 360) % 360;
    const ss = s1 + (s2 - s1) * lt;
    const ll = l1 + (l2 - l1) * lt;
    return hslToHex(hh, ss, ll);
  };

  const totalLines = segments * perSeg;

  for (let i = 0; i < segments; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // perpendicular unit vector
    const nx = -dy / len;
    const ny = dx / len;

    for (let j = 0; j < perSeg; j++) {
      const tLine = (i * perSeg + j) / (totalLines - 1);
      const frac = j / perSeg;
      const cx = p0.x + dx * frac;
      const cy = p0.y + dy * frac;
      const lineLen = rng.range(8, 36);
      const phase = rng.next() * Math.PI * 2;
      const offset = Math.sin(phase) * lineLen;
      const color = getColor(tLine);
      const w = (1 + rng.next() * 2).toFixed(1);
      const opStr = alpha.toFixed(2);

      const x1 = (cx - nx * offset).toFixed(1);
      const y1 = (cy - ny * offset).toFixed(1);
      const x2 = (cx + nx * offset).toFixed(1);
      const y2 = (cy + ny * offset).toFixed(1);

      lineEls.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${opStr}"/>`
      );

      if (symmetry === "partial" || symmetry === "full") {
        const sy1 = (S - parseFloat(y1)).toFixed(1);
        const sy2 = (S - parseFloat(y2)).toFixed(1);
        lineEls.push(
          `<line x1="${x1}" y1="${sy1}" x2="${x2}" y2="${sy2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${opStr}"/>`
        );
      }

      if (symmetry === "full") {
        const mx1 = (S - parseFloat(x1)).toFixed(1);
        const mx2 = (S - parseFloat(x2)).toFixed(1);
        lineEls.push(
          `<line x1="${mx1}" y1="${y1}" x2="${mx2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${opStr}"/>`
        );
        const sy1 = (S - parseFloat(y1)).toFixed(1);
        const sy2 = (S - parseFloat(y2)).toFixed(1);
        lineEls.push(
          `<line x1="${mx1}" y1="${sy1}" x2="${mx2}" y2="${sy2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${opStr}"/>`
        );
      }
    }
  }

  // FID watermark
  const watermark = `<text x="${S - 12}" y="${S - 10}" font-family="monospace" font-size="11" fill="${hslToHex(baseHue, 60, 70)}" text-anchor="end" opacity="0.5">#${fid}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" fill="${bg}"/>
  ${lineEls.join("\n  ")}
  ${watermark}
</svg>`;
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = new Hono();

app.get("/art/:fid", (c) => {
  const fid = parseInt(c.req.param("fid"), 10) || 1;
  const svg = generateArtSvg(fid);
  return c.body(svg, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
});

registerSnapHandler(app, async (ctx): Promise<SnapHandlerResult> => {
  const url = new URL(ctx.request.url);
  const base = url.origin;
  const generated = url.searchParams.get("generated") === "1";

  if (ctx.action.type !== "post" || !generated) {
    return {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "subtitle", "generateBtn"],
          },
          title: {
            type: "text",
            props: { content: "SnaPunks", size: "lg", weight: "bold", align: "center" },
          },
          subtitle: {
            type: "text",
            props: { content: "Generate your unique generative art — one per FID, forever.", size: "sm", align: "center" },
          },
          generateBtn: {
            type: "button",
            props: { label: "Generate My Art", variant: "primary", icon: "zap" },
            on: { press: { action: "submit", params: { target: `${base}/snapunks?generated=1` } } },
          },
        },
      },
    };
  }

  const fid = ctx.action.user.fid ?? 1;
  const artUrl = `${base}/snapunks/art/${fid}`;
  const shareText = `My SnaPunk #${fid} — unique generative art seeded by my FID.\n\nsnapapps.vercel.app/snapunks`;

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["title", "artImg", "btnRow"],
        },
        title: {
          type: "text",
          props: { content: `SnaPunk #${fid}`, size: "md", weight: "bold", align: "center" },
        },
        artImg: {
          type: "image",
          props: { url: artUrl, aspect: "1:1", alt: `SnaPunk #${fid}` },
        },
        btnRow: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "center" },
          children: ["shareBtn", "regenBtn"],
        },
        shareBtn: {
          type: "button",
          props: { label: "Share", variant: "primary", icon: "share" },
          on: { press: { action: "compose_cast", params: { text: shareText, embeds: [`${base}/snapunks`] } } },
        },
        regenBtn: {
          type: "button",
          props: { label: "Regenerate", variant: "secondary", icon: "refresh-cw" },
          on: { press: { action: "submit", params: { target: `${base}/snapunks?generated=1` } } },
        },
      },
    },
  };
});

export default app;

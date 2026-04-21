import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const BACKGROUNDS = ["#1a0533","#0a0a0a","#001a1a","#0d0d2b","#1a0a00","#0a1a00","#1a0010","#000d1a"];
const SKINS = ["#f5c89a","#d4956a","#a0632a","#6b3a1f","#7dbd6e"];
const HAIR_STYLES = ["mohawk","long","bald","spiky","afro","cap"] as const;
const HAIR_COLORS = ["#ff2d55","#00e5ff","#ffe600","#ff6a00","#a259ff","#ffffff","#111111"];
const EYE_STYLES = ["normal","angry","tired","shades","laser"] as const;
const MOUTH_STYLES = ["smirk","frown","cig","gold"] as const;
const ACCESSORY_STYLES = ["chain","earring","hat","none","halo","scar"] as const;
const SHIRT_COLORS = ["#1e1e2e","#2d1b69","#0f3460","#1a1a2e","#16213e","#0a0a0a"];

type Hair = typeof HAIR_STYLES[number];
type Eye = typeof EYE_STYLES[number];
type Mouth = typeof MOUTH_STYLES[number];
type Accessory = typeof ACCESSORY_STYLES[number];

function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function hair(style: Hair, color: string, u: number): string {
  switch (style) {
    case "mohawk": return `<rect x="${8*u}" y="0" width="${8*u}" height="${6*u}" fill="${color}" rx="${u}"/><rect x="${10*u}" y="${-2*u}" width="${4*u}" height="${4*u}" fill="${color}"/>`;
    case "long": return `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${4*u}" fill="${color}" rx="${u}"/><rect x="${3*u}" y="${6*u}" width="${3*u}" height="${10*u}" fill="${color}" rx="${u}"/><rect x="${18*u}" y="${6*u}" width="${3*u}" height="${10*u}" fill="${color}" rx="${u}"/>`;
    case "bald": return `<rect x="${5*u}" y="${2*u}" width="${14*u}" height="${2*u}" fill="${color}" rx="${u}" opacity="0.4"/>`;
    case "spiky": return `<polygon points="${8*u},${4*u} ${10*u},${-1*u} ${12*u},${4*u}" fill="${color}"/><polygon points="${11*u},${4*u} ${13*u},${-2*u} ${15*u},${4*u}" fill="${color}"/><polygon points="${5*u},${4*u} ${7*u},0 ${9*u},${4*u}" fill="${color}"/><rect x="${4*u}" y="${3*u}" width="${16*u}" height="${3*u}" fill="${color}"/>`;
    case "afro": return `<ellipse cx="${12*u}" cy="${4*u}" rx="${9*u}" ry="${7*u}" fill="${color}"/>`;
    case "cap": return `<rect x="${4*u}" y="${3*u}" width="${16*u}" height="${4*u}" fill="${color}" rx="${u}"/><rect x="${2*u}" y="${6*u}" width="${5*u}" height="${1.5*u}" fill="${color}"/>`;
  }
}

function eyes(style: Eye, u: number): string {
  switch (style) {
    case "normal": return `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${8*u}" y="${11*u}" width="${2*u}" height="${2*u}" fill="#222"/><rect x="${15*u}" y="${11*u}" width="${2*u}" height="${2*u}" fill="#222"/>`;
    case "angry": return `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${8*u}" y="${11*u}" width="${2*u}" height="${2*u}" fill="#ff2222"/><rect x="${15*u}" y="${11*u}" width="${2*u}" height="${2*u}" fill="#ff2222"/><rect x="${6*u}" y="${9*u}" width="${4*u}" height="${1.5*u}" fill="#222" transform="rotate(15,${8*u},${9.5*u})"/><rect x="${14*u}" y="${9*u}" width="${4*u}" height="${1.5*u}" fill="#222" transform="rotate(-15,${16*u},${9.5*u})"/>`;
    case "tired": return `<rect x="${7*u}" y="${11*u}" width="${3*u}" height="${2*u}" fill="#fff"/><rect x="${14*u}" y="${11*u}" width="${3*u}" height="${2*u}" fill="#fff"/><rect x="${8*u}" y="${11.5*u}" width="${2*u}" height="${1.5*u}" fill="#aaf"/><rect x="${15*u}" y="${11.5*u}" width="${2*u}" height="${1.5*u}" fill="#aaf"/><rect x="${6.5*u}" y="${10.5*u}" width="${4*u}" height="${u}" fill="#222"/><rect x="${13.5*u}" y="${10.5*u}" width="${4*u}" height="${u}" fill="#222"/>`;
    case "shades": return `<rect x="${5*u}" y="${9.5*u}" width="${6*u}" height="${4*u}" fill="#111" rx="${u}" opacity="0.95"/><rect x="${13*u}" y="${9.5*u}" width="${6*u}" height="${4*u}" fill="#111" rx="${u}" opacity="0.95"/><rect x="${11*u}" y="${10.5*u}" width="${2*u}" height="${1.5*u}" fill="#333"/>`;
    case "laser": return `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#f22" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#f22" rx="${u*.5}"/><rect x="0" y="${11*u}" width="${24*u}" height="${1.5*u}" fill="#f22" opacity="0.5"/>`;
  }
}

function mouth(style: Mouth, u: number): string {
  switch (style) {
    case "smirk": return `<rect x="${9*u}" y="${17*u}" width="${7*u}" height="${2*u}" fill="#c33" rx="${u*.5}"/><rect x="${14*u}" y="${16*u}" width="${2*u}" height="${u}" fill="#c33"/>`;
    case "frown": return `<rect x="${9*u}" y="${18*u}" width="${6*u}" height="${1.5*u}" fill="#c33" rx="${u*.5}"/><rect x="${9*u}" y="${17*u}" width="${1.5*u}" height="${1.5*u}" fill="#c33"/><rect x="${13.5*u}" y="${17*u}" width="${1.5*u}" height="${1.5*u}" fill="#c33"/>`;
    case "cig": return `<rect x="${9*u}" y="${17*u}" width="${5*u}" height="${1.5*u}" fill="#c33" rx="${u*.5}"/><rect x="${14*u}" y="${16.5*u}" width="${5*u}" height="${u}" fill="#f5f0e8"/><rect x="${19*u}" y="${15.5*u}" width="${u}" height="${2*u}" fill="#f63" rx="${u*.3}"/>`;
    case "gold": return `<rect x="${9*u}" y="${17*u}" width="${6*u}" height="${2*u}" fill="#c33" rx="${u*.5}"/><rect x="${11*u}" y="${17*u}" width="${2*u}" height="${2*u}" fill="#FFD700"/>`;
  }
}

function accessory(style: Accessory, u: number): string {
  switch (style) {
    case "chain": return `<rect x="${7*u}" y="${20*u}" width="${10*u}" height="${u}" fill="#c0c0c0" rx="${u*.3}"/><rect x="${11*u}" y="${20*u}" width="${2*u}" height="${2*u}" fill="#FFD700" rx="${u*.5}"/>`;
    case "earring": return `<circle cx="${5*u}" cy="${14*u}" r="${1.5*u}" fill="#FFD700" stroke="#c0a000" stroke-width="${u*.5}"/>`;
    case "hat": return `<rect x="${4*u}" y="${u}" width="${16*u}" height="${5*u}" fill="#111" rx="${u}"/><rect x="${2*u}" y="${5*u}" width="${20*u}" height="${2*u}" fill="#111" rx="${u*.5}"/>`;
    case "none": return "";
    case "halo": return `<ellipse cx="${12*u}" cy="${1.5*u}" rx="${7*u}" ry="${2*u}" fill="none" stroke="#FFD700" stroke-width="${u*1.5}"/>`;
    case "scar": return `<rect x="${16*u}" y="${11*u}" width="${u}" height="${5*u}" fill="#c00" rx="${u*.3}"/><rect x="${15.5*u}" y="${12*u}" width="${2*u}" height="${u*.8}" fill="#c00"/>`;
  }
}

function generatePunkSvg(fid: number): string {
  const rng = seededRng(fid * 7919 + 12345);
  const S = 240, u = S / 24;
  const bg = pick(BACKGROUNDS, rng);
  const skin = pick(SKINS, rng);
  const hairSt = pick(HAIR_STYLES, rng);
  const hairCol = pick(HAIR_COLORS, rng);
  const eyeSt = pick(EYE_STYLES, rng);
  const mouthSt = pick(MOUTH_STYLES, rng);
  const accSt = pick(ACCESSORY_STYLES, rng);
  const shirt = pick(SHIRT_COLORS, rng);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">
  <rect width="${S}" height="${S}" fill="${bg}"/>
  <rect x="${3*u}" y="${19*u}" width="${18*u}" height="${5*u}" fill="${shirt}" rx="${u}"/>
  <rect x="${10*u}" y="${17*u}" width="${4*u}" height="${3*u}" fill="${skin}"/>
  <rect x="${5*u}" y="${5*u}" width="${14*u}" height="${13*u}" fill="${skin}" rx="${u}"/>
  ${hair(hairSt, hairCol, u)}
  ${eyes(eyeSt, u)}
  ${mouth(mouthSt, u)}
  ${accessory(accSt, u)}
  </svg>`;
}

const app = new Hono();

app.get("/punk/:fid", (c) => {
  const fid = parseInt(c.req.param("fid"), 10) || 1;
  return c.body(generatePunkSvg(fid), 200, { "Content-Type": "image/svg+xml" });
});

app.get("/placeholder", (c) => {
  const S = 240;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <rect width="${S}" height="${S}" fill="#1a0533"/>
  <text x="50%" y="50%" font-size="60" fill="#a259ff" text-anchor="middle">?</text>
  </svg>`;
  return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
});

registerSnapHandler(app, async (ctx): Promise<SnapHandlerResult> => {
  const url = new URL(ctx.request.url);
  const base = url.origin;
  const generated = url.searchParams.get("generated") === "1";
  const fid = ctx.action.user.fid ?? 1;

  const img = generated
    ? `${base}/snapunks/punk/${fid}`
    : `${base}/snapunks/placeholder`;

  const text = `Just claimed my Punk #${fid}! Every FID gets a unique one.`;

  if (ctx.action.type !== "post" || !generated) {
    return {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "placeholder", "generateBtn"] },
          title: { type: "text", props: { content: "Claim your Punk", size: "md", weight: "bold", align: "center" } },
          placeholder: { type: "image", props: { url: img, alt: "punk", aspect: "1:1" } },
          generateBtn: { type: "button", props: { label: "Generate Punk", variant: "primary", icon: "zap" }, on: { press: { action: "submit", params: { target: `${base}/snapunks?generated=1` } } } },
        },
      },
    };
  }

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "punkImg", "btnRow"] },
        title: { type: "text", props: { content: "Claim your Punk", size: "md", weight: "bold", align: "center" } },
        punkImg: { type: "image", props: { url: img, alt: `Punk #${fid}`, aspect: "1:1" } },
        btnRow: { type: "stack", props: { direction: "horizontal", gap: "sm", justify: "center" }, children: ["shareBtn"] },
        shareBtn: { type: "button", props: { label: "Share Punk", variant: "primary", icon: "share" }, on: { press: { action: "compose_cast", params: { text, embeds: [img] } } } },
      },
    },
  };
});

export default app;

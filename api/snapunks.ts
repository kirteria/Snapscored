import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

// ─── Seeded RNG ───────────────────────────────────────
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Color Palettes (Harmonious) ───────────────────────
const COLOR_PALETTES = [
  // Warm vibrant
  { skin: "#f5c89a", hairs: ["#ff2d55", "#ff6a00", "#ffe600", "#d4956a"], shirts: ["#2d1b69", "#16213e", "#1a0a00"] },
  // Cool blues
  { skin: "#d4956a", hairs: ["#00e5ff", "#0f3460", "#a259ff", "#ffffff"], shirts: ["#0f3460", "#1a1a2e", "#0a1a00"] },
  // Earthy
  { skin: "#a0632a", hairs: ["#8b4513", "#d4956a", "#111111", "#654321"], shirts: ["#1e1e2e", "#0a0a0a", "#2d1b69"] },
  // Golden hour
  { skin: "#7dbd6e", hairs: ["#ff9500", "#ffe600", "#c77dff", "#ffffff"], shirts: ["#1a0010", "#0d0d2b", "#16213e"] },
  // Deep neons
  { skin: "#c9a961", hairs: ["#ff2d55", "#a259ff", "#00e5ff", "#ff6a00"], shirts: ["#001a1a", "#0a0a0a", "#2d1b69"] },
  // Sunset
  { skin: "#f5c89a", hairs: ["#ff2d55", "#ff6a00", "#c77dff", "#ffd700"], shirts: ["#16213e", "#1a0010", "#0d0d2b"] },
  // Ocean
  { skin: "#d4956a", hairs: ["#00e5ff", "#0a8fab", "#a259ff", "#ffffff"], shirts: ["#001a1a", "#0f3460", "#1a1a2e"] },
  // Cyberpunk
  { skin: "#6b3a1f", hairs: ["#ff2d55", "#00e5ff", "#a259ff", "#ffe600"], shirts: ["#0a0a0a", "#1e1e2e", "#2d1b69"] },
];

const BACKGROUNDS = ["#0a0a0a", "#001a1a", "#0d0d2b", "#0a1a00", "#1a0010", "#1a0533", "#001a33"];

// ─── Expanded Hair Styles (50+) ───────────────────────
const HAIR_STYLES = [
  "mohawk", "long", "bald", "spiky", "afro", "cap", "cornrows", "braids",
  "dreads", "wavy", "curly", "straight", "mullet", "undercut", "pompadour",
  "slicked", "shag", "pixie", "crew", "fade", "quiff", "top-knot", "messy",
  "asymmetrical", "liberty", "victory-rolls", "beehive", "bowlcut", "flattop",
  "flat", "liberty-spikes", "deathhawk", "side-part", "fade-top", "fade-side",
  "buzz", "wave", "frosted", "spiked-texture", "tousled", "styled-back",
  "swoosh", "high-fade", "low-fade", "temple-fade", "gradient", "textured",
  "faux-hawk", "bleached-tips", "half-shave", "crown", "volume", "sleek",
] as const;

const EYE_STYLES = [
  "normal", "angry", "tired", "shades", "laser", "heart", "star", "x-eyes",
  "wink", "dizzy", "confused", "suspicious", "sleepy", "wide", "narrow",
  "crossed", "dead", "dreamy", "evil", "evil-grin", "happy", "intense",
  "kind", "loving", "paranoid", "piercing", "questioning", "rebel",
  "sad", "smug", "soulless", "squinting", "stoned", "surprised",
  "thoughtful", "uncaring", "unhinged", "unsettled", "wild", "wise",
  "wrathful", "zealous", "blank", "bloodshot", "focused", "glowing",
  "heterochromia", "hypnotic", "icy", "infinite", "jeweled", "keen",
] as const;

const MOUTH_STYLES = [
  "smirk", "frown", "cig", "gold", "grin", "open", "teeth", "tongue",
  "shocked", "surprised", "yawning", "whistling", "pout", "kiss", "sad",
  "manic", "evil-grin", "slack", "pursed", "smug", "sneer", "sullen",
  "toothy", "chewing", "drooling", "gap-teeth", "gold-tooth", "grimace",
  "half-smile", "lopsided", "nervous", "open-jaw", "o-face", "playful",
  "scowl", "serious", "shy", "slight-smile", "sly", "sticked-out-tongue",
  "straight", "vampire", "wry", "zynical", "anatomically-perfect",
  "bubble-gum", "cigarette-ash", "dripping", "fangs", "golden-smile",
] as const;

const ACCESSORY_STYLES = [
  "none", "chain", "earring", "hat", "halo", "scar", "monocle", "eyepatch",
  "goggles", "headphones", "crown", "tiara", "visor", "sunglasses-push",
  "neck-tie", "bowtie", "collar", "pendant", "locket", "bandana",
  "face-paint", "mask", "gas-mask", "respirator", "veil", "hijab",
  "piercing-nose", "piercing-lip", "piercing-eyebrow", "piercing-cheek",
  "tattoo-cheek", "tattoo-forehead", "tear-drop", "war-paint", "stripes",
  "dots", "stars", "glitter", "jewels", "rhinestones", "metallic",
  "cybernetic", "prosthetic", "implant", "circuit", "glow", "aura",
  "horns", "spikes", "thorns", "feathers", "fur", "scales",
] as const;

type Hair = typeof HAIR_STYLES[number];
type Eye = typeof EYE_STYLES[number];
type Mouth = typeof MOUTH_STYLES[number];
type Accessory = typeof ACCESSORY_STYLES[number];

// ─── Enhanced SVG Rendering ───────────────────────────
function hair(style: Hair, color: string, u: number): string {
  const renders: Record<Hair, string> = {
    mohawk: `<rect x="${8*u}" y="${2*u}" width="${8*u}" height="${5*u}" fill="${color}" rx="${u}"/><rect x="${10*u}" y="${-1*u}" width="${4*u}" height="${3*u}" fill="${color}"/>`,
    long: `<ellipse cx="${6*u}" cy="${10*u}" rx="${3*u}" ry="${8*u}" fill="${color}"/><ellipse cx="${18*u}" cy="${10*u}" rx="${3*u}" ry="${8*u}" fill="${color}"/><rect x="${4*u}" y="${2*u}" width="${16*u}" height="${4*u}" fill="${color}" rx="${u}"/>`,
    bald: `<ellipse cx="${12*u}" cy="${3*u}" rx="${6*u}" ry="${2.5*u}" fill="${color}" opacity="0.6"/>`,
    spiky: `<polygon points="${8*u},${4*u} ${10*u},${-2*u} ${12*u},${4*u}" fill="${color}"/><polygon points="${11*u},${4*u} ${13*u},${-3*u} ${15*u},${4*u}" fill="${color}"/><polygon points="${5*u},${4*u} ${7*u},${-1*u} ${9*u},${4*u}" fill="${color}"/><rect x="${4*u}" y="${3*u}" width="${16*u}" height="${3.5*u}" fill="${color}"/>`,
    afro: `<ellipse cx="${12*u}" cy="${4*u}" rx="${10*u}" ry="${8*u}" fill="${color}"/><circle cx="${8*u}" cy="${2*u}" r="${2*u}" fill="${color}"/><circle cx="${16*u}" cy="${2*u}" r="${2*u}" fill="${color}"/>`,
    cap: `<ellipse cx="${12*u}" cy="${2*u}" rx="${10*u}" ry="${3*u}" fill="${color}"/><rect x="${2*u}" y="${5*u}" width="${20*u}" height="${1.5*u}" fill="${color}" rx="${u*.5}"/>`,
    cornrows: `<rect x="${4*u}" y="${2*u}" width="${3*u}" height="${10*u}" fill="${color}" rx="${u*.5}"/><rect x="${8*u}" y="${2*u}" width="${3*u}" height="${10*u}" fill="${color}" rx="${u*.5}"/><rect x="${12*u}" y="${2*u}" width="${3*u}" height="${10*u}" fill="${color}" rx="${u*.5}"/><rect x="${16*u}" y="${2*u}" width="${3*u}" height="${10*u}" fill="${color}" rx="${u*.5}"/>`,
    braids: `<path d="M ${6*u} ${2*u} Q ${8*u} ${8*u} ${6*u} ${14*u}" stroke="${color}" stroke-width="${2*u}" fill="none" stroke-linecap="round"/><path d="M ${18*u} ${2*u} Q ${16*u} ${8*u} ${18*u} ${14*u}" stroke="${color}" stroke-width="${2*u}" fill="none" stroke-linecap="round"/><rect x="${4*u}" y="${2*u}" width="${16*u}" height="${3*u}" fill="${color}"/>`,
    dreads: `<rect x="${5*u}" y="${2*u}" width="${2*u}" height="${12*u}" fill="${color}" rx="${u}"/><rect x="${9*u}" y="${2*u}" width="${2*u}" height="${13*u}" fill="${color}" rx="${u}"/><rect x="${13*u}" y="${2*u}" width="${2*u}" height="${12*u}" fill="${color}" rx="${u}"/><rect x="${17*u}" y="${2*u}" width="${2*u}" height="${13*u}" fill="${color}" rx="${u}"/>`,
    wavy: `<path d="M ${4*u} ${3*u} Q ${6*u} ${1*u} ${8*u} ${3*u} T ${12*u} ${3*u} T ${16*u} ${3*u} T ${20*u} ${3*u}" stroke="${color}" stroke-width="${3*u}" fill="none" stroke-linecap="round"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${3*u}" fill="${color}"/>`,
    curly: `<circle cx="${7*u}" cy="${4*u}" r="${2*u}" fill="${color}"/><circle cx="${12*u}" cy="${2*u}" r="${2*u}" fill="${color}"/><circle cx="${17*u}" cy="${4*u}" r="${2*u}" fill="${color}"/><circle cx="${9*u}" cy="${8*u}" r="${1.5*u}" fill="${color}"/><circle cx="${15*u}" cy="${8*u}" r="${1.5*u}" fill="${color}"/>`,
    straight: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${12*u}" fill="${color}" rx="${u}"/>`,
    mullet: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${4*u}" fill="${color}" rx="${u}"/><rect x="${5*u}" y="${6*u}" width="${3*u}" height="${8*u}" fill="${color}"/><rect x="${16*u}" y="${6*u}" width="${3*u}" height="${8*u}" fill="${color}"/>`,
    undercut: `<ellipse cx="${12*u}" cy="${2*u}" rx="${8*u}" ry="${3*u}" fill="${color}"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}" opacity="0.3"/>`,
    pompadour: `<ellipse cx="${12*u}" cy="${0}" rx="${9*u}" ry="${5*u}" fill="${color}"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    slicked: `<path d="M ${5*u} ${3*u} Q ${12*u} ${0} ${19*u} ${3*u}" stroke="${color}" stroke-width="${2.5*u}" fill="none"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    shag: `<path d="M ${6*u} ${2*u} L ${5*u} ${12*u}" stroke="${color}" stroke-width="${2.5*u}" fill="none" stroke-linecap="round"/><path d="M ${12*u} ${1*u} L ${12*u} ${12*u}" stroke="${color}" stroke-width="${2.5*u}" fill="none" stroke-linecap="round"/><path d="M ${18*u} ${2*u} L ${19*u} ${12*u}" stroke="${color}" stroke-width="${2.5*u}" fill="none" stroke-linecap="round"/><rect x="${4*u}" y="${2*u}" width="${16*u}" height="${3*u}" fill="${color}"/>`,
    pixie: `<ellipse cx="${12*u}" cy="${4*u}" rx="${7*u}" ry="${5*u}" fill="${color}"/><rect x="${5*u}" y="${8*u}" width="${2*u}" height="${4*u}" fill="${color}"/><rect x="${17*u}" y="${8*u}" width="${2*u}" height="${4*u}" fill="${color}"/>`,
    crew: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${6*u}" fill="${color}" rx="${u*.5}"/>`,
    fade: `<rect x="${4*u}" y="${1*u}" width="${16*u}" height="${3*u}" fill="${color}"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}" opacity="0.6"/><rect x="${5*u}" y="${6*u}" width="${14*u}" height="${2*u}" fill="${color}" opacity="0.3"/>`,
    quiff: `<polygon points="${8*u},${5*u} ${12*u},${-1*u} ${16*u},${5*u}" fill="${color}"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    "top-knot": `<circle cx="${12*u}" cy="${1*u}" r="${3*u}" fill="${color}"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${3*u}" fill="${color}"/>`,
    messy: `<path d="M ${5*u} ${2*u} L ${4*u} ${6*u} L ${7*u} ${4*u} L ${6*u} ${7*u}" stroke="${color}" stroke-width="${1.5*u}" fill="none"/><path d="M ${19*u} ${2*u} L ${20*u} ${6*u} L ${17*u} ${4*u} L ${18*u} ${7*u}" stroke="${color}" stroke-width="${1.5*u}" fill="none"/><ellipse cx="${12*u}" cy="${4*u}" rx="${8*u}" ry="${5*u}" fill="${color}"/>`,
    asymmetrical: `<ellipse cx="${10*u}" cy="${3*u}" rx="${6*u}" ry="${5*u}" fill="${color}"/><rect x="${4*u}" y="${6*u}" width="${6*u}" height="${6*u}" fill="${color}"/>`,
    liberty: `<polygon points="${12*u},${-2*u} ${14*u},${4*u} ${8*u},${5*u}" fill="${color}"/><polygon points="${12*u},${4*u} ${10*u},${9*u} ${14*u},${9*u}" fill="${color}"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    "victory-rolls": `<ellipse cx="${7*u}" cy="${3*u}" rx="${2*u}" ry="${4*u}" fill="${color}" transform="rotate(-20 7 3)"/><ellipse cx="${17*u}" cy="${3*u}" rx="${2*u}" ry="${4*u}" fill="${color}" transform="rotate(20 17 3)"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    beehive: `<ellipse cx="${12*u}" cy="${2*u}" rx="${8*u}" ry="${6*u}" fill="${color}"/><ellipse cx="${12*u}" cy="${8*u}" rx="${6*u}" ry="${2*u}" fill="${color}"/>`,
    bowlcut: `<ellipse cx="${12*u}" cy="${5*u}" rx="${9*u}" ry="${6*u}" fill="${color}"/><rect x="${3*u}" y="${8*u}" width="${18*u}" height="${2*u}" fill="${color}"/>`,
    flattop: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${5*u}" fill="${color}"/><rect x="${3*u}" y="${6*u}" width="${18*u}" height="${1*u}" fill="${color}"/>`,
    flat: `<rect x="${4*u}" y="${3*u}" width="${16*u}" height="${4*u}" fill="${color}" rx="${u}"/>`,
    "liberty-spikes": `<polygon points="${6*u},${5*u} ${7*u},${-2*u} ${8*u},${5*u}" fill="${color}"/><polygon points="${10*u},${5*u} ${11*u},${-3*u} ${12*u},${5*u}" fill="${color}"/><polygon points="${14*u},${5*u} ${15*u},${-2*u} ${16*u},${5*u}" fill="${color}"/><polygon points="${18*u},${5*u} ${19*u},${-1*u} ${20*u},${5*u}" fill="${color}"/><rect x="${4*u}" y="${4*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    deathhawk: `<rect x="${10*u}" y="${0}" width="${4*u}" height="${8*u}" fill="${color}"/><polygon points="${8*u},${8*u} ${10*u},${5*u} ${12*u},${8*u}" fill="${color}"/><polygon points="${12*u},${8*u} ${14*u},${5*u} ${16*u},${8*u}" fill="${color}"/><rect x="${4*u}" y="${3*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    "side-part": `<path d="M ${8*u} ${2*u} L ${8.5*u} ${8*u}" stroke="${color}" stroke-width="${1*u}" fill="none"/><ellipse cx="${13*u}" cy="${4*u}" rx="${8*u}" ry="${5*u}" fill="${color}"/>`,
    "fade-top": `<rect x="${4*u}" y="${1*u}" width="${16*u}" height="${4*u}" fill="${color}"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${1.5*u}" fill="${color}" opacity="0.5"/>`,
    "fade-side": `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${3*u}" fill="${color}"/><rect x="${4*u}" y="${5*u}" width="${8*u}" height="${3*u}" fill="${color}" opacity="0.4"/>`,
    buzz: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${8*u}" fill="${color}" opacity="0.6"/>`,
    wave: `<path d="M ${4*u} ${4*u} Q ${8*u} ${2*u} ${12*u} ${4*u} T ${20*u} ${4*u}" stroke="${color}" stroke-width="${3*u}" fill="none" stroke-linecap="round"/><rect x="${4*u}" y="${6*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    frosted: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${5*u}" fill="${color}"/><circle cx="${8*u}" cy="${2*u}" r="${1*u}" fill="#fff" opacity="0.7"/><circle cx="${12*u}" cy="${1*u}" r="${1.2*u}" fill="#fff" opacity="0.7"/><circle cx="${16*u}" cy="${2.5*u}" r="${0.9*u}" fill="#fff" opacity="0.7"/>`,
    "spiked-texture": `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${5*u}" fill="${color}"/><polygon points="${6*u},${2*u} ${6.5*u},${0} ${7*u},${2*u}" fill="${color}"/><polygon points="${10*u},${1.5*u} ${10.5*u},${-0.5*u} ${11*u},${1.5*u}" fill="${color}"/><polygon points="${14*u},${2*u} ${14.5*u},${0} ${15*u},${2*u}" fill="${color}"/><polygon points="${18*u},${1.5*u} ${18.5*u},${-0.5*u} ${19*u},${1.5*u}" fill="${color}"/>`,
    "tousled": `<path d="M ${5*u} ${3*u} Q ${7*u} ${1*u} ${9*u} ${3*u}" stroke="${color}" stroke-width="${2*u}" fill="none" stroke-linecap="round"/><path d="M ${15*u} ${3*u} Q ${17*u} ${0.5*u} ${19*u} ${3*u}" stroke="${color}" stroke-width="${2*u}" fill="none" stroke-linecap="round"/><ellipse cx="${12*u}" cy="${5*u}" rx="${7*u}" ry="${4*u}" fill="${color}"/>`,
    "styled-back": `<ellipse cx="${12*u}" cy="${6*u}" rx="${8*u}" ry="${5*u}" fill="${color}"/><path d="M ${8*u} ${2*u} Q ${12*u} ${-1*u} ${16*u} ${2*u}" stroke="${color}" stroke-width="${2*u}" fill="none"/>`,
    swoosh: `<path d="M ${5*u} ${4*u} Q ${12*u} ${0} ${19*u} ${3*u}" stroke="${color}" stroke-width="${2.5*u}" fill="none" stroke-linecap="round"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
    "high-fade": `<rect x="${4*u}" y="${0}" width="${16*u}" height="${5*u}" fill="${color}"/><rect x="${5*u}" y="${5*u}" width="${14*u}" height="${1.5*u}" fill="${color}" opacity="0.4"/><rect x="${6*u}" y="${6.5*u}" width="${12*u}" height="${1*u}" fill="${color}" opacity="0.2"/>`,
    "low-fade": `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${3*u}" fill="${color}"/><rect x="${5*u}" y="${5*u}" width="${14*u}" height="${2*u}" fill="${color}" opacity="0.5"/><rect x="${6*u}" y="${7*u}" width="${12*u}" height="${1.5*u}" fill="${color}" opacity="0.2"/>`,
    "temple-fade": `<rect x="${4*u}" y="${2*u}" width="${4*u}" height="${6*u}" fill="${color}" opacity="0.3"/><rect x="${16*u}" y="${2*u}" width="${4*u}" height="${6*u}" fill="${color}" opacity="0.3"/><ellipse cx="${12*u}" cy="${4*u}" rx="${6*u}" ry="${4*u}" fill="${color}"/>`,
    gradient: `<defs><linearGradient id="hairGrad"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#111"/></linearGradient></defs><rect x="${4*u}" y="${2*u}" width="${16*u}" height="${8*u}" fill="url(#hairGrad)" rx="${u}"/>`,
    textured: `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${6*u}" fill="${color}"/><circle cx="${7*u}" cy="${4*u}" r="${0.8*u}" fill="#fff" opacity="0.3"/><circle cx="${12*u}" cy="${3.5*u}" r="${0.7*u}" fill="#fff" opacity="0.3"/><circle cx="${17*u}" cy="${4.5*u}" r="${0.8*u}" fill="#fff" opacity="0.3"/>`,
    "faux-hawk": `<ellipse cx="${12*u}" cy="${2*u}" rx="${6*u}" ry="${4*u}" fill="${color}"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${2*u}" fill="${color}" opacity="0.6"/>`,
    "bleached-tips": `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${5*u}" fill="${color}"/><rect x="${4*u}" y="${2*u}" width="${2*u}" height="${4*u}" fill="#fff" opacity="0.8"/><rect x="${18*u}" y="${2*u}" width="${2*u}" height="${4*u}" fill="#fff" opacity="0.8"/><circle cx="${12*u}" cy="${0.5*u}" r="${1.5*u}" fill="#fff" opacity="0.8"/>`,
    "half-shave": `<ellipse cx="${10*u}" cy="${4*u}" rx="${6*u}" ry="${5*u}" fill="${color}"/><rect x="${16*u}" y="${2*u}" width="${4*u}" height="${8*u}" fill="#000" opacity="0.1"/>`,
    crown: `<polygon points="${12*u},${0} ${15*u},${3*u} ${14*u},${6*u} ${10*u},${6*u} ${9*u},${3*u}" fill="${color}"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${3*u}" fill="${color}"/>`,
    volume: `<ellipse cx="${12*u}" cy="${2*u}" rx="${9*u}" ry="${6*u}" fill="${color}"/><rect x="${5*u}" y="${7*u}" width="${14*u}" height="${2*u}" fill="${color}"/>`,
    sleek: `<path d="M ${5*u} ${3*u} Q ${12*u} ${2*u} ${19*u} ${4*u}" stroke="${color}" stroke-width="${3*u}" fill="none" stroke-linecap="round"/><rect x="${4*u}" y="${5*u}" width="${16*u}" height="${2*u}" fill="${color}"/>`,
  };
  return renders[style] || `<rect x="${4*u}" y="${2*u}" width="${16*u}" height="${6*u}" fill="${color}"/>`;
}

function eyes(style: Eye, u: number): string {
  const renders: Record<Eye, string> = {
    normal: `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="#fff" rx="${u*.5}"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#222"/>`,
    angry: `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#ff2222"/><circle cx="${15.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#ff2222"/><rect x="${6*u}" y="${9*u}" width="${4*u}" height="${1.5*u}" fill="#222" transform="rotate(20 8 9.5)"/><rect x="${14*u}" y="${9*u}" width="${4*u}" height="${1.5*u}" fill="#222" transform="rotate(-20 16 9.5)"/>`,
    tired: `<rect x="${7*u}" y="${11*u}" width="${3*u}" height="${2*u}" fill="#fff"/><rect x="${14*u}" y="${11*u}" width="${3*u}" height="${2*u}" fill="#fff"/><rect x="${8*u}" y="${11.5*u}" width="${2*u}" height="${1.5*u}" fill="#88aaff"/><rect x="${15*u}" y="${11.5*u}" width="${2*u}" height="${1.5*u}" fill="#88aaff"/><rect x="${6.5*u}" y="${10*u}" width="${4*u}" height="${1.5*u}" fill="#222" rx="${u*.3}"/><rect x="${13.5*u}" y="${10*u}" width="${4*u}" height="${1.5*u}" fill="#222" rx="${u*.3}"/>`,
    shades: `<rect x="${5*u}" y="${9.5*u}" width="${6*u}" height="${4*u}" fill="#111" rx="${u}" opacity="0.95"/><rect x="${13*u}" y="${9.5*u}" width="${6*u}" height="${4*u}" fill="#111" rx="${u}" opacity="0.95"/><rect x="${11*u}" y="${10.5*u}" width="${2*u}" height="${1.5*u}" fill="#333"/>`,
    laser: `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#f22" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#f22" rx="${u*.5}"/><rect x="0" y="${11*u}" width="${24*u}" height="${1.5*u}" fill="#f22" opacity="0.5"/>`,
    heart: `<path d="M ${8.5*u} ${9.5*u} L ${8*u} ${10.5*u} L ${9*u} ${11*u} L ${8.5*u} ${11*u}" fill="#ff2d55"/><path d="M ${15.5*u} ${9.5*u} L ${15*u} ${10.5*u} L ${16*u} ${11*u} L ${15.5*u} ${11*u}" fill="#ff2d55"/>`,
    star: `<polygon points="${8.5*u},${9*u} ${9.2*u},${10.8*u} ${11.2*u},${10.8*u} ${9.5*u},${11.8*u} ${10.2*u},${13.6*u} ${8.5*u},${12.6*u} ${6.8*u},${13.6*u} ${7.5*u},${11.8*u} ${5.8*u},${10.8*u} ${7.8*u},${10.8*u}" fill="#FFD700"/><polygon points="${15.5*u},${9*u} ${16.2*u},${10.8*u} ${18.2*u},${10.8*u} ${16.5*u},${11.8*u} ${17.2*u},${13.6*u} ${15.5*u},${12.6*u} ${13.8*u},${13.6*u} ${14.5*u},${11.8*u} ${12.8*u},${10.8*u} ${14.8*u},${10.8*u}" fill="#FFD700"/>`,
    "x-eyes": `<line x1="${6*u}" y1="${10*u}" x2="${10*u}" y2="${12*u}" stroke="#222" stroke-width="${1.5*u}" stroke-linecap="round"/><line x1="${10*u}" y1="${10*u}" x2="${6*u}" y2="${12*u}" stroke="#222" stroke-width="${1.5*u}" stroke-linecap="round"/><line x1="${13*u}" y1="${10*u}" x2="${17*u}" y2="${12*u}" stroke="#222" stroke-width="${1.5*u}" stroke-linecap="round"/><line x1="${17*u}" y1="${10*u}" x2="${13*u}" y2="${12*u}" stroke="#222" stroke-width="${1.5*u}" stroke-linecap="round"/>`,
    wink: `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#222"/><path d="M ${14*u} ${11*u} Q ${16*u} ${13*u} ${18*u} ${11*u}" stroke="#222" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/>`,
    dizzy: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.8*u}" fill="none" stroke="#FFD700" stroke-width="${1*u}"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#FFD700"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.8*u}" fill="none" stroke="#FFD700" stroke-width="${1*u}"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#FFD700"/>`,
    confused: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#222"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#222"/><path d="M ${10.5*u} ${13.5*u} Q ${12*u} ${12.5*u} ${13.5*u} ${13.5*u}" stroke="#999" stroke-width="${0.8*u}" fill="none" stroke-linecap="round"/>`,
    suspicious: `<circle cx="${8.5*u}" cy="${10.5*u}" r="${1.5*u}" fill="#fff"/><path d="M ${7.5*u} ${10*u} L ${9.5*u} ${10*u}" stroke="#222" stroke-width="${1*u}" stroke-linecap="round"/><circle cx="${15.5*u}" cy="${10.5*u}" r="${1.5*u}" fill="#fff"/><path d="M ${14.5*u} ${10*u} L ${16.5*u} ${10*u}" stroke="#222" stroke-width="${1*u}" stroke-linecap="round"/>`,
    sleepy: `<path d="M ${7*u} ${11*u} Q ${8.5*u} ${13*u} ${10*u} ${11*u}" stroke="#222" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/><path d="M ${14*u} ${11*u} Q ${15.5*u} ${13*u} ${17*u} ${11*u}" stroke="#222" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/>`,
    wide: `<ellipse cx="${8.5*u}" cy="${11*u}" rx="${2*u}" ry="${2.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${1*u}" fill="#222"/><ellipse cx="${15.5*u}" cy="${11*u}" rx="${2*u}" ry="${2.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1*u}" fill="#222"/>`,
    narrow: `<ellipse cx="${8.5*u}" cy="${11*u}" rx="${2*u}" ry="${1*u}" fill="#fff"/><rect x="${8*u}" y="${10.5*u}" width="${1*u}" height="${1*u}" fill="#222"/><ellipse cx="${15.5*u}" cy="${11*u}" rx="${2*u}" ry="${1*u}" fill="#fff"/><rect x="${15*u}" y="${10.5*u}" width="${1*u}" height="${1*u}" fill="#222"/>`,
    crossed: `<line x1="${7*u}" y1="${9.5*u}" x2="${10*u}" y2="${12.5*u}" stroke="#222" stroke-width="${1.5*u}"/><line x1="${10*u}" y1="${9.5*u}" x2="${7*u}" y2="${12.5*u}" stroke="#222" stroke-width="${1.5*u}"/><line x1="${14*u}" y1="${9.5*u}" x2="${17*u}" y2="${12.5*u}" stroke="#222" stroke-width="${1.5*u}"/><line x1="${17*u}" y1="${9.5*u}" x2="${14*u}" y2="${12.5*u}" stroke="#222" stroke-width="${1.5*u}"/>`,
    dead: `<line x1="${7*u}" y1="${10*u}" x2="${10*u}" y2="${12*u}" stroke="#666" stroke-width="${1*u}"/><line x1="${10*u}" y1="${10*u}" x2="${7*u}" y2="${12*u}" stroke="#666" stroke-width="${1*u}"/><line x1="${14*u}" y1="${10*u}" x2="${17*u}" y2="${12*u}" stroke="#666" stroke-width="${1*u}"/><line x1="${17*u}" y1="${10*u}" x2="${14*u}" y2="${12*u}" stroke="#666" stroke-width="${1*u}"/>`,
    dreamy: `<circle cx="${8.5*u}" cy="${11*u}" r="${2*u}" fill="#a8d8ff" opacity="0.7"/><circle cx="${8.5*u}" cy="${11*u}" r="${1*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${2*u}" fill="#a8d8ff" opacity="0.7"/><circle cx="${15.5*u}" cy="${11*u}" r="${1*u}" fill="#fff"/>`,
    evil: `<ellipse cx="${8.5*u}" cy="${10.5*u}" rx="${1.8*u}" ry="${2.2*u}" fill="#f00"/><rect x="${7.5*u}" y="${10*u}" width="${2*u}" height="${1.5*u}" fill="#000"/><ellipse cx="${15.5*u}" cy="${10.5*u}" rx="${1.8*u}" ry="${2.2*u}" fill="#f00"/><rect x="${14.5*u}" y="${10*u}" width="${2*u}" height="${1.5*u}" fill="#000"/>`,
    "evil-grin": `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#f00"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#f00"/>`,
    happy: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${10.5*u}" r="${0.7*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${10.5*u}" r="${0.7*u}" fill="#000"/><path d="M ${7.5*u} ${11*u} Q ${8.5*u} ${12*u} ${9.5*u} ${11*u}" stroke="#000" stroke-width="${0.5*u}" fill="none"/>`,
    intense: `<rect x="${7*u}" y="${9.5*u}" width="${3*u}" height="${3.5*u}" fill="#fff" rx="${u*.5}"/><circle cx="${8.5*u}" cy="${11*u}" r="${1.3*u}" fill="#000"/><rect x="${14*u}" y="${9.5*u}" width="${3*u}" height="${3.5*u}" fill="#fff" rx="${u*.5}"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.3*u}" fill="#000"/>`,
    kind: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.6*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#8855ff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.6*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#8855ff"/><path d="M ${7*u} ${13*u} Q ${8.5*u} ${13.5*u} ${10*u} ${13*u}" stroke="#8855ff" stroke-width="${0.5*u}" fill="none"/>`,
    loving: `<path d="M ${8.5*u} ${9.5*u} L ${8*u} ${10.5*u} L ${9*u} ${11.2*u} L ${8.5*u} ${10.2*u}" fill="#ff2d55"/><path d="M ${8.5*u} ${11.2*u} L ${8*u} ${10.2*u} L ${9*u} ${9.5*u}" fill="#ff2d55"/><path d="M ${15.5*u} ${9.5*u} L ${15*u} ${10.5*u} L ${16*u} ${11.2*u} L ${15.5*u} ${10.2*u}" fill="#ff2d55"/><path d="M ${15.5*u} ${11.2*u} L ${15*u} ${10.2*u} L ${16*u} ${9.5*u}" fill="#ff2d55"/>`,
    paranoid: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${7.5*u}" cy="${11*u}" r="${0.6*u}" fill="#000" transform="translate(-0.5 -0.5)"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${16.5*u}" cy="${11*u}" r="${0.6*u}" fill="#000" transform="translate(0.5 -0.5)"/>`,
    piercing: `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#222"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${0.4*u}" fill="#FFD700"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><circle cx="${15.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#222"/><circle cx="${15.5*u}" cy="${11.5*u}" r="${0.4*u}" fill="#FFD700"/>`,
    questioning: `<ellipse cx="${8.5*u}" cy="${10.5*u}" rx="${1.5*u}" ry="${2*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${10.2*u}" r="${0.7*u}" fill="#000"/><ellipse cx="${15.5*u}" cy="${10.5*u}" rx="${1.5*u}" ry="${2*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${10.2*u}" r="${0.7*u}" fill="#000"/><path d="M ${9.5*u} ${12.5*u} L ${10.5*u} ${11.5*u}" stroke="#999" stroke-width="${0.8*u}"/>`,
    rebel: `<path d="M ${7*u} ${9*u} L ${10*u} ${12*u}" stroke="#ff2d55" stroke-width="${2*u}" stroke-linecap="round"/><path d="M ${10*u} ${9*u} L ${7*u} ${12*u}" stroke="#ff2d55" stroke-width="${2*u}" stroke-linecap="round"/><path d="M ${14*u} ${9*u} L ${17*u} ${12*u}" stroke="#ff2d55" stroke-width="${2*u}" stroke-linecap="round"/><path d="M ${17*u} ${9*u} L ${14*u} ${12*u}" stroke="#ff2d55" stroke-width="${2*u}" stroke-linecap="round"/>`,
    sad: `<path d="M ${7*u} ${11*u} Q ${8.5*u} ${10*u} ${10*u} ${11*u}" stroke="#222" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/><path d="M ${14*u} ${11*u} Q ${15.5*u} ${10*u} ${17*u} ${11*u}" stroke="#222" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/>`,
    smug: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${10.8*u}" r="${0.7*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${10.8*u}" r="${0.7*u}" fill="#000"/><path d="M ${7*u} ${10.5*u} L ${10*u} ${10*u}" stroke="#000" stroke-width="${0.8*u}" stroke-linecap="round"/>`,
    soulless: `<rect x="${7*u}" y="${10.2*u}" width="${3*u}" height="${2.6*u}" fill="#000"/><rect x="${14*u}" y="${10.2*u}" width="${3*u}" height="${2.6*u}" fill="#000"/>`,
    squinting: `<path d="M ${7*u} ${11.5*u} Q ${8.5*u} ${13*u} ${10*u} ${11.5*u}" stroke="#222" stroke-width="${2*u}" fill="none" stroke-linecap="round"/><path d="M ${14*u} ${11.5*u} Q ${15.5*u} ${13*u} ${17*u} ${11.5*u}" stroke="#222" stroke-width="${2*u}" fill="none" stroke-linecap="round"/>`,
    stoned: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#0f0"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#0f0"/>`,
    surprised: `<ellipse cx="${8.5*u}" cy="${11*u}" rx="${2*u}" ry="${2.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${1.2*u}" fill="#000"/><ellipse cx="${15.5*u}" cy="${11*u}" rx="${2*u}" ry="${2.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.2*u}" fill="#000"/>`,
    thoughtful: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.7*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.7*u}" fill="#000"/><circle cx="${11*u}" cy="${13.5*u}" r="${0.6*u}" fill="#999"/>`,
    uncaring: `<rect x="${7*u}" y="${11*u}" width="${3*u}" height="${1.5*u}" fill="#fff"/><rect x="${14*u}" y="${11*u}" width="${3*u}" height="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${0.5*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11.5*u}" r="${0.5*u}" fill="#000"/>`,
    unhinged: `<ellipse cx="${8.5*u}" cy="${11.5*u}" rx="${2*u}" ry="${2.2*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${10.5*u}" r="${1*u}" fill="#f00"/><ellipse cx="${15.5*u}" cy="${11.5*u}" rx="${2*u}" ry="${2.2*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${10.5*u}" r="${1*u}" fill="#f00"/>`,
    unsettled: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${7.8*u}" cy="${11*u}" r="${0.8*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${16.2*u}" cy="${11*u}" r="${0.8*u}" fill="#000"/>`,
    wild: `<circle cx="${8.5*u}" cy="${11*u}" r="${2*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${1.2*u}" fill="#0f0"/><circle cx="${15.5*u}" cy="${11*u}" r="${2*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.2*u}" fill="#0f0"/><polygon points="${7*u},${8*u} ${8.5*u},${6*u} ${10*u},${8*u}" fill="#0f0"/>`,
    wise: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.6*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#333"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.6*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#333"/><path d="M ${7*u} ${13.5*u} Q ${12*u} ${14*u} ${17*u} ${13.5*u}" stroke="#999" stroke-width="${0.5*u}" fill="none"/>`,
    wrathful: `<ellipse cx="${8.5*u}" cy="${10*u}" rx="${1.8*u}" ry="${2.5*u}" fill="#ff2d55"/><path d="M ${7*u} ${9*u} L ${10*u} ${8*u}" stroke="#ff2d55" stroke-width="${1.5*u}" stroke-linecap="round"/><ellipse cx="${15.5*u}" cy="${10*u}" rx="${1.8*u}" ry="${2.5*u}" fill="#ff2d55"/><path d="M ${14*u} ${9*u} L ${17*u} ${8*u}" stroke="#ff2d55" stroke-width="${1.5*u}" stroke-linecap="round"/>`,
    zealous: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#ff6a00"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#ff6a00"/><polygon points="${8.5*u},${8*u} ${9*u},${9*u} ${8*u},${9.5*u}" fill="#ff6a00"/><polygon points="${15.5*u},${8*u} ${16*u},${9*u} ${15*u},${9.5*u}" fill="#ff6a00"/>`,
    blank: `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#e0e0e0" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#e0e0e0" rx="${u*.5}"/>`,
    bloodshot: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${1*u}" fill="#f0f"/><line x1="${7.2*u}" y1="${9.8*u}" x2="${9.8*u}" y2="${12.2*u}" stroke="#f00" stroke-width="${0.3*u}"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1*u}" fill="#f0f"/><line x1="${14.2*u}" y1="${9.8*u}" x2="${16.8*u}" y2="${12.2*u}" stroke="#f00" stroke-width="${0.3*u}"/>`,
    focused: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.3*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.9*u}" fill="#000"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.3*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.9*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.5*u}" fill="#fff"/>`,
    glowing: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.8*u}" fill="#FFD700" opacity="0.6"/><circle cx="${8.5*u}" cy="${11*u}" r="${1.2*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.7*u}" fill="#0f0"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.8*u}" fill="#FFD700" opacity="0.6"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.2*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.7*u}" fill="#0f0"/>`,
    heterochromia: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#ff6a00"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#00e5ff"/>`,
    hypnotic: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${1.2*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.9*u}" fill="#000"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.6*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.3*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.2*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.9*u}" fill="#000"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.6*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.3*u}" fill="#000"/>`,
    icy: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#a8f0ff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.8*u}" fill="#00e5ff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#a8f0ff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.8*u}" fill="#00e5ff"/>`,
    infinite: `<ellipse cx="${8.5*u}" cy="${11*u}" rx="${2*u}" ry="${1.2*u}" fill="#fff"/><ellipse cx="${8.5*u}" cy="${11*u}" rx="${1.3*u}" ry="${0.8*u}" fill="#000"/><ellipse cx="${15.5*u}" cy="${11*u}" rx="${2*u}" ry="${1.2*u}" fill="#fff"/><ellipse cx="${15.5*u}" cy="${11*u}" rx="${1.3*u}" ry="${0.8*u}" fill="#000"/>`,
    jeweled: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><polygon points="${8.5*u},${9.5*u} ${9.5*u},${11*u} ${8.5*u},${12*u} ${7.5*u},${11*u}" fill="#ff2d55"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.5*u}" fill="#fff"/><polygon points="${15.5*u},${9.5*u} ${16.5*u},${11*u} ${15.5*u},${12*u} ${14.5*u},${11*u}" fill="#ff2d55"/>`,
    keen: `<circle cx="${8.5*u}" cy="${11*u}" r="${1.4*u}" fill="#fff"/><circle cx="${8.5*u}" cy="${11*u}" r="${0.9*u}" fill="#222"/><circle cx="${8.5*u}" cy="${10.6*u}" r="${0.4*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${1.4*u}" fill="#fff"/><circle cx="${15.5*u}" cy="${11*u}" r="${0.9*u}" fill="#222"/><circle cx="${15.5*u}" cy="${10.6*u}" r="${0.4*u}" fill="#fff"/>`,
  };
  return renders[style] || `<rect x="${7*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><rect x="${14*u}" y="${10*u}" width="${3*u}" height="${3*u}" fill="#fff" rx="${u*.5}"/><circle cx="${8.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#222"/><circle cx="${15.5*u}" cy="${11.5*u}" r="${1.2*u}" fill="#222"/>`;
}

function mouth(style: Mouth, u: number): string {
  const renders: Record<Mouth, string> = {
    smirk: `<rect x="${9*u}" y="${17*u}" width="${7*u}" height="${2*u}" fill="#c33" rx="${u*.5}"/><rect x="${14*u}" y="${16*u}" width="${2*u}" height="${u}" fill="#c33"/>`,
    frown: `<path d="M ${10*u} ${19*u} Q ${12*u} ${17*u} ${14*u} ${19*u}" stroke="#c33" stroke-width="${2*u}" fill="none" stroke-linecap="round"/>`,
    cig: `<rect x="${9*u}" y="${17*u}" width="${5*u}" height="${1.5*u}" fill="#c33" rx="${u*.5}"/><rect x="${14*u}" y="${16.5*u}" width="${5*u}" height="${u}" fill="#f5f0e8"/><rect x="${19*u}" y="${15.5*u}" width="${u}" height="${2*u}" fill="#f63" rx="${u*.3}"/>`,
    gold: `<rect x="${9*u}" y="${17*u}" width="${6*u}" height="${2*u}" fill="#c33" rx="${u*.5}"/><rect x="${11*u}" y="${17*u}" width="${2*u}" height="${2*u}" fill="#FFD700"/>`,
    grin: `<ellipse cx="${12*u}" cy="${17.5*u}" rx="${4*u}" ry="${2*u}" fill="#c33"/><rect x="${10*u}" y="${16.5*u}" width="${4*u}" height="${1*u}" fill="#fff"/>`,
    open: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3.5*u}" ry="${2.5*u}" fill="#c33"/><ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${1.8*u}" fill="#000"/>`,
    teeth: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3.5*u}" ry="${2.5*u}" fill="#c33"/><line x1="${9.5*u}" y1="${17*u}" x2="${14.5*u}" y2="${17*u}" stroke="#fff" stroke-width="${0.8*u}"/><line x1="${9.5*u}" y1="${18*u}" x2="${14.5*u}" y2="${18*u}" stroke="#fff" stroke-width="${0.8*u}"/>`,
    tongue: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${2*u}" fill="#c33"/><ellipse cx="${12*u}" cy="${18.5*u}" rx="${2*u}" ry="${1.5*u}" fill="#ff99aa"/>`,
    shocked: `<ellipse cx="${12*u}" cy="${17*u}" rx="${2.5*u}" ry="${3*u}" fill="#c33"/>`,
    surprised: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${3.5*u}" fill="#c33"/><ellipse cx="${12*u}" cy="${17.5*u}" rx="${2*u}" ry="${2*u}" fill="#000"/>`,
    yawning: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${3*u}" fill="#c33"/><path d="M ${11*u} ${16*u} L ${13*u} ${16*u}" stroke="#fff" stroke-width="${0.8*u}"/>`,
    whistling: `<circle cx="${12*u}" cy="${17*u}" r="${2*u}" fill="#c33"/><circle cx="${12*u}" cy="${17*u}" r="${1*u}" fill="#000"/>`,
    pout: `<ellipse cx="${12*u}" cy="${17.5*u}" rx="${3*u}" ry="${1.8*u}" fill="#ff99aa"/>`,
    kiss: `<ellipse cx="${12*u}" cy="${17*u}" rx="${2*u}" ry="${2*u}" fill="#ff2d55"/>`,
    sad: `<path d="M ${10*u} ${18*u} Q ${12*u} ${16*u} ${14*u} ${18*u}" stroke="#c33" stroke-width="${2*u}" fill="none" stroke-linecap="round"/>`,
    manic: `<rect x="${9*u}" y="${16*u}" width="${6*u}" height="${3*u}" fill="#c33" rx="${u}"/><path d="M ${11*u} ${17.5*u} L ${13*u} ${17.5*u}" stroke="#fff" stroke-width="${1*u}" stroke-linecap="round"/>`,
    "evil-grin": `<path d="M ${10*u} ${17*u} L ${14*u} ${17*u} L ${14*u} ${19*u} Q ${12*u} ${20*u} ${10*u} ${19*u}" fill="#c33"/><line x1="${11*u}" y1="${18*u}" x2="${13*u}" y2="${18*u}" stroke="#fff" stroke-width="${0.5*u}"/>`,
    slack: `<ellipse cx="${12*u}" cy="${18*u}" rx="${3.5*u}" ry="${2*u}" fill="#c33" opacity="0.6"/>`,
    pursed: `<rect x="${10*u}" y="${17*u}" width="${4*u}" height="${1.5*u}" fill="#c33" rx="${u*.5}"/>`,
    smug: `<path d="M ${10*u} ${17.5*u} L ${14*u} ${17.5*u}" stroke="#c33" stroke-width="${2*u}" stroke-linecap="round"/><path d="M ${10.5*u} ${16*u} Q ${12*u} ${17*u} ${13.5*u} ${16*u}" stroke="#c33" stroke-width="${1*u}" fill="none"/>`,
    sneer: `<path d="M ${9.5*u} ${18*u} L ${12*u} ${16.5*u} L ${14.5*u} ${18*u}" fill="#c33"/><line x1="${9.5*u}" y1="${18*u}" x2="${14.5*u}" y2="${18*u}" stroke="#c33" stroke-width="${1*u}"/>`,
    sullen: `<path d="M ${10*u} ${18.5*u} Q ${12*u} ${17*u} ${14*u} ${18.5*u}" stroke="#c33" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/>`,
    toothy: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3.5*u}" ry="${2.5*u}" fill="#c33"/><rect x="${10*u}" y="${16*u}" width="${1*u}" height="${2.5*u}" fill="#fff"/><rect x="${11.5*u}" y="${16*u}" width="${1*u}" height="${2.5*u}" fill="#fff"/><rect x="${13*u}" y="${16*u}" width="${1*u}" height="${2.5*u}" fill="#fff"/><rect x="${14.5*u}" y="${16*u}" width="${1*u}" height="${2.5*u}" fill="#fff"/>`,
    chewing: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${1.8*u}" fill="#c33"/><path d="M ${10*u} ${16.5*u} L ${14*u} ${16.5*u}" stroke="#fff" stroke-width="${0.8*u}"/>`,
    drooling: `<path d="M ${13*u} ${19*u} Q ${13.5*u} ${21*u} ${13*u} ${22*u}" stroke="#c33" stroke-width="${1*u}" stroke-linecap="round" fill="none"/>`,
    "gap-teeth": `<ellipse cx="${12*u}" cy="${17.5*u}" rx="${3*u}" ry="${2*u}" fill="#c33"/><rect x="${10*u}" y="${17*u}" width="${1*u}" height="${1.5*u}" fill="#fff"/><rect x="${12.5*u}" y="${17*u}" width="${1*u}" height="${1.5*u}" fill="#fff"/><rect x="${14*u}" y="${17*u}" width="${1*u}" height="${1.5*u}" fill="#fff"/>`,
    "gold-tooth": `<ellipse cx="${12*u}" cy="${17*u}" rx="${3.5*u}" ry="${2*u}" fill="#c33"/><polygon points="${11.5*u},${16*u} ${12.5*u},${16*u} ${12.5*u},${18*u} ${11.5*u},${18*u}" fill="#FFD700"/>`,
    grimace: `<path d="M ${10*u} ${16.5*u} L ${14*u} ${16.5*u}" stroke="#c33" stroke-width="${2.5*u}" stroke-linecap="round"/><circle cx="${10*u}" cy="${17.5*u}" r="${0.8*u}" fill="#c33"/><circle cx="${14*u}" cy="${17.5*u}" r="${0.8*u}" fill="#c33"/>`,
    "half-smile": `<path d="M ${10*u} ${17*u} Q ${12*u} ${18*u} ${14*u} ${17*u}" stroke="#c33" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/><path d="M ${10*u} ${17*u} L ${10*u} ${18*u}" stroke="#c33" stroke-width="${1*u}"/>`,
    lopsided: `<path d="M ${10.5*u} ${18*u} Q ${11.5*u} ${16.5*u} ${13*u} ${16*u}" stroke="#c33" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/>`,
    nervous: `<path d="M ${10*u} ${17*u} L ${14*u} ${17*u}" stroke="#c33" stroke-width="${1.5*u}" stroke-linecap="round"/><circle cx="${10*u}" cy="${18*u}" r="${0.6*u}" fill="#c33"/><circle cx="${14*u}" cy="${18*u}" r="${0.6*u}" fill="#c33"/>`,
    "open-jaw": `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${3.5*u}" fill="#c33"/><ellipse cx="${12*u}" cy="${16*u}" rx="${3*u}" ry="${1*u}" fill="#000"/>`,
    "o-face": `<circle cx="${12*u}" cy="${17*u}" r="${2.5*u}" fill="#c33"/><circle cx="${12*u}" cy="${17*u}" r="${1.5*u}" fill="#000"/>`,
    playful: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${2*u}" fill="#ff99aa"/><path d="M ${10*u} ${17*u} L ${14*u} ${17*u}" stroke="#c33" stroke-width="${1*u}"/>`,
    scowl: `<path d="M ${10*u} ${16*u} L ${14*u} ${18*u}" stroke="#c33" stroke-width="${2*u}" stroke-linecap="round"/>`,
    serious: `<path d="M ${10*u} ${17*u} L ${14*u} ${17*u}" stroke="#c33" stroke-width="${2*u}" stroke-linecap="round"/>`,
    shy: `<path d="M ${10*u} ${17.5*u} Q ${12*u} ${16*u} ${14*u} ${17.5*u}" stroke="#c33" stroke-width="${1.2*u}" fill="none" stroke-linecap="round"/>`,
    "slight-smile": `<path d="M ${10*u} ${17*u} Q ${12*u} ${18*u} ${14*u} ${17*u}" stroke="#c33" stroke-width="${1.2*u}" fill="none" stroke-linecap="round"/>`,
    sly: `<path d="M ${10*u} ${17.5*u} Q ${12*u} ${16*u} ${14*u} ${17.5*u}" stroke="#c33" stroke-width="${1.5*u}" fill="none"/><line x1="${14.2*u}" y1="${17.2*u}" x2="${15.5*u}" y2="${17*u}" stroke="#c33" stroke-width="${1*u}" stroke-linecap="round"/>`,
    "sticked-out-tongue": `<ellipse cx="${12*u}" cy="${17*u}" rx="${2.5*u}" ry="${1.5*u}" fill="#c33"/><ellipse cx="${12*u}" cy="${19*u}" rx="${2*u}" ry="${1.5*u}" fill="#ff99aa"/>`,
    straight: `<line x1="${10*u}" y1="${17*u}" x2="${14*u}" y2="${17*u}" stroke="#c33" stroke-width="${1.5*u}" stroke-linecap="round"/>`,
    vampire: `<ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${2*u}" fill="#c33"/><polygon points="${11*u},${18*u} ${11*u},${19.5*u} ${11.5*u},${18.5*u}" fill="#fff"/><polygon points="${13*u},${18*u} ${13*u},${19.5*u} ${12.5*u},${18.5*u}" fill="#fff"/>`,
    wry: `<path d="M ${10*u} ${16.5*u} Q ${12*u} ${17.5*u} ${14*u} ${17*u}" stroke="#c33" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/>`,
    zynical: `<path d="M ${10*u} ${18*u} Q ${12*u} ${16.5*u} ${14*u} ${18*u}" stroke="#c33" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/><line x1="${10*u}" y1="${18*u}" x2="${14*u}" y2="${18*u}" stroke="#c33" stroke-width="${0.8*u}"/>`,
    "anatomically-perfect": `<ellipse cx="${12*u}" cy="${17*u}" rx="${3.5*u}" ry="${2.2*u}" fill="#c33"/><ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${1.5*u}" fill="#fff"/><path d="M ${10*u} ${17.5*u} Q ${12*u} ${18.5*u} ${14*u} ${17.5*u}" stroke="#c33" stroke-width="${1*u}" fill="none"/>`,
    "bubble-gum": `<circle cx="${12*u}" cy="${16.5*u}" r="${2.5*u}" fill="#ff69b4"/>`,
    "cigarette-ash": `<rect x="${9*u}" y="${17*u}" width="${5*u}" height="${1.5*u}" fill="#c33" rx="${u*.5}"/><rect x="${14*u}" y="${16.5*u}" width="${5*u}" height="${u}" fill="#f5f0e8"/><circle cx="${20*u}" cy="${15*u}" r="${0.8*u}" fill="#999" opacity="0.7"/>`,
    dripping: `<path d="M ${12*u} ${19*u} L ${11.8*u} ${21*u}" stroke="#c33" stroke-width="${1*u}" stroke-linecap="round"/><path d="M ${12*u} ${19*u} L ${12.2*u} ${21*u}" stroke="#c33" stroke-width="${1*u}" stroke-linecap="round"/>`,
    fangs: `<path d="M ${10*u} ${17*u} L ${14*u} ${17*u}" stroke="#c33" stroke-width="${2*u}" stroke-linecap="round"/><polygon points="${10.5*u},${17*u} ${11*u},${19*u} ${10.8*u},${17.2*u}" fill="#fff"/><polygon points="${13.5*u},${17*u} ${13*u},${19*u} ${13.2*u},${17.2*u}" fill="#fff"/>`,
    "golden-smile": `<path d="M ${10*u} ${17*u} Q ${12*u} ${18.5*u} ${14*u} ${17*u}" stroke="#FFD700" stroke-width="${2.5*u}" fill="none" stroke-linecap="round"/><ellipse cx="${12*u}" cy="${17*u}" rx="${3*u}" ry="${1.5*u}" fill="#FFD700" opacity="0.3"/>`,
  };
  return renders[style] || `<rect x="${9*u}" y="${17*u}" width="${6*u}" height="${2*u}" fill="#c33" rx="${u*.5}"/>`;
}

function accessory(style: Accessory, u: number): string {
  const renders: Record<Accessory, string> = {
    none: "",
    chain: `<rect x="${7*u}" y="${20*u}" width="${10*u}" height="${u}" fill="#c0c0c0" rx="${u*.3}"/><rect x="${11*u}" y="${20*u}" width="${2*u}" height="${2*u}" fill="#FFD700" rx="${u*.5}"/>`,
    earring: `<circle cx="${5*u}" cy="${14*u}" r="${1.5*u}" fill="#FFD700" stroke="#c0a000" stroke-width="${u*.5}"/>`,
    hat: `<rect x="${4*u}" y="${u}" width="${16*u}" height="${5*u}" fill="#111" rx="${u}"/><rect x="${2*u}" y="${5*u}" width="${20*u}" height="${2*u}" fill="#111" rx="${u*.5}"/>`,
    halo: `<ellipse cx="${12*u}" cy="${1.5*u}" rx="${7*u}" ry="${2*u}" fill="none" stroke="#FFD700" stroke-width="${u*1.5}"/>`,
    scar: `<rect x="${16*u}" y="${11*u}" width="${u}" height="${5*u}" fill="#c00" rx="${u*.3}"/><rect x="${15.5*u}" y="${12*u}" width="${2*u}" height="${u*.8}" fill="#c00"/>`,
    monocle: `<circle cx="${16.5*u}" cy="${10*u}" r="${2*u}" fill="none" stroke="#c0c0c0" stroke-width="${u*.4}"/><rect x="${18.2*u}" y="${9.5*u}" width="${3*u}" height="${1*u}" fill="#c0c0c0"/>`,
    eyepatch: `<rect x="${15*u}" y="${9*u}" width="${4*u}" height="${4*u}" fill="#000" rx="${u}"/>`,
    goggles: `<rect x="${5.5*u}" y="${9*u}" width="${3*u}" height="${3.5*u}" fill="#888" rx="${u*.3}"/><rect x="${15.5*u}" y="${9*u}" width="${3*u}" height="${3.5*u}" fill="#888" rx="${u*.3}"/><rect x="${8.8*u}" y="${10*u}" width="${2.4*u}" height="${1.5*u}" fill="#888"/>`,
    headphones: `<path d="M ${5*u} ${6*u} Q ${5*u} ${10*u} ${12*u} ${11*u} Q ${19*u} ${10*u} ${19*u} ${6*u}" stroke="#333" stroke-width="${1.5*u}" fill="none" stroke-linecap="round"/><circle cx="${7*u}" cy="${12*u}" r="${1.5*u}" fill="#333"/><circle cx="${17*u}" cy="${12*u}" r="${1.5*u}" fill="#333"/>`,
    crown: `<polygon points="${12*u},${-1*u} ${15*u},${2*u} ${14.5*u},${5*u} ${12*u},${4.5*u} ${9.5*u},${5*u} ${9*u},${2*u}" fill="#FFD700" stroke="#c0a000" stroke-width="${u*.3}"/>`,
    tiara: `<polygon points="${5*u},${4*u} ${7*u},${1*u} ${9*u},${3*u} ${12*u},${0} ${15*u},${3*u} ${17*u},${1*u} ${19*u},${4*u}" fill="#FFD700" stroke="#c0a000" stroke-width="${u*.3}"/><rect x="${5*u}" y="${4*u}" width="${14*u}" height="${1*u}" fill="#FFD700"/>`,
    visor: `<ellipse cx="${12*u}" cy="${8*u}" rx="${8*u}" ry="${2*u}" fill="#000" opacity="0.9"/>`,
    "sunglasses-push": `<rect x="${5*u}" y="${9.5*u}" width="${4*u}" height="${3*u}" fill="#FFD700" opacity="0.8"/><rect x="${15*u}" y="${9.5*u}" width="${4*u}" height="${3*u}" fill="#FFD700" opacity="0.8"/><rect x="${9.5*u}" y="${10*u}" width="${1*u}" height="${1.5*u}" fill="#FFD700" opacity="0.8"/>`,
    "neck-tie": `<polygon points="${12*u},${19*u} ${11*u},${20*u} ${11*u},${23*u} ${12*u},${22*u}" fill="#ff2d55" stroke="#c00" stroke-width="${u*.2}"/><polygon points="${12*u},${19*u} ${13*u},${20*u} ${13*u},${23*u} ${12*u},${22*u}" fill="#c33" stroke="#c00" stroke-width="${u*.2}"/>`,
    bowtie: `<polygon points="${10*u},${18*u} ${11*u},${19*u} ${12*u},${18.5*u}" fill="#c33"/><polygon points="${12*u},${18*u} ${13*u},${19*u} ${14*u},${18.5*u}" fill="#c33"/><rect x="${11*u}" y="${18.5*u}" width="${2*u}" height="${1.5*u}" fill="#666"/>`,
    collar: `<rect x="${8*u}" y="${18*u}" width="${8*u}" height="${2*u}" fill="#fff" rx="${u*.5}"/>`,
    pendant: `<circle cx="${12*u}" cy="${21*u}" r="${1.2*u}" fill="#FFD700"/><line x1="${12*u}" y1="${19*u}" x2="${12*u}" y2="${20*u}" stroke="#c0a000" stroke-width="${u*.3}"/>`,
    locket: `<circle cx="${12*u}" cy="${21*u}" r="${1*u}" fill="#c0c0c0"/><circle cx="${11.5*u}" cy="${20.8*u}" r="${0.4*u}" fill="#FFD700"/>`,
    bandana: `<polygon points="${5*u},${8*u} ${19*u},${8*u} ${18*u},${12*u} ${6*u},${12*u}" fill="#ff2d55" opacity="0.9"/>`,
    "face-paint": `<path d="M ${7*u} ${12*u} L ${9*u} ${14*u} L ${7*u} ${14*u}" fill="#00e5ff" opacity="0.7"/><path d="M ${15*u} ${12*u} L ${17*u} ${14*u} L ${15*u} ${14*u}" fill="#00e5ff" opacity="0.7"/>`,
    mask: `<ellipse cx="${12*u}" cy="${12*u}" rx="${5*u}" ry="${4*u}" fill="#111" opacity="0.95"/>`,
    "gas-mask": `<rect x="${6*u}" y="${10*u}" width="${4*u}" height="${5*u}" fill="#333"/><rect x="${14*u}" y="${10*u}" width="${4*u}" height="${5*u}" fill="#333"/><rect x="${9.5*u}" y="${12*u}" width="${1.5*u}" height="${3*u}" fill="#444"/>`,
    respirator: `<rect x="${8*u}" y="${11*u}" width="${8*u}" height="${3*u}" fill="#888" rx="${u*.5}"/><circle cx="${8*u}" cy="${12.5*u}" r="${0.8*u}" fill="#000"/><circle cx="${16*u}" cy="${12.5*u}" r="${0.8*u}" fill="#000"/>`,
    veil: `<polygon points="${4*u},${3*u} ${12*u},${2*u} ${20*u},${3*u} ${19*u},${10*u} ${5*u},${10*u}" fill="#000" opacity="0.4"/>`,
    hijab: `<path d="M ${5*u} ${3*u} Q ${12*u} ${1*u} ${19*u} ${3*u} L ${18*u} ${16*u} Q ${12*u} ${18*u} ${6*u} ${16*u}" fill="#001a1a" opacity="0.95"/>`,
    "piercing-nose": `<circle cx="${12*u}" cy="${14*u}" r="${0.6*u}" fill="#c0c0c0" stroke="#FFD700" stroke-width="${u*.2}"/>`,
    "piercing-lip": `<circle cx="${12*u}" cy="${18*u}" r="${0.6*u}" fill="#c0c0c0" stroke="#FFD700" stroke-width="${u*.2}"/>`,
    "piercing-eyebrow": `<circle cx="${7*u}" cy="${8*u}" r="${0.6*u}" fill="#c0c0c0" stroke="#FFD700" stroke-width="${u*.2}"/>`,
    "piercing-cheek": `<circle cx="${6*u}" cy="${13*u}" r="${0.5*u}" fill="#c0c0c0" stroke="#FFD700" stroke-width="${u*.2}"/>`,
    "tattoo-cheek": `<path d="M ${5.5*u} ${13*u} L ${6.5*u} ${13*u}" stroke="#222" stroke-width="${0.8*u}"/><circle cx="${6*u}" cy="${12.5*u}" r="${0.3*u}" fill="#222"/>`,
    "tattoo-forehead": `<polygon points="${12*u},${3*u} ${13*u},${4*u} ${11*u},${4*u}" fill="#222"/>`,
    "tear-drop": `<path d="M ${5.5*u} ${11*u} Q ${5.2*u} ${13*u} ${5*u} ${14*u}" stroke="#0088ff" stroke-width="${0.6*u}" fill="none" stroke-linecap="round"/>`,
    "war-paint": `<path d="M ${5*u} ${11*u} L ${7*u} ${13*u}" stroke="#ff6a00" stroke-width="${1.2*u}" stroke-linecap="round"/><path d="M ${17*u} ${11*u} L ${19*u} ${13*u}" stroke="#ff6a00" stroke-width="${1.2*u}" stroke-linecap="round"/>`,
    stripes: `<line x1="${5*u}" y1="${8*u}" x2="${19*u}" y2="${8*u}" stroke="#222" stroke-width="${0.8*u}"/><line x1="${5*u}" y1="${11*u}" x2="${19*u}" y2="${11*u}" stroke="#222" stroke-width="${0.8*u}"/><line x1="${5*u}" y1="${14*u}" x2="${19*u}" y2="${14*u}" stroke="#222" stroke-width="${0.8*u}"/>`,
    dots: `<circle cx="${7*u}" cy="${10*u}" r="${0.5*u}" fill="#222"/><circle cx="${12*u}" cy="${9*u}" r="${0.5*u}" fill="#222"/><circle cx="${17*u}" cy="${10*u}" r="${0.5*u}" fill="#222"/><circle cx="${9*u}" cy="${13*u}" r="${0.5*u}" fill="#222"/><circle cx="${15*u}" cy="${13*u}" r="${0.5*u}" fill="#222"/>`,
    stars: `<polygon points="${8*u},${9*u} ${8.5*u},${10.5*u} ${10*u},${10.5*u} ${8.7*u},${11.2*u} ${9.2*u},${12.7*u} ${8*u},${12*u} ${6.8*u},${12.7*u} ${7.3*u},${11.2*u} ${6*u},${10.5*u} ${7.5*u},${10.5*u}" fill="#FFD700"/><polygon points="${16*u},${10*u} ${16.5*u},${11.5*u} ${18*u},${11.5*u} ${16.7*u},${12.2*u} ${17.2*u},${13.7*u} ${16*u},${13*u} ${14.8*u},${13.7*u} ${15.3*u},${12.2*u} ${14*u},${11.5*u} ${15.5*u},${11.5*u}" fill="#FFD700"/>`,
    glitter: `<circle cx="${7*u}" cy="${9*u}" r="${0.4*u}" fill="#FFD700" opacity="0.9"/><circle cx="${12*u}" cy="${8*u}" r="${0.4*u}" fill="#00e5ff" opacity="0.9"/><circle cx="${17*u}" cy="${9.5*u}" r="${0.4*u}" fill="#ff2d55" opacity="0.9"/><circle cx="${9*u}" cy="${12*u}" r="${0.35*u}" fill="#FFD700" opacity="0.9"/><circle cx="${15*u}" cy="${12.5*u}" r="${0.35*u}" fill="#00e5ff" opacity="0.9"/>`,
    jewels: `<polygon points="${8*u},${10*u} ${8.3*u},${10.8*u} ${9.1*u},${10.8*u} ${8.5*u},${11.3*u} ${8.8*u},${12.1*u} ${8*u},${11.6*u} ${7.2*u},${12.1*u} ${7.5*u},${11.3*u} ${6.9*u},${10.8*u} ${7.7*u},${10.8*u}" fill="#ff2d55"/><polygon points="${16*u},${10*u} ${16.3*u},${10.8*u} ${17.1*u},${10.8*u} ${16.5*u},${11.3*u} ${16.8*u},${12.1*u} ${16*u},${11.6*u} ${15.2*u},${12.1*u} ${15.5*u},${11.3*u} ${14.9*u},${10.8*u} ${15.7*u},${10.8*u}" fill="#ff2d55"/>`,
    rhinestones: `<circle cx="${7*u}" cy="${9*u}" r="${0.5*u}" fill="#fff" opacity="0.8"/><circle cx="${12*u}" cy="${8*u}" r="${0.5*u}" fill="#fff" opacity="0.8"/><circle cx="${17*u}" cy="${9*u}" r="${0.5*u}" fill="#fff" opacity="0.8"/><circle cx="${9.5*u}" cy="${12*u}" r="${0.4*u}" fill="#fff" opacity="0.8"/><circle cx="${14.5*u}" cy="${12*u}" r="${0.4*u}" fill="#fff" opacity="0.8"/>`,
    metallic: `<rect x="${6*u}" y="${9*u}" width="${2*u}" height="${3*u}" fill="#c0c0c0" opacity="0.9"/><rect x="${16*u}" y="${9*u}" width="${2*u}" height="${3*u}" fill="#c0c0c0" opacity="0.9"/>`,
    cybernetic: `<rect x="${5*u}" y="${8*u}" width="${5*u}" height="${6*u}" fill="#00e5ff" opacity="0.3" stroke="#00e5ff" stroke-width="${u*.2}"/><rect x="${14*u}" y="${8*u}" width="${5*u}" height="${6*u}" fill="#00e5ff" opacity="0.3" stroke="#00e5ff" stroke-width="${u*.2}"/><line x1="${6*u}" y1="${10*u}" x2="${10*u}" y2="${10*u}" stroke="#00e5ff" stroke-width="${u*.2}"/><line x1="${14*u}" y1="${10*u}" x2="${18*u}" y2="${10*u}" stroke="#00e5ff" stroke-width="${u*.2}"/>`,
    prosthetic: `<rect x="${5.5*u}" y="${7*u}" width="${3*u}" height="${6*u}" fill="#888" opacity="0.8" rx="${u*.3}"/>`,
    implant: `<circle cx="${6*u}" cy="${10*u}" r="${1.5*u}" fill="#c0c0c0" stroke="#00e5ff" stroke-width="${u*.3}"/><circle cx="${6*u}" cy="${10*u}" r="${0.8*u}" fill="#00e5ff" opacity="0.6"/>`,
    circuit: `<rect x="${5.5*u}" y="${8.5*u}" width="${4*u}" height="${4*u}" fill="none" stroke="#00e5ff" stroke-width="${u*.25}"/><line x1="${6*u}" y1="${10.5*u}" x2="${9.5*u}" y2="${10.5*u}" stroke="#00e5ff" stroke-width="${u*.2}"/><circle cx="${6.5*u}" cy="${10.5*u}" r="${0.3*u}" fill="#00e5ff"/>`,
    glow: `<circle cx="${12*u}" cy="${10*u}" r="${3.5*u}" fill="#a259ff" opacity="0.2"/><circle cx="${12*u}" cy="${10*u}" r="${2*u}" fill="#a259ff" opacity="0.4"/>`,
    aura: `<circle cx="${12*u}" cy="${12*u}" r="${5*u}" fill="none" stroke="#FFD700" stroke-width="${u*.3}" opacity="0.6"/><circle cx="${12*u}" cy="${12*u}" r="${4*u}" fill="none" stroke="#FFD700" stroke-width="${u*.2}" opacity="0.4"/>`,
    horns: `<polygon points="${7*u},${4*u} ${6*u},${1*u} ${7.5*u},${4*u}" fill="#333"/><polygon points="${17*u},${4*u} ${18*u},${1*u} ${16.5*u},${4*u}" fill="#333"/>`,
    spikes: `<polygon points="${6*u},${5*u} ${5*u},${2*u} ${7*u},${5*u}" fill="#333"/><polygon points="${12*u},${4*u} ${12*u},${0} ${13*u},${4*u}" fill="#333"/><polygon points="${18*u},${5*u} ${19*u},${2*u} ${17*u},${5*u}" fill="#333"/>`,
    thorns: `<polygon points="${5.5*u},${8*u} ${5*u},${5*u} ${6.5*u},${8*u}" fill="#8b4513"/><polygon points="${18.5*u},${8*u} ${19*u},${5*u} ${17.5*u},${8*u}" fill="#8b4513"/>`,
    feathers: `<path d="M ${6*u} ${5*u} Q ${4*u} ${8*u} ${6*u} ${11*u}" stroke="#fff" stroke-width="${1.5*u}" fill="none"/><path d="M ${18*u} ${5*u} Q ${20*u} ${8*u} ${18*u} ${11*u}" stroke="#fff" stroke-width="${1.5*u}" fill="none"/>`,
    fur: `<circle cx="${6*u}" cy="${8*u}" r="${2*u}" fill="#8b4513" opacity="0.7"/><circle cx="${18*u}" cy="${8*u}" r="${2*u}" fill="#8b4513" opacity="0.7"/>`,
    scales: `<circle cx="${6*u}" cy="${8*u}" r="${1.2*u}" fill="#00e5ff" opacity="0.8"/><circle cx="${6.5*u}" cy="${9*u}" r="${1.2*u}" fill="#00e5ff" opacity="0.8"/><circle cx="${18*u}" cy="${8*u}" r="${1.2*u}" fill="#00e5ff" opacity="0.8"/><circle cx="${17.5*u}" cy="${9*u}" r="${1.2*u}" fill="#00e5ff" opacity="0.8"/>`,
  };
  return renders[style] || "";
}

function generatePunkSvg(fid: number): string {
  const rng = seededRng(fid * 7919 + 12345);
  const palette = pick(COLOR_PALETTES, rng);
  const S = 240, u = S / 24;
  const bg = pick(BACKGROUNDS, rng);
  const skin = palette.skin;
  const hairSt = pick(HAIR_STYLES, rng);
  const hairCol = pick(palette.hairs, rng);
  const eyeSt = pick(EYE_STYLES, rng);
  const mouthSt = pick(MOUTH_STYLES, rng);
  const accSt = pick(ACCESSORY_STYLES, rng);
  const shirt = pick(palette.shirts, rng);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">
  <defs><pattern id="g" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><path d="M ${u} 0 L 0 0 0 ${u}" fill="none" stroke="#fff" stroke-width="0.4"/></pattern></defs>
  <rect width="${S}" height="${S}" fill="${bg}"/>
  <rect width="${S}" height="${S}" fill="url(#g)" opacity="0.04"/>
  <rect x="${3*u}" y="${19*u}" width="${18*u}" height="${5*u}" fill="${shirt}" rx="${u}"/>
  <rect x="${10*u}" y="${17*u}" width="${4*u}" height="${3*u}" fill="${skin}"/>
  <rect x="${5*u}" y="${5*u}" width="${14*u}" height="${13*u}" fill="${skin}" rx="${u}"/>
  ${hair(hairSt, hairCol, u)}
  ${eyes(eyeSt, u)}
  <rect x="${11*u}" y="${14*u}" width="${2*u}" height="${1.5*u}" fill="${skin}"/>
  <rect x="${10*u}" y="${15*u}" width="${u}" height="${u}" fill="${skin}" opacity="0.7"/>
  <rect x="${13*u}" y="${15*u}" width="${u}" height="${u}" fill="${skin}" opacity="0.7"/>
  ${mouth(mouthSt, u)}
  ${accessory(accSt, u)}
  <rect width="${S}" height="${S}" fill="none" stroke="#ffffff" stroke-width="${u*.3}" opacity="0.15"/>
</svg>`;
}

const app = new Hono();

app.get("/punk/:fid", (c) => {
  const fid = parseInt(c.req.param("fid"), 10) || 1;
  const svg = generatePunkSvg(fid);
  return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
});

app.get("/placeholder", (c) => {
  const S = 240, u = S / 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">
  <defs><pattern id="g" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><path d="M ${u} 0 L 0 0 0 ${u}" fill="none" stroke="#fff" stroke-width="0.4"/></pattern></defs>
  <rect width="${S}" height="${S}" fill="#1a0533"/>
  <rect width="${S}" height="${S}" fill="url(#g)" opacity="0.04"/>
  <rect x="10" y="10" width="${S-20}" height="${S-20}" fill="none" stroke="#a259ff" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.5"/>
  <text x="${S/2}" y="${S/2+30}" font-family="monospace" font-size="90" font-weight="bold" fill="#a259ff" text-anchor="middle" opacity="0.8">?</text>
  <text x="${S/2}" y="${S-20}" font-family="monospace" font-size="10" fill="#666" text-anchor="middle">tap generate to reveal</text>
</svg>`;
  return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
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
          page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "placeholder", "generateBtn"] },
          title: { type: "text", props: { content: "Claim your Punk", size: "md", weight: "bold", align: "center" } },
          placeholder: { type: "image", props: { url: `${base}/snapunks/placeholder`, alt: "Your punk will appear here", aspect: "1:1" } },
          generateBtn: { type: "button", props: { label: "Generate Punk", variant: "primary", icon: "zap" }, on: { press: { action: "submit", params: { target: `${base}/snapunks?generated=1` } } } },
        },
      },
    };
  }

  const fid = ctx.action.user.fid ?? 1;
  const imgSrc = `${base}/snapunks/punk/${fid}`;
  const shareText = `Just claimed my Punk #${fid}! Every FID gets a unique one.\n\nGet yours now!`;

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "punkImg", "btnRow"] },
        title: { type: "text", props: { content: "Claim your Punk", size: "md", weight: "bold", align: "center" } },
        punkImg: { type: "image", props: { url: imgSrc, alt: `Punk #${fid}`, aspect: "1:1" } },
        btnRow: { type: "stack", props: { direction: "horizontal", gap: "sm", justify: "center" }, children: ["shareBtn"] },
        shareBtn: { type: "button", props: { label: "Share Punk", variant: "primary", icon: "share" }, on: { press: { action: "compose_cast", params: { text: shareText, embeds: [`${base}/snapunks/punk/${fid}`] } } } },
      },
    },
  };
});

export default app;

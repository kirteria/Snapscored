import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import { snapscored } from "./snapscored/index.js";
import { snapunks, generatePunkSvg } from "./snapunks/index.js";

const app = new Hono();

app.get("/snapunks/placeholder", (c) => {
  const S = 240;
  const u = S / 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">
  <defs>
    <pattern id="g" width="${u}" height="${u}" patternUnits="userSpaceOnUse">
      <path d="M ${u} 0 L 0 0 0 ${u}" fill="none" stroke="#fff" stroke-width="0.4"/>
    </pattern>
  </defs>
  <rect width="${S}" height="${S}" fill="#1a0533"/>
  <rect width="${S}" height="${S}" fill="url(#g)" opacity="0.04"/>
  <rect x="10" y="10" width="${S-20}" height="${S-20}" fill="none" stroke="#a259ff" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.5"/>
  <text x="${S/2}" y="${S/2+30}" font-family="monospace" font-size="90" font-weight="bold" fill="#a259ff" text-anchor="middle" opacity="0.8">?</text>
  <text x="${S/2}" y="${S-20}" font-family="monospace" font-size="10" fill="#666" text-anchor="middle">tap generate to reveal</text>
</svg>`;
  return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
});

app.get("/snapunks/punk/:fid", (c) => {
  const fid = parseInt(c.req.param("fid") ?? "1", 10);
  const svg = generatePunkSvg(isNaN(fid) ? 1 : fid);
  return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
});

registerSnapHandler(app, snapscored, { path: "/snapscored" });
registerSnapHandler(app, snapunks, { path: "/snapunks" });

app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SnapApps</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #fff;
      font-family: 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    h1 { font-size: 2rem; color: #a259ff; margin-bottom: 0.5rem; letter-spacing: 0.1em; }
    p.sub { color: #666; font-size: 0.85rem; margin-bottom: 3rem; letter-spacing: 0.05em; }
    .grid { display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 400px; }
    .card {
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      background: #111;
      text-decoration: none;
      color: inherit;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: border-color 0.2s, background 0.2s;
    }
    .card:hover { border-color: #a259ff; background: #1a1a2e; }
    .icon { font-size: 2rem; }
    .info h2 { font-size: 1rem; color: #fff; margin-bottom: 0.25rem; }
    .info p { font-size: 0.75rem; color: #666; }
    footer { margin-top: 3rem; color: #333; font-size: 0.7rem; }
  </style>
</head>
<body>
  <h1>SnapApps</h1>
  <p class="sub">a collection of farcaster snaps</p>
  <div class="grid">
    <a class="card" href="/snapscored">
      <span class="icon">🏅</span>
      <div class="info">
        <h2>SnapScored</h2>
        <p>Check your Neynar score — Diamond or Newcomer?</p>
      </div>
    </a>
    <a class="card" href="/snapunks">
      <span class="icon">👾</span>
      <div class="info">
        <h2>SnaPunks</h2>
        <p>Claim your unique generative pixel punk art</p>
      </div>
    </a>
  </div>
  <footer>built by @weak</footer>
</body>
</html>`);
});

export default app;

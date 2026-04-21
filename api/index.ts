import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SnapApps</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a0a;color:#fff;font-family:'Courier New',monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem}
    h1{font-size:2rem;color:#a259ff;margin-bottom:.5rem;letter-spacing:.1em}
    p.sub{color:#666;font-size:.85rem;margin-bottom:3rem}
    .grid{display:flex;flex-direction:column;gap:1rem;width:100%;max-width:400px}
    .card{border:1px solid #2a2a2a;border-radius:12px;padding:1.25rem 1.5rem;background:#111;text-decoration:none;color:inherit;display:flex;align-items:center;gap:1rem;transition:border-color .2s,background .2s}
    .card:hover{border-color:#a259ff;background:#1a1a2e}
    .icon{font-size:2rem}
    .info h2{font-size:1rem;color:#fff;margin-bottom:.25rem}
    .info p{font-size:.75rem;color:#666}
    footer{margin-top:3rem;color:#333;font-size:.7rem}
  </style>
</head>
<body>
  <h1>SnapApps</h1>
  <p class="sub">a collection of farcaster snaps</p>
  <div class="grid">
    <a class="card" href="/snapscored">
      <span class="icon">🏅</span>
      <div class="info"><h2>SnapScored</h2><p>Check your Neynar score — Diamond or Newcomer?</p></div>
    </a>
    <a class="card" href="/snapunks">
      <span class="icon">👾</span>
      <div class="info"><h2>SnaPunks</h2><p>Claim your unique generative pixel punk art</p></div>
    </a>
  </div>
  <footer>built by @weak</footer>
</body>
</html>`);
});

export default app.fetch.bind(app);
export { app };


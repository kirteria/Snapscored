import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

// local dev only — import snap handlers directly
import { snapscored } from "./snapscored/index.js";
import { snapunks } from "./snapunks/index.js";

const app = new Hono();

app.get("/", (c) => c.html(`<html><body style="background:#0a0a0a;color:#fff;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:1rem"><h1 style="color:#a259ff">SnapApps</h1><a href="/snapscored" style="color:#fff">SnapScored</a><a href="/snapunks" style="color:#fff">SnaPunks</a></body></html>`));

registerSnapHandler(app, snapscored, { path: "/snapscored", og: false });
registerSnapHandler(app, snapunks, { path: "/snapunks", og: false });

const port = Number(process.env.PORT) || 3003;
serve({ fetch: app.fetch, port });
console.log(`Snap running at http://localhost:${port}`);

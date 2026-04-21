import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";

// Re-export api/index as the Vercel entrypoint
export { default } from "../api/index.js";

// Satisfy Vercel's Hono entrypoint detection
const _app = new Hono();
export { _app };

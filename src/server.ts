import { serve } from "@hono/node-server";
import app from "../api/index.js";

const port = Number(process.env.PORT) || 3003;
serve({ fetch: app.fetch, port });
console.log(`Snap running at http://localhost:${port}`);

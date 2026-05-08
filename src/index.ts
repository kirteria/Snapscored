import { Hono } from "hono";
import homeApp from "../api/index.js";
import snapscored from "../api/snapscored.js";
import snapunks from "../api/snapunks.js";
import snapunks from "../api/gmfarcaster.js";

const app = new Hono();

app.route("/", homeApp);
app.route("/snapscored", snapscored);
app.route("/snapunks", snapunks);
app.route("/gmfarcaster", gmfarcaster);

export default app;

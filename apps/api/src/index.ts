import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors";
import authRoutes from "./routes/auth";
import foodRoutes from "./routes/food";

const app = new Hono();

app.use("*", logger());
app.use("*", corsMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/auth", authRoutes);
app.route("/food", foodRoutes);

const port = Number(process.env.PORT) || 3001;
console.log(`Savoro API listening on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;

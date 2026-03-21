import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import foodRoutes from "./routes/food";
import logRoutes from "./routes/log";
import goalRoutes from "./routes/goal";
import favoritesRoutes from "./routes/favorites";
import recipeRoutes from "./routes/recipe";
import kitchenRoutes from "./routes/kitchen";

const app = new Hono();

app.use("*", logger());
app.use("*", corsMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/auth", authRoutes);
app.route("/chat", chatRoutes);
app.route("/food", foodRoutes);
app.route("/log", logRoutes);
app.route("/goal", goalRoutes);
app.route("/favorites", favoritesRoutes);
app.route("/recipe", recipeRoutes);
app.route("/kitchen", kitchenRoutes);

const port = Number(process.env.PORT) || 3001;
console.log(`Savoro API listening on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;

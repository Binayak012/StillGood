import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { householdsRouter } from "./modules/households/households.routes.js";
import { itemsRouter } from "./modules/items/items.routes.js";
import { alertsRouter } from "./modules/alerts/alerts.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { recipesRouter } from "./modules/recipes/recipes.routes.js";
import { integrationsRouter } from "./modules/integrations/integrations.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/households", householdsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/integrations", integrationsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

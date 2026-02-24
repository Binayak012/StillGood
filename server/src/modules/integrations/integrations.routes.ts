import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";

export const integrationsRouter = Router();

integrationsRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({
      title: "Auto-sync with grocery apps (Coming Soon)",
      connected: false,
      description:
        "Automatically updates freshness using grocery app data integration (in development)."
    });
  })
);

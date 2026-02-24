import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { requireAuth, requireHousehold } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { runAlertSweep } from "./alerts.service.js";

const alertParamsSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({})
});

const emptySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}),
  query: z.object({})
});

export const alertsRouter = Router();

alertsRouter.get(
  "/",
  requireAuth,
  requireHousehold,
  asyncHandler(async (req, res) => {
    if (!req.user!.prefsInApp) {
      res.json({ alerts: [] });
      return;
    }

    const alerts = await prisma.alert.findMany({
      where: {
        householdId: req.membership!.householdId,
        userId: req.user!.id
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ alerts });
  })
);

alertsRouter.post(
  "/:id/read",
  requireAuth,
  requireHousehold,
  validate(alertParamsSchema),
  asyncHandler(async (req, res) => {
    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        householdId: req.membership!.householdId,
        userId: req.user!.id
      }
    });

    if (!alert) {
      throw new AppError(404, "ALERT_NOT_FOUND", "Alert not found");
    }

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { readAt: new Date() }
    });

    res.json({ alert: updated });
  })
);

alertsRouter.post(
  "/run",
  requireAuth,
  requireHousehold,
  validate(emptySchema),
  asyncHandler(async (_req, res) => {
    const result = await runAlertSweep(prisma);
    res.json({ result });
  })
);

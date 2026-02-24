import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { requireAuth, requireHousehold } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { buildComputedFields, refreshAndPersistItem, trackEvent } from "./items.service.js";

const createItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    category: z.string().min(2).max(40),
    quantity: z.string().min(1).max(60),
    dateAdded: z.coerce.date().optional(),
    opened: z.boolean().nullable().optional(),
    customFreshDays: z.number().int().min(1).max(90).nullable().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const itemParamsSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({})
});

const updateItemSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(120).optional(),
      category: z.string().min(2).max(40).optional(),
      quantity: z.string().min(1).max(60).optional(),
      dateAdded: z.coerce.date().optional(),
      opened: z.boolean().nullable().optional(),
      customFreshDays: z.number().int().min(1).max(90).nullable().optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be updated"
    }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({})
});

const listItemsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    status: z.enum(["active", "archived"]).default("active")
  })
});

async function getItemOrThrow(householdId: string, itemId: string) {
  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      householdId
    }
  });

  if (!item) {
    throw new AppError(404, "ITEM_NOT_FOUND", "Item not found");
  }
  return item;
}

export const itemsRouter = Router();

itemsRouter.get(
  "/",
  requireAuth,
  requireHousehold,
  validate(listItemsSchema),
  asyncHandler(async (req, res) => {
    const archived = req.query.status === "archived";
    const items = await prisma.item.findMany({
      where: {
        householdId: req.membership!.householdId,
        archivedAt: archived ? { not: null } : null
      },
      orderBy: { createdAt: "desc" }
    });

    const hydrated = archived
      ? items
      : await Promise.all(items.map((item) => refreshAndPersistItem(prisma, item)));

    res.json({ items: hydrated });
  })
);

itemsRouter.post(
  "/",
  requireAuth,
  requireHousehold,
  validate(createItemSchema),
  asyncHandler(async (req, res) => {
    const dateAdded = req.body.dateAdded ?? new Date();
    const opened = req.body.opened ?? false;
    const openedAt = opened ? new Date() : null;

    const computed = await buildComputedFields(prisma, {
      category: req.body.category,
      dateAdded,
      opened,
      openedAt,
      customFreshDays: req.body.customFreshDays
    });

    const item = await prisma.item.create({
      data: {
        householdId: req.membership!.householdId,
        createdByUserId: req.user!.id,
        name: req.body.name,
        category: req.body.category.toLowerCase(),
        quantity: req.body.quantity,
        dateAdded,
        opened,
        openedAt,
        customFreshDays: req.body.customFreshDays,
        expiresAt: computed.expiresAt,
        daysRemaining: computed.daysRemaining,
        status: computed.status,
        confidence: computed.confidence
      }
    });

    await trackEvent(prisma, {
      householdId: req.membership!.householdId,
      itemId: item.id,
      userId: req.user!.id,
      type: "ITEM_ADDED"
    });

    res.status(201).json({ item });
  })
);

itemsRouter.patch(
  "/:id",
  requireAuth,
  requireHousehold,
  validate(updateItemSchema),
  asyncHandler(async (req, res) => {
    const existing = await getItemOrThrow(req.membership!.householdId, req.params.id);

    const incomingOpened =
      typeof req.body.opened === "boolean" || req.body.opened === null
        ? req.body.opened
        : existing.opened;

    const openingNow = existing.opened !== true && incomingOpened === true;
    const openedAt =
      incomingOpened === true
        ? openingNow
          ? new Date()
          : existing.openedAt ?? new Date()
        : null;

    const updatedValues = {
      name: req.body.name ?? existing.name,
      category: (req.body.category ?? existing.category).toLowerCase(),
      quantity: req.body.quantity ?? existing.quantity,
      dateAdded: req.body.dateAdded ?? existing.dateAdded,
      opened: incomingOpened,
      openedAt,
      customFreshDays:
        req.body.customFreshDays === undefined ? existing.customFreshDays : req.body.customFreshDays
    };

    const computed = await buildComputedFields(prisma, {
      category: updatedValues.category,
      dateAdded: updatedValues.dateAdded,
      opened: updatedValues.opened,
      openedAt: updatedValues.openedAt,
      customFreshDays: updatedValues.customFreshDays,
      previousExpiresAt: existing.expiresAt
    });

    const item = await prisma.item.update({
      where: { id: existing.id },
      data: {
        ...updatedValues,
        expiresAt: computed.expiresAt,
        daysRemaining: computed.daysRemaining,
        status: computed.status,
        confidence: computed.confidence
      }
    });

    res.json({ item });
  })
);

itemsRouter.delete(
  "/:id",
  requireAuth,
  requireHousehold,
  validate(itemParamsSchema),
  asyncHandler(async (req, res) => {
    const existing = await getItemOrThrow(req.membership!.householdId, req.params.id);
    await prisma.item.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

itemsRouter.post(
  "/:id/open",
  requireAuth,
  requireHousehold,
  validate(itemParamsSchema),
  asyncHandler(async (req, res) => {
    const existing = await getItemOrThrow(req.membership!.householdId, req.params.id);
    if (existing.archivedAt) {
      throw new AppError(400, "ITEM_ARCHIVED", "Cannot open an archived item");
    }

    const openedAt = existing.openedAt ?? new Date();
    const openItem = await prisma.item.update({
      where: { id: existing.id },
      data: {
        opened: true,
        openedAt
      }
    });

    const item = await refreshAndPersistItem(prisma, openItem, {
      previousExpiresAt: existing.expiresAt
    });

    await trackEvent(prisma, {
      householdId: req.membership!.householdId,
      itemId: item.id,
      userId: req.user!.id,
      type: "ITEM_OPENED"
    });

    res.json({ item });
  })
);

itemsRouter.post(
  "/:id/consume",
  requireAuth,
  requireHousehold,
  validate(itemParamsSchema),
  asyncHandler(async (req, res) => {
    const existing = await getItemOrThrow(req.membership!.householdId, req.params.id);
    if (existing.archivedAt) {
      throw new AppError(400, "ITEM_ARCHIVED", "Item already archived");
    }

    const now = new Date();
    const item = await prisma.item.update({
      where: { id: existing.id },
      data: {
        archivedAt: now,
        consumedAt: now
      }
    });

    await trackEvent(prisma, {
      householdId: req.membership!.householdId,
      itemId: item.id,
      userId: req.user!.id,
      type: "ITEM_CONSUMED"
    });

    res.json({ item });
  })
);

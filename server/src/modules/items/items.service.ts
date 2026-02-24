import { Prisma, PrismaClient } from "@prisma/client";
import { calculateFreshness } from "../../lib/freshness.js";

type ItemRecord = Prisma.ItemGetPayload<{}>;

export async function getRule(prisma: PrismaClient, category: string) {
  return prisma.freshnessRule.findUnique({
    where: { category: category.toLowerCase() }
  });
}

export async function buildComputedFields(
  prisma: PrismaClient,
  input: {
    category: string;
    dateAdded: Date;
    opened?: boolean | null;
    openedAt?: Date | null;
    customFreshDays?: number | null;
    previousExpiresAt?: Date | null;
    now?: Date;
  }
) {
  const rule = await getRule(prisma, input.category);
  return calculateFreshness({
    category: input.category,
    dateAdded: input.dateAdded,
    opened: input.opened,
    openedAt: input.openedAt,
    customFreshDays: input.customFreshDays,
    previousExpiresAt: input.previousExpiresAt,
    now: input.now,
    rule: rule
      ? {
          unopenedDays: rule.unopenedDays,
          openedDays: rule.openedDays
        }
      : null
  });
}

export async function refreshAndPersistItem(
  prisma: PrismaClient,
  item: ItemRecord,
  options?: { previousExpiresAt?: Date | null; now?: Date }
) {
  const computed = await buildComputedFields(prisma, {
    category: item.category,
    dateAdded: item.dateAdded,
    opened: item.opened,
    openedAt: item.openedAt,
    customFreshDays: item.customFreshDays,
    previousExpiresAt: options?.previousExpiresAt ?? item.expiresAt,
    now: options?.now
  });

  return prisma.item.update({
    where: { id: item.id },
    data: {
      expiresAt: computed.expiresAt,
      daysRemaining: computed.daysRemaining,
      status: computed.status,
      confidence: computed.confidence
    }
  });
}

export async function trackEvent(
  prisma: PrismaClient,
  payload: {
    householdId: string;
    itemId?: string | null;
    userId?: string | null;
    type: "ITEM_OPENED" | "ITEM_CONSUMED" | "ITEM_EXPIRED" | "ITEM_ADDED";
    meta?: Prisma.InputJsonValue;
    createdAt?: Date;
  }
) {
  return prisma.analyticsEvent.create({
    data: {
      householdId: payload.householdId,
      itemId: payload.itemId,
      userId: payload.userId,
      type: payload.type,
      meta: payload.meta,
      createdAt: payload.createdAt
    }
  });
}

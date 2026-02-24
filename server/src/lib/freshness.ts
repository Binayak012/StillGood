import { ItemStatus } from "@prisma/client";
import { addUtcDays, dayDiffUtc, startOfUtcDay } from "./dates.js";

export interface FreshnessRuleInput {
  unopenedDays: number;
  openedDays: number;
}

export interface FreshnessInput {
  category: string;
  dateAdded: Date;
  opened?: boolean | null;
  openedAt?: Date | null;
  customFreshDays?: number | null;
  rule?: FreshnessRuleInput | null;
  previousExpiresAt?: Date | null;
  now?: Date;
}

export interface FreshnessResult {
  expiresAt: Date;
  daysRemaining: number;
  status: ItemStatus;
  confidence: number;
}

function clampToEarlier(a: Date, b: Date): Date {
  return a.getTime() < b.getTime() ? a : b;
}

function computeStatus(daysRemaining: number): ItemStatus {
  if (daysRemaining < 0) {
    return ItemStatus.EXPIRED;
  }
  if (daysRemaining <= 2) {
    return ItemStatus.USE_SOON;
  }
  return ItemStatus.FRESH;
}

function computeConfidence(category: string, hasRule: boolean, openedKnown: boolean): number {
  if (!hasRule || category.toLowerCase() === "other") {
    return 0.55;
  }
  return openedKnown ? 0.9 : 0.75;
}

export function calculateFreshness(input: FreshnessInput): FreshnessResult {
  const now = input.now ?? new Date();
  const openedKnown = input.opened === true || input.opened === false;
  const hasRule = Boolean(input.rule);

  let freshnessDays: number;
  if (typeof input.customFreshDays === "number") {
    freshnessDays = input.customFreshDays;
  } else if (input.rule) {
    const opened = input.opened === true;
    freshnessDays = opened ? input.rule.openedDays : input.rule.unopenedDays;
  } else {
    freshnessDays = 4;
  }

  const baseDate = input.opened === true && input.openedAt ? input.openedAt : input.dateAdded;
  let expiresAt = addUtcDays(startOfUtcDay(baseDate), freshnessDays);

  if (
    input.opened === true &&
    input.rule &&
    typeof input.customFreshDays !== "number" &&
    input.previousExpiresAt
  ) {
    expiresAt = clampToEarlier(input.previousExpiresAt, expiresAt);
  }

  const daysRemaining = dayDiffUtc(now, expiresAt);
  return {
    expiresAt,
    daysRemaining,
    status: computeStatus(daysRemaining),
    confidence: computeConfidence(input.category, hasRule, openedKnown)
  };
}

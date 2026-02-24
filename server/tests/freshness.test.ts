import { describe, expect, it } from "vitest";
import { calculateFreshness } from "../src/lib/freshness.js";

describe("freshness engine", () => {
  it("uses unopened category rules by default", () => {
    const result = calculateFreshness({
      category: "dairy",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: false,
      rule: { unopenedDays: 7, openedDays: 4 },
      now: new Date("2026-01-05T00:00:00.000Z")
    });

    expect(result.expiresAt.toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(result.daysRemaining).toBe(3);
    expect(result.status).toBe("FRESH");
    expect(result.confidence).toBe(0.9);
  });

  it("uses opened rules and marks use soon at threshold", () => {
    const result = calculateFreshness({
      category: "produce",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: true,
      openedAt: new Date("2026-01-03T00:00:00.000Z"),
      rule: { unopenedDays: 5, openedDays: 3 },
      now: new Date("2026-01-05T00:00:00.000Z")
    });

    expect(result.expiresAt.toISOString()).toBe("2026-01-06T00:00:00.000Z");
    expect(result.daysRemaining).toBe(1);
    expect(result.status).toBe("USE_SOON");
    expect(result.confidence).toBe(0.9);
  });

  it("prefers custom freshness days override", () => {
    const result = calculateFreshness({
      category: "meat",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: false,
      customFreshDays: 10,
      rule: { unopenedDays: 3, openedDays: 2 },
      now: new Date("2026-01-05T00:00:00.000Z")
    });

    expect(result.expiresAt.toISOString()).toBe("2026-01-11T00:00:00.000Z");
    expect(result.daysRemaining).toBe(6);
    expect(result.status).toBe("FRESH");
  });

  it("does not extend timeline when opened later", () => {
    const result = calculateFreshness({
      category: "dairy",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: true,
      openedAt: new Date("2026-01-06T00:00:00.000Z"),
      rule: { unopenedDays: 7, openedDays: 4 },
      previousExpiresAt: new Date("2026-01-08T00:00:00.000Z"),
      now: new Date("2026-01-06T00:00:00.000Z")
    });

    expect(result.expiresAt.toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(result.daysRemaining).toBe(2);
    expect(result.status).toBe("USE_SOON");
  });

  it("handles status thresholds and confidence fallbacks", () => {
    const expired = calculateFreshness({
      category: "other",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: null,
      now: new Date("2026-01-10T00:00:00.000Z")
    });
    const boundaryUseSoon = calculateFreshness({
      category: "produce",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: false,
      rule: { unopenedDays: 5, openedDays: 3 },
      now: new Date("2026-01-06T00:00:00.000Z")
    });
    const boundaryFresh = calculateFreshness({
      category: "produce",
      dateAdded: new Date("2026-01-01T00:00:00.000Z"),
      opened: false,
      rule: { unopenedDays: 5, openedDays: 3 },
      now: new Date("2026-01-03T00:00:00.000Z")
    });

    expect(expired.daysRemaining).toBeLessThan(0);
    expect(expired.status).toBe("EXPIRED");
    expect(expired.confidence).toBe(0.55);
    expect(boundaryUseSoon.daysRemaining).toBe(0);
    expect(boundaryUseSoon.status).toBe("USE_SOON");
    expect(boundaryFresh.daysRemaining).toBe(3);
    expect(boundaryFresh.status).toBe("FRESH");
  });
});

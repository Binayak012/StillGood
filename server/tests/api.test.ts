import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { app } from "../src/app.js";

async function resetDb() {
  await prisma.analyticsEvent.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.item.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();
  await prisma.freshnessRule.deleteMany();

  await prisma.freshnessRule.createMany({
    data: [
      { category: "dairy", unopenedDays: 7, openedDays: 4 },
      { category: "produce", unopenedDays: 5, openedDays: 3 },
      { category: "meat", unopenedDays: 3, openedDays: 2 },
      { category: "leftovers", unopenedDays: 4, openedDays: 2 }
    ]
  });
}

describe("auth and items api", () => {
  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers, logs in, and resolves /auth/me session", async () => {
    const agent = request.agent(app);

    const register = await agent.post("/api/auth/register").send({
      email: "test1@stillgood.local",
      password: "StrongPass123",
      name: "Test User"
    });

    expect(register.status).toBe(201);
    expect(register.body.user.email).toBe("test1@stillgood.local");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe("Test User");

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(204);

    const meAfterLogout = await agent.get("/api/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("blocks unauthorized item route access", async () => {
    const response = await request(app).get("/api/items");
    expect(response.status).toBe(401);
  });

  it("supports item lifecycle create/list/open/consume", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      email: "test2@stillgood.local",
      password: "StrongPass123",
      name: "Item Owner"
    });

    const createHousehold = await agent.post("/api/households").send({
      name: "Family"
    });
    expect(createHousehold.status).toBe(201);

    const createItem = await agent.post("/api/items").send({
      name: "Milk",
      category: "dairy",
      quantity: "1 carton",
      opened: false
    });
    expect(createItem.status).toBe(201);
    expect(createItem.body.item.status).toBeDefined();
    const itemId = createItem.body.item.id as string;

    const listActive = await agent.get("/api/items?status=active");
    expect(listActive.status).toBe(200);
    expect(listActive.body.items.length).toBe(1);

    const openItem = await agent.post(`/api/items/${itemId}/open`);
    expect(openItem.status).toBe(200);
    expect(openItem.body.item.opened).toBe(true);

    const consumeItem = await agent.post(`/api/items/${itemId}/consume`);
    expect(consumeItem.status).toBe(200);
    expect(consumeItem.body.item.archivedAt).toBeTruthy();

    const archived = await agent.get("/api/items?status=archived");
    expect(archived.status).toBe(200);
    expect(archived.body.items.length).toBe(1);
  });

  it("runs alerts manually and marks alert read", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      email: "test3@stillgood.local",
      password: "StrongPass123",
      name: "Alert User"
    });
    await agent.post("/api/households").send({ name: "Alerts Home" });

    const staleDate = new Date();
    staleDate.setUTCDate(staleDate.getUTCDate() - 2);

    const created = await agent.post("/api/items").send({
      name: "Spinach",
      category: "produce",
      quantity: "1 bag",
      dateAdded: staleDate.toISOString(),
      opened: true,
      customFreshDays: 2
    });
    expect(created.status).toBe(201);

    const run = await agent.post("/api/alerts/run").send({});
    expect(run.status).toBe(200);
    expect(run.body.result.scannedItems).toBeGreaterThan(0);

    const alerts = await agent.get("/api/alerts");
    expect(alerts.status).toBe(200);
    expect(alerts.body.alerts.length).toBeGreaterThan(0);

    const unread = alerts.body.alerts.find((alert: { readAt: string | null }) => !alert.readAt);
    expect(unread).toBeTruthy();
    if (!unread) {
      throw new Error("Expected unread alert");
    }

    const marked = await agent.post(`/api/alerts/${unread.id}/read`).send({});
    expect(marked.status).toBe(200);
    expect(marked.body.alert.readAt).toBeTruthy();
  });
});

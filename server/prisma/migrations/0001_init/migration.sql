PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "householdName" TEXT,
  "prefsEmail" INTEGER NOT NULL DEFAULT 0,
  "prefsInApp" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Household" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "HouseholdMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('OWNER', 'MEMBER')),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Item" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "dateAdded" DATETIME NOT NULL,
  "opened" INTEGER,
  "openedAt" DATETIME,
  "customFreshDays" INTEGER,
  "expiresAt" DATETIME NOT NULL,
  "daysRemaining" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'FRESH' CHECK ("status" IN ('FRESH', 'USE_SOON', 'EXPIRED')),
  "confidence" REAL NOT NULL DEFAULT 0.55,
  "archivedAt" DATETIME,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FreshnessRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "category" TEXT NOT NULL UNIQUE,
  "unopenedDays" INTEGER NOT NULL,
  "openedDays" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Alert" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('USE_SOON', 'EXPIRED')),
  "message" TEXT NOT NULL,
  "readAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "alertId" TEXT,
  "channel" TEXT NOT NULL CHECK ("channel" IN ('EMAIL', 'IN_APP')),
  "status" TEXT NOT NULL CHECK ("status" IN ('QUEUED', 'SENT', 'SKIPPED')),
  "detail" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "itemId" TEXT,
  "userId" TEXT,
  "type" TEXT NOT NULL CHECK ("type" IN ('ITEM_OPENED', 'ITEM_CONSUMED', 'ITEM_EXPIRED', 'ITEM_ADDED')),
  "meta" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "HouseholdMember_householdId_userId_key"
  ON "HouseholdMember" ("householdId", "userId");

CREATE INDEX IF NOT EXISTS "HouseholdMember_userId_idx"
  ON "HouseholdMember" ("userId");

CREATE INDEX IF NOT EXISTS "Item_householdId_status_idx"
  ON "Item" ("householdId", "status");

CREATE INDEX IF NOT EXISTS "Item_householdId_archivedAt_idx"
  ON "Item" ("householdId", "archivedAt");

CREATE INDEX IF NOT EXISTS "Alert_userId_createdAt_idx"
  ON "Alert" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Alert_itemId_type_readAt_idx"
  ON "Alert" ("itemId", "type", "readAt");

CREATE INDEX IF NOT EXISTS "NotificationLog_userId_createdAt_idx"
  ON "NotificationLog" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_householdId_type_createdAt_idx"
  ON "AnalyticsEvent" ("householdId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_itemId_idx"
  ON "AnalyticsEvent" ("itemId");

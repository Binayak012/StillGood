import { AlertType, AnalyticsEventType, NotificationChannel, NotificationStatus, PrismaClient } from "@prisma/client";
import { refreshAndPersistItem, trackEvent } from "../items/items.service.js";

function alertMessage(name: string, type: AlertType): string {
  if (type === AlertType.EXPIRED) {
    return `${name} has expired.`;
  }
  return `${name} should be used soon.`;
}

export async function runAlertSweep(prisma: PrismaClient) {
  const households = await prisma.household.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              prefsEmail: true,
              prefsInApp: true
            }
          }
        }
      },
      items: {
        where: { archivedAt: null }
      }
    }
  });

  const stats = {
    scannedItems: 0,
    alertsCreated: 0
  };

  for (const household of households) {
    for (const item of household.items) {
      stats.scannedItems += 1;
      const refreshed = await refreshAndPersistItem(prisma, item);
      if (refreshed.status !== "USE_SOON" && refreshed.status !== "EXPIRED") {
        continue;
      }

      if (refreshed.status === "EXPIRED") {
        const existingExpiredEvent = await prisma.analyticsEvent.findFirst({
          where: {
            householdId: household.id,
            itemId: refreshed.id,
            type: AnalyticsEventType.ITEM_EXPIRED
          }
        });

        if (!existingExpiredEvent) {
          await trackEvent(prisma, {
            householdId: household.id,
            itemId: refreshed.id,
            type: "ITEM_EXPIRED"
          });
        }
      }

      const alertType = refreshed.status === "EXPIRED" ? AlertType.EXPIRED : AlertType.USE_SOON;
      for (const member of household.members) {
        const existingUnread = await prisma.alert.findFirst({
          where: {
            userId: member.userId,
            itemId: refreshed.id,
            type: alertType,
            readAt: null
          }
        });

        if (existingUnread) {
          continue;
        }

        const alert = await prisma.alert.create({
          data: {
            householdId: household.id,
            userId: member.userId,
            itemId: refreshed.id,
            type: alertType,
            message: alertMessage(refreshed.name, alertType)
          }
        });

        stats.alertsCreated += 1;

        await prisma.notificationLog.create({
          data: {
            userId: member.userId,
            alertId: alert.id,
            channel: NotificationChannel.IN_APP,
            status: member.user.prefsInApp ? NotificationStatus.SENT : NotificationStatus.SKIPPED,
            detail: member.user.prefsInApp
              ? "In-app alert created."
              : "Skipped in-app alert because preference is disabled."
          }
        });

        await prisma.notificationLog.create({
          data: {
            userId: member.userId,
            alertId: alert.id,
            channel: NotificationChannel.EMAIL,
            status: member.user.prefsEmail ? NotificationStatus.SENT : NotificationStatus.SKIPPED,
            detail: member.user.prefsEmail
              ? `Simulated email sent for ${alert.type} alert.`
              : "Skipped email because preference is disabled."
          }
        });
      }
    }
  }

  return stats;
}

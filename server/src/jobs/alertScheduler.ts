import { PrismaClient } from "@prisma/client";
import { runAlertSweep } from "../modules/alerts/alerts.service.js";

let timer: NodeJS.Timeout | null = null;

export function startAlertScheduler(prisma: PrismaClient, intervalMs = 60_000): void {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    runAlertSweep(prisma).catch((error) => {
      console.error("Alert sweep failed:", error);
    });
  }, intervalMs);
}

export function stopAlertScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db.js";
import { startAlertScheduler, stopAlertScheduler } from "./jobs/alertScheduler.js";

const server = app.listen(env.PORT, () => {
  console.log(`StillGood server listening on http://localhost:${env.PORT}`);
});

startAlertScheduler(prisma);

async function shutdown() {
  stopAlertScheduler();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

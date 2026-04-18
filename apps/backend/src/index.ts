import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { BaileysSessionManager } from "./services/baileys/session-manager";
import { registerCronJobs } from "./services/cron";
import { registerMessageQueueWorker } from "./services/message-queue";
import { seedDefaults } from "./services/seed";
import { createSocketServer } from "./services/socket";

async function main() {
  await seedDefaults();

  let sessionManager: BaileysSessionManager;
  const io = createSocketServer((user) => {
    void sessionManager?.replayConnectionState(user.id);
  });
  sessionManager = new BaileysSessionManager(io);
  const app = createApp(sessionManager, io);
  const server = http.createServer(app);

  io.attach(server);

  registerMessageQueueWorker(sessionManager);

  const restorableUsers = await prisma.user.findMany({
    where: {
      needsReauth: false,
    },
    select: { id: true },
  });

  await Promise.all(
    restorableUsers.map(async (user) => {
      try {
        await sessionManager.initialize(user.id);
      } catch (error) {
        console.error(`[startup] failed to restore WhatsApp session for user ${user.id}`, error);
      }
    }),
  );

  registerCronJobs(sessionManager);

  server.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

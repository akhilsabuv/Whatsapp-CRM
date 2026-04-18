import { Boom } from "@hapi/boom";
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import fs from "fs/promises";
import path from "path";
import pino from "pino";
import type { AppSocketServer } from "../socket";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { invalidateCrmCache } from "../cache";

type ManagedSession = {
  sock: ReturnType<typeof makeWASocket>;
  jid?: string;
};

export class BaileysSessionManager {
  private sessions = new Map<number, ManagedSession>();
  private lastQrByUserId = new Map<number, string>();
  private resettingUsers = new Set<number>();
  private initializingUsers = new Map<number, Promise<ManagedSession | undefined>>();
  private logger = pino({ level: "silent" });

  constructor(private readonly io: AppSocketServer) {}

  async initialize(userId: number) {
    const inFlight = this.initializingUsers.get(userId);
    if (inFlight) {
      return inFlight;
    }

    const run = this.initializeInternal(userId);
    this.initializingUsers.set(userId, run);

    try {
      return await run;
    } finally {
      this.initializingUsers.delete(userId);
    }
  }

  private async initializeInternal(userId: number) {
    if (this.sessions.has(userId)) {
      return this.sessions.get(userId);
    }

    await fs.mkdir(path.resolve(env.SESSIONS_DIR), { recursive: true });
    const sessionDir = path.resolve(env.SESSIONS_DIR, `user_${userId}`);
    await fs.mkdir(sessionDir, { recursive: true });
    console.log(`[baileys] initializing session for user ${userId} in ${sessionDir}`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu("Chrome"),
      logger: this.logger,
      printQRInTerminal: false,
      syncFullHistory: false,
      version,
    });

    const managed: ManagedSession = { sock };
    this.sessions.set(userId, managed);

    sock.ev.on("connection.update", async (update) => {
      console.log(`[baileys] connection.update user=${userId}`, {
        connection: update.connection,
        hasQr: Boolean(update.qr),
        isNewLogin: update.isNewLogin,
        receivedPendingNotifications: update.receivedPendingNotifications,
      });

      if (update.qr) {
        this.lastQrByUserId.set(userId, update.qr);
        this.io.to(`user:${userId}`).emit("whatsapp:qr", {
          userId,
          qr: update.qr,
        });
        console.log(`[baileys] qr emitted for user ${userId}`);
      }

      if (update.connection === "open") {
        managed.jid = sock.user?.id;
        await prisma.user.update({
          where: { id: userId },
          data: {
            whatsappConnected: true,
            needsReauth: false,
          },
        });
        await invalidateCrmCache();
        this.lastQrByUserId.delete(userId);

        this.io.to(`user:${userId}`).emit("whatsapp:connected", { userId });
        console.log(`[baileys] session connected for user ${userId}`);
      }

      if (update.connection === "close") {
        const error = update.lastDisconnect?.error as Boom | undefined;
        const statusCode = error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const message = error?.message || "Unknown disconnect";
        console.error(`[baileys] session closed for user ${userId}: ${message}`);

        await prisma.user.update({
          where: { id: userId },
          data: {
            whatsappConnected: false,
            needsReauth: true,
          },
        });
        await invalidateCrmCache();

        this.io.to(`user:${userId}`).emit("whatsapp:disconnected", {
          userId,
          loggedOut,
          message,
        });

        this.sessions.delete(userId);

        if (this.resettingUsers.has(userId)) {
          console.log(`[baileys] reset acknowledged for user ${userId}`);
          this.resettingUsers.delete(userId);
          return;
        }

        if (!loggedOut) {
          void this.initialize(userId);
        }
      }
    });

    sock.ev.on("creds.update", async () => {
      console.log(`[baileys] creds updated for user ${userId}`);
      await saveCreds();
    });

    return managed;
  }

  async reset(userId: number) {
    this.resettingUsers.add(userId);
    const existing = this.sessions.get(userId);

    if (existing) {
      try {
        existing.sock.end(new Error("Session reset requested"));
      } catch {
        // Ignore teardown errors and continue with a clean re-init.
      }
      this.sessions.delete(userId);
    }

    this.lastQrByUserId.delete(userId);

    const sessionDir = path.resolve(env.SESSIONS_DIR, `user_${userId}`);
    await fs.mkdir(path.resolve(env.SESSIONS_DIR), { recursive: true });
    await fs.rm(sessionDir, { recursive: true, force: true });
    await prisma.user.update({
      where: { id: userId },
      data: {
        whatsappConnected: false,
        needsReauth: true,
      },
    });
    await invalidateCrmCache();
  }

  async initializeForUserIfNeeded(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, needsReauth: true },
    });

    if (!user) {
      return null;
    }

    return this.initialize(user.id);
  }

  async replayConnectionState(userId: number) {
    const qr = this.lastQrByUserId.get(userId);

    if (qr) {
      this.io.to(`user:${userId}`).emit("whatsapp:qr", {
        userId,
        qr,
      });
    }
  }

  async getConnectionState(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        whatsappConnected: true,
        needsReauth: true,
      },
    });

    return {
      qr: this.lastQrByUserId.get(userId) ?? null,
      whatsappConnected: user?.whatsappConnected ?? false,
      needsReauth: user?.needsReauth ?? true,
    };
  }

  private async waitForSessionJid(
    userId: number,
    timeoutMs = 15000,
    intervalMs = 250,
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const session = this.sessions.get(userId);
      const jid = session?.jid ?? session?.sock.user?.id;

      if (jid) {
        return { session, jid };
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return {
      session: this.sessions.get(userId),
      jid: this.sessions.get(userId)?.jid ?? this.sessions.get(userId)?.sock.user?.id,
    };
  }

  async sendText(userId: number, text: string, leadId?: number) {
    try {
      await this.initialize(userId);
      const { session, jid } = await this.waitForSessionJid(userId);

      if (!session) {
        return false;
      }

      if (!jid) {
        console.error(`[baileys] sendText aborted for user ${userId}: session not ready`);
        return false;
      }

      await session.sock.sendMessage(jid, { text });

      await prisma.whatsAppMessage.create({
        data: {
          leadId,
          userId,
          content: text,
        },
      });

      return true;
    } catch (error) {
      console.error(`[baileys] sendText failed for user ${userId}`, error);
      return false;
    }
  }

  async sendTextToPhone(senderUserId: number, phone: string, text: string, leadId?: number) {
    try {
      await this.initialize(senderUserId);
      const { session, jid } = await this.waitForSessionJid(senderUserId);

      if (!session) {
        return false;
      }

      if (!jid) {
        console.error(
          `[baileys] sendTextToPhone aborted for user ${senderUserId}: session not ready`,
        );
        return false;
      }

      const normalizedPhone = phone.replace(/[^\d]/g, "");

      if (!normalizedPhone) {
        console.error(
          `[baileys] sendTextToPhone aborted for user ${senderUserId}: invalid phone`,
        );
        return false;
      }

      await session.sock.sendMessage(`${normalizedPhone}@s.whatsapp.net`, { text });

      await prisma.whatsAppMessage.create({
        data: {
          leadId,
          userId: senderUserId,
          content: text,
        },
      });

      return true;
    } catch (error) {
      console.error(
        `[baileys] sendTextToPhone failed for user ${senderUserId} -> ${phone}`,
        error,
      );
      return false;
    }
  }
}

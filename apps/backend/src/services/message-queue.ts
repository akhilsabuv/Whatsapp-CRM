import { Job, Queue, Worker } from "bullmq";
import { env } from "../config/env";
import type { BaileysSessionManager } from "./baileys/session-manager";

type SendSelfMessageJob = {
  type: "self";
  userId: number;
  text: string;
  leadId?: number;
};

type SendPhoneMessageJob = {
  type: "phone";
  senderUserId: number;
  phone: string;
  text: string;
  leadId?: number;
};

type OutboundMessageJob = SendSelfMessageJob | SendPhoneMessageJob;

const QUEUE_NAME = "outbound-whatsapp";
const queueConnection = {
  url: env.REDIS_URL,
};

const globalForQueue = globalThis as unknown as {
  outboundQueue?: Queue<OutboundMessageJob, void, string>;
  outboundWorker?: Worker<OutboundMessageJob, void, string>;
};

function getQueue() {
  if (!globalForQueue.outboundQueue) {
    globalForQueue.outboundQueue = new Queue<OutboundMessageJob, void, string>(QUEUE_NAME, {
      connection: queueConnection,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });
  }

  return globalForQueue.outboundQueue;
}

async function processJob(
  job: Job<OutboundMessageJob>,
  sessionManager: BaileysSessionManager,
) {
  if (job.data.type === "self") {
    const sent = await sessionManager.sendText(job.data.userId, job.data.text, job.data.leadId);

    if (!sent) {
      throw new Error(`Session not ready for user ${job.data.userId}`);
    }

    return;
  }

  const sent = await sessionManager.sendTextToPhone(
    job.data.senderUserId,
    job.data.phone,
    job.data.text,
    job.data.leadId,
  );

  if (!sent) {
    throw new Error(`Session not ready for sender ${job.data.senderUserId}`);
  }
}

export function registerMessageQueueWorker(sessionManager: BaileysSessionManager) {
  if (globalForQueue.outboundWorker) {
    return globalForQueue.outboundWorker;
  }

  globalForQueue.outboundWorker = new Worker<OutboundMessageJob, void, string>(
    QUEUE_NAME,
    async (job: Job<OutboundMessageJob>) => {
      await processJob(job, sessionManager);
    },
    {
      connection: queueConnection,
      concurrency: 5,
    },
  );

  globalForQueue.outboundWorker.on("completed", (job: Job<OutboundMessageJob>) => {
    console.log(`[queue] outbound job ${job.id} completed`);
  });

  globalForQueue.outboundWorker.on(
    "failed",
    (job: Job<OutboundMessageJob> | undefined, error: Error) => {
      console.error(`[queue] outbound job ${job?.id} failed`, error);
    },
  );

  return globalForQueue.outboundWorker;
}

export async function enqueueSelfMessage(userId: number, text: string, leadId?: number) {
  const queue = getQueue();
  await queue.add("send-self", { type: "self", userId, text, leadId });
}

export async function enqueuePhoneMessage(
  senderUserId: number,
  phone: string,
  text: string,
  leadId?: number,
) {
  const queue = getQueue();
  await queue.add("send-phone", { type: "phone", senderUserId, phone, text, leadId });
}

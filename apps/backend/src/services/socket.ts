import type { JwtUser } from "../utils/auth";
import { verifyToken } from "../utils/auth";
import { Server } from "socket.io";

export type AppSocketServer = Server;

export function projectRoom(projectId: number) {
  return `project:${projectId}`;
}

export function createSocketServer(onAuthenticatedConnection?: (user: JwtUser) => void) {
  const io = new Server({
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Missing auth token"));
    }

    try {
      const user = verifyToken(token) as JwtUser;
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as JwtUser;
    socket.join(`user:${user.id}`);

    socket.on("project:subscribe", (payload: { projectId?: number }) => {
      if (typeof payload?.projectId !== "number") {
        return;
      }

      socket.join(projectRoom(payload.projectId));
    });

    socket.on("project:unsubscribe", (payload: { projectId?: number }) => {
      if (typeof payload?.projectId !== "number") {
        return;
      }

      socket.leave(projectRoom(payload.projectId));
    });

    onAuthenticatedConnection?.(user);
  });

  return io;
}

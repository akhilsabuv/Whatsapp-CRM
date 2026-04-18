import type { JwtUser } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtUser;
    }
  }
}

export {};

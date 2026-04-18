import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtUser = {
  id: number;
  email: string;
  role: "ADMIN" | "USER";
};

export function signToken(user: JwtUser) {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}

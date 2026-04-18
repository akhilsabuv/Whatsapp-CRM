import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

export async function seedDefaults() {
  const users = [
    {
      email: env.DEFAULT_ADMIN_EMAIL,
      password: env.DEFAULT_ADMIN_PASSWORD,
      role: UserRole.ADMIN,
    },
    {
      email: env.DEFAULT_USER_EMAIL,
      password: env.DEFAULT_USER_PASSWORD,
      role: UserRole.USER,
    },
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.user.create({
      data: {
        email: user.email,
        passwordHash: await bcrypt.hash(user.password, 10),
        role: user.role,
        needsReauth: true,
      },
    });
  }
}

import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { signToken } from "../utils/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: "Invalid login payload" });
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(result.data.password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      whatsappConnected: user.whatsappConnected,
      needsReauth: user.needsReauth,
      timeZone: user.timeZone,
      currency: user.currency,
      language: user.language,
      briefingTime: user.briefingTime,
      firstReminderMinutes: user.firstReminderMinutes,
      secondReminderMinutes: user.secondReminderMinutes,
      smtpHost: user.smtpHost,
      smtpPort: user.smtpPort,
      smtpSecure: user.smtpSecure,
      smtpUsername: user.smtpUsername,
      smtpPassword: user.smtpPassword,
      smtpFromEmail: user.smtpFromEmail,
      smtpFromName: user.smtpFromName,
    },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      role: true,
      whatsappConnected: true,
      needsReauth: true,
      timeZone: true,
      currency: true,
      language: true,
      briefingTime: true,
      firstReminderMinutes: true,
      secondReminderMinutes: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUsername: true,
      smtpPassword: true,
      smtpFromEmail: true,
      smtpFromName: true,
    },
  });

  return res.json({ user });
});

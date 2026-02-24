import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken
} from "../../middleware/auth.js";

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
    householdName: z.string().min(2).max(80).optional(),
    prefsEmail: z.boolean().optional(),
    prefsInApp: z.boolean().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  params: z.object({}),
  query: z.object({})
});

const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(80).optional(),
      householdName: z.string().max(80).nullable().optional(),
      prefsEmail: z.boolean().optional(),
      prefsInApp: z.boolean().optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be updated"
    }),
  params: z.object({}),
  query: z.object({})
});

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  householdName: string | null;
  prefsEmail: boolean;
  prefsInApp: boolean;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    householdName: user.householdName,
    prefsEmail: user.prefsEmail,
    prefsInApp: user.prefsInApp,
    createdAt: user.createdAt
  };
}

export const authRouter = Router();

authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, householdName, prefsEmail, prefsInApp } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "EMAIL_IN_USE", "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        householdName,
        prefsEmail: prefsEmail ?? false,
        prefsInApp: prefsInApp ?? true
      }
    });

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res.status(201).json({
      user: sanitizeUser(user)
    });
  })
);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res.json({
      user: sanitizeUser(user)
    });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.status(204).send();
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const membership = await prisma.householdMember.findFirst({
      where: { userId: req.user!.id },
      include: { household: true },
      orderBy: { createdAt: "asc" }
    });

    res.json({
      user: sanitizeUser(req.user!),
      household: membership
        ? {
            id: membership.household.id,
            name: membership.household.name,
            inviteCode: membership.household.inviteCode,
            role: membership.role
          }
        : null
    });
  })
);

authRouter.patch(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: req.body.name,
        householdName: req.body.householdName,
        prefsEmail: req.body.prefsEmail,
        prefsInApp: req.body.prefsInApp
      }
    });

    res.json({ user: sanitizeUser(updated) });
  })
);

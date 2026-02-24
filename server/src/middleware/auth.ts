import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

interface TokenPayload {
  userId: string;
}

export const AUTH_COOKIE_NAME = "stillgood_token";

export function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax"
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        householdName: true,
        prefsEmail: true,
        prefsInApp: true
      }
    });

    if (!user) {
      next(new AppError(401, "INVALID_SESSION", "Session is invalid"));
      return;
    }

    req.user = user;
    next();
  } catch (_error) {
    next(new AppError(401, "INVALID_TOKEN", "Token is invalid or expired"));
  }
}

export async function requireHousehold(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
    return;
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) {
    next(new AppError(403, "HOUSEHOLD_REQUIRED", "Join or create a household first"));
    return;
  }

  req.membership = { householdId: membership.householdId, role: membership.role };
  next();
}

export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (!req.membership || req.membership.role !== "OWNER") {
    next(new AppError(403, "OWNER_REQUIRED", "Owner access required"));
    return;
  }
  next();
}

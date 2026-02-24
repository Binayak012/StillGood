import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { requireAuth, requireHousehold, requireOwner } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function ensureNoMembership(userId: string): Promise<void> {
  const existing = await prisma.householdMember.findFirst({ where: { userId } });
  if (existing) {
    throw new AppError(400, "ALREADY_IN_HOUSEHOLD", "User already belongs to a household");
  }
}

const createHouseholdSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80)
  }),
  params: z.object({}),
  query: z.object({})
});

const joinHouseholdSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(4).max(24)
  }),
  params: z.object({}),
  query: z.object({})
});

const removeMemberSchema = z.object({
  body: z.object({}),
  params: z.object({
    userId: z.string().min(1)
  }),
  query: z.object({})
});

export const householdsRouter = Router();

householdsRouter.post(
  "/",
  requireAuth,
  validate(createHouseholdSchema),
  asyncHandler(async (req, res) => {
    await ensureNoMembership(req.user!.id);
    const inviteCode = generateInviteCode();

    const household = await prisma.household.create({
      data: {
        name: req.body.name,
        inviteCode,
        members: {
          create: {
            userId: req.user!.id,
            role: "OWNER"
          }
        }
      }
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        householdName: req.body.name
      }
    });

    res.status(201).json({ household });
  })
);

householdsRouter.post(
  "/join",
  requireAuth,
  validate(joinHouseholdSchema),
  asyncHandler(async (req, res) => {
    await ensureNoMembership(req.user!.id);
    const inviteCode = req.body.inviteCode.toUpperCase();
    const household = await prisma.household.findUnique({ where: { inviteCode } });
    if (!household) {
      throw new AppError(404, "INVALID_INVITE_CODE", "Invite code not found");
    }

    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: req.user!.id,
        role: "MEMBER"
      }
    });

    res.status(201).json({ household });
  })
);

householdsRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const membership = await prisma.householdMember.findFirst({
      where: { userId: req.user!.id },
      include: { household: true },
      orderBy: { createdAt: "asc" }
    });

    if (!membership) {
      res.json({ household: null });
      return;
    }

    res.json({
      household: {
        id: membership.household.id,
        name: membership.household.name,
        inviteCode: membership.household.inviteCode,
        role: membership.role
      }
    });
  })
);

householdsRouter.post(
  "/invite",
  requireAuth,
  requireHousehold,
  requireOwner,
  asyncHandler(async (req, res) => {
    const inviteCode = generateInviteCode();
    const household = await prisma.household.update({
      where: { id: req.membership!.householdId },
      data: { inviteCode }
    });

    res.json({
      inviteCode: household.inviteCode
    });
  })
);

householdsRouter.get(
  "/members",
  requireAuth,
  requireHousehold,
  asyncHandler(async (req, res) => {
    const members = await prisma.householdMember.findMany({
      where: { householdId: req.membership!.householdId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role
      }))
    });
  })
);

householdsRouter.delete(
  "/members/:userId",
  requireAuth,
  requireHousehold,
  requireOwner,
  validate(removeMemberSchema),
  asyncHandler(async (req, res) => {
    if (req.params.userId === req.user!.id) {
      throw new AppError(400, "INVALID_MEMBER_REMOVAL", "Owner cannot remove themselves");
    }

    await prisma.householdMember.deleteMany({
      where: {
        householdId: req.membership!.householdId,
        userId: req.params.userId
      }
    });

    res.status(204).send();
  })
);

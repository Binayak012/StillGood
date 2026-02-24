import type { MemberRole, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "name" | "householdName" | "prefsEmail" | "prefsInApp">;
      membership?: {
        householdId: string;
        role: MemberRole;
      };
    }
  }
}

export {};

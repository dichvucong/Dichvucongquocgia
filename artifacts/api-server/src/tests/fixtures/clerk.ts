import type { Request } from "express";

// Identity is injected by the test harness, not by production headers or tokens.
export const identities = {
  admin: { publicMetadata: { role: "admin" }, emailAddresses: [] },
  member: { publicMetadata: {}, unsafeMetadata: { role: "admin" }, emailAddresses: [] },
  verified: {
    publicMetadata: {},
    emailAddresses: [{ emailAddress: "allowed@example.invalid", verification: { status: "verified" } }],
  },
  unverified: {
    publicMetadata: {},
    emailAddresses: [{ emailAddress: "allowed@example.invalid", verification: { status: "unverified" } }],
  },
};
export type Identity = keyof typeof identities | "unavailable";
export const authRequests = new WeakMap<Request, Identity>();
export const clerkCalls: string[] = [];

export function getAuth(req: Request) {
  return { userId: authRequests.get(req) ?? null };
}

export const clerkClient = {
  users: {
    async getUser(userId: string) {
      clerkCalls.push(userId);
      if (userId === "unavailable") throw new Error("Simulated identity provider outage");
      const user = identities[userId as keyof typeof identities];
      if (!user) throw new Error("Unknown synthetic identity");
      return user;
    },
  },
};

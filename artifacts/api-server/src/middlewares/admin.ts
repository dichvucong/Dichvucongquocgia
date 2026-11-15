import { clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";

export function adminConfigured() {
  return Boolean(process.env.ADMIN_EMAILS?.trim());
}

export async function isAdministrator(req: Request): Promise<boolean> {
  const userId = getAuth(req).userId;
  if (!userId) return false;
  const user = await clerkClient.users.getUser(userId);
  // Metadata is server-owned; an ordinary user cannot edit publicMetadata.
  if (user.publicMetadata.role === "admin") return true;
  const allowed = new Set((process.env.ADMIN_EMAILS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
  return user.emailAddresses.some(e => e.verification?.status === "verified" && allowed.has(e.emailAddress.toLowerCase()));
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Vui lòng đăng nhập." }); return;
  }
  try {
    if (!await isAdministrator(req)) {
      res.status(403).json({ error: "Tài khoản chưa được cấp quyền quản trị." }); return;
    }
    next();
  } catch {
    req.log.error("Unable to verify administrator access");
    res.status(503).json({ error: "Chưa xác minh được quyền truy cập. Vui lòng thử lại." });
  }
};

export const sameOriginMutation: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  const rawHost = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  try {
    if (!origin || new URL(origin).host !== rawHost) {
      res.status(403).json({ error: "Nguồn yêu cầu không hợp lệ." }); return;
    }
  } catch {
    res.status(403).json({ error: "Nguồn yêu cầu không hợp lệ." }); return;
  }
  next();
};

export const adminLimiter = rateLimit({
  windowMs: 60_000, limit: 100,
  standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: req => getAuth(req).userId ?? "anonymous-admin",
  message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau một phút." },
});

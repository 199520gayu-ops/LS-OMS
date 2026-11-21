import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "./models";
export interface AuthUser { id: string; name: string; role: Role }
export type AuthReq = Request & { user?: AuthUser };
const secret = () => process.env.JWT_SECRET as string;
export const sign = (u: AuthUser) => jwt.sign(u, secret(), { expiresIn: "12h" });
export function requireAuth(req: AuthReq, res: Response, next: NextFunction) {
  const t = req.headers.authorization?.replace("Bearer ", "");
  if (!t) return res.status(401).json({ message: "Not authenticated" });
  try { req.user = jwt.verify(t, secret()) as AuthUser; next(); }
  catch { res.status(401).json({ message: "Session expired" }); }
}
export const allow = (...roles: Role[]) => (req: AuthReq, res: Response, next: NextFunction) =>
  roles.includes(req.user!.role) ? next() : res.status(403).json({ message: "Forbidden" });

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { forbidden, unauthorized } from "./http";

export const AUTH_COOKIE = "vrs_token";
const TOKEN_TTL = "30d";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function signToken(userId: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret());
}

export async function setAuthCookie(token: string) {
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookie() {
  (await cookies()).delete(AUTH_COOKIE);
}

/** Reads the session from the cookie (web) or the Authorization header (mobile). */
export async function currentUser(): Promise<User | null> {
  const auth = (await headers()).get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(...roles: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user) throw unauthorized();
  if (roles.length && !roles.includes(user.role)) throw forbidden();
  return user;
}

export async function requireSidekick() {
  const user = await requireUser("SIDEKICK");
  const profile = await db.sidekickProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw forbidden("Sidekick profile missing");
  return { user, profile };
}

export function publicUser(u: User) {
  const { passwordHash: _pw, ...rest } = u;
  return rest;
}

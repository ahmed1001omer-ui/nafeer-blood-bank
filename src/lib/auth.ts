import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { permissionsForUser, type SessionUser } from "./rbac";

export type { SessionUser };

const COOKIE_NAME = "bbms_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "bbms-local-dev-secret-change-in-production-please",
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser, remember: boolean) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sessionUser = payload.user as SessionUser | undefined;
    if (!sessionUser || !Number.isInteger(sessionUser.id)) return null;

    // Re-read the account on each server-side session check so deactivation,
    // role changes, and permission changes take effect for existing sessions.
    const [account] = await db.select().from(users).where(eq(users.id, sessionUser.id));
    if (!account?.active) return null;
    return {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      permissions: permissionsForUser(account.role, account.permissions),
    };
  } catch {
    return null;
  }
}

export async function authenticate(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const cleanUsername = username.trim().toLowerCase();
  const [account] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, username.trim()),
        sql`LOWER(${users.username}) = ${cleanUsername}`
      )
    );
  if (!account || !account.active) return null;
  const ok = await verifyPassword(password, account.passwordHash);
  if (!ok) return null;

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, account.id));

  return {
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    permissions: permissionsForUser(account.role, account.permissions),
  };
}

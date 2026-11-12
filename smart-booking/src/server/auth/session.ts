import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminUser } from "@prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { DomainError } from "../errors";
import { randomToken, safeEqual, sha256 } from "../security/crypto";

export const SESSION_COOKIE = "sb_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h
const BCRYPT_ROUNDS = 12;

export const passwordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .max(200)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Incluye letras y números");

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

// Hash ficticio para igualar tiempos cuando el email no existe (evita enumeración de usuarios).
const DUMMY_HASH = "$2b$12$afGezdw85kd/dTSxr2meous6VVFOAMlrf2IYa7FS6aCtp0XwomrwO";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export async function verifyCredentials(email: string, password: string): Promise<AdminUser | null> {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  return admin && ok ? admin : null;
}

export async function createSession(adminId: string, meta: { ipHash?: string; userAgent?: string }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.adminSession.create({
    data: { tokenHash: sha256(token), adminId, expiresAt, ipHash: meta.ipHash, userAgent: meta.userAgent?.slice(0, 300) },
  });
  await prisma.adminUser.update({ where: { id: adminId }, data: { lastLoginAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production" || env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: sha256(token) }, include: { admin: true } });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.admin;
}

/** Para Server Components / Server Actions del panel: redirige al login si no hay sesión. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Para route handlers: lanza 401. */
export async function requireAdminApi(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new DomainError("UNAUTHORIZED", "No autorizado", 401);
  return admin;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function adminExists(): Promise<boolean> {
  return (await prisma.adminUser.count()) > 0;
}

export function checkSetupToken(token: string): boolean {
  const expected = env().SETUP_TOKEN;
  return Boolean(expected) && safeEqual(token, expected!);
}

export async function purgeExpiredSessions() {
  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

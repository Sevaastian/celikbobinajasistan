"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { IP_LIMIT, USER_LIMIT, clearAttempts, lockedMinutes, loginKeys, recordFailure, type Executor } from "@/lib/login-guard";

function clientIp() {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "bilinmiyor";
}
const lockMessage = (minutes: number) =>
  `Çok fazla hatalı deneme yapıldı. Lütfen ${minutes} dakika sonra tekrar deneyin.`;

const loginSchema = z.object({
  username: z.string().trim().min(1, "Kullanıcı adı gerekli."),
  password: z.string().min(1, "Şifre gerekli."),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const guard = getDb() as unknown as Executor;
  const keys = loginKeys(parsed.data.username, clientIp());
  const waiting = await lockedMinutes(guard, [keys.user, keys.ip]);
  if (waiting) return { error: lockMessage(waiting) };

  const [user] = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, parsed.data.username))
    .limit(1);

  // Kullanıcı yoksa da hash karşılaştırması yapılır (zamanlama farkını azaltmak için).
  const dummy = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5W5r0nVY7r1m3gq3k6S0p8yV1uYk2Wy";
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? dummy);
  if (!user || !user.active || !ok) {
    const [byUser, byIp] = await Promise.all([
      recordFailure(guard, keys.user, USER_LIMIT),
      recordFailure(guard, keys.ip, IP_LIMIT),
    ]);
    const locked = Math.max(byUser ?? 0, byIp ?? 0);
    return { error: locked ? lockMessage(locked) : "Kullanıcı adı veya şifre hatalı." };
  }
  await clearAttempts(guard, keys.user);

  const token = await signSession({ uid: user.id, name: user.fullName, role: user.role });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  await logActivity(user.id, "giris", "kullanici", user.id);
  const next = formData.get("sonra");
  redirect(typeof next === "string" && /^\/is-emirleri\/\d+(\/bilgi)?$/.test(next) ? next : "/");
}

export async function logoutAction() {
  const session = await getSession();
  cookies().delete(SESSION_COOKIE);
  if (session) await logActivity(session.uid, "cikis", "kullanici", session.uid);
  redirect("/giris");
}

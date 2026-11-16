import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SESSION_COOKIE, verifySession, hasRole, type Role, type SessionPayload } from "./session";

/** Geçerli oturumu döndürür. Kullanıcı pasife alındıysa veya silindiyse oturum geçersiz sayılır. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const [user] = await getDb()
    .select({ active: schema.users.active, role: schema.users.role, name: schema.users.fullName })
    .from(schema.users)
    .where(eq(schema.users.id, session.uid))
    .limit(1);
  if (!user || !user.active) return null;

  // Rol veya ad değiştiyse veritabanındaki güncel değer geçerli olur.
  return { uid: session.uid, name: user.name, role: user.role };
}

/** Sayfalarda kullanılır: giriş yoksa /giris'e yönlendirir. */
export async function requireUser(min: Role = "personel") {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (!hasRole(session.role, min)) redirect("/?hata=yetki");
  return session;
}

/** Sunucu eylemlerinde kullanılır: yetki yoksa Türkçe hata fırlatır. */
export async function assertRole(min: Role = "personel") {
  const session = await getSession();
  if (!session) throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
  if (!hasRole(session.role, min)) throw new Error("Bu işlem için yetkiniz yok.");
  return session;
}

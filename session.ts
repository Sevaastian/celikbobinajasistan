import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cb_oturum";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 saat

export type Role = "yonetici" | "usta" | "personel";

export type SessionPayload = {
  uid: number;
  name: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET tanımlı değil veya 32 karakterden kısa.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Edge (middleware) ve Node'da çalışır; veritabanına dokunmaz. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { uid: payload.uid as number, name: payload.name as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

/** Rol hiyerarşisi: yönetici > usta > personel */
const RANK: Record<Role, number> = { personel: 1, usta: 2, yonetici: 3 };
export function hasRole(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

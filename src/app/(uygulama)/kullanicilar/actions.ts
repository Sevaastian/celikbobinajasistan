"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { field } from "@/lib/record-input";

function validPassword(password: string) {
  return password.length >= 10 && Buffer.byteLength(password, "utf8") <= 72;
}

export async function saveUser(id: number | null, _: string | null, form: FormData) {
  const current = await requireUser("yonetici");
  const username = field(form, "username").toLowerCase();
  const fullName = field(form, "fullName").slice(0, 100);
  const role = schema.roleEnum.enumValues.find(value => value === field(form, "role"));
  const active = form.has("active");
  const password = String(form.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !fullName || !role) return "Ad, rol ve 3–40 karakterlik kullanıcı adı girin.";
  if ((!id || password) && !validPassword(password)) return "Şifre en az 10 karakter ve en fazla 72 bayt olmalıdır.";
  if (id === current.uid && (!active || role !== "yonetici")) return "Kendi yönetici yetkinizi kaldıramazsınız.";
  const db = getDb();
  try {
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    const result = id ? await db.execute(sql`
      with saved as (
        update kullanicilar set kullanici_adi = ${username}, ad_soyad = ${fullName},
        rol = ${role}::rol, aktif = ${active}, sifre_hash = coalesce(${passwordHash}, sifre_hash)
        where id = ${id} returning id
      ) insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select ${current.uid}, 'guncelle', 'kullanici', id from saved returning id
    `) : await db.execute(sql`
      with saved as (
        insert into kullanicilar (kullanici_adi, ad_soyad, rol, aktif, sifre_hash)
        values (${username}, ${fullName}, ${role}::rol, ${active}, ${passwordHash}) returning id
      ) insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select ${current.uid}, 'olustur', 'kullanici', id from saved returning id
    `);
    if (!result.rows.length) return "Kullanıcı bulunamadı.";
  } catch { return "Kayıt kaydedilemedi. Kullanıcı adı başka bir hesapta kullanılıyor olabilir."; }
  redirect("/kullanicilar");
}

export async function changePassword(_: string | null, form: FormData) {
  const current = await requireUser();
  const oldPassword = String(form.get("current") ?? "");
  const password = String(form.get("password") ?? "");
  if (!validPassword(password) || password !== form.get("confirm")) return "Yeni şifreyi doğrulayın. Şifre en az 10 karakter ve en fazla 72 bayt olmalıdır.";
  const db = getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, current.uid));
  if (!row || !await bcrypt.compare(oldPassword, row.hash)) return "Mevcut şifre yanlış.";
  try {
    const result = await db.execute(sql`
      with saved as (
        update kullanicilar set sifre_hash = ${await bcrypt.hash(password, 12)}
        where id = ${current.uid} and sifre_hash = ${row.hash} returning id
      ) insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select id, 'sifre_degisti', 'kullanici', id from saved returning id
    `);
    if (!result.rows.length) return "Şifre değişmiş. Sayfayı yenileyin.";
  } catch { return "Şifre kaydedilemedi."; }
  redirect("/hesabim?guncellendi=1");
}

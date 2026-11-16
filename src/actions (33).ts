"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { assertRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const { customers, workOrders, payments } = schema;

export type FormState = { error?: string };

const customerSchema = z.object({
  name: z.string().trim().min(1, "Ad soyad veya firma adı gerekli.").max(200),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function parse(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = customerSchema.safeParse({
    name: raw.name,
    phone: raw.phone,
    address: raw.address,
    notes: raw.notes,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  return {
    data: { name: d.name, phone: d.phone || null, address: d.address || null, notes: d.notes || null },
  } as const;
}

export async function createCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let session;
  try {
    session = await assertRole("personel");
  } catch (e) {
    return { error: (e as Error).message };
  }
  const p = parse(formData);
  if ("error" in p) return { error: p.error };

  const [row] = await getDb().insert(customers).values(p.data).returning({ id: customers.id });
  await logActivity(session.uid, "olustur", "musteri", row.id, { ad: p.data.name });
  revalidatePath("/musteriler");
  if (formData.get("afterIntake") === "1") redirect(`/is-emirleri/kabul?musteri=${row.id}&kaydedildi=1`);
  redirect(`/musteriler/${row.id}`);
}

export async function updateCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let session;
  try {
    session = await assertRole("personel");
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Geçersiz müşteri." };
  const p = parse(formData);
  if ("error" in p) return { error: p.error };

  const updated = await getDb().update(customers).set(p.data).where(eq(customers.id, id)).returning({ id: customers.id });
  if (updated.length === 0) return { error: "Müşteri bulunamadı." };
  await logActivity(session.uid, "guncelle", "musteri", id, { ad: p.data.name });
  revalidatePath("/musteriler");
  redirect(`/musteriler/${id}`);
}

export async function deleteCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let session;
  try {
    session = await assertRole("yonetici");
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Geçersiz müşteri." };

  const db = getDb();
  const [{ n: orderCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(workOrders).where(eq(workOrders.customerId, id));
  const [{ n: payCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(payments).where(eq(payments.customerId, id));
  if (orderCount > 0 || payCount > 0) {
    return { error: "Bu müşterinin iş emirleri veya ödemeleri var; silinemez. Geçmiş kayıtların korunması için önce ilgili kayıtlar kaldırılmalı." };
  }

  await db.delete(customers).where(eq(customers.id, id));
  await logActivity(session.uid, "sil", "musteri", id);
  revalidatePath("/musteriler");
  redirect("/musteriler");
}

"use server";

import { requireUser } from "@/lib/auth";
import { decimal, recordId } from "@/lib/record-input";
import { similarWindings, type SimilarItem } from "@/lib/similar";

/** Kabul formunda plaka değerleri değiştikçe benzer motorları getirir. */
export async function findSimilar(input: { kw: string; rpm: string; poles: string; brand: string }): Promise<SimilarItem[]> {
  await requireUser();
  const kw = decimal((input.kw ?? "").trim(), 7, 3);
  if (!kw) return [];
  try {
    return await similarWindings({
      kw, rpm: recordId((input.rpm ?? "").trim()), poles: recordId((input.poles ?? "").trim()),
      brand: (input.brand ?? "").trim().slice(0, 100) || null,
    });
  } catch (error) {
    console.error("Benzer motor sorgusu başarısız", error);
    return [];
  }
}

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { isMonophase } from "@/lib/winding-check";
import { formatWireList, formatWindingWires } from "@/lib/wire-sizes";

/** Benzer motor: aynı güç (±%3) ve aynı kutup (kutup yoksa devir ±%5). Sipir bilgisi olan kayıtlar öne alınır. */
export type SimilarQuery = { kw?: string | null; rpm?: number | null; poles?: number | null; brand?: string | null; excludeId?: number | null };

export type SimilarItem = {
  id: number; title: string; date: string; kw: string | null; rpm: number | null; poles: number | null;
  sipir: string | null; hatve: string | null; mold: string | null; wires: string; mono: boolean; aux: string | null;
};

export async function similarWindings(q: SimilarQuery, limit = 8): Promise<SimilarItem[]> {
  const kw = q.kw && /^\d{1,7}(\.\d{1,3})?$/.test(q.kw) && Number(q.kw) > 0 ? q.kw : null;
  if (!kw) return [];
  const { windingRecords: w } = schema;
  const brand = q.brand?.trim() || null;
  const rows = await getDb().select().from(w).where(and(
    sql`${w.kw} between ${kw}::numeric * 0.97 and ${kw}::numeric * 1.03`,
    q.poles ? eq(w.poleCount, q.poles)
      : q.rpm ? sql`${w.rpm} between ${Math.round(q.rpm * 0.95)} and ${Math.round(q.rpm * 1.05)}` : undefined,
    sql`coalesce(trim(${w.sipir}), '') <> ''`,
    q.excludeId ? ne(w.id, q.excludeId) : undefined,
  )).orderBy(
    brand ? desc(sql`lower(coalesce(${w.brand}, '')) = lower(${brand})`) : desc(sql`true`),
    desc(w.createdAt), desc(w.id),
  ).limit(limit);
  return rows.map(r => ({
    id: r.id,
    title: [r.brand, r.model].filter(Boolean).join(" ") || `Kayıt #${r.id}`,
    date: formatDate(r.createdAt),
    kw: r.kw, rpm: r.rpm, poles: r.poleCount,
    sipir: r.sipir, hatve: r.hatve, mold: r.mold,
    wires: formatWindingWires(r), mono: isMonophase(r.phase),
    aux: isMonophase(r.phase) ? `Yardımcı: Sipir ${r.auxSipir ?? "—"} · Hatve ${r.auxHatve ?? "—"} · ${formatWireList(r.auxWireDiameters) || "tel yok"}` : null,
  }));
}

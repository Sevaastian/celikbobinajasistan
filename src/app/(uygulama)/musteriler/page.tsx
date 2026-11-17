import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { Plus, Search, Phone } from "lucide-react";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { btnPrimary, cardCls, inputCls } from "@/components/ui";
import { Pager } from "@/components/pager";
import { PAGE_SIZE, pageWindow, parsePage } from "@/lib/pagination";

const { customers } = schema;

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; sayfa?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const page = parsePage(searchParams.sayfa);
  const { limit, offset } = pageWindow(page);
  const fetched = await getDb()
    .select()
    .from(customers)
    .where(q ? or(ilike(customers.name, like), ilike(customers.phone, like)) : undefined)
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset);
  const rows = fetched.slice(0, PAGE_SIZE);
  const hasNext = fetched.length > PAGE_SIZE;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Müşteriler</h1>
        <Link href="/musteriler/yeni" className={btnPrimary}>
          <Plus size={16} /> Yeni müşteri
        </Link>
      </div>

      <form className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-3.5 text-zinc-500" />
        <input name="q" defaultValue={q} placeholder="Ad veya telefon ara..." className={`${inputCls} pl-9`} />
      </form>

      {rows.length === 0 ? (
        <div className={cardCls}>
          <p className="text-sm text-zinc-400">
            {q ? "Aramanıza uyan müşteri bulunamadı." : "Henüz müşteri yok. İlk müşteriyi ekleyerek başlayın."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/musteriler/${c.id}`} className={`${cardCls} block transition hover:border-accent-500`}>
                <div className="font-medium">{c.name}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                  <Phone size={12} /> {c.phone || "Telefon yok"} · Kayıt: {formatDate(c.createdAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager basePath="/musteriler" params={searchParams} page={page} hasNext={hasNext} />
    </div>
  );
}

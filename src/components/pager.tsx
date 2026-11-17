import Link from "next/link";
import { hrefForPage } from "@/lib/pagination";
import { btnGhost } from "./ui";

/** Önceki / Sonraki sayfa bağlantıları. Filtreler korunur. */
export function Pager({ basePath, params, page, hasNext }: {
  basePath: string; params: Record<string, string | string[] | undefined>; page: number; hasNext: boolean;
}) {
  if (page === 1 && !hasNext) return null;
  return <nav aria-label="Sayfalar" className="flex items-center justify-between gap-3 py-2">
    {page > 1 ? <Link className={btnGhost} href={hrefForPage(basePath, params, page - 1)}>← Önceki</Link> : <span />}
    <span className="text-sm text-zinc-400">Sayfa {page}</span>
    {hasNext ? <Link className={btnGhost} href={hrefForPage(basePath, params, page + 1)}>Sonraki →</Link> : <span />}
  </nav>;
}

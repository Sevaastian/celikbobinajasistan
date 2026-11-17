/** Liste sayfalama: sayfa başına kayıt sayısı ve `sayfa` parametresinin güvenli okunması. */
export const PAGE_SIZE = 50;

export function parsePage(value: string | string[] | undefined) {
  const n = typeof value === "string" && /^\d{1,5}$/.test(value) ? Number(value) : 1;
  return Math.max(1, n);
}

/** Bir fazla kayıt çekilir; fazlası varsa "Sonraki" açılır. */
export function pageWindow(page: number) {
  return { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE };
}

export function hrefForPage(basePath: string, params: Record<string, string | string[] | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "sayfa" && typeof value === "string" && value !== "") search.set(key, value);
  }
  if (page > 1) search.set("sayfa", String(page));
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}

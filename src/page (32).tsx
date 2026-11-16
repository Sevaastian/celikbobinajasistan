import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NAV_ITEMS } from "@/components/nav-items";

export default async function MenuPage() {
  const session = await requireUser();
  const items = NAV_ITEMS.filter((i) => (!i.adminOnly || session.role === "yonetici") && (!i.staffOnly || session.role !== "personel"));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Menü</h1>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 text-sm font-medium hover:border-accent-500">
            <Icon size={20} className="text-accent-500" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

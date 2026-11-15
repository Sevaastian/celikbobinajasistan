"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cog, Settings, LogOut } from "lucide-react";
import clsx from "clsx";
import { logoutAction } from "@/app/giris/actions";
import { NAV_ITEMS } from "@/components/nav-items";
import { WorkshopFeedback, SoundToggle } from "@/components/workshop-feedback";
import { ThemePicker } from "@/components/theme-picker";

// Telefonda alt çubukta görünecek ana sekmeler
const MOBILE_TABS = ["/", "/is-emirleri", "/bobinaj", "/musteriler"];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => (!i.adminOnly || user.role === "yonetici") && (!i.staffOnly || user.role !== "personel"));
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const roleLabel = { yonetici: "Yönetici", usta: "Usta", personel: "Personel" }[user.role] ?? user.role;

  return (
    <div className="min-h-dvh lg:flex">
      {/* Masaüstü yan menü */}
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-600 bg-ink-900 lg:sticky lg:top-0 lg:flex">
        <div className="flex items-center gap-3 border-b border-ink-600 p-4">
          <div className="rounded-lg bg-accent-500 p-2 text-black">
            <Cog size={20} />
          </div>
          <div className="leading-tight">
            <div className="font-bold">ÇELİK BOBİNAJ</div>
            <div className="text-xs text-zinc-400">Atölye Yönetimi</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active(href)
                  ? "bg-accent-500/15 font-semibold text-accent-400"
                  : "text-zinc-300 hover:bg-ink-700",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-600 p-3">
          <div className="mb-2 px-1 text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-zinc-400">{roleLabel}</div>
          </div>
          <div className="flex items-center gap-1">
            <ThemePicker />
            <SoundToggle />
          </div>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-ink-700">
              <LogOut size={16} /> Çıkış yap
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil üst çubuk: çentik/durum çubuğu alanını güvenli alanla ayırır */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-ink-600 bg-ink-900/95 backdrop-blur lg:hidden"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
            paddingBottom: "0.5rem",
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(0.5rem, env(safe-area-inset-right))",
          }}
        >
          <div className="flex min-w-0 items-center gap-2 font-bold">
            <Cog size={20} className="shrink-0 text-accent-500" />
            <span className="truncate">ÇELİK BOBİNAJ</span>
          </div>
          <div className="flex shrink-0 items-center">
            <SoundToggle />
            <ThemePicker />
            <form action={logoutAction}>
              <button aria-label="Çıkış yap" className="rounded-lg p-2 text-zinc-300 hover:bg-ink-700">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </header>

        <Suspense><WorkshopFeedback /></Suspense>

        <main
          className="cb-workspace min-w-0 flex-1 p-4 lg:p-8 lg:pb-8"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
            paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>

        {/* Mobil alt gezinme: ana ekran çubuğunun üstünde kalır */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-ink-600 bg-ink-900/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {items
            .filter((i) => MOBILE_TABS.includes(i.href))
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex min-w-0 flex-col items-center gap-0.5 py-2 text-[11px]",
                  active(href) ? "text-accent-400" : "text-zinc-400",
                )}
              >
                <Icon size={20} />
                <span className="w-full truncate text-center">{label.split(" ")[0]}</span>
              </Link>
            ))}
          <Link href="/menu" className={clsx("flex min-w-0 flex-col items-center gap-0.5 py-2 text-[11px]", pathname === "/menu" ? "text-accent-400" : "text-zinc-400")}>
            <Settings size={20} />
            Menü
          </Link>
        </nav>
      </div>
    </div>
  );
}

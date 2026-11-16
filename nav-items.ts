import {
  LayoutDashboard, Users, ClipboardList, Cog, Settings, Wrench, Zap, Droplets, Boxes,
  Wallet, FileText, Search, UserCog, CircleUser, DatabaseBackup, type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; staffOnly?: boolean };
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
  { href: "/bobinaj", label: "Motor Bobinaj", icon: Cog },
  { href: "/el-aletleri", label: "El Aletleri", icon: Wrench },
  { href: "/jeneratorler", label: "Jeneratörler", icon: Zap },
  { href: "/pompalar", label: "Pompalar", icon: Droplets },
  { href: "/stok", label: "Stok ve Depo", icon: Boxes },
  { href: "/finans", label: "Finans", icon: Wallet, staffOnly: true },
  { href: "/raporlar", label: "Raporlar", icon: FileText },
  { href: "/arama", label: "Arama", icon: Search },
  { href: "/hesabim", label: "Hesabım", icon: CircleUser },
  { href: "/kullanicilar", label: "Kullanıcılar", icon: UserCog, adminOnly: true },
  { href: "/ayarlar", label: "Teknik Alanlar", icon: Settings, adminOnly: true },
  { href: "/yedek", label: "Veri Yedeği", icon: DatabaseBackup, adminOnly: true },
];

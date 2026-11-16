import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return <AppShell user={{ name: session.name, role: session.role }}>{children}</AppShell>;
}

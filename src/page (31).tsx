import { asc, desc, eq, getTableColumns } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { cardCls } from "@/components/ui";
import { saveUser } from "./actions";

const roles = [["yonetici", "Yönetici"], ["usta", "Usta"], ["personel", "Personel"]] as const;
type User = Omit<typeof schema.users.$inferSelect, "passwordHash">;

function Editor({ user }: { user?: User }) {
  return <RecordForm action={saveUser.bind(null, user?.id ?? null)}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field name="username" label="Kullanıcı adı" value={user?.username} required />
      <Field name="fullName" label="Ad soyad" value={user?.fullName} required />
      <SelectField name="role" label="Rol" options={roles} value={user?.role ?? "personel"} />
      <Field name="password" type="password" label={user ? "Yeni şifre (isteğe bağlı)" : "Şifre"} required={!user} />
      <label><input type="checkbox" name="active" defaultChecked={user?.active ?? true} /> Hesap aktif</label>
    </div>
  </RecordForm>;
}

export default async function Page() {
  await requireUser("yonetici");
  const db = getDb();
  const { users: u, activityLogs: l } = schema;
  const { passwordHash, ...columns } = getTableColumns(u);
  const [users, logs] = await Promise.all([
    db.select(columns).from(u).orderBy(asc(u.fullName)),
    db.select({ log: l, name: u.fullName }).from(l).leftJoin(u, eq(l.userId, u.id)).orderBy(desc(l.id)).limit(150),
  ]);
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Kullanıcılar ve İşlem Geçmişi</h1>
    <details className={cardCls}><summary className="mb-3 cursor-pointer font-semibold">Yeni kullanıcı</summary><Editor /></details>
    {users.map(user => <details className={cardCls} key={user.id}>
      <summary className="mb-3 cursor-pointer">{user.fullName} · {roles.find(([role]) => role === user.role)?.[1]}{!user.active && " · Pasif"}</summary>
      <Editor user={user} />
    </details>)}
    <section className={cardCls}><h2 className="mb-3 font-semibold">Son 150 işlem</h2>
      {logs.map(({ log, name }) => <p className="border-t border-ink-600 py-2 text-sm" key={log.id}>
        {formatDateTime(log.createdAt)} · {name ?? "—"} · {log.entity.replaceAll("_", " ")} · {log.action.replaceAll("_", " ")}
        {log.entityId !== null && ` · #${log.entityId}`}
      </p>)}
    </section>
  </div>;
}

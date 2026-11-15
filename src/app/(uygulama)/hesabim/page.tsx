import { requireUser } from "@/lib/auth";
import { Field } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { cardCls } from "@/components/ui";
import { changePassword } from "../kullanicilar/actions";

export default async function Page({ searchParams }: { searchParams: { guncellendi?: string } }) {
  const user = await requireUser();
  return <section className={cardCls + " max-w-xl"}>
    <h1 className="text-2xl font-bold">Hesabım</h1><p className="mb-4 text-zinc-400">{user.name}</p>
    {searchParams.guncellendi === "1" && <p className="mb-4 text-green-300" role="status">Şifre güncellendi.</p>}
    <RecordForm action={changePassword} label="Şifreyi değiştir">
      <Field name="current" label="Mevcut şifre" type="password" required />
      <Field name="password" label="Yeni şifre" type="password" required />
      <Field name="confirm" label="Yeni şifre tekrar" type="password" required />
    </RecordForm>
  </section>;
}

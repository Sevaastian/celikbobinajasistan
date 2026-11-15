"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Cog, LogIn } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 font-semibold text-black transition hover:bg-accent-400 disabled:opacity-60"
    >
      <LogIn size={18} />
      {pending ? "Giriş yapılıyor..." : "Giriş yap"}
    </button>
  );
}

export default function LoginPage({ searchParams }: { searchParams: { sonra?: string } }) {
  const [state, action] = useFormState<LoginState, FormData>(loginAction, {});

  return (
    <main className="flex min-h-dvh items-center justify-center p-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div className="w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-accent-500 p-2.5 text-black">
            <Cog size={26} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">ÇELİK BOBİNAJ</h1>
            <p className="text-xs text-zinc-400">Atölye Yönetim Sistemi</p>
          </div>
        </div>

        <form action={action} className="space-y-4">
          {typeof searchParams.sonra === "string" && <input type="hidden" name="sonra" value={searchParams.sonra} />}
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-300">Kullanıcı adı</span>
            <input
              name="username"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2.5 outline-none focus:border-accent-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-300">Şifre</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2.5 outline-none focus:border-accent-500"
            />
          </label>
          {state.error && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}
          <Submit />
        </form>
      </div>
    </main>
  );
}

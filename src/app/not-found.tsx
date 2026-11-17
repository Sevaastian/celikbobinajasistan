import Link from "next/link";
import { MascotFace } from "@/components/mascot-face";

export default function NotFound() {
  return <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
    <MascotFace mood="saskin" size={96} />
    <h1 className="text-2xl font-bold">Bu sayfa sarımdan çıkmış!</h1>
    <p className="text-zinc-400">Aradığın sayfa bulunamadı. Telde kopma olmuş olabilir; ana sayfaya dönüp tekrar deneyelim.</p>
    <Link href="/" className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-black">Ana sayfaya dön</Link>
  </div>;
}

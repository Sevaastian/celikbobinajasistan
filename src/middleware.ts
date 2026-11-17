import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * İlk savunma hattı: geçerli imzalı çerez yoksa giriş ekranına yönlendirir.
 * Asıl yetki ve kullanıcı aktiflik kontrolleri sunucu tarafında (auth.ts) yapılır.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/giris") return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });
    }
    const login = new URL("/giris", req.url);
    if (/^\/is-emirleri\/\d+(\/bilgi)?$/.test(pathname)) login.searchParams.set("sonra", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"],
};

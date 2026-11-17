export type Mood = "mutlu" | "saskin" | "dusunceli" | "uykulu" | "kutlama";

/** Motor maskotu: gövde vurgu renginde, yüz ifadesi `mood` ile değişir. Saf SVG, her yerde kullanılabilir. */
export function MascotFace({ mood = "mutlu", size = 56, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const eyes = mood === "uykulu"
    ? <><path d="M17 32 h8" stroke="#111" strokeWidth="2.6" strokeLinecap="round" /><path d="M31 32 h8" stroke="#111" strokeWidth="2.6" strokeLinecap="round" /></>
    : mood === "kutlama"
      ? <><path d="M21 27 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6z" fill="#fde047" /><path d="M35 27 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6z" fill="#fde047" /></>
      : <><circle cx="21" cy="32" r="4.5" fill="#fff" /><circle cx="35" cy="32" r="4.5" fill="#fff" />
        <circle cx={mood === "dusunceli" ? 23 : 22} cy={mood === "saskin" ? 31 : 33} r="2.2" fill="#111" />
        <circle cx={mood === "dusunceli" ? 37 : 36} cy={mood === "saskin" ? 31 : 33} r="2.2" fill="#111" /></>;
  const mouth = mood === "saskin" ? <ellipse cx="28" cy="43" rx="3.5" ry="4" fill="#111" />
    : mood === "dusunceli" ? <path d="M22 43 h12" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />
    : mood === "uykulu" ? <path d="M24 43 q4 3 8 0" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    : <path d="M20 41 q8 7 16 0" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
  return <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={className}>
    <rect x="6" y="18" width="40" height="30" rx="8" className="fill-accent-500" />
    <rect x="46" y="26" width="12" height="14" rx="3" className="fill-zinc-400" />
    <rect x="14" y="12" width="24" height="8" rx="3" className="fill-accent-600" />
    {mood === "kutlama" && <path d="M18 12 l6 -10 6 10z" fill="#f472b6" />}
    {mood === "dusunceli" && <path d="M16 24 l9 -2 M31 22 l9 2" stroke="#111" strokeWidth="2" strokeLinecap="round" />}
    {mood === "uykulu" && <text x="44" y="14" fontSize="10" fill="#a1a1aa">z</text>}
    {eyes}{mouth}
    <rect x="12" y="48" width="8" height="6" rx="2" className="fill-zinc-500" /><rect x="32" y="48" width="8" height="6" rx="2" className="fill-zinc-500" />
  </svg>;
}

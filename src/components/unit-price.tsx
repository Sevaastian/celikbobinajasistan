"use client";

import { useRef } from "react";
import { btnGhost, inputCls, labelCls } from "./ui";

/** Adet başı ücreti yazınca toplamı hesaplayıp tahmini ya da kesin ücret kutusuna yazar. */
export function UnitPrice() {
  const unit = useRef<HTMLInputElement>(null);
  const fill = (target: "estimatedPrice" | "finalPrice") => {
    const form = unit.current?.closest("form");
    const price = Number((unit.current?.value ?? "").replace(",", "."));
    const quantity = Number((form?.querySelector<HTMLInputElement>('input[name="quantity"]')?.value ?? "1") || 1);
    const box = form?.querySelector<HTMLInputElement>(`input[name="${target}"]`);
    if (!box || !Number.isFinite(price) || price <= 0 || !Number.isInteger(quantity) || quantity < 1) return;
    box.value = (Math.round(price * quantity * 100) / 100).toFixed(2);
  };
  return <div className="sm:col-span-2">
    <label className={labelCls} htmlFor="unit-price">Adet başı ücret (isteğe bağlı, toplamı hesaplar)</label>
    <div className="flex flex-wrap gap-2">
      <input id="unit-price" ref={unit} className={inputCls + " max-w-[10rem]"} inputMode="decimal" placeholder="örn. 450" />
      <button type="button" className={btnGhost} onClick={() => fill("estimatedPrice")}>Tahmini ücrete yaz</button>
      <button type="button" className={btnGhost} onClick={() => fill("finalPrice")}>Kesin ücrete yaz</button>
    </div>
  </div>;
}

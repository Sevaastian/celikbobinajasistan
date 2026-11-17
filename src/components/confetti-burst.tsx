"use client";

import { useEffect, useState } from "react";
import { OrderCelebration } from "./order-celebration";

/** Her yerden `window.dispatchEvent(new Event("cb-confetti"))` ile tetiklenen konfeti. */
export function ConfettiBurst() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fire = () => setCount(n => n + 1);
    window.addEventListener("cb-confetti", fire);
    return () => window.removeEventListener("cb-confetti", fire);
  }, []);
  return <OrderCelebration key={count} active={count > 0} />;
}

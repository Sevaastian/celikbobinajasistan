"use client";

import { useEffect, useState } from "react";

const colors = ["#fb923c", "#34d399", "#60a5fa", "#f472b6", "#facc15", "#c084fc"];

/** Brief, decorative celebration after an order is completed or delivered. */
export function OrderCelebration({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!visible) return null;
  return <div className="cb-confetti" aria-hidden="true">
    {Array.from({ length: 42 }, (_, index) => <i key={index} style={{
      left: `${(index * 47 + 11) % 100}%`,
      backgroundColor: colors[index % colors.length],
      animationDelay: `${(index % 9) * 45}ms`,
      animationDuration: `${1500 + (index % 6) * 110}ms`,
      transform: `rotate(${(index * 37) % 360}deg)`,
    }} />)}
  </div>;
}

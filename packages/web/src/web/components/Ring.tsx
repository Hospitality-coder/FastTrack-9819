import { motion } from "motion/react";
import type { ReactNode } from "react";

export function Ring({
  size = 220,
  stroke = 14,
  progress,
  color = "var(--primary)",
  track = "#1A2A1C",
  glow = true,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  track?: string;
  glow?: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, filter: glow && p > 0 ? `drop-shadow(0 0 14px ${color}66)` : undefined }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

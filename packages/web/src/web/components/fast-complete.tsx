import { Flame } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFastStats } from "../queries/fasts";
import { RankBadge } from "./charts";
import { Display, Muted, Pill, Pixel } from "./ui";

const LINES = [
  "Discipline is the sharpest blade.",
  "The shadows reward patience.",
  "Another fast in the books. Unstoppable.",
  "Hunger bowed. You didn't.",
];

const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 53) % 100,
  delay: ((i * 97) % 600) / 1000,
  size: 6 + (i % 4) * 3,
  color: i % 3 === 0 ? "#39FF14" : i % 3 === 1 ? "#B6FF5C" : "#FFD60A",
  spin: i % 2 ? 540 : -540,
}));

export function FastComplete({ data, onClose }: { data: { hours: number; protocol: string } | null; onClose: () => void }) {
  const stats = useFastStats();
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/80 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {CONFETTI.map((c, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute -top-5 rounded-[2px]"
              style={{ left: `${c.left}%`, width: c.size, height: c.size * 1.6, backgroundColor: c.color }}
              initial={{ y: 0, opacity: 0, rotate: 0 }}
              animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: c.spin }}
              transition={{ duration: 2.8 + c.delay, delay: c.delay, repeat: Infinity, ease: "easeIn" }}
            />
          ))}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative flex w-full max-w-[420px] flex-col items-center overflow-hidden rounded-xl border border-border p-7"
            style={{ background: "linear-gradient(180deg, #1B5A2E 0%, #0F1A10 100%)" }}
          >
            <img src="/images/ninja.png" alt="" className="h-[120px] w-[120px] rounded-[30px] object-contain" />
            <Pixel className="mt-3.5 text-[14px]">Fast complete</Pixel>
            <div className="mt-1.5 flex items-end gap-1.5">
              <span className="font-display text-[56px] font-black leading-[60px] text-foreground">{data.hours}</span>
              <Display as="span" className="mb-2 text-[22px]">
                hours
              </Display>
            </div>
            {data.protocol ? <Muted>{data.protocol} protocol · nailed it</Muted> : null}
            <Display as="p" className="mt-4 text-center text-[16px] text-accent">
              {LINES[Math.floor(data.hours) % LINES.length]}
            </Display>

            {stats.data && (
              <div className="mt-5 w-full rounded-lg bg-[rgba(7,10,7,0.6)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Flame className="h-[18px] w-[18px] text-warning" />
                    <Pixel className="text-[16px] text-foreground">{stats.data.currentStreak}</Pixel>
                    <Muted>day streak</Muted>
                  </span>
                  {stats.data.currentStreak >= stats.data.bestStreak && stats.data.currentStreak > 1 ? (
                    <Pixel className="text-[10px]" color="var(--warning)">
                      New best
                    </Pixel>
                  ) : null}
                </div>
                <RankBadge rank={stats.data.rank} />
              </div>
            )}

            <Pill label="Open the window" size="lg" className="mt-5 w-full" onClick={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

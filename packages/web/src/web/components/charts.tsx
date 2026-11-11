import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame } from "lucide-react";
import { shortDay } from "../lib/dates";
import { Eyebrow, Muted, Pixel } from "./ui";
import { cn } from "../lib/utils";

/* ---------- MacroBar ---------- */

export function MacroBar({
  label,
  value,
  target,
  unit = "g",
  color = "var(--primary)",
  overIsBad,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color?: string;
  overIsBad?: boolean;
}) {
  const pct = target > 0 ? value / target : 0;
  const over = pct > 1;
  const fill = over && overIsBad ? "var(--destructive)" : color;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-foreground">{label}</span>
        <Muted className={cn(over && overIsBad && "text-destructive")}>
          <span className="font-bold text-foreground">{Math.round(value)}</span> / {target} {unit}
        </Muted>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/7">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: fill }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct * 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ---------- WeekBars ---------- */

export function WeekBars({
  bars,
  target,
  color = "var(--primary)",
  overColor,
  format = (v: number) => String(v),
}: {
  bars: { date: string; value: number }[];
  target?: number;
  color?: string;
  overColor?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(target ?? 0, ...bars.map((b) => b.value), 1);
  return (
    <div className="flex h-[150px] items-end gap-2">
      {bars.map((b) => {
        const h = Math.max(4, (b.value / max) * 100);
        const over = target !== undefined && b.value > target;
        return (
          <div key={b.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground tabular">{format(b.value)}</span>
            <div className="relative flex w-full flex-1 items-end rounded-sm bg-white/4">
              {target !== undefined && (
                <div className="absolute left-0 right-0 border-t border-dashed border-foreground/25" style={{ bottom: `${(target / max) * 100}%` }} />
              )}
              <motion.div
                className="w-full rounded-sm"
                style={{ backgroundColor: over && overColor ? overColor : color, opacity: b.value === 0 ? 0.25 : 1 }}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <Eyebrow className="text-[10px]">{shortDay(b.date)}</Eyebrow>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- LineChart (weight) ---------- */

export function LineChart({
  points,
  goal,
  color = "var(--primary)",
  unit = "kg",
  height = 220,
}: {
  points: { date: string; value: number }[];
  goal?: number | null;
  color?: string;
  unit?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        <Muted>Log a few weigh-ins to see the trend.</Muted>
      </div>
    );
  }
  const values = points.map((p) => p.value).concat(goal ? [goal] : []);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const data = points.map((p) => ({ ...p, label: p.date.slice(5).replace("-", "/") }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8A9A8C", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis domain={[min, max]} tick={{ fill: "#8A9A8C", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={{ background: "#0F1A10", border: "1px solid #1E2E20", borderRadius: 12, fontSize: 13 }}
            labelStyle={{ color: "#8A9A8C" }}
            itemStyle={{ color: "#E8FFE0" }}
            formatter={(v) => [`${v} ${unit}`, "Weight"]}
          />
          {goal ? <ReferenceLine y={goal} stroke="#B6FF5C" strokeDasharray="4 4" label={{ value: `goal ${goal}`, fill: "#B6FF5C", fontSize: 10, position: "insideTopRight" }} /> : null}
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#lineFill)" dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- StreakHeatmap ---------- */

type Cell = { date: string; hours: number; completed: boolean };

export function StreakHeatmap({ cells }: { cells: Cell[] }) {
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const shade = (c: Cell) => {
    if (c.completed) return "var(--primary)";
    if (c.hours >= 12) return "rgba(57,255,20,0.45)";
    if (c.hours >= 4) return "rgba(57,255,20,0.22)";
    return "rgba(255,255,255,0.06)";
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-1">
            {w.map((c) => (
              <div key={c.date} title={`${c.date}: ${c.hours}h`} className="aspect-square w-full rounded-[4px]" style={{ backgroundColor: shade(c) }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        {[
          ["rgba(255,255,255,0.06)", "none"],
          ["rgba(57,255,20,0.3)", "partial"],
          ["var(--primary)", "completed"],
        ].map(([bg, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: bg }} />
            <Muted className="text-[11px]">{l}</Muted>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- RankBadge ---------- */

type Rank = { name: string; completed: number; nextName: string | null; nextAt: number | null; progress: number };

export function RankBadge({ rank, compact }: { rank: Rank; compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1.5">
        <Flame className="h-3 w-3 text-primary" />
        <Pixel className="text-[11px]">{rank.name}</Pixel>
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <Eyebrow>Ninja rank</Eyebrow>
          <Pixel className="mt-0.5 text-[18px]">{rank.name}</Pixel>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-[22px] font-bold text-foreground">{rank.completed}</span>
          <Muted className="text-[11px]">fasts done</Muted>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/7">
        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.round(rank.progress * 100)}%` }} transition={{ duration: 0.6 }} />
      </div>
      <Muted className="text-[12px]">{rank.nextName ? `${rank.nextAt! - rank.completed} more to reach ${rank.nextName}` : "Max rank. Legendary."}</Muted>
    </div>
  );
}

/* ---------- SuggestionCard ---------- */

export type Suggestion = {
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  tags: string[];
  whyForYou: string;
};

export function SuggestionCard({ item, className }: { item: Suggestion; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-lg border border-primary/25 bg-deeper p-4", className)}>
      <div className="flex flex-wrap gap-1.5">
        {item.tags.slice(0, 3).map((t) => (
          <Pixel key={t} className="rounded-[6px] bg-primary/12 px-1.5 py-0.5 text-[9px]">
            {t}
          </Pixel>
        ))}
      </div>
      <span className="font-display text-[16px] font-bold text-foreground">{item.title}</span>
      <p className="line-clamp-3 text-[13px] leading-[19px] text-[#C9DCC5]">{item.description}</p>
      <div className="flex gap-3.5">
        <Macro v={item.calories} u="kcal" />
        <Macro v={item.protein} u="g P" />
        <Macro v={item.carbs} u="g C" />
        <Macro v={item.sugar} u="g S" />
      </div>
      <Muted className="line-clamp-2 text-[12px] italic">{item.whyForYou}</Muted>
    </div>
  );
}

function Macro({ v, u }: { v: number; u: string }) {
  return (
    <span className="text-[12px] font-bold text-accent">
      {Math.round(v)}
      <span className="font-normal text-muted-foreground"> {u}</span>
    </span>
  );
}

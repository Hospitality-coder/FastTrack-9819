import { useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";

/* ---------- Typography ---------- */

export function Pixel({ className, children, color }: { className?: string; children: ReactNode; color?: string }) {
  return (
    <span className={cn("font-pixel text-[12px] uppercase tracking-[1px] text-primary", className)} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

export function Display({ className, children, as: Tag = "h2" }: { className?: string; children: ReactNode; as?: "h1" | "h2" | "h3" | "span" | "p" }) {
  return <Tag className={cn("font-display font-bold leading-[1.1] text-foreground", className)}>{children}</Tag>;
}

export function Muted({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("text-[13px] text-muted-foreground", className)}>{children}</span>;
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("text-[11px] uppercase tracking-[1px] text-muted-foreground", className)}>{children}</span>;
}

/* ---------- Layout ---------- */

export function Card({ className, children, onClick, glass }: { className?: string; children: ReactNode; onClick?: () => void; glass?: boolean }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "card-sheen rounded-xl border border-border bg-card p-5 text-left",
        glass && "bg-[rgba(10,20,12,0.85)] backdrop-blur",
        onClick && "w-full cursor-pointer transition hover:border-primary/30 active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <Display as="h3" className="text-[18px] md:text-[20px]">
        {title}
      </Display>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  pixel,
  className,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  pixel?: boolean;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      {pixel ? (
        <Pixel className="text-[18px]" color={color}>
          {value}
          {unit ? <span className="text-[10px] text-muted-foreground"> {unit}</span> : null}
        </Pixel>
      ) : (
        <span className="font-display text-[15px] text-foreground tabular" style={color ? { color } : undefined}>
          {value}
          {unit ? <span className="text-[11px] text-muted-foreground"> {unit}</span> : null}
        </span>
      )}
      <Eyebrow>{label}</Eyebrow>
    </div>
  );
}

export function Empty({ title, body, art }: { title: string; body?: string; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      {art ?? <img src="/images/ninja.png" alt="" className="mb-1 h-16 w-16 object-contain" />}
      <Display as="h3" className="text-[17px]">
        {title}
      </Display>
      {body && <Muted className="max-w-[320px]">{body}</Muted>}
    </div>
  );
}

/* ---------- Buttons ---------- */

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "primary" | "outline" | "ghost" | "danger" | "water";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};

export function Pill({ label, variant = "primary", size = "md", loading, icon, className, disabled, ...rest }: PillProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-display font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-4 text-[12px]",
        size === "md" && "h-11 px-5 text-[13px]",
        size === "lg" && "h-[52px] px-6 text-[14px]",
        variant === "primary" && "bg-primary text-primary-foreground shadow-glow hover:brightness-110",
        variant === "water" && "bg-water text-primary-foreground hover:brightness-110",
        variant === "outline" && "border border-foreground/30 text-foreground hover:border-primary hover:text-primary",
        variant === "ghost" && "bg-white/5 text-foreground hover:bg-white/10",
        variant === "danger" && "border border-destructive text-destructive hover:bg-destructive/10",
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

export function Chip({ label, active, onClick, color, className }: { label: string; active?: boolean; onClick?: () => void; color?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active && color ? { backgroundColor: color } : undefined}
      className={cn(
        "h-8 rounded-sm px-3.5 font-body text-[13px] font-bold transition active:scale-95",
        active ? "bg-primary text-primary-foreground" : "bg-white/6 text-foreground hover:bg-white/10",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function IconButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/5 text-foreground transition hover:bg-white/10 active:scale-95 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Inputs ---------- */

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label?: string;
  suffix?: string;
  onChangeText?: (v: string) => void;
  containerClassName?: string;
};

export function Field({ label, suffix, onChangeText, className, containerClassName, ...rest }: FieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex min-w-0 flex-1 flex-col gap-1.5", containerClassName)}>
      {label && <Eyebrow>{label}</Eyebrow>}
      <div className="flex h-12 items-center gap-2 rounded-md border border-border bg-input px-3.5 focus-within:border-primary/60">
        <input
          id={id}
          {...rest}
          onChange={(e) => onChangeText?.(e.target.value)}
          className={cn("min-w-0 w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/60", className)}
        />
        {suffix && <span className="shrink-0 text-[12px] text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

export function NumberField({
  value,
  onChange,
  ...rest
}: Omit<FieldProps, "value" | "onChangeText" | "type"> & { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    const n = Number(text);
    if (value === null && text !== "") setText("");
    else if (value !== null && (text === "" || n !== value)) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field
      {...rest}
      inputMode="decimal"
      value={text}
      onChangeText={(t) => {
        const clean = t.replace(/[^0-9.]/g, "");
        setText(clean);
        if (clean === "" || clean === ".") onChange(null);
        else {
          const n = Number(clean);
          if (!Number.isNaN(n)) onChange(n);
        }
      }}
    />
  );
}

export function ToggleRow({
  label,
  body,
  value,
  onChange,
  color,
}: {
  label: string;
  body?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-4 py-2 text-left">
      <div className="flex flex-col">
        <span className="text-[15px] font-bold text-foreground">{label}</span>
        {body && <Muted className="text-[12px]">{body}</Muted>}
      </div>
      <span
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition", value ? "bg-primary" : "bg-white/10")}
        style={value && color ? { backgroundColor: color } : undefined}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-background transition-all", value ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

/* ---------- Overlays ---------- */

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="card-sheen flex w-full max-w-[520px] flex-col gap-4 rounded-t-xl border border-border bg-card p-6 md:rounded-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Display as="h3" className="text-[20px]">
                  {title}
                </Display>
                {subtitle && <Muted>{subtitle}</Muted>}
              </div>
              <IconButton onClick={onClose} aria-label="Close" className="h-9 w-9">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={body}>
      <div className="flex gap-3">
        <Pill label="Cancel" variant="ghost" className="flex-1" onClick={onClose} />
        <Pill label={confirmLabel} variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm} loading={loading} />
      </div>
    </Sheet>
  );
}

/* ---------- Motion helpers ---------- */

export function FadeUp({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary", className)} />;
}

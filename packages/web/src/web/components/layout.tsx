import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Camera, Droplets, Home, Images, Scale, Settings, Timer, UtensilsCrossed } from "lucide-react";
import { cn } from "../lib/utils";
import { Pixel } from "./ui";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/fast", label: "Fast", icon: Timer },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/water", label: "Water", icon: Droplets },
  { to: "/weight", label: "Weight", icon: Scale },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const isActive = (to: string) => (to === "/" ? loc === "/" : loc.startsWith(to));

  return (
    <div className="hero-mesh min-h-dvh">
      <div className="mx-auto flex w-full max-w-[1200px]">
        {/* Sidebar (md+) */}
        <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-2 border-r border-border/60 px-4 py-6 md:flex">
          <Link to="/" className="mb-6 flex items-center gap-3 px-2">
            <img src="/images/ninja.png" alt="FastTrack" className="h-10 w-10 object-contain" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[17px] font-black text-foreground">FastTrack</span>
              <Pixel className="text-[9px]">fast · fuel · flow</Pixel>
            </span>
          </Link>
          {NAV.map((n) => {
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-bold transition",
                  active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <n.icon className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            );
          })}
          <div className="mt-2 border-t border-border/60 pt-2">
            <Link
              to="/calendar"
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-bold transition",
                isActive("/calendar") ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <CalendarDays className="h-[18px] w-[18px]" />
              Calendar
            </Link>
            <Link
              to="/gallery"
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-bold transition",
                isActive("/gallery") ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Images className="h-[18px] w-[18px]" />
              Gallery
            </Link>
            <Link
              to="/scan"
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-bold transition",
                isActive("/scan") ? "bg-accent text-accent-foreground" : "text-accent hover:bg-accent/10",
              )}
            >
              <Camera className="h-[18px] w-[18px]" />
              Scan meal
            </Link>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-bold transition",
                isActive("/settings") ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Settings className="h-[18px] w-[18px]" />
              Settings
            </Link>
          </div>
          <div className="mt-auto px-2">
            <Pixel className="text-[9px] text-muted-foreground">stay in the shadows</Pixel>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-5 pb-28 pt-5 md:px-10 md:pb-12 md:pt-8">{children}</main>
      </div>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[rgba(7,10,7,0.92)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-[600px] items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
          {NAV.map((n) => {
            const active = isActive(n.to);
            return (
              <Link key={n.to} to={n.to} className="flex flex-1 flex-col items-center gap-1 py-1">
                <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition", active && "bg-primary/15")}>
                  <n.icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                </span>
                <span className={cn("text-[10px] font-bold", active ? "text-primary" : "text-muted-foreground")}>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  right,
  color,
  leading,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  color?: string;
  /** Optional element rendered before the eyebrow/title (e.g. an avatar). */
  leading?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3.5">
        {leading}
        <div className="flex flex-col">
          <Pixel color={color}>{eyebrow}</Pixel>
          <h1 className="mt-1 font-display text-[26px] font-bold leading-[1.1] text-foreground md:text-[34px]">{title}</h1>
        </div>
      </div>
      {right && <div className="flex items-center gap-2.5 pt-1">{right}</div>}
    </div>
  );
}

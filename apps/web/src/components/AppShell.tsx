import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircuitBoard,
  Cloud,
  Factory,
  Fingerprint,
  LogOut,
  MoreHorizontal,
  Orbit,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { NexusSession } from "@/types/auth";

export type ViewKey =
  | "mission"
  | "projects"
  | "galaxy"
  | "city"
  | "analytics"
  | "calendar"
  | "control";

interface NavItem {
  key: ViewKey;
  label: string;
  helper: string;
  icon: typeof Rocket;
}

const commandItems: NavItem[] = [
  { key: "mission", label: "Mission", helper: "Daily command", icon: Rocket },
  { key: "projects", label: "Projects", helper: "Work breakdown", icon: CircuitBoard },
  { key: "galaxy", label: "Galaxy", helper: "Project systems", icon: Orbit },
  { key: "city", label: "City", helper: "Progress skyline", icon: Factory },
  { key: "analytics", label: "Analytics", helper: "Health and velocity", icon: BarChart3 },
  { key: "calendar", label: "Calendar", helper: "Deadlines", icon: CalendarDays }
];

const systemItems: NavItem[] = [
  { key: "control", label: "Control Center", helper: "Settings and tools", icon: Settings }
];

const navGroups = [
  { label: "Command", items: commandItems },
  { label: "System", items: systemItems }
];

const navItems = [...commandItems, ...systemItems];
const mobilePrimaryItems = commandItems.slice(0, 4);
const mobileMoreItems = [...commandItems.slice(4), ...systemItems];

interface AppShellProps {
  activeView: ViewKey;
  session: NexusSession;
  onViewChange: (view: ViewKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({ activeView, session, onViewChange, onLogout, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenuRef = useRef<HTMLButtonElement>(null);
  const activeItem = navItems.find((item) => item.key === activeView);
  const mobileMoreActive = mobileMoreItems.some((item) => item.key === activeView);
  const workspaceLabel =
    session.mode === "api" ? "Cloud workspace" : session.mode === "firebase" ? "Google workspace" : "Owner local";

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    closeMobileMenuRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [mobileMenuOpen]);

  function selectView(view: ViewKey) {
    setMobileMenuOpen(false);
    onViewChange(view);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-slate-100">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-30" />

      <aside className="no-scrollbar glass-panel fixed left-3 top-3 z-30 hidden h-[calc(100vh-1.5rem)] w-[248px] overflow-y-auto rounded-lg p-3 lg:flex lg:flex-col">
        <div className="mb-4 flex items-center gap-3 rounded-md border border-cyan/25 bg-cyan/10 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cyan/30 bg-cyan/10">
            <Sparkles className="text-cyan" size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">Nexus</p>
            <p className="truncate text-sm font-semibold text-white">Command OS</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={item.label}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => selectView(item.key)}
                      className={cn(
                        "group flex min-h-12 w-full items-center gap-3 rounded-md border px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                        isActive
                          ? "border-cyan/45 bg-cyan/15 text-cyan shadow-glow"
                          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition",
                          isActive
                            ? "border-cyan/35 bg-cyan/15"
                            : "border-white/10 bg-white/[0.03] group-hover:border-white/20"
                        )}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{item.helper}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-2">
          <div className="rounded-md border border-success/20 bg-success/10 p-3">
            <div className="flex items-center gap-2 text-success">
              <ShieldCheck size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">Zero cost</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Free hosting-first policy. Paid services stay opt-in.
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Active workspace</p>
            <p className="mt-1 truncate text-xs font-semibold text-white">{workspaceLabel}</p>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-20 border-b border-white/10 bg-void/55 px-4 py-3 backdrop-blur-xl lg:left-[272px]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Nexus</p>
            <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
              {activeItem?.label ?? "Mission Control"}
            </h1>
            <p className="mt-1 hidden truncate text-xs text-slate-500 sm:block">
              {activeItem?.helper ?? "Project command system"}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <HeaderPill
              icon={session.mode === "local" ? <Fingerprint size={14} /> : <Cloud size={14} />}
              label={workspaceLabel}
            />
            <HeaderPill icon={<ShieldCheck size={14} />} label="$0 policy" tone="success" />
            <Button
              icon={<Sparkles size={16} />}
              variant="primary"
              onClick={() => selectView("mission")}
            >
              AI Briefing
            </Button>
            <Button
              icon={<LogOut size={16} />}
              variant="ghost"
              aria-label="Log out"
              title="Log out"
              onClick={onLogout}
            />
          </div>
          <Button
            icon={<LogOut size={16} />}
            variant="ghost"
            className="h-10 w-10 px-0 sm:hidden"
            aria-label="Log out"
            title="Log out"
            onClick={onLogout}
          />
        </div>
      </header>

      <main className="relative z-10 min-h-screen px-4 pb-28 pt-24 lg:pb-6 lg:pl-[288px]">
        {children}
      </main>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <section
            id="mobile-more-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="glass-panel absolute bottom-0 left-0 right-0 rounded-t-lg border-x-0 border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Navigation</p>
                <h2 id="mobile-more-title" className="mt-1 text-lg font-semibold text-white">
                  More Nexus tools
                </h2>
              </div>
              <button
                ref={closeMobileMenuRef}
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => selectView(item.key)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-md border px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                      isActive
                        ? "border-cyan/45 bg-cyan/15 text-cyan"
                        : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-current/20 bg-white/[0.03]">
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      <nav
        aria-label="Primary navigation"
        className="glass-panel fixed bottom-3 left-3 right-3 z-30 grid grid-cols-5 gap-1 rounded-lg p-2 lg:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              onClick={() => selectView(item.key)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                isActive
                  ? "border-cyan/45 bg-cyan/15 text-cyan shadow-glow"
                  : "border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon size={18} />
              <span className="max-w-full truncate text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-more-navigation"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
            mobileMoreActive
              ? "border-cyan/45 bg-cyan/15 text-cyan shadow-glow"
              : "border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white"
          )}
        >
          <MoreHorizontal size={19} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}

function HeaderPill({
  icon,
  label,
  tone = "default"
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-medium",
        tone === "success"
          ? "border-success/25 bg-success/10 text-success"
          : "border-white/10 bg-white/[0.04] text-slate-300"
      )}
    >
      {icon}
      {label}
    </span>
  );
}

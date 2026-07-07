import {
  BarChart3,
  CalendarDays,
  CircuitBoard,
  Dna,
  Factory,
  Github,
  Lightbulb,
  LogOut,
  NotebookPen,
  Orbit,
  Rocket,
  Settings,
  Sparkles,
  UserCircle
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ViewKey =
  | "mission"
  | "projects"
  | "galaxy"
  | "timeline"
  | "city"
  | "analytics"
  | "calendar"
  | "ideas"
  | "journal"
  | "integrations"
  | "settings"
  | "profile";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof Rocket;
}

const navItems: NavItem[] = [
  { key: "mission", label: "Mission", icon: Rocket },
  { key: "projects", label: "Projects", icon: CircuitBoard },
  { key: "galaxy", label: "Galaxy", icon: Orbit },
  { key: "timeline", label: "DNA", icon: Dna },
  { key: "city", label: "City", icon: Factory },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "ideas", label: "Ideas", icon: Lightbulb },
  { key: "journal", label: "Journal", icon: NotebookPen },
  { key: "integrations", label: "Integrations", icon: Github },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "profile", label: "Profile", icon: UserCircle }
];

interface AppShellProps {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({ activeView, onViewChange, onLogout, children }: AppShellProps) {
  const activeItem = navItems.find((item) => item.key === activeView);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-slate-100">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-30" />

      <aside className="glass-panel fixed left-3 top-3 z-30 hidden h-[calc(100vh-1.5rem)] w-[76px] rounded-lg p-2 lg:block">
        <div className="mb-4 flex h-14 items-center justify-center rounded-md border border-cyan/25 bg-cyan/10">
          <Sparkles className="text-cyan" size={24} />
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => onViewChange(item.key)}
                className={cn(
                  "flex h-11 w-full items-center justify-center rounded-md border text-slate-400 transition",
                  isActive
                    ? "border-cyan/45 bg-cyan/15 text-cyan shadow-glow"
                    : "border-transparent hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon size={19} />
              </button>
            );
          })}
        </nav>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-20 border-b border-white/10 bg-void/55 px-4 py-3 backdrop-blur-xl lg:left-[96px]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Nexus</p>
            <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
              {activeItem?.label ?? "Mission Control"}
            </h1>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              icon={<Sparkles size={16} />}
              variant="primary"
              onClick={() => onViewChange("mission")}
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

      <main className="relative z-10 min-h-screen px-4 pb-24 pt-24 lg:pb-6 lg:pl-[112px]">
        {children}
      </main>

      <nav className="no-scrollbar glass-panel fixed bottom-3 left-3 right-3 z-30 flex gap-1 overflow-x-auto rounded-lg p-2 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => onViewChange(item.key)}
              className={cn(
                "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-md border transition",
                isActive
                  ? "border-cyan/45 bg-cyan/15 text-cyan shadow-glow"
                  : "border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon size={19} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Database,
  Gauge,
  Github,
  Lightbulb,
  Monitor,
  NotebookPen,
  Save,
  Settings,
  ShieldCheck,
  UserCircle
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { IntegrationsView } from "@/pages/IntegrationsView";
import { IdeasView, JournalView } from "@/pages/PlanningViews";
import type { NexusSession } from "@/types/auth";

const PREFERENCES_KEY = "nexus.preferences.v1";

interface Preferences {
  reducedMotion: boolean;
  compactInterface: boolean;
  autoBriefing: boolean;
}

const defaults: Preferences = {
  reducedMotion: false,
  compactInterface: false,
  autoBriefing: true
};

type ControlModule = "settings" | "ideas" | "journal" | "integrations" | "profile" | "security";

const controlModules: Array<{
  key: ControlModule;
  label: string;
  description: string;
  icon: typeof Settings;
}> = [
  {
    key: "settings",
    label: "Settings",
    description: "Interface, motion, density, and briefing preferences.",
    icon: Settings
  },
  {
    key: "ideas",
    label: "Ideas",
    description: "Capture raw concepts before they become projects.",
    icon: Lightbulb
  },
  {
    key: "journal",
    label: "Journal",
    description: "Project notes, daily decisions, and reflection logs.",
    icon: NotebookPen
  },
  {
    key: "integrations",
    label: "Integrations",
    description: "GitHub, calendar, drive, chat, and future app links.",
    icon: Github
  },
  {
    key: "profile",
    label: "Profile",
    description: "Identity, workspace boundary, and session details.",
    icon: UserCircle
  },
  {
    key: "security",
    label: "Security",
    description: "Zero-cost security posture, data export, and account safety.",
    icon: ShieldCheck
  }
];

export function ControlCenterView({ session }: { session: NexusSession }) {
  const [activeModule, setActiveModule] = useState<ControlModule>("settings");

  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="glass-panel rounded-lg p-3">
        <div className="px-2 py-2">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Nexus</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Control Center</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Secondary tools live here so the command rail stays focused.
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {controlModules.map((module) => {
            const Icon = module.icon;
            const active = activeModule === module.key;
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => setActiveModule(module.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border p-3 text-left transition",
                  active
                    ? "border-cyan/45 bg-cyan/10 shadow-glow"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                    active ? "border-cyan/35 bg-cyan/15 text-cyan" : "border-white/10 text-slate-400"
                  )}
                >
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{module.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{module.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0">
        {activeModule === "settings" ? <SettingsView embedded /> : null}
        {activeModule === "ideas" ? <IdeasView session={session} /> : null}
        {activeModule === "journal" ? <JournalView session={session} /> : null}
        {activeModule === "integrations" ? <IntegrationsView /> : null}
        {activeModule === "profile" ? <ProfileView session={session} embedded /> : null}
        {activeModule === "security" ? <SecurityCenter session={session} /> : null}
      </div>
    </section>
  );
}

function SecurityCenter({ session }: { session: NexusSession }) {
  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-success">Security</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Workspace Safety</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <PreferencePanel icon={<ShieldCheck size={20} />} title="Authentication">
          <SecurityLine label="Session" value={session.mode === "firebase" ? "Google verified" : session.mode} />
          <SecurityLine label="Workspace" value={session.workspaceId} />
          <SecurityLine label="Boundary" value={session.mode === "api" ? "Server isolated" : "Local-first"} />
        </PreferencePanel>
        <PreferencePanel icon={<Database size={20} />} title="Data Policy">
          <SecurityLine label="Project cost" value="$0 target" />
          <SecurityLine label="Secrets" value="Never stored in client code" />
          <SecurityLine label="Exports" value="Planned under data controls" />
        </PreferencePanel>
        <PreferencePanel icon={<Gauge size={20} />} title="Hardening">
          <SecurityLine label="Input validation" value="Enabled on auth forms" />
          <SecurityLine label="Dependency audit" value="Required before deploy" />
          <SecurityLine label="Tenant tests" value="Phase 4/5 target" />
        </PreferencePanel>
      </div>
    </section>
  );
}

export function SettingsView({ embedded = false }: { embedded?: boolean }) {
  return <SettingsPanel embedded={embedded} />;
}

function SettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}") };
    } catch {
      return defaults;
    }
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", preferences.reducedMotion);
  }, [preferences.reducedMotion]);

  function save() {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <section className={cn("mx-auto max-w-4xl", embedded ? "xl:mx-0" : "")}>
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">System</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Settings</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <PreferencePanel icon={<Monitor size={20} />} title="Interface">
          <PreferenceToggle
            label="Reduce motion"
            checked={preferences.reducedMotion}
            onChange={(checked) => setPreferences({ ...preferences, reducedMotion: checked })}
          />
          <PreferenceToggle
            label="Compact data density"
            checked={preferences.compactInterface}
            onChange={(checked) => setPreferences({ ...preferences, compactInterface: checked })}
          />
        </PreferencePanel>
        <PreferencePanel icon={<Gauge size={20} />} title="Automation">
          <PreferenceToggle
            label="Daily mission briefing"
            checked={preferences.autoBriefing}
            onChange={(checked) => setPreferences({ ...preferences, autoBriefing: checked })}
          />
        </PreferencePanel>
      </div>
      <Button className="mt-4" icon={<Save size={16} />} onClick={save}>
        {saved ? "Saved" : "Save Settings"}
      </Button>
    </section>
  );
}

export function ProfileView({ session, embedded = false }: { session: NexusSession; embedded?: boolean }) {
  return (
    <section className={cn("mx-auto max-w-4xl", embedded ? "xl:mx-0" : "")}>
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet">Identity</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Profile</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="glass-panel flex min-h-56 items-center justify-center rounded-lg">
          <div className="text-center">
            {session.photoUrl ? (
              <img
                src={session.photoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="mx-auto h-16 w-16 rounded-full border border-cyan/30 object-cover"
              />
            ) : (
              <UserCircle className="mx-auto text-cyan" size={64} />
            )}
            <p className="mt-3 font-medium text-white">
              {session.displayName ??
                (session.mode === "api" ? "Nexus Member" : "Local Commander")}
            </p>
            {session.email ? <p className="mt-1 text-xs text-slate-500">{session.email}</p> : null}
          </div>
        </div>
        <div className="glass-panel rounded-lg p-5">
          <div className="flex items-center gap-2 text-success">
            <ShieldCheck size={18} />
            <span className="text-sm font-medium">
              {session.mode === "api"
                ? "Authenticated workspace"
                : session.mode === "firebase"
                  ? "Google identity verified"
                  : "Offline local session"}
            </span>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <IdentityField label="User ID" value={session.userId} />
            <IdentityField label="Workspace ID" value={session.workspaceId} />
            <IdentityField label="Session mode" value={session.mode.toUpperCase()} />
            <IdentityField
              label="Data boundary"
              value={session.mode === "api" ? "Isolated workspace" : "This device"}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function SecurityLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

function PreferencePanel({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-3 text-cyan">
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function PreferenceToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-slate-300">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-cyan"
      />
    </label>
  );
}

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-2 break-all font-mono text-sm text-slate-200">{value}</dd>
    </div>
  );
}

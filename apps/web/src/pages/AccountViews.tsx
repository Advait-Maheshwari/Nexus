import { useEffect, useState } from "react";
import { Gauge, Monitor, Save, ShieldCheck, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
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

export function SettingsView() {
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
    <section className="mx-auto max-w-4xl">
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

export function ProfileView({ session }: { session: NexusSession }) {
  return (
    <section className="mx-auto max-w-4xl">
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

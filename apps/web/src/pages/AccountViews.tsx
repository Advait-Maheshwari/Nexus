import { useEffect, useState } from "react";
import {
  BellRing,
  Check,
  Cloud,
  Copy,
  Database,
  Fingerprint,
  FlaskConical,
  Gauge,
  Github,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Monitor,
  NotebookPen,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCircle,
  Users,
  X
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  changeAccountPassword,
  createWorkspaceInvitation,
  deleteAccount,
  enterPrivateDemo,
  fetchAccount,
  fetchWorkspaceUsage,
  listWorkspaceMembers,
  listWorkspaces,
  logoutAllSessions,
  mergeAccount,
  switchWorkspace,
  updateWorkspaceMemberRole,
  updateAccount
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { IntegrationsView } from "@/pages/IntegrationsView";
import { IdeasView, JournalView } from "@/pages/PlanningViews";
import type {
  NexusAccount,
  NexusRole,
  NexusSession,
  NexusWorkspace,
  WorkspaceMember,
  WorkspaceUsage
} from "@/types/auth";
import type { MissionData } from "@/types/domain";

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

const avatarPresets = [
  { label: "Orbit", path: "/avatars/orbit.svg" },
  { label: "Nova", path: "/avatars/nova.svg" },
  { label: "Atlas", path: "/avatars/atlas.svg" },
  { label: "Luna", path: "/avatars/luna.svg" }
] as const;

function resolveAvatarUrl(value?: string) {
  if (!value?.startsWith("/avatars/")) {
    return value;
  }
  return `${import.meta.env.BASE_URL}${value.slice(1)}`;
}

type ControlModule =
  | "settings"
  | "team"
  | "ideas"
  | "journal"
  | "integrations"
  | "profile"
  | "security";

const controlModules: Array<{
  key: ControlModule;
  label: string;
  description: string;
  icon: typeof Settings;
}> = [
  {
    key: "team",
    label: "Team",
    description: "Workspace members, roles, invitations, and free-plan usage.",
    icon: Users
  },
  {
    key: "settings",
    label: "Settings",
    description: "Interface density, motion, briefing, and cost policy.",
    icon: Settings
  },
  {
    key: "ideas",
    label: "Ideas",
    description: "Capture raw concepts without cluttering the main rail.",
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

export function ControlCenterView({
  session,
  missionData,
  onSessionChange,
  onSessionRevoked
}: {
  session: NexusSession;
  missionData: MissionData;
  onSessionChange: (session: NexusSession) => void;
  onSessionRevoked: () => void;
}) {
  const [activeModule, setActiveModule] = useState<ControlModule>("settings");

  return (
    <section className="grid min-h-[calc(100vh-8rem)] min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="glass-panel min-w-0 overflow-hidden rounded-lg p-3">
        <div className="rounded-md border border-cyan/20 bg-cyan/10 px-3 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Nexus</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Control Center</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Settings, private planning tools, integrations, and security live here so the main
            command rail stays focused.
          </p>
        </div>
        <div className="no-scrollbar mt-3 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2 xl:overflow-visible xl:pb-0">
          {controlModules.map((module) => {
            const Icon = module.icon;
            const active = activeModule === module.key;
            return (
              <button
                key={module.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveModule(module.key)}
                className={cn(
                  "flex min-h-12 min-w-[148px] items-center gap-3 rounded-md border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan xl:w-full xl:min-w-0 xl:items-start",
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
                  <span className="mt-1 hidden text-xs leading-5 text-slate-500 xl:block">
                    {module.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 hidden rounded-md border border-white/10 bg-white/[0.035] p-3 xl:block">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workspace mode</p>
          <p className="mt-1 text-sm font-semibold text-white">
            Cloud account
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Email and Google identities connect to an isolated server workspace.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        {activeModule === "settings" ? (
          <SettingsView
            session={session}
            onSessionChange={onSessionChange}
            onSessionRevoked={onSessionRevoked}
            embedded
          />
        ) : null}
        {activeModule === "team" ? (
          <TeamCenter session={session} onSessionChange={onSessionChange} />
        ) : null}
        {activeModule === "ideas" ? <IdeasView session={session} /> : null}
        {activeModule === "journal" ? <JournalView session={session} /> : null}
        {activeModule === "integrations" ? <IntegrationsView data={missionData} /> : null}
        {activeModule === "profile" ? (
          <ProfileView session={session} onSessionChange={onSessionChange} embedded />
        ) : null}
        {activeModule === "security" ? (
          <SecurityCenter session={session} onSessionRevoked={onSessionRevoked} />
        ) : null}
      </div>
    </section>
  );
}

function TeamCenter({
  session,
  onSessionChange
}: {
  session: NexusSession;
  onSessionChange: (session: NexusSession) => void;
}) {
  const [workspaces, setWorkspaces] = useState<NexusWorkspace[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<NexusRole, "owner">>("member");
  const [inviteLink, setInviteLink] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(session.mode === "api");

  useEffect(() => {
    if (session.mode !== "api") return;
    let active = true;
    setBusy(true);
    Promise.all([
      listWorkspaces(session.accessToken),
      listWorkspaceMembers(session.accessToken),
      fetchWorkspaceUsage(session.accessToken)
    ])
      .then(([nextWorkspaces, nextMembers, nextUsage]) => {
        if (!active) return;
        setWorkspaces(nextWorkspaces);
        setMembers(nextMembers);
        setUsage(nextUsage);
      })
      .catch((error) => {
        if (active) setStatus(error instanceof Error ? error.message : "Team loading failed.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, session.mode]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const invitation = await createWorkspaceInvitation(
        session.accessToken,
        inviteEmail.trim(),
        inviteRole
      );
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set("invite", invitation.inviteToken ?? "");
      setInviteLink(url.toString());
      setInviteEmail("");
      setStatus("Invitation link created. It expires in seven days.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invitation creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, role: Exclude<NexusRole, "owner">) {
    setBusy(true);
    setStatus("");
    try {
      const updated = await updateWorkspaceMemberRole(session.accessToken, userId, role);
      setMembers((current) => current.map((member) => (member.userId === userId ? updated : member)));
      setStatus("Member role updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Role update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function selectWorkspace(workspaceId: string) {
    if (workspaceId === session.workspaceId) return;
    setBusy(true);
    setStatus("");
    try {
      const switched = await switchWorkspace(session.accessToken, workspaceId);
      onSessionChange({
        ...switched,
        identityProvider: session.identityProvider,
        photoUrl: session.photoUrl
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Workspace switch failed.");
      setBusy(false);
    }
  }

  if (session.mode !== "api") {
    return (
      <section className="glass-panel mx-auto max-w-3xl rounded-lg p-6">
        <Users className="text-cyan" size={24} />
        <h2 className="mt-3 text-xl font-semibold text-white">Team workspaces require cloud sign-in</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Local owner mode stays private to this device. Sign in with email or Google to invite members.
        </p>
      </section>
    );
  }

  const canInvite = session.role === "owner" || session.role === "admin";

  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Workspace</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Team and Usage</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Collaborate through explicit roles while keeping the personal SaaS baseline on free infrastructure.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="glass-panel rounded-lg p-5">
            <h3 className="font-semibold text-white">Members</h3>
            <div className="mt-4 divide-y divide-white/10">
              {members.map((member) => (
                <div key={member.userId} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan/20 bg-cyan/10 text-sm font-semibold text-cyan">
                    {member.fullName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{member.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  {session.role === "owner" && member.role !== "owner" ? (
                    <select
                      value={member.role}
                      disabled={busy}
                      aria-label={`Role for ${member.fullName}`}
                      onChange={(event) =>
                        void changeRole(
                          member.userId,
                          event.target.value as Exclude<NexusRole, "owner">
                        )
                      }
                      className="min-h-10 rounded-md border border-white/10 bg-void px-3 text-sm text-slate-200"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase text-slate-400">
                      {member.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {canInvite ? (
            <section className="glass-panel rounded-lg p-5">
              <h3 className="font-semibold text-white">Invite a Member</h3>
              <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]" onSubmit={invite}>
                <AccountInput
                  label="Email"
                  type="email"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  autoComplete="email"
                />
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">Role</span>
                  <select
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value as Exclude<NexusRole, "owner">)
                    }
                    className="min-h-11 w-full rounded-md border border-white/10 bg-void px-3 text-sm text-slate-200"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </label>
                <Button className="self-end" type="submit" disabled={busy || !inviteEmail.trim()}>
                  Create Link
                </Button>
              </form>
              {inviteLink ? (
                <div className="mt-4 flex min-w-0 items-center gap-2 rounded-md border border-success/20 bg-success/10 p-3">
                  <p className="min-w-0 flex-1 truncate font-mono text-xs text-success">{inviteLink}</p>
                  <Button
                    type="button"
                    icon={<Copy size={15} />}
                    onClick={() => void navigator.clipboard.writeText(inviteLink)}
                  >
                    Copy
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="glass-panel rounded-lg p-5">
            <h3 className="font-semibold text-white">Workspaces</h3>
            <div className="mt-4 space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void selectWorkspace(workspace.id)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition",
                    workspace.id === session.workspaceId
                      ? "border-cyan/40 bg-cyan/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  )}
                >
                  <span className="block truncate text-sm font-semibold text-white">{workspace.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{workspace.role}</span>
                </button>
              ))}
            </div>
          </section>
          {usage ? (
            <section className="glass-panel rounded-lg p-5">
              <h3 className="font-semibold text-white">Zero-Cost Limits</h3>
              <div className="mt-4 space-y-4">
                <UsageLine label="Projects" value={usage.projects} limit={usage.projectLimit} />
                <UsageLine label="Tasks" value={usage.tasks} limit={usage.taskLimit} />
                <UsageLine label="Members" value={usage.members} limit={usage.memberLimit} />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">Plan: {usage.planCode}</p>
            </section>
          ) : null}
        </aside>
      </div>
      {status ? <p role="status" className="mt-4 text-sm text-slate-400">{status}</p> : null}
    </section>
  );
}

function UsageLine({ label, value, limit }: { label: string; value: number; limit: number }) {
  const percent = Math.min(100, Math.round((value / limit) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-300">{value} / {limit}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-cyan transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function SecurityCenter({
  session,
  onSessionRevoked
}: {
  session: NexusSession;
  onSessionRevoked: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setPasswordStatus("");
    try {
      await changeAccountPassword(session.accessToken, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus("Password updated. Other signed-in devices were revoked.");
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : "Password update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeEverySession() {
    setBusy(true);
    setPasswordStatus("");
    try {
      await logoutAllSessions(session.accessToken);
      onSessionRevoked();
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : "Session revocation failed.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-success">Security</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Workspace Safety</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          HCI rule for security: make the safe path obvious, make risky paths quiet, and keep
          account boundaries readable at a glance.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <PreferencePanel icon={<ShieldCheck size={20} />} title="Authentication">
          <SecurityLine label="Session" value="API verified" />
          <SecurityLine label="Workspace" value={session.workspaceId} />
          <SecurityLine label="Boundary" value="Server isolated" />
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
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PreferencePanel icon={<Fingerprint size={20} />} title="Identity Controls">
          <SecurityLine label="Full name" value="Letters and spaces only on sign up" />
          <SecurityLine label="Password minimum" value="10 characters" />
        </PreferencePanel>
        <PreferencePanel icon={<Cloud size={20} />} title="Zero-Cost Boundary">
          <SecurityLine label="Firebase hosting" value="Free tier target" />
          <SecurityLine label="Render API" value="Free instance only" />
          <SecurityLine label="Neon database" value="Free branch/storage policy" />
        </PreferencePanel>
      </div>
      {session.mode === "api" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PreferencePanel icon={<LockKeyhole size={20} />} title="Password">
            {session.identityProvider === "google" ? (
              <p className="text-sm leading-6 text-slate-400">
                This account uses Google identity. Password management stays with Google.
              </p>
            ) : (
              <form className="space-y-3" onSubmit={submitPassword}>
                <AccountInput
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
                <AccountInput
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  minLength={10}
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={busy || !currentPassword || newPassword.length < 10}>
                  Update Password
                </Button>
              </form>
            )}
          </PreferencePanel>
          <PreferencePanel icon={<LogOut size={20} />} title="Active Sessions">
            <p className="text-sm leading-6 text-slate-400">
              Sign out every browser and device connected to this account, including this one.
            </p>
            <Button
              type="button"
              className="border-danger/35 text-danger hover:border-danger/60 hover:bg-danger/10"
              disabled={busy}
              onClick={() => void revokeEverySession()}
            >
              Revoke All Sessions
            </Button>
          </PreferencePanel>
        </div>
      ) : null}
      {passwordStatus ? (
        <p role="status" className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
          {passwordStatus}
        </p>
      ) : null}
    </section>
  );
}

export function SettingsView({
  session,
  onSessionChange,
  onSessionRevoked,
  embedded = false
}: {
  session: NexusSession;
  onSessionChange: (session: NexusSession) => void;
  onSessionRevoked: () => void;
  embedded?: boolean;
}) {
  return (
    <SettingsPanel
      session={session}
      onSessionChange={onSessionChange}
      onSessionRevoked={onSessionRevoked}
      embedded={embedded}
    />
  );
}

function SettingsPanel({
  session,
  onSessionChange,
  onSessionRevoked,
  embedded = false
}: {
  session: NexusSession;
  onSessionChange: (session: NexusSession) => void;
  onSessionRevoked: () => void;
  embedded?: boolean;
}) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}") };
    } catch {
      return defaults;
    }
  });
  const [saved, setSaved] = useState(false);
  const [account, setAccount] = useState<NexusAccount | null>(null);
  const [accountStatus, setAccountStatus] = useState("");
  const [accountBusy, setAccountBusy] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", preferences.reducedMotion);
    document.documentElement.classList.toggle("compact-interface", preferences.compactInterface);
  }, [preferences.compactInterface, preferences.reducedMotion]);

  useEffect(() => {
    let active = true;
    setAccountBusy(true);
    void fetchAccount(session.accessToken)
      .then((nextAccount) => {
        if (active) setAccount(nextAccount);
      })
      .catch((error) => {
        if (active) {
          setAccountStatus(error instanceof Error ? error.message : "Account controls failed to load.");
        }
      })
      .finally(() => {
        if (active) setAccountBusy(false);
      });
    return () => {
      active = false;
    };
  }, [session.accessToken]);

  function save() {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  async function openPrivateDemo() {
    setAccountBusy(true);
    setAccountStatus("");
    try {
      const demoSession = await enterPrivateDemo(session.accessToken);
      onSessionChange({
        ...demoSession,
        identityProvider: session.identityProvider,
        photoUrl: session.photoUrl
      });
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Private demo could not be opened.");
      setAccountBusy(false);
    }
  }

  async function removeAccount(event: React.FormEvent) {
    event.preventDefault();
    setAccountBusy(true);
    setAccountStatus("");
    try {
      await deleteAccount(session.accessToken, deletePhrase, deletePassword || undefined);
      onSessionRevoked();
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Account deletion failed.");
      setAccountBusy(false);
    }
  }

  return (
    <section className={cn("mx-auto max-w-5xl", embedded ? "xl:mx-0" : "")}>
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">System</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Settings</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          The default experience favors desktop focus, readable hierarchy, calm motion, and no-cost
          infrastructure decisions.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <PreferencePanel icon={<Monitor size={20} />} title="Interface">
          <PreferenceToggle
            label="Reduce motion"
            description="Shortens animation for lower cognitive load and better battery life."
            checked={preferences.reducedMotion}
            onChange={(checked) => setPreferences({ ...preferences, reducedMotion: checked })}
          />
          <PreferenceToggle
            label="Compact data density"
            description="Tightens future list and table spacing for heavy desktop sessions."
            checked={preferences.compactInterface}
            onChange={(checked) => setPreferences({ ...preferences, compactInterface: checked })}
          />
        </PreferencePanel>
        <PreferencePanel icon={<BellRing size={20} />} title="AI Briefing">
          <PreferenceToggle
            label="Daily mission briefing"
            description="Keeps the free rule-based briefing visible until paid AI is explicitly enabled."
            checked={preferences.autoBriefing}
            onChange={(checked) => setPreferences({ ...preferences, autoBriefing: checked })}
          />
          <PreferenceInfo label="AI cost mode" value="Free local heuristics by default" />
          <PreferenceInfo label="Upgrade rule" value="Paid model keys stay opt-in later" />
        </PreferencePanel>
        <PreferencePanel icon={<LayoutDashboard size={20} />} title="Navigation">
          <PreferenceInfo label="Primary rail" value="Mission, Projects, Galaxy, City, Analytics, Calendar" />
          <PreferenceInfo label="Secondary tools" value="Ideas, Journal, Integrations, Profile, Security" />
          <PreferenceInfo label="Desktop priority" value="Labeled controls with mobile fallback" />
        </PreferencePanel>
        <PreferencePanel icon={<Cloud size={20} />} title="Cost Policy">
          <PreferenceInfo label="Project policy" value="$0 from Phase 1 through launch baseline" />
          <PreferenceInfo label="Deployments" value="Use free Firebase/Render/Neon tiers only" />
          <PreferenceInfo label="Future SaaS" value="Paid services require manual approval" />
        </PreferencePanel>
        <PreferencePanel icon={<SlidersHorizontal size={20} />} title="HCI Rules">
          <PreferenceInfo label="Recognition first" value="Main navigation uses labels, icons, and helper text." />
          <PreferenceInfo label="Low friction" value="Secondary tools are grouped away from daily command views." />
          <PreferenceInfo label="Error prevention" value="Authentication always resolves to a server workspace." />
          <PreferenceInfo label="Profile pictures" value="Private bundled presets with no external tracking" />
        </PreferencePanel>
        {account?.demoAccess ? (
          <PreferencePanel icon={<FlaskConical size={20} />} title="Private Demo">
            <p className="text-sm leading-6 text-slate-400">
              Your isolated showcase workspace contains representative Nexus work. This control is
              authorized by the API and is never shown to other accounts.
            </p>
            <Button
              type="button"
              variant="primary"
              icon={<FlaskConical size={16} />}
              disabled={accountBusy || account.demoWorkspace}
              onClick={() => void openPrivateDemo()}
            >
              {account.demoWorkspace ? "Private Demo Active" : "Open Private Demo"}
            </Button>
          </PreferencePanel>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button icon={<Save size={16} />} onClick={save}>
          {saved ? "Saved" : "Save Settings"}
        </Button>
        {accountStatus ? <p role="status" className="text-sm text-slate-400">{accountStatus}</p> : null}
      </div>
      <section className="mt-8 border-t border-danger/30 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-danger">Danger Zone</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Delete Account</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Permanently removes your profile, sessions, private workspaces, and owned project
              data. Shared workspaces with other members must be resolved first.
            </p>
          </div>
          <Button
            type="button"
            icon={<Trash2 size={16} />}
            className="border-danger/45 text-danger hover:border-danger/70 hover:bg-danger/10"
            disabled={accountBusy}
            onClick={() => setDeleteOpen(true)}
          >
            Delete Account
          </Button>
        </div>
      </section>
      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDeleteOpen(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="glass-panel w-full max-w-lg rounded-lg border-danger/35 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-danger">Permanent Action</p>
                <h3 id="delete-account-title" className="mt-2 text-xl font-semibold text-white">
                  Delete your Nexus account?
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close account deletion"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white"
                onClick={() => setDeleteOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              This cannot be undone. Type <strong className="font-mono text-white">DELETE MY ACCOUNT</strong>
              {account?.passwordEnabled ? " and enter your current password" : ""} to continue.
            </p>
            <form className="mt-5 space-y-4" onSubmit={removeAccount}>
              <AccountInput
                label="Confirmation phrase"
                value={deletePhrase}
                onChange={setDeletePhrase}
                autoComplete="off"
              />
              {account?.passwordEnabled ? (
                <AccountInput
                  label="Current password"
                  type="password"
                  value={deletePassword}
                  onChange={setDeletePassword}
                  autoComplete="current-password"
                />
              ) : null}
              <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
                <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  icon={<Trash2 size={16} />}
                  className="border-danger/55 bg-danger/10 text-danger hover:bg-danger/15"
                  disabled={
                    accountBusy ||
                    deletePhrase !== "DELETE MY ACCOUNT" ||
                    Boolean(account?.passwordEnabled && !deletePassword)
                  }
                >
                  {accountBusy ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function ProfileView({
  session,
  onSessionChange,
  embedded = false
}: {
  session: NexusSession;
  onSessionChange?: (session: NexusSession) => void;
  embedded?: boolean;
}) {
  const [account, setAccount] = useState<NexusAccount | null>(null);
  const [fullName, setFullName] = useState(session.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(session.photoUrl ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(session.mode === "api");

  useEffect(() => {
    if (session.mode !== "api") return;
    let active = true;
    setBusy(true);
    void fetchAccount(session.accessToken)
      .then((nextAccount) => {
        if (!active) return;
        setAccount(nextAccount);
        setFullName(nextAccount.displayName);
        setAvatarUrl(nextAccount.photoUrl ?? "");
      })
      .catch((error) => {
        if (active) setStatus(error instanceof Error ? error.message : "Account loading failed.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, session.mode]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (session.mode !== "api") return;
    setBusy(true);
    setStatus("");
    try {
      const nextAccount = await updateAccount(
        session.accessToken,
        fullName.trim(),
        avatarUrl.startsWith("/avatars/") ? avatarUrl : undefined
      );
      setAccount(nextAccount);
      setFullName(nextAccount.displayName);
      onSessionChange?.(mergeAccount(session, nextAccount));
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Profile update failed.");
    } finally {
      setBusy(false);
    }
  }

  const displayName = account?.displayName ?? session.displayName;
  const email = account?.email ?? session.email;

  return (
    <section className={cn("mx-auto max-w-4xl", embedded ? "xl:mx-0" : "")}>
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet">Identity</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Profile</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="glass-panel flex min-h-56 items-center justify-center rounded-lg">
          <div className="text-center">
            {avatarUrl || session.photoUrl ? (
              <img
                src={resolveAvatarUrl(avatarUrl || session.photoUrl)}
                alt=""
                referrerPolicy="no-referrer"
                className="mx-auto h-16 w-16 rounded-full border border-cyan/30 object-cover"
              />
            ) : (
              <UserCircle className="mx-auto text-cyan" size={64} />
            )}
            <p className="mt-3 font-medium text-white">
              {displayName ?? "Nexus Member"}
            </p>
            {email ? <p className="mt-1 text-xs text-slate-500">{email}</p> : null}
          </div>
        </div>
        <div className="glass-panel rounded-lg p-5">
          <div className="flex items-center gap-2 text-success">
            <ShieldCheck size={18} />
            <span className="text-sm font-medium">
              Authenticated workspace
            </span>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <IdentityField label="User ID" value={session.userId} />
            <IdentityField label="Workspace ID" value={session.workspaceId} />
            <IdentityField label="Session mode" value={session.mode.toUpperCase()} />
            <IdentityField label="Role" value={(account?.role ?? session.role ?? "owner").toUpperCase()} />
            <IdentityField
              label="Data boundary"
              value={session.mode === "api" ? "Isolated workspace" : "This device"}
            />
          </dl>
        </div>
      </div>
      {session.mode === "api" ? (
        <form className="glass-panel mt-4 rounded-lg p-5" onSubmit={saveProfile}>
          <div className="flex items-center gap-3 text-cyan">
            <UserCircle size={20} />
            <h3 className="font-semibold text-white">Account Details</h3>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <AccountInput
              label="Full name"
              value={fullName}
              onChange={(value) => setFullName(value.replace(/[^\p{L} ]/gu, ""))}
              autoComplete="name"
            />
            <AccountInput label="Email" value={email ?? ""} disabled onChange={() => undefined} />
          </div>
          <fieldset className="mt-5 border-t border-white/10 pt-5">
            <legend className="text-sm font-semibold text-white">Profile picture</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Bundled with Nexus for fast loading, privacy, and zero external image cost.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {avatarPresets.map((avatar) => {
                const selected = avatarUrl === avatar.path;
                return (
                  <button
                    key={avatar.path}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAvatarUrl(avatar.path)}
                    className={cn(
                      "relative flex min-h-24 flex-col items-center justify-center rounded-md border p-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                      selected
                        ? "border-cyan/55 bg-cyan/10 shadow-glow"
                        : "border-white/10 bg-white/[0.035] hover:border-white/25"
                    )}
                  >
                    <img
                      src={resolveAvatarUrl(avatar.path)}
                      alt=""
                      className="h-12 w-12 rounded-full border border-white/15 object-cover"
                    />
                    <span className="mt-2 text-xs font-medium text-slate-300">{avatar.label}</span>
                    {selected ? (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan text-void">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" icon={<Save size={16} />} disabled={busy || !fullName.trim()}>
              {busy ? "Saving..." : "Save Profile"}
            </Button>
            {status ? <p role="status" className="text-sm text-slate-400">{status}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}

function AccountInput({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  minLength,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        minLength={minLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan/45 focus:ring-2 focus:ring-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
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
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
      <span>
        <span className="block font-medium text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition",
          checked ? "border-cyan/45 bg-cyan/25" : "border-white/15 bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full transition",
            checked ? "translate-x-5 bg-cyan text-void" : "translate-x-0 bg-slate-500"
          )}
        >
          {checked ? <Check size={10} /> : null}
        </span>
      </span>
    </label>
  );
}

function PreferenceInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{value}</p>
    </div>
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

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  Database,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { fetchAdminWorkspaceDashboard } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AdminSessionSummary,
  AdminWorkspaceDashboard,
  AdminWorkspaceUser,
  NexusSession
} from "@/types/auth";

export function AdminDashboard({ session }: { session: NexusSession }) {
  const [dashboard, setDashboard] = useState<AdminWorkspaceDashboard | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(session.mode === "api");

  const identityStats = useMemo(() => {
    const users = dashboard?.users ?? [];
    return {
      google: users.filter((user) => user.googleEnabled).length,
      password: users.filter((user) => user.passwordEnabled).length,
      verified: users.filter((user) => user.emailVerified).length
    };
  }, [dashboard]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken]);

  async function load() {
    if (session.mode !== "api") return;
    setLoading(true);
    setStatus("");
    try {
      setDashboard(await fetchAdminWorkspaceDashboard(session.accessToken));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin dashboard loading failed.");
    } finally {
      setLoading(false);
    }
  }

  if (session.role !== "owner") {
    return (
      <section className="glass-panel mx-auto max-w-3xl rounded-lg p-6">
        <ShieldCheck className="text-solar" size={24} />
        <h2 className="mt-3 text-xl font-semibold text-white">Owner Access Required</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          User and session telemetry is restricted to the workspace owner.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Admin</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Users and Sessions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Workspace owner view for account inventory, active sessions, and recent login signals.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCw size={16} />}
          disabled={loading}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          icon={<Users size={18} />}
          label="Users"
          value={String(dashboard?.totalUsers ?? 0)}
          detail={dashboard?.workspaceName ?? "Workspace"}
        />
        <AdminMetric
          icon={<Activity size={18} />}
          label="Active Sessions"
          value={String(dashboard?.activeSessionCount ?? 0)}
          detail="Not revoked and not expired"
          tone={dashboard?.activeSessionCount ? "cyan" : "slate"}
        />
        <AdminMetric
          icon={<Fingerprint size={18} />}
          label="Google Login"
          value={String(identityStats.google)}
          detail="Firebase-linked accounts"
        />
        <AdminMetric
          icon={<ShieldCheck size={18} />}
          label="Verified"
          value={String(identityStats.verified)}
          detail={`${identityStats.password} password-enabled`}
        />
      </div>

      {status ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-risk/25 bg-risk/10 px-3 py-2 text-sm text-risk"
        >
          {status}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel min-w-0 rounded-lg p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">User List</h3>
              <p className="mt-1 text-sm text-slate-500">
                Last login is derived from server-issued sessions.
              </p>
            </div>
            {dashboard ? (
              <span className="font-mono text-[11px] uppercase text-slate-500">
                Updated {formatDateTime(dashboard.generatedAt)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[840px] w-full border-collapse text-left text-sm">
              <thead className="border-y border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">User</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Login</th>
                  <th className="py-3 pr-4 font-medium">Sessions</th>
                  <th className="py-3 pr-4 font-medium">Last Login</th>
                  <th className="py-3 font-medium">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(dashboard?.users ?? []).map((user) => (
                  <UserRow key={user.userId} user={user} />
                ))}
                {!loading && dashboard?.users.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-slate-500" colSpan={6}>
                      No users are attached to this workspace yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel self-start rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 text-cyan">
            <Database size={18} />
            <h3 className="font-semibold text-white">Active Sessions</h3>
          </div>
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {(dashboard?.activeSessions ?? []).map((stored) => (
              <SessionRow key={stored.id} session={stored} users={dashboard?.users ?? []} />
            ))}
            {!loading && dashboard?.activeSessions.length === 0 ? (
              <p className="py-5 text-sm text-slate-500">No active sessions are visible.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function AdminMetric({
  icon,
  label,
  value,
  detail,
  tone = "cyan"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "cyan" | "slate";
}) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <div className={cn("flex items-center gap-2", tone === "cyan" ? "text-cyan" : "text-slate-400")}>
        {icon}
        <p className="font-mono text-xs uppercase tracking-[0.16em]">{label}</p>
      </div>
      <strong className="mt-3 block font-mono text-3xl font-semibold text-white">{value}</strong>
      <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
    </section>
  );
}

function UserRow({ user }: { user: AdminWorkspaceUser }) {
  return (
    <tr className="align-top">
      <td className="py-3 pr-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan/20 bg-cyan/10 text-sm font-semibold text-cyan">
            {user.fullName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <StatusBadge label={user.role} tone={user.role === "owner" ? "cyan" : "slate"} />
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1.5">
          {user.googleEnabled ? <StatusBadge label="Google" tone="success" /> : null}
          {user.passwordEnabled ? <StatusBadge label="Password" tone="slate" /> : null}
          {user.emailVerified ? <StatusBadge label="Verified" tone="success" /> : null}
        </div>
      </td>
      <td className="py-3 pr-4 font-mono text-sm text-slate-300">
        {user.activeSessionCount} active / {user.totalSessionCount} total
      </td>
      <td className="py-3 pr-4 text-slate-300">{formatDateTime(user.lastLoginAt)}</td>
      <td className="max-w-[220px] py-3">
        <code className="block truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-400">
          {user.userId}
        </code>
      </td>
    </tr>
  );
}

function SessionRow({
  session,
  users
}: {
  session: AdminSessionSummary;
  users: AdminWorkspaceUser[];
}) {
  const user = users.find((item) => item.userId === session.userId);
  return (
    <article className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {user?.fullName ?? "Unknown user"}
          </p>
          <p className="truncate text-xs text-slate-500">{user?.email ?? session.userId}</p>
        </div>
        {session.current ? <StatusBadge label="Current" tone="cyan" /> : null}
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-slate-400">
        <SessionLine icon={<Clock3 size={13} />} label="Started" value={formatDateTime(session.createdAt)} />
        <SessionLine icon={<UserCheck size={13} />} label="Expires" value={formatDateTime(session.expiresAt)} />
        <SessionLine icon={<Fingerprint size={13} />} label="Session ID" value={session.id} monospace />
      </dl>
    </article>
  );
}

function SessionLine({
  icon,
  label,
  value,
  monospace = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-slate-600">{icon}</span>
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={cn("min-w-0 truncate text-slate-300", monospace && "font-mono")}>{value}</span>
    </div>
  );
}

function StatusBadge({
  label,
  tone
}: {
  label: string;
  tone: "cyan" | "success" | "slate";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]",
        tone === "cyan" && "border-cyan/30 bg-cyan/10 text-cyan",
        tone === "success" && "border-success/25 bg-success/10 text-success",
        tone === "slate" && "border-white/10 bg-white/[0.04] text-slate-400"
      )}
    >
      {label}
    </span>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

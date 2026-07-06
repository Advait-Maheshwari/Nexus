import { useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  ExternalLink,
  GitCommitHorizontal,
  Github,
  KeyRound,
  RefreshCw,
  ShieldCheck
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { fetchGitHubActivity } from "@/lib/api";
import type { GitHubRepositoryActivity } from "@/types/integrations";

const localActivity: GitHubRepositoryActivity = {
  repository: "Advait-Maheshwari/Nexus",
  source: "local",
  authenticated: false,
  commits: [
    {
      sha: "5b4127c",
      message: "ci: verify frontend and backend milestones",
      author: "Advait-Maheshwari",
      committedAt: "2026-07-06T12:12:00Z",
      url: "",
      verified: false
    },
    {
      sha: "5ab0667",
      message: "feat: make the project galaxy interactive",
      author: "Advait-Maheshwari",
      committedAt: "2026-07-06T12:11:00Z",
      url: "",
      verified: false
    },
    {
      sha: "0913c31",
      message: "feat: add zero-cost project workspace",
      author: "Advait-Maheshwari",
      committedAt: "2026-07-06T12:10:00Z",
      url: "",
      verified: false
    }
  ]
};

export function IntegrationsView() {
  const [owner, setOwner] = useState("Advait-Maheshwari");
  const [repo, setRepo] = useState("Nexus");
  const [activity, setActivity] = useState(localActivity);
  const [loading, setLoading] = useState(false);

  async function refresh(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    try {
      setActivity(await fetchGitHubActivity(owner.trim(), repo.trim()));
    } catch {
      setActivity({ ...localActivity, repository: `${owner}/${repo}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="glass-panel rounded-lg p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Phase 3</p>
            <h2 className="mt-2 text-xl font-semibold text-white">GitHub Link</h2>
          </div>
          <Github size={26} className="text-white" />
        </div>

        <form onSubmit={refresh} className="mt-6 space-y-4">
          <RepoInput label="Owner" value={owner} onChange={setOwner} />
          <RepoInput label="Repository" value={repo} onChange={setRepo} />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""} />}
          >
            Sync Activity
          </Button>
        </form>

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <PolicyLine
            icon={<ShieldCheck size={16} />}
            text="Public repositories work without credentials."
          />
          <PolicyLine
            icon={<KeyRound size={16} />}
            text="Private access uses your local GITHUB_TOKEN."
          />
          <PolicyLine
            icon={<CheckCircle2 size={16} />}
            text="No paid API or hosted connector required."
          />
        </div>
      </aside>

      <section className="glass-panel rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-violet">
              Repository Signal
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{activity.repository}</h2>
          </div>
          <div className="text-right">
            <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1 text-xs text-cyan">
              {activity.source === "github" ? "GitHub connected" : "Local fallback"}
            </span>
            {activity.rateLimitRemaining !== undefined ? (
              <p className="mt-2 font-mono text-xs text-slate-500">
                {activity.rateLimitRemaining} requests remain
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {activity.commits.map((commit) => (
            <article
              key={commit.sha}
              className="grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-violet/25 bg-violet/10 text-violet">
                <GitCommitHorizontal size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white">{commit.message}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {commit.sha.slice(0, 7)} / {commit.author}
                </p>
              </div>
              {commit.url ? (
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open commit ${commit.sha.slice(0, 7)}`}
                  title="Open commit"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 transition hover:border-cyan/30 hover:text-cyan"
                >
                  <ExternalLink size={16} />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function RepoInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
      />
    </label>
  );
}

function PolicyLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6 text-slate-300">
      <span className="mt-1 text-success">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

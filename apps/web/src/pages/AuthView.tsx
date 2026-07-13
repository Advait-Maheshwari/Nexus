import { useState, type FormEvent } from "react";
import { Chrome, LockKeyhole, LogIn, Orbit, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { authenticate } from "@/lib/api";
import { signInWithGoogle } from "@/lib/firebase";
import type { NexusSession } from "@/types/auth";

const OWNER_DEMO_KEY = "nexus.owner.demo.v1";
const OWNER_DEMO_QUERY = "owner_demo";
const OWNER_DEMO_VALUE = "advait";

export function AuthView({ onAuthenticated }: { onAuthenticated: (session: NexusSession) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownerDemoEnabled] = useState(readOwnerDemoAccess);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      onAuthenticated(await authenticate(mode, { email, password, fullName: fullName.trim() }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function continueLocally() {
    onAuthenticated({
      accessToken: "local-demo",
      userId: "local-user",
      workspaceId: "workspace-personal",
      mode: "local",
      identityProvider: "local"
    });
  }

  async function continueWithGoogle() {
    setLoading(true);
    setError("");
    try {
      onAuthenticated(await signInWithGoogle());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google sign-in is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-void px-4 py-10 text-slate-100">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-30" />
      <section className="glass-panel relative z-10 grid w-full max-w-5xl overflow-hidden rounded-lg lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden min-h-[620px] border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan/30 bg-cyan/10 text-cyan">
              <Orbit size={24} />
            </span>
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-cyan">Nexus</p>
            <h1 className="mt-3 max-w-md text-4xl font-semibold leading-tight text-white">
              Your project universe, secured and synchronized.
            </h1>
          </div>
          <div className="space-y-3 text-sm leading-6 text-slate-300">
            <SecurityLine text="Separate workspace ownership for every account." />
            <SecurityLine text="Password hashes never leave the API." />
            <SecurityLine text="JWT sessions expire automatically." />
            <SecurityLine text="Public users only see cloud authentication paths." />
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="flex rounded-md border border-white/10 bg-white/[0.04] p-1">
            <ModeButton active={mode === "register"} onClick={() => setMode("register")}>
              Sign Up
            </ModeButton>
            <ModeButton active={mode === "login"} onClick={() => setMode("login")}>
              Log In
            </ModeButton>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-violet">
                {mode === "register" ? "Create workspace" : "Return to command"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {mode === "register" ? "Create your Nexus account" : "Welcome back"}
              </h2>
            </div>
            {mode === "register" ? (
              <AuthInput
                label="Full name"
                value={fullName}
                onChange={(value) => setFullName(value.replace(/[^A-Za-z ]/g, ""))}
                pattern="(?=.*[A-Za-z])[A-Za-z ]+"
                title="Use alphabets and spaces only"
                autoComplete="name"
              />
            ) : null}
            <AuthInput label="Email" type="email" value={email} onChange={setEmail} />
            <AuthInput
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              minLength={10}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            {error ? (
              <p className="rounded-md border border-risk/25 bg-risk/10 px-3 py-2 text-sm text-risk">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
              icon={mode === "register" ? <UserPlus size={16} /> : <LogIn size={16} />}
            >
              {mode === "register" ? "Create Account" : "Log In"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            Cloud identity
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mb-3 w-full"
            icon={<Chrome size={16} />}
            disabled={loading}
            onClick={continueWithGoogle}
          >
            Continue with Google
          </Button>
          {ownerDemoEnabled ? (
            <div className="mt-3 rounded-md border border-cyan/20 bg-cyan/10 p-3">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan">Owner workspace</p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                icon={<LockKeyhole size={16} />}
                onClick={continueLocally}
              >
                Open Local Owner Workspace
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function readOwnerDemoAccess() {
  if (import.meta.env.DEV) {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedOwnerMode = params.get(OWNER_DEMO_QUERY)?.toLowerCase() === OWNER_DEMO_VALUE;

  if (requestedOwnerMode) {
    sessionStorage.setItem(OWNER_DEMO_KEY, "enabled");
    params.delete(OWNER_DEMO_QUERY);
    const nextSearch = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );
    return true;
  }

  return sessionStorage.getItem(OWNER_DEMO_KEY) === "enabled";
}

function ModeButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-md text-sm font-medium transition ${
        active ? "bg-cyan/15 text-cyan" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function AuthInput({
  label,
  value,
  onChange,
  type = "text",
  minLength,
  autoComplete,
  pattern,
  title
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
  autoComplete?: string;
  pattern?: string;
  title?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-500">
      {label}
      <input
        required
        type={type}
        value={value}
        minLength={minLength}
        autoComplete={autoComplete}
        pattern={pattern}
        title={title}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-white/10 bg-navy px-3 text-sm normal-case text-white outline-none focus:border-cyan/50"
      />
    </label>
  );
}

function SecurityLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <ShieldCheck size={17} className="mt-1 shrink-0 text-success" />
      <span>{text}</span>
    </div>
  );
}

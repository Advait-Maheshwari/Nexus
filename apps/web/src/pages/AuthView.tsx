import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Chrome,
  KeyRound,
  LogIn,
  MailCheck,
  Orbit,
  Send,
  ShieldCheck,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  authenticate,
  requestPasswordReset,
  resendAccountVerification,
  resetAccountPassword,
  verifyAccountEmail
} from "@/lib/api";
import { signInWithGoogle } from "@/lib/firebase";
import type { NexusSession } from "@/types/auth";

type AuthMode = "login" | "register" | "forgot" | "reset";

const passwordRegistrationEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ALLOW_PASSWORD_REGISTRATION === "true";

export function AuthView({ onAuthenticated }: { onAuthenticated: (session: NexusSession) => void }) {
  const initialResetToken = readActionToken("reset_password");
  const [mode, setMode] = useState<AuthMode>(
    initialResetToken ? "reset" : passwordRegistrationEnabled ? "register" : "login"
  );
  const [resetToken] = useState(initialResetToken);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = readActionToken("verify_email");
    if (!token) return;
    setLoading(true);
    setError("");
    void verifyAccountEmail(token)
      .then(() => {
        setMode("login");
        setNotice("Email verified. You can now log in.");
        clearActionToken("verify_email");
      })
      .catch((reason: unknown) => {
        setMode("login");
        setError(reason instanceof Error ? reason.message : "Email verification failed.");
        clearActionToken("verify_email");
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        setNotice(await requestPasswordReset(email));
        return;
      }
      if (mode === "reset") {
        if (!resetToken) throw new Error("This reset link is missing its secure token.");
        await resetAccountPassword(resetToken, password);
        clearActionToken("reset_password");
        setPassword("");
        setMode("login");
        setNotice("Password reset. Log in with your new password.");
        return;
      }
      const result = await authenticate(mode, {
        email,
        password,
        fullName: fullName.trim()
      });
      if ("accessToken" in result) {
        onAuthenticated(result);
        return;
      }
      setPassword("");
      setMode("login");
      setNotice(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      setNotice(await resendAccountVerification(email));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verification request failed.");
    } finally {
      setLoading(false);
    }
  }

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
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

  const isPrimaryAuth = mode === "login" || mode === "register";
  const showResend = mode === "login" && error.toLowerCase().includes("verification");

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
            <SecurityLine text="Verification and reset tokens are single-use and expire." />
            <SecurityLine text="Password hashes and recovery tokens never leave the API." />
            <SecurityLine text="Public users only see cloud authentication paths." />
          </div>
        </div>

        <div className="p-6 sm:p-10">
          {isPrimaryAuth && passwordRegistrationEnabled ? (
            <div className="flex rounded-md border border-white/10 bg-white/[0.04] p-1">
              <ModeButton active={mode === "register"} onClick={() => chooseMode("register")}>
                Sign Up
              </ModeButton>
              <ModeButton active={mode === "login"} onClick={() => chooseMode("login")}>
                Log In
              </ModeButton>
            </div>
          ) : !isPrimaryAuth ? (
            <button
              type="button"
              onClick={() => chooseMode("login")}
              className="inline-flex h-10 items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={16} /> Back to login
            </button>
          ) : null}

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-violet">
                {modeEyebrow(mode)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{modeHeading(mode)}</h2>
              {!passwordRegistrationEnabled && mode === "login" ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  New to Nexus? Continue with Google to create your secure workspace.
                </p>
              ) : null}
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
            {mode !== "reset" ? (
              <AuthInput label="Email" type="email" value={email} onChange={setEmail} />
            ) : null}
            {mode !== "forgot" ? (
              <AuthInput
                label={mode === "reset" ? "New password" : "Password"}
                type="password"
                value={password}
                onChange={setPassword}
                minLength={mode === "login" ? undefined : 10}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            ) : null}
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => chooseMode("forgot")}
                className="text-sm text-cyan transition hover:text-white"
              >
                Forgot password?
              </button>
            ) : null}
            {notice ? (
              <p className="rounded-md border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-risk/25 bg-risk/10 px-3 py-2 text-sm text-risk">
                {error}
              </p>
            ) : null}
            {showResend ? (
              <Button
                type="button"
                variant="secondary"
                disabled={loading || !email}
                className="w-full"
                icon={<Send size={16} />}
                onClick={resendVerification}
              >
                Resend Verification
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
              icon={modeIcon(mode)}
            >
              {modeAction(mode)}
            </Button>
          </form>

          {isPrimaryAuth ? (
            <>
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
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function readActionToken(name: "verify_email" | "reset_password") {
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

function clearActionToken(name: "verify_email" | "reset_password") {
  const params = new URLSearchParams(window.location.search);
  params.delete(name);
  replaceSearch(params);
}

function replaceSearch(params: URLSearchParams) {
  const nextSearch = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
  );
}

function modeEyebrow(mode: AuthMode) {
  if (mode === "register") return "Create workspace";
  if (mode === "forgot") return "Account recovery";
  if (mode === "reset") return "Secure reset";
  return "Return to command";
}

function modeHeading(mode: AuthMode) {
  if (mode === "register") return "Create your Nexus account";
  if (mode === "forgot") return "Recover your account";
  if (mode === "reset") return "Choose a new password";
  return "Welcome back";
}

function modeAction(mode: AuthMode) {
  if (mode === "register") return "Create Account";
  if (mode === "forgot") return "Send Reset Link";
  if (mode === "reset") return "Reset Password";
  return "Log In";
}

function modeIcon(mode: AuthMode) {
  if (mode === "register") return <UserPlus size={16} />;
  if (mode === "forgot") return <MailCheck size={16} />;
  if (mode === "reset") return <KeyRound size={16} />;
  return <LogIn size={16} />;
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

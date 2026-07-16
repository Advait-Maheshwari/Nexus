import { useEffect, useState } from "react";

import { AppShell, type ViewKey } from "@/components/AppShell";
import { useMissionData } from "@/hooks/useMissionData";
import {
  acceptWorkspaceInvitation,
  logoutSession,
  switchWorkspace,
  validateSession
} from "@/lib/api";
import { signOutFirebase } from "@/lib/firebase";
import { AuthView } from "@/pages/AuthView";
import { ControlCenterView } from "@/pages/AccountViews";
import { CityBuilderView } from "@/pages/CityBuilder";
import { MissionControl } from "@/pages/MissionControl";
import { CalendarView } from "@/pages/PlanningViews";
import { ProjectsView } from "@/pages/ProjectsWorkspace";
import {
  AnalyticsView,
  GalaxyView
} from "@/pages/WorkspaceViews";
import type { NexusSession } from "@/types/auth";

const SESSION_KEY = "nexus.session.v1";

function App() {
  const [session, setSession] = useState<NexusSession | null>(loadSession);
  const [sessionReady, setSessionReady] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>("mission");
  const { data: missionData } = useMissionData(session);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView]);

  useEffect(() => {
    let active = true;
    const saved = loadSession();
    if (!saved) {
      setSessionReady(true);
      return () => {
        active = false;
      };
    }

    void validateSession(saved)
      .then((validated) => activateInvitation(validated))
      .then((validated) => {
        if (!active) return;
        persistSession(validated);
        setSession(validated);
      })
      .catch(() => {
        if (!active) return;
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!sessionReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-void text-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" />
          <p className="mt-4 text-sm text-slate-400">Validating secure workspace...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <AuthView
        onAuthenticated={(nextSession) => {
          void activateInvitation(nextSession).then((activated) => {
            persistSession(activated);
            setSession(activated);
          });
        }}
      />
    );
  }

  return (
    <AppShell
      activeView={activeView}
      session={session}
      onViewChange={setActiveView}
      onLogout={() => {
        if (session.mode === "api") {
          void logoutSession();
        }
        if (session.mode === "firebase" || session.identityProvider === "google") {
          void signOutFirebase();
        }
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      }}
    >
      {activeView === "mission" ? <MissionControl data={missionData} /> : null}
      {activeView === "projects" ? <ProjectsView session={session} /> : null}
      {activeView === "galaxy" ? <GalaxyView data={missionData} /> : null}
      {activeView === "analytics" ? <AnalyticsView data={missionData} /> : null}
      {activeView === "city" ? <CityBuilderView data={missionData} /> : null}
      {activeView === "calendar" ? <CalendarView session={session} /> : null}
      {activeView === "control" ? (
        <ControlCenterView
          session={session}
          onSessionChange={(nextSession) => {
            persistSession(nextSession);
            setSession(nextSession);
          }}
          onSessionRevoked={() => {
            sessionStorage.removeItem(SESSION_KEY);
            setSession(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}

function persistSession(session: NexusSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function activateInvitation(session: NexusSession): Promise<NexusSession> {
  if (session.mode !== "api") return session;
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite");
  if (!inviteToken) return session;

  try {
    const workspace = await acceptWorkspaceInvitation(session.accessToken, inviteToken);
    const switched = await switchWorkspace(session.accessToken, workspace.id);
    params.delete("invite");
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`
    );
    return {
      ...switched,
      identityProvider: session.identityProvider,
      photoUrl: session.photoUrl
    };
  } catch {
    return session;
  }
}

export default App;

function loadSession(): NexusSession | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? (JSON.parse(saved) as NexusSession) : null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

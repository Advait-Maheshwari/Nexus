import { useEffect, useState } from "react";

import { AppShell, type ViewKey } from "@/components/AppShell";
import { useMissionData } from "@/hooks/useMissionData";
import {
  acceptWorkspaceInvitation,
  logoutSession,
  switchWorkspace,
  validateSession
} from "@/lib/api";
import { resumeGoogleSession, signOutFirebase } from "@/lib/firebase";
import { publicPreviewMissionData } from "@/lib/publicPreview";
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
const PREVIEW_SESSION: NexusSession = {
  mode: "api",
  accessToken: "public-preview",
  userId: "public-preview",
  workspaceId: "public-preview",
  email: "preview@nexus.local",
  displayName: "Public Preview",
  identityProvider: "password",
  role: "viewer"
};

function App() {
  const [session, setSession] = useState<NexusSession | null>(loadSession);
  const [sessionReady, setSessionReady] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>("mission");
  const [previewMode, setPreviewMode] = useState(false);
  const { data: missionData } = useMissionData(session);
  const activeSession = previewMode ? PREVIEW_SESSION : session;
  const activeMissionData = previewMode ? publicPreviewMissionData : missionData;

  useEffect(() => {
    purgeLegacyLocalData();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView]);

  useEffect(() => {
    let active = true;
    const saved = loadSession();

    void restoreSession(saved)
      .then((validated) => (validated ? activateInvitation(validated) : null))
      .then((validated) => {
        if (!active || !validated) return;
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

  if (!activeSession) {
    return (
      <AuthView
        onAuthenticated={(nextSession) => {
          void activateInvitation(nextSession).then((activated) => {
            persistSession(activated);
            setPreviewMode(false);
            setSession(activated);
          });
        }}
        onPreview={() => {
          setActiveView("mission");
          setPreviewMode(true);
        }}
      />
    );
  }

  return (
    <AppShell
      activeView={activeView}
      session={activeSession}
      previewMode={previewMode}
      onViewChange={setActiveView}
      onLogout={() => {
        if (previewMode) {
          setPreviewMode(false);
          setActiveView("mission");
          return;
        }
        void logoutSession();
        if (activeSession.identityProvider === "google" || activeSession.identityProvider === "password") {
          void signOutFirebase();
        }
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      }}
    >
      {activeView === "mission" ? (
        <MissionControl data={activeMissionData} session={activeSession} previewMode={previewMode} />
      ) : null}
      {!previewMode && activeView === "projects" ? <ProjectsView session={activeSession} /> : null}
      {activeView === "galaxy" ? <GalaxyView data={activeMissionData} /> : null}
      {activeView === "analytics" ? <AnalyticsView data={activeMissionData} /> : null}
      {activeView === "city" ? <CityBuilderView data={activeMissionData} /> : null}
      {!previewMode && activeView === "calendar" ? <CalendarView session={activeSession} /> : null}
      {!previewMode && activeView === "control" ? (
        <ControlCenterView
          session={activeSession}
          missionData={activeMissionData}
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

async function restoreSession(saved: NexusSession | null): Promise<NexusSession | null> {
  if (saved) {
    try {
      return await validateSession(saved);
    } catch {
      if (saved.identityProvider !== "google" && saved.identityProvider !== "password") {
        throw new Error("Saved session is no longer valid");
      }
    }
  }
  return resumeGoogleSession();
}

async function activateInvitation(session: NexusSession): Promise<NexusSession> {
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
    if (!saved) return null;
    const session = JSON.parse(saved) as NexusSession;
    if (session.mode !== "api" || !session.accessToken || !session.workspaceId) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("nexus.owner.demo.v1");
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function purgeLegacyLocalData() {
  sessionStorage.removeItem("nexus.owner.demo.v1");
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("nexus.workspace.v2.") || key.startsWith("nexus.planning.v2.")) {
      localStorage.removeItem(key);
    }
  }
}

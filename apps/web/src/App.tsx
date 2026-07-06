import { useState } from "react";

import { AppShell, type ViewKey } from "@/components/AppShell";
import { useMissionData } from "@/hooks/useMissionData";
import { signOutFirebase } from "@/lib/firebase";
import { AuthView } from "@/pages/AuthView";
import { ProfileView, SettingsView } from "@/pages/AccountViews";
import { CityBuilderView } from "@/pages/CityBuilder";
import { IntegrationsView } from "@/pages/IntegrationsView";
import { MissionControl } from "@/pages/MissionControl";
import { CalendarView, IdeasView, JournalView } from "@/pages/PlanningViews";
import { ProjectsView } from "@/pages/ProjectsWorkspace";
import {
  AnalyticsView,
  GalaxyView,
  TimelineView
} from "@/pages/WorkspaceViews";
import type { NexusSession } from "@/types/auth";

const SESSION_KEY = "nexus.session.v1";

function App() {
  const [session, setSession] = useState<NexusSession | null>(loadSession);
  const [activeView, setActiveView] = useState<ViewKey>("mission");
  const { data: missionData } = useMissionData();

  if (!session) {
    return (
      <AuthView
        onAuthenticated={(nextSession) => {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <AppShell
      activeView={activeView}
      onViewChange={setActiveView}
      onLogout={() => {
        if (session.mode === "firebase") {
          void signOutFirebase();
        }
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      }}
    >
      {activeView === "mission" ? <MissionControl data={missionData} /> : null}
      {activeView === "projects" ? <ProjectsView session={session} /> : null}
      {activeView === "galaxy" ? <GalaxyView data={missionData} /> : null}
      {activeView === "timeline" ? <TimelineView data={missionData} /> : null}
      {activeView === "analytics" ? <AnalyticsView data={missionData} /> : null}
      {activeView === "city" ? <CityBuilderView data={missionData} /> : null}
      {activeView === "calendar" ? <CalendarView session={session} /> : null}
      {activeView === "ideas" ? <IdeasView session={session} /> : null}
      {activeView === "journal" ? <JournalView session={session} /> : null}
      {activeView === "integrations" ? <IntegrationsView /> : null}
      {activeView === "settings" ? <SettingsView /> : null}
      {activeView === "profile" ? <ProfileView session={session} /> : null}
    </AppShell>
  );
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

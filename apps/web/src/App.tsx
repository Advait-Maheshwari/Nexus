import { useState } from "react";

import { AppShell, type ViewKey } from "@/components/AppShell";
import { useMissionData } from "@/hooks/useMissionData";
import { AuthView } from "@/pages/AuthView";
import { IntegrationsView } from "@/pages/IntegrationsView";
import { MissionControl } from "@/pages/MissionControl";
import { ProjectsView } from "@/pages/ProjectsWorkspace";
import {
  AnalyticsView,
  GalaxyView,
  PlaceholderView,
  TimelineView
} from "@/pages/WorkspaceViews";
import type { NexusSession } from "@/types/auth";

const SESSION_KEY = "nexus.session.v1";

function App() {
  const [session, setSession] = useState<NexusSession | null>(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? (JSON.parse(saved) as NexusSession) : null;
  });
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
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      }}
    >
      {activeView === "mission" ? <MissionControl data={missionData} /> : null}
      {activeView === "projects" ? <ProjectsView /> : null}
      {activeView === "galaxy" ? <GalaxyView data={missionData} /> : null}
      {activeView === "timeline" ? <TimelineView data={missionData} /> : null}
      {activeView === "analytics" ? <AnalyticsView data={missionData} /> : null}
      {activeView === "city" ? <PlaceholderView view="city" /> : null}
      {activeView === "calendar" ? <PlaceholderView view="calendar" /> : null}
      {activeView === "ideas" ? <PlaceholderView view="ideas" /> : null}
      {activeView === "journal" ? <PlaceholderView view="journal" /> : null}
      {activeView === "integrations" ? <IntegrationsView /> : null}
      {activeView === "settings" ? <PlaceholderView view="settings" /> : null}
      {activeView === "profile" ? <PlaceholderView view="profile" /> : null}
    </AppShell>
  );
}

export default App;

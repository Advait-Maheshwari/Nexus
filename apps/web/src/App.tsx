import { useState } from "react";

import { AppShell, type ViewKey } from "@/components/AppShell";
import { useMissionData } from "@/hooks/useMissionData";
import { MissionControl } from "@/pages/MissionControl";
import { ProjectsView } from "@/pages/ProjectsWorkspace";
import {
  AnalyticsView,
  GalaxyView,
  PlaceholderView,
  TimelineView
} from "@/pages/WorkspaceViews";

function App() {
  const [activeView, setActiveView] = useState<ViewKey>("mission");
  const { data: missionData } = useMissionData();

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {activeView === "mission" ? <MissionControl data={missionData} /> : null}
      {activeView === "projects" ? <ProjectsView /> : null}
      {activeView === "galaxy" ? <GalaxyView data={missionData} /> : null}
      {activeView === "timeline" ? <TimelineView data={missionData} /> : null}
      {activeView === "analytics" ? <AnalyticsView data={missionData} /> : null}
      {activeView === "city" ? <PlaceholderView view="city" /> : null}
      {activeView === "calendar" ? <PlaceholderView view="calendar" /> : null}
      {activeView === "ideas" ? <PlaceholderView view="ideas" /> : null}
      {activeView === "journal" ? <PlaceholderView view="journal" /> : null}
      {activeView === "settings" ? <PlaceholderView view="settings" /> : null}
      {activeView === "profile" ? <PlaceholderView view="profile" /> : null}
    </AppShell>
  );
}

export default App;

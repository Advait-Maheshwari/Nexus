import { useEffect, useState } from "react";

import { fetchMissionControl } from "@/lib/api";
import { MISSION_DATA_CHANGED_EVENT } from "@/lib/missionEvents";
import type { NexusSession } from "@/types/auth";
import type { MissionData } from "@/types/domain";

type MissionDataStatus = "loading" | "ready" | "error";

const emptyMissionData: MissionData = {
  metrics: [],
  projects: [],
  relationships: [],
  todayMission: [],
  aiRecommendations: [],
  activity: [],
  timeline: []
};

export function useMissionData(session: NexusSession | null) {
  const [data, setData] = useState<MissionData>(emptyMissionData);
  const [status, setStatus] = useState<MissionDataStatus>("loading");

  useEffect(() => {
    let active = true;

    if (!session) {
      setData(emptyMissionData);
      setStatus("loading");
      return () => {
        active = false;
      };
    }

    const refresh = () => {
      fetchMissionControl(session.accessToken)
        .then((apiData) => {
          if (!active) return;
          setData(apiData);
          setStatus("ready");
        })
        .catch(() => {
          if (!active) return;
          setData(emptyMissionData);
          setStatus("error");
        });
    };

    refresh();
    window.addEventListener(MISSION_DATA_CHANGED_EVENT, refresh);

    return () => {
      active = false;
      window.removeEventListener(MISSION_DATA_CHANGED_EVENT, refresh);
    };
  }, [session]);

  return { data, status };
}

import { useEffect, useState } from "react";

import { missionData } from "@/data/nexusSeed";
import { fetchMissionControl } from "@/lib/api";
import type { NexusSession } from "@/types/auth";
import type { MissionData } from "@/types/domain";

type MissionDataStatus = "loading" | "api" | "seed";

export function useMissionData(session: NexusSession | null) {
  const [data, setData] = useState<MissionData>(missionData);
  const [status, setStatus] = useState<MissionDataStatus>("loading");

  useEffect(() => {
    let active = true;

    if (!session) {
      setData(missionData);
      setStatus("seed");
      return () => {
        active = false;
      };
    }

    fetchMissionControl(session.mode === "api" ? session.accessToken : undefined)
      .then((apiData) => {
        if (!active) {
          return;
        }
        setData(apiData);
        setStatus("api");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setData(missionData);
        setStatus("seed");
      });

    return () => {
      active = false;
    };
  }, [session]);

  return { data, status };
}

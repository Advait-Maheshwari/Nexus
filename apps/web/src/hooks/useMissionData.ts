import { useEffect, useState } from "react";

import { missionData } from "@/data/nexusSeed";
import { fetchMissionControl } from "@/lib/api";
import type { MissionData } from "@/types/domain";

type MissionDataStatus = "loading" | "api" | "seed";

export function useMissionData() {
  const [data, setData] = useState<MissionData>(missionData);
  const [status, setStatus] = useState<MissionDataStatus>("loading");

  useEffect(() => {
    let active = true;

    fetchMissionControl()
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
  }, []);

  return { data, status };
}


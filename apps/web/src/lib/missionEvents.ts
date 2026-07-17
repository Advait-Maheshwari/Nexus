export const MISSION_DATA_CHANGED_EVENT = "nexus:mission-data-changed";

export function notifyMissionDataChanged() {
  window.dispatchEvent(new Event(MISSION_DATA_CHANGED_EVENT));
}

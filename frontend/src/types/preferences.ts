export interface Preferences {
  reducedMotion: boolean;
  compactInterface: boolean;
  autoBriefing: boolean;
}

export const defaultPreferences: Preferences = {
  reducedMotion: false,
  compactInterface: false,
  autoBriefing: true
};

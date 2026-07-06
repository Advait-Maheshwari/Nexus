export interface NexusSession {
  accessToken: string;
  userId: string;
  workspaceId: string;
  mode: "api" | "local" | "firebase";
  displayName?: string;
  email?: string;
  photoUrl?: string;
}

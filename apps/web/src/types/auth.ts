export interface NexusSession {
  accessToken: string;
  userId: string;
  workspaceId: string;
  mode: "api";
  identityProvider?: "password" | "google";
  role?: "owner" | "admin" | "member" | "viewer";
  displayName?: string;
  email?: string;
  photoUrl?: string;
}

export interface NexusAccount {
  userId: string;
  workspaceId: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  role: "owner" | "admin" | "member" | "viewer";
  workspaceName: string;
  passwordEnabled: boolean;
  emailVerified: boolean;
}

export type NexusRole = "owner" | "admin" | "member" | "viewer";

export interface NexusWorkspace {
  id: string;
  name: string;
  role: NexusRole;
  planCode: string;
}

export interface WorkspaceUsage {
  planCode: string;
  projects: number;
  projectLimit: number;
  tasks: number;
  taskLimit: number;
  members: number;
  memberLimit: number;
}

export interface WorkspaceMember {
  userId: string;
  fullName: string;
  email: string;
  role: NexusRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: Exclude<NexusRole, "owner">;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  inviteToken?: string;
}

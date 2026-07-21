export interface GitHubCommitActivity {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
  url: string;
  verified: boolean;
}

export interface GitHubRepositoryActivity {
  repository: string;
  commits: GitHubCommitActivity[];
  rateLimitRemaining?: number;
  authenticated: boolean;
  source: "github" | "local";
}

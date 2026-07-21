// types/leaderboard.ts
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarPath: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  level: number;
}

export type LeaderboardScope = 'friends' | 'global';
